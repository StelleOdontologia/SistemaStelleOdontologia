// Edge Function: Webhook do WhatsApp via Evolution API
// Recebe respostas dos pacientes e atualiza status dos agendamentos
// REGRA: Paciente DEVE responder à mensagem específica usando "Reply" do WhatsApp

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function isConfirmation(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  const positives = ['sim', 's', 'ok', 'confirmar', 'confirmo', 'confirmado', 'yes']
  return positives.some(p => normalized === p || normalized.startsWith(p + ' ') || normalized.startsWith(p + '.'))
}

function isCancellation(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  const negatives = ['nao', 'não', 'n', 'cancelar', 'desmarcar', 'no']
  return negatives.some(p => normalized === p || normalized.startsWith(p + ' ') || normalized.startsWith(p + '.'))
}

async function sendWhatsAppMessage(
  apiUrl: string,
  apiKey: string,
  instance: string,
  phone: string,
  message: string
): Promise<boolean> {
  try {
    const url = `${apiUrl}/message/sendText/${instance}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
    })
    return response.ok
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return false
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const payload = await req.json()
    console.log('Webhook recebido:', JSON.stringify(payload))

    const event = payload.event || payload.eventType
    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') {
      return new Response(JSON.stringify({ ok: true, ignored: 'event' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = payload.data || payload
    const key = data.key || {}

    // Ignora mensagens enviadas POR nós
    if (key.fromMe) {
      return new Response(JSON.stringify({ ok: true, ignored: 'fromMe' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extrai texto da mensagem
    const messageObj = data.message || {}
    const conversation = messageObj.conversation
    const extendedText = messageObj.extendedTextMessage?.text
    const imageCaption = messageObj.imageMessage?.caption
    const messageText = conversation || extendedText || imageCaption || ''

    if (!messageText) {
      return new Response(JSON.stringify({ ok: true, ignored: 'no text' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extrai telefone do remetente
    const remoteJid = key.remoteJid || ''
    const phoneRaw = remoteJid.split('@')[0]
    const phoneNormalized = normalizePhone(phoneRaw)
    const phoneShort = phoneNormalized.length >= 11
      ? phoneNormalized.slice(-11)
      : phoneNormalized

    console.log(`Mensagem de ${phoneShort}: ${messageText}`)

    // Busca configurações
    const { data: config } = await supabase.from('whatsapp_config').select('*').limit(1).single()
    const { data: policy } = await supabase
      .from('message_policies')
      .select('*')
      .eq('policy_type', 'next_day_reminder')
      .limit(1)
      .single()

    // Detecta se é SIM ou NÃO
    const isConfirm = isConfirmation(messageText)
    const isCancel = isCancellation(messageText)

    // Se não é SIM nem NÃO, ignora
    if (!isConfirm && !isCancel) {
      console.log('Mensagem não reconhecida como confirmação')
      await supabase.from('message_logs').insert([{
        message_text: messageText,
        phone_from: phoneShort,
        message_type: 'received',
        status: 'unrecognized',
        raw_payload: payload
      }])
      return new Response(JSON.stringify({ ok: true, ignored: 'not yes/no' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ⭐ EXTRAI O ID DA MENSAGEM CITADA (Reply)
    // Evolution API coloca contextInfo em data.contextInfo (não em data.message.contextInfo)
    const contextInfo = data.contextInfo
      || messageObj.extendedTextMessage?.contextInfo
      || messageObj.contextInfo
      || {}
    const repliedMessageId = contextInfo.stanzaId || contextInfo.quotedMessageId

    console.log('repliedMessageId:', repliedMessageId)

    // Se NÃO usou Reply, envia instrução
    if (!repliedMessageId) {
      console.log('Resposta sem Reply - enviando instrução')

      const instructionMessage = `⚠️ Para confirmar sua consulta, por favor:

1️⃣ Segure a mensagem do paciente
2️⃣ Toque em "Responder"
3️⃣ Digite SIM ou NÃO

Assim conseguimos identificar qual consulta você quer confirmar. 🙏

${config?.clinic_name || 'Stelle Odontologia'}`

      if (config) {
        await sendWhatsAppMessage(
          config.evolution_api_url,
          config.evolution_api_key,
          config.instance_name,
          phoneRaw,
          instructionMessage
        )
      }

      await supabase.from('message_logs').insert([{
        message_text: messageText,
        phone_from: phoneShort,
        message_type: 'received',
        status: 'no_reply_context',
        raw_payload: payload
      }])

      return new Response(JSON.stringify({ ok: true, action: 'sent_instructions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ⭐ BUSCA QUAL AGENDAMENTO TINHA AQUELE message_id
    const { data: originalLog } = await supabase
      .from('message_logs')
      .select('*, appointment:appointments(*, patient:patients(*))')
      .eq('whatsapp_message_id', repliedMessageId)
      .limit(1)
      .single()

    if (!originalLog || !originalLog.appointment) {
      console.log('Mensagem original não encontrada para ID:', repliedMessageId)
      await supabase.from('message_logs').insert([{
        message_text: messageText,
        phone_from: phoneShort,
        message_type: 'received',
        status: 'message_not_found',
        raw_payload: payload
      }])

      // Envia mensagem genérica
      if (config) {
        await sendWhatsAppMessage(
          config.evolution_api_url,
          config.evolution_api_key,
          config.instance_name,
          phoneRaw,
          'Não encontramos a consulta referenciada. Por favor, entre em contato com a clínica.'
        )
      }

      return new Response(JSON.stringify({ ok: true, ignored: 'no original message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const appointment = (originalLog as any).appointment
    const patient = appointment.patient
    const newStatus = isConfirm ? 'confirmed' : 'cancelled'

    // Atualiza agendamento
    await supabase
      .from('appointments')
      .update({
        status: newStatus,
        confirmation_status: newStatus,
        whatsapp_confirmed: isConfirm,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment.id)

    console.log(`✅ Agendamento ${appointment.id} (${patient.name}) → ${newStatus}`)

    // Monta resposta personalizada
    let responseMessage = ''
    if (isConfirm) {
      const template = policy?.confirmation_response || 'Obrigado, #paciente! Sua consulta foi confirmada. ✅'
      responseMessage = template.replace(/#paciente/g, patient.name.split(' ')[0])
    } else {
      const template = policy?.cancellation_response || 'Entendido, #paciente. Sua consulta foi desmarcada. Entre em contato para reagendar.'
      responseMessage = template.replace(/#paciente/g, patient.name.split(' ')[0])
    }

    // Envia resposta automática
    if (config) {
      await sendWhatsAppMessage(
        config.evolution_api_url,
        config.evolution_api_key,
        config.instance_name,
        phoneRaw,
        responseMessage
      )
    }

    // Salva log
    await supabase.from('message_logs').insert([{
      patient_id: patient.id,
      appointment_id: appointment.id,
      message_text: messageText,
      phone_from: phoneShort,
      message_type: 'received',
      status: newStatus,
      raw_payload: payload
    }])

    return new Response(JSON.stringify({
      ok: true,
      patient: patient.name,
      action: newStatus,
      appointment_id: appointment.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Erro no webhook:', error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
