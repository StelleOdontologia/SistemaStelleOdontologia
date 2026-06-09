// Edge Function: Envio Manual/Automático de Lembretes via WhatsApp

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Substitui variáveis no template
function applyVariables(
  template: string,
  vars: { paciente: string; dataAgenda: string; nomeFantasia: string; telefone: string }
): string {
  return template
    .replace(/#nomeFantasia/g, vars.nomeFantasia)
    .replace(/#paciente/g, vars.paciente)
    .replace(/#dataAgenda/g, vars.dataAgenda)
    .replace(/#telefone/g, vars.telefone)
}

// Formata data: "amanhã às 14:00" ou "segunda-feira às 14:00"
function formatAppointmentDate(date: string, time: string): string {
  const apptDate = new Date(date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

  let dayLabel = ''
  if (apptDate.getTime() === tomorrow.getTime()) {
    dayLabel = 'amanhã'
  } else if (apptDate.getTime() === today.getTime()) {
    dayLabel = 'hoje'
  } else {
    dayLabel = days[apptDate.getDay()]
  }

  const dateStr = apptDate.toLocaleDateString('pt-BR')
  const timeStr = time.substring(0, 5)

  return `${dayLabel} (${dateStr}) às ${timeStr}`
}

// Envia mensagem via Evolution API
async function sendWhatsAppMessage(
  apiUrl: string,
  apiKey: string,
  instance: string,
  phone: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const phoneNumber = phone.replace(/\D/g, '')
    const fullPhone = phoneNumber.length === 11 ? '55' + phoneNumber : phoneNumber

    const url = `${apiUrl}/message/sendText/${instance}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: fullPhone,
        text: message
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { ok: false, error: `${response.status}: ${errorText}` }
    }
    return { ok: true }
  } catch (error: any) {
    return { ok: false, error: error.message }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const body = await req.json().catch(() => ({}))
    const { target_date, dry_run } = body

    // Pega configurações
    const { data: config } = await supabase.from('whatsapp_config').select('*').limit(1).single()
    const { data: policy } = await supabase
      .from('message_policies')
      .select('*')
      .eq('policy_type', 'next_day_reminder')
      .limit(1)
      .single()

    if (!config) {
      return new Response(JSON.stringify({ ok: false, error: 'WhatsApp não configurado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!policy) {
      return new Response(JSON.stringify({ ok: false, error: 'Política não cadastrada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Calcula data alvo (próximo dia ou data específica)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let targetDateStr: string

    if (target_date) {
      targetDateStr = target_date
    } else {
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + (policy.days_before || 1))
      targetDateStr = tomorrow.toISOString().split('T')[0]
    }

    // Busca agendamentos do dia alvo
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*, patient:patients(*)')
      .eq('appointment_date', targetDateStr)
      .in('status', ['scheduled'])

    if (error) throw error

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        message: 'Nenhum agendamento para o dia',
        target_date: targetDateStr,
        sent: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results = []

    for (const appt of appointments) {
      const patient = (appt as any).patient
      if (!patient || !patient.phone) {
        results.push({
          appointment_id: appt.id,
          patient: patient?.name,
          status: 'skip',
          reason: 'Sem telefone'
        })
        continue
      }

      const message = applyVariables(policy.message_template, {
        nomeFantasia: config.clinic_name || 'Stelle Odontologia',
        paciente: patient.name.split(' ')[0],
        dataAgenda: formatAppointmentDate(appt.appointment_date, appt.appointment_time),
        telefone: config.clinic_phone || ''
      })

      if (dry_run) {
        results.push({
          appointment_id: appt.id,
          patient: patient.name,
          phone: patient.phone,
          status: 'preview',
          message
        })
        continue
      }

      const sent = await sendWhatsAppMessage(
        config.evolution_api_url,
        config.evolution_api_key,
        config.instance_name,
        patient.phone,
        message
      )

      await supabase.from('message_logs').insert([{
        appointment_id: appt.id,
        patient_id: patient.id,
        policy_id: policy.id,
        message_text: message,
        phone_to: patient.phone,
        message_type: 'sent',
        status: sent.ok ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
        error_message: sent.error
      }])

      results.push({
        appointment_id: appt.id,
        patient: patient.name,
        phone: patient.phone,
        status: sent.ok ? 'sent' : 'failed',
        error: sent.error
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      target_date: targetDateStr,
      total: appointments.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Erro:', error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
