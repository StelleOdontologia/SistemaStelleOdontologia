import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface AppointmentInfo {
  patient_name: string
  appointment_date: string
  appointment_time: string
  status?: string
}

export default function ConfirmAppointment() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [appointment, setAppointment] = useState<AppointmentInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<'confirmed' | 'cancelled' | null>(null)

  useEffect(() => {
    if (token) loadAppointment()
  }, [token])

  const loadAppointment = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          patient:patients(name)
        `)
        .eq('confirmation_token', token)
        .single()

      if (error || !data) {
        setError('Agendamento não encontrado. O link pode ter expirado.')
        return
      }

      setAppointment({
        patient_name: (data as any).patient?.name || '',
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        status: data.status
      })

      if (data.status === 'confirmed') {
        setDone('confirmed')
      } else if (data.status === 'cancelled') {
        setDone('cancelled')
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar agendamento')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'confirm' | 'cancel') => {
    if (!token || processing) return
    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('confirm_appointment_by_token', {
        p_token: token,
        p_action: action
      })

      if (error) throw error

      if (data?.ok) {
        setDone(action === 'confirm' ? 'confirmed' : 'cancelled')
      } else {
        setError(data?.error || 'Erro ao processar')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (date: string) => {
    const [y, m, d] = date.split('-')
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    return `${dayNames[dateObj.getDay()]}, ${d} de ${monthNames[dateObj.getMonth()]}`
  }

  const formatTime = (time: string) => time.substring(0, 5)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="text-gray-600">⏳ Carregando...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ops!</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Entre em contato com a clínica para mais informações.
          </p>
        </div>
      </div>
    )
  }

  if (done) {
    const isConfirmed = done === 'confirmed'
    const whatsappLink = 'https://wa.me/5521976939004'

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-7xl mb-4">{isConfirmed ? '✅' : '❌'}</div>
          <h1 className={`text-2xl font-bold mb-3 ${isConfirmed ? 'text-green-700' : 'text-red-700'}`}>
            {isConfirmed ? 'Presença Confirmada!' : 'Consulta Desmarcada'}
          </h1>

          {appointment && (
            <div className={`rounded-lg p-4 mb-6 ${isConfirmed ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
              <p className="font-bold text-gray-900 text-lg mb-1">{appointment.patient_name}</p>
              <p className="text-gray-700">📅 {formatDate(appointment.appointment_date)}</p>
              <p className="text-gray-700">⏰ {formatTime(appointment.appointment_time)}</p>
            </div>
          )}

          <p className="text-gray-600 mb-6">
            {isConfirmed
              ? 'Sua consulta está confirmada. Esperamos por você!'
              : 'Sua consulta foi cancelada. Entre em contato para reagendar.'}
          </p>

          {/* Botão voltar pro WhatsApp */}
          <a
            href={whatsappLink}
            className="block w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95"
          >
            💬 Voltar para o WhatsApp
          </a>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-bold text-blue-700">🦷 Stelle Odontologia</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🦷</div>
          <h1 className="text-2xl font-bold text-blue-700">Stelle Odontologia</h1>
        </div>

        {/* Detalhes do agendamento */}
        {appointment && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
            <p className="text-sm font-bold text-blue-600 uppercase mb-2">Sua Consulta</p>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{appointment.patient_name}</h2>
            <div className="space-y-1 text-gray-700">
              <p className="flex items-center gap-2">
                <span>📅</span>
                <span>{formatDate(appointment.appointment_date)}</span>
              </p>
              <p className="flex items-center gap-2">
                <span>⏰</span>
                <span className="font-bold text-lg">{formatTime(appointment.appointment_time)}</span>
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-gray-700 mb-6">
          Por favor, confirme sua presença:
        </p>

        {/* Botões */}
        <div className="space-y-3">
          <button
            onClick={() => handleAction('confirm')}
            disabled={processing}
            className="w-full py-5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold text-lg rounded-xl shadow-lg transition transform active:scale-95"
          >
            {processing ? '⏳ Processando...' : '✅ CONFIRMAR PRESENÇA'}
          </button>

          <button
            onClick={() => handleAction('cancel')}
            disabled={processing}
            className="w-full py-5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold text-lg rounded-xl shadow-lg transition transform active:scale-95"
          >
            {processing ? '⏳ Processando...' : '❌ NÃO POSSO IR'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Dúvidas? Entre em contato com a clínica.
        </p>
      </div>
    </div>
  )
}
