// Edge Function: Webhook do WhatsApp via Evolution API
// Recebe respostas dos pacientes e atualiza status dos agendamentos

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Normaliza telefone: remove tudo que não for número
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

// Verifica se é confirmação positiva
function isConfirmation(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  const positives = ['sim', 's', 'ok', 'confirmar', 'confirmo', 'confirmado', 'yes']
  return positives.some(p => normalized === p || normalized.startsWith(p + ' '))
}

// Verifica se é cancelamento
function isCancellation(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  const negatives = ['nao', 'não', 'n', 'cancelar', 'desmarcar', 'no']
  return negatives.some(p => normalized === p || normalized.startsWith(p + ' '))
}

// Envia mensagem via Evolution API
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
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = payload.data || payload
    const key = data.key || {}

    if (key.fromMe) {
      return new Response(JSON.stringify({ ok: true, ignored: 'fromMe' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const message = data.message || {}
    const messageText = message.conversation
      || message.extendedTextMessage?.text
      || message.imageMessage?.caption
      || ''

    if (!messageText) {
      return new Response(JSON.stringify({ ok: true, ignored: 'no text' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const remoteJid = key.remoteJid || ''
    const phoneRaw = remoteJid.split('@')[0]
    const phoneNormalized = normalizePhone(phoneRaw)
    const phoneShort = phoneNormalized.length >= 11
      ? phoneNormalized.slice(-11)
      : phoneNormalized

    console.log(`Mensagem de ${phoneShort}: ${messageText}`)

    const { data: patients } = await supabase
      .from('patients')
      .select('*')

    const patient = patients?.find((p: any) => {
      if (!p.phone) return false
      const dbPhone = normalizePhone(p.phone)
      return dbPhone.endsWith(phoneShort) || phoneShort.endsWith(dbPhone)
    })

    if (!patient) {
      console.log('Paciente não encontrado:', phoneShort)
      await supabase.from('message_logs').insert([{
        message_text: messageText,
        phone_from: phoneShort,
        message_type: 'received',
        status: 'no_patient',
        raw_payload: payload
      }])
      return new Response(JSON.stringify({ ok: true, ignored: 'no patient' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const today = new Date().toISOString().split('T')[0]
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patient.id)
      .gte('appointment_date', today)
      .in('status', ['scheduled'])
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .limit(1)

    const appointment = appointments?.[0]

    if (!appointment) {
      console.log('Sem agendamento pendente para:', patient.name)
      await supabase.from('message_logs').insert([{
        patient_id: patient.id,
        message_text: messageText,
        phone_from: phoneShort,
        message_type: 'received',
        status: 'no_appointment',
        raw_payload: payload
      }])
      return new Response(JSON.stringify({ ok: true, ignored: 'no appointment' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: config } = await supabase.from('whatsapp_config').select('*').limit(1).single()
    const { data: policy } = await supabase.from('message_policies').select('*').eq('policy_type', 'next_day_reminder').limit(1).single()

    let newStatus: string | null = null
    let responseMessage = ''

    if (isConfirmation(messageText)) {
      newStatus = 'confirmed'
      responseMessage = policy?.confirmation_response || 'Obrigado! Sua consulta foi confirmada. ✅'
    } else if (isCancellation(messageText)) {
      newStatus = 'cancelled'
      responseMessage = policy?.cancellation_response || 'Entendido. Sua consulta foi desmarcada. Entre em contato para reagendar.'
    }

    if (newStatus && appointment) {
      await supabase
        .from('appointments')
        .update({
          status: newStatus,
          confirmation_status: newStatus,
          whatsapp_confirmed: newStatus === 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id)

      console.log(`Agendamento ${appointment.id} atualizado para ${newStatus}`)

      if (config && responseMessage) {
        await sendWhatsAppMessage(
          config.evolution_api_url,
          config.evolution_api_key,
          config.instance_name,
          phoneRaw,
          responseMessage
        )
      }
    }

    await supabase.from('message_logs').insert([{
      patient_id: patient.id,
      appointment_id: appointment.id,
      message_text: messageText,
      phone_from: phoneShort,
      message_type: 'received',
      status: newStatus || 'no_action',
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
