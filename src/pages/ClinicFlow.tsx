import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Appointment, Patient } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AppointmentWithPatient extends Appointment {
  patient_name?: string
  checked_in_at?: string
  in_progress_at?: string
}

export default function ClinicFlow() {
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [timers, setTimers] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    loadAppointments()
    const interval = setInterval(() => {
      setTimers(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(key => {
          updated[key] = updated[key] + 1
        })
        return updated
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadAppointments = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')

      const [appointmentsRes, patientsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .eq('appointment_date', today)
          .order('appointment_time', { ascending: true }),
        supabase
          .from('patients')
          .select('*')
          .order('name', { ascending: true })
      ])

      if (appointmentsRes.error) throw appointmentsRes.error
      if (patientsRes.error) throw patientsRes.error

      const appts = appointmentsRes.data || []
      const pats = patientsRes.data || []

      const withNames = appts.map(appt => ({
        ...appt,
        patient_name: pats.find(p => p.id === appt.patient_id)?.name
      }))

      setAppointments(withNames)
      setPatients(pats)
    } catch (error) {
      console.error('Erro ao carregar:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const updateData: { status: string; checked_in_at?: string; in_progress_at?: string } = {
        status: newStatus
      }

      if (newStatus === 'checked_in') {
        updateData.checked_in_at = new Date().toISOString()
        setTimers(prev => ({ ...prev, [`${appointmentId}-wait`]: 0 }))
      } else if (newStatus === 'in_progress') {
        updateData.in_progress_at = new Date().toISOString()
        setTimers(prev => {
          const updated = { ...prev }
          delete updated[`${appointmentId}-wait`]
          updated[`${appointmentId}-service`] = 0
          return updated
        })
      } else if (newStatus === 'completed') {
        setTimers(prev => {
          const updated = { ...prev }
          delete updated[`${appointmentId}-service`]
          return updated
        })
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)

      if (error) throw error
      loadAppointments()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getNextStatus = (current: string): string | null => {
    const flow = ['scheduled', 'checked_in', 'in_progress', 'completed']
    const idx = flow.indexOf(current)
    return idx < flow.length - 1 ? flow[idx + 1] : null
  }

  const statusLabels: { [key: string]: string } = {
    scheduled: 'Agendado',
    checked_in: 'Sala de Espera',
    in_progress: 'Em Atendimento',
    completed: 'Finalizado',
    cancelled: 'Cancelado'
  }

  const statusIcons: { [key: string]: string } = {
    scheduled: '📅',
    checked_in: '⏳',
    in_progress: '🦷',
    completed: '✅',
    cancelled: '❌'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-600 text-lg">⏳ Carregando...</div></div>

  const grouped = {
    scheduled: appointments.filter(a => a.status === 'scheduled'),
    checked_in: appointments.filter(a => a.status === 'checked_in'),
    in_progress: appointments.filter(a => a.status === 'in_progress'),
    completed: appointments.filter(a => a.status === 'completed')
  }

  const totalAppointments = appointments.length

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Fluxo na Clínica</h1>
          <p className="text-gray-600 mt-2">
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ptBR })} • {totalAppointments} agendamentos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {(['scheduled', 'checked_in', 'in_progress', 'completed'] as const).map(status => {
            const count = grouped[status].length
            const colors = {
              scheduled: 'bg-blue-50 border-blue-200 text-blue-900',
              checked_in: 'bg-yellow-50 border-yellow-200 text-yellow-900',
              in_progress: 'bg-purple-50 border-purple-200 text-purple-900',
              completed: 'bg-green-50 border-green-200 text-green-900'
            }
            return (
              <div key={status} className={`p-4 rounded-lg border-2 ${colors[status]}`}>
                <div className="text-2xl mb-2">{statusIcons[status]}</div>
                <div className="font-bold text-lg">{count}</div>
                <div className="text-sm opacity-75">{statusLabels[status]}</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['scheduled', 'checked_in', 'in_progress', 'completed'] as const).map(status => (
            <div key={status} className="bg-white rounded-lg shadow-md border-t-4" style={{
              borderTopColor: status === 'scheduled' ? '#3b82f6' : status === 'checked_in' ? '#eab308' : status === 'in_progress' ? '#a855f7' : '#22c55e'
            }}>
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <span>{statusIcons[status]}</span>
                  {statusLabels[status]}
                </h2>
              </div>

              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {grouped[status].length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">-</p>
                ) : (
                  grouped[status].map(appt => (
                    <div
                      key={appt.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition"
                    >
                      <div className="font-bold text-gray-900 text-sm mb-2">{appt.patient_name}</div>
                      <div className="text-xs text-gray-600 space-y-1 mb-3">
                        <div>⏰ {appt.appointment_time} - {appt.procedure}</div>
                        <div>⏱️ {appt.duration_minutes} min</div>
                      </div>

                      {status === 'checked_in' && (
                        <div className="text-sm font-mono bg-yellow-100 p-2 rounded text-center text-yellow-900 mb-3 font-bold">
                          ⏳ {formatTime(timers[`${appt.id}-wait`] || 0)}
                        </div>
                      )}

                      {status === 'in_progress' && (
                        <div className="text-sm font-mono bg-purple-100 p-2 rounded text-center text-purple-900 mb-3 font-bold">
                          🦷 {formatTime(timers[`${appt.id}-service`] || 0)}
                        </div>
                      )}

                      {status !== 'completed' && status !== 'cancelled' && (
                        <div>
                          <button
                            onClick={() => {
                              const next = getNextStatus(status)
                              if (next) handleStatusChange(appt.id, next)
                            }}
                            className="w-full px-3 py-2 bg-blue-600 text-white text-xs rounded font-medium hover:bg-blue-700 transition"
                          >
                            Avançar →
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-2">💡 Fluxo do Paciente:</h3>
          <div className="flex items-center justify-center gap-2 text-sm text-blue-800 flex-wrap">
            <span className="px-3 py-1 bg-blue-100 rounded-full">📅 Agendado</span>
            <span className="text-lg">→</span>
            <span className="px-3 py-1 bg-yellow-100 rounded-full">⏳ Sala de Espera</span>
            <span className="text-lg">→</span>
            <span className="px-3 py-1 bg-purple-100 rounded-full">🦷 Em Atendimento</span>
            <span className="text-lg">→</span>
            <span className="px-3 py-1 bg-green-100 rounded-full">✅ Finalizado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
