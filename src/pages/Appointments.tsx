import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AppointmentForm } from '@/components/AppointmentForm'
import type { Appointment, Patient } from '@/lib/supabase'
import { addDays, startOfWeek, format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Appointments() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null)
  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null)

  useEffect(() => {
    loadData()
  }, [currentDate])

  const loadData = async () => {
    try {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = addDays(weekStart, 6)

      const startStr = format(weekStart, 'yyyy-MM-dd')
      const endStr = format(weekEnd, 'yyyy-MM-dd')

      const [appointmentsRes, patientsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .gte('appointment_date', startStr)
          .lte('appointment_date', endStr)
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true }),
        supabase
          .from('patients')
          .select('*')
          .order('name', { ascending: true })
      ])

      if (appointmentsRes.error) throw appointmentsRes.error
      if (patientsRes.error) throw patientsRes.error

      setAppointments(appointmentsRes.data || [])
      setPatients(patientsRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWeekDays = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
  }

  const getTimeSlots = () => {
    const slots = []
    for (let h = 8; h < 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        slots.push(format(new Date().setHours(h, m), 'HH:mm'))
      }
    }
    return slots
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500'
      case 'checked_in': return 'bg-yellow-500'
      case 'in_progress': return 'bg-purple-500'
      case 'completed': return 'bg-green-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'scheduled': 'Agendado',
      'checked_in': 'Sala de Espera',
      'in_progress': 'Em Atendimento',
      'completed': 'Finalizado',
      'cancelled': 'Cancelado'
    }
    return labels[status] || status
  }

  const getAppointmentForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointments.find(
      appt => appt.appointment_date === dateStr && appt.appointment_time === time
    )
  }

  const handleDragStart = (appt: Appointment) => {
    setDraggedAppt(appt)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('ring-2', 'ring-blue-400')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-blue-400')
  }

  const handleDrop = async (e: React.DragEvent, date: Date, time: string) => {
    e.preventDefault()
    e.currentTarget.classList.remove('ring-2', 'ring-blue-400')

    if (!draggedAppt) return

    const dateStr = format(date, 'yyyy-MM-dd')
    const existing = appointments.find(
      appt => appt.appointment_date === dateStr && appt.appointment_time === time
    )

    if (existing) {
      alert('Horário já ocupado')
      return
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: dateStr,
          appointment_time: time
        })
        .eq('id', draggedAppt.id)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Erro ao mover:', error)
      alert('Erro ao mover agendamento')
    } finally {
      setDraggedAppt(null)
    }
  }

  const weekDays = getWeekDays()
  const timeSlots = getTimeSlots()

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-600 text-lg">⏳ Carregando...</div></div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agendamentos</h1>
            <p className="text-gray-600 mt-1">Calendário da semana</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="px-3 py-2 bg-white rounded-lg hover:bg-gray-100 border border-gray-300 text-sm font-medium"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 bg-white rounded-lg hover:bg-gray-100 border border-gray-300 text-sm font-medium"
            >
              Hoje
            </button>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="px-3 py-2 bg-white rounded-lg hover:bg-gray-100 border border-gray-300 text-sm font-medium"
            >
              Próxima →
            </button>
          </div>
        </div>

        {showForm && selectedSlot && (
          <div className="mb-6 p-6 bg-white rounded-lg shadow-lg border-l-4 border-blue-500">
            <h2 className="text-xl font-bold mb-4">
              📝 Novo Agendamento - {format(selectedSlot.date, 'dd/MM/yyyy')} às {selectedSlot.time}
            </h2>
            <AppointmentForm
              date={selectedSlot.date}
              time={selectedSlot.time}
              patients={patients}
              onSuccess={() => {
                setShowForm(false)
                setSelectedSlot(null)
                loadData()
              }}
              onCancel={() => {
                setShowForm(false)
                setSelectedSlot(null)
              }}
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <th className="p-3 text-left text-sm font-semibold w-20">Hora</th>
                {weekDays.map(day => (
                  <th key={day.toISOString()} className="p-3 text-center text-sm font-semibold min-w-32">
                    <div className="text-xs uppercase tracking-wide">{format(day, 'EEEE', { locale: ptBR })}</div>
                    <div className="text-lg font-bold">{format(day, 'dd/MM')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, idx) => (
                <tr key={time} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 text-sm font-mono text-gray-700 border-r border-gray-200">
                    <div className="font-semibold">{time}</div>
                  </td>
                  {weekDays.map(day => {
                    const appt = getAppointmentForSlot(day, time)
                    return (
                      <td
                        key={`${day.toISOString()}-${time}`}
                        className="p-1 border-r border-gray-200 transition cursor-pointer"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, day, time)}
                        onClick={() => {
                          if (!appt) {
                            setSelectedSlot({ date: day, time })
                            setShowForm(true)
                          }
                        }}
                      >
                        {appt ? (
                          <div
                            draggable
                            onDragStart={() => handleDragStart(appt)}
                            className={`m-1 p-2 rounded text-white text-xs font-medium cursor-move hover:shadow-lg transition ${getStatusColor(appt.status)} ${draggedAppt?.id === appt.id ? 'opacity-60' : ''}`}
                          >
                            <div className="font-bold text-xs truncate">
                              {patients.find(p => p.id === appt.patient_id)?.name?.split(' ')[0]}
                            </div>
                            <div className="text-xs truncate">{appt.procedure}</div>
                          </div>
                        ) : (
                          <div className="m-1 p-2 text-center text-gray-400 text-xs hover:bg-blue-50 rounded cursor-pointer">
                            +
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-2">💡 Como usar:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Clique em qualquer célula vazia para criar um novo agendamento</li>
            <li>• Arraste agendamentos para mudar de horário ou dia</li>
            <li>• Cores indicam status: 🔵 Agendado | 🟡 Sala de Espera | 🟣 Em Atendimento | 🟢 Finalizado</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
