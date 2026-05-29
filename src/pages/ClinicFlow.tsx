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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-50 border-blue-300'
      case 'checked_in': return 'bg-yellow-50 border-yellow-300'
      case 'in_progress': return 'bg-purple-50 border-purple-300'
      case 'completed': return 'bg-green-50 border-green-300'
      default: return 'bg-gray-50'
    }
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

  if (loading) return <div className="p-8">Carregando...</div>

  const grouped = {
    scheduled: appointments.filter(a => a.status === 'scheduled'),
    checked_in: appointments.filter(a => a.status === 'checked_in'),
    in_progress: appointments.filter(a => a.status === 'in_progress'),
    completed: appointments.filter(a => a.status === 'completed')
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Fluxo na Clínica</h1>
      <p className="text-gray-600 mb-6">{format(new Date(), 'EEEE, d MMMM yyyy', { locale: ptBR })}</p>

      <div className="grid grid-cols-4 gap-4">
        {(['scheduled', 'checked_in', 'in_progress', 'completed'] as const).map(status => (
          <div key={status} className="bg-gray-100 rounded-lg p-4">
            <h2 className="font-bold text-lg mb-4 text-gray-800">
              {statusLabels[status]}
              <span className="text-sm font-normal text-gray-600 ml-2">({grouped[status].length})</span>
            </h2>

            <div className="space-y-3">
              {grouped[status].length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">-</p>
              ) : (
                grouped[status].map(appt => (
                  <div
                    key={appt.id}
                    className={`p-4 rounded border-2 ${getStatusColor(status)} space-y-2`}
                  >
                    <div className="font-semibold text-sm">{appt.patient_name}</div>
                    <div className="text-xs text-gray-600">
                      <div>{appt.appointment_time} - {appt.procedure}</div>
                      <div>{appt.duration_minutes} min</div>
                    </div>

                    {status === 'checked_in' && (
                      <div className="text-sm font-mono bg-white p-1 rounded text-center text-blue-600">
                        {formatTime(timers[`${appt.id}-wait`] || 0)}
                      </div>
                    )}

                    {status === 'in_progress' && (
                      <div className="text-sm font-mono bg-white p-1 rounded text-center text-purple-600">
                        {formatTime(timers[`${appt.id}-service`] || 0)}
                      </div>
                    )}

                    {status !== 'completed' && status !== 'cancelled' && (
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            const next = getNextStatus(status)
                            if (next) handleStatusChange(appt.id, next)
                          }}
                          className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Avançar
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
    </div>
  )
}
