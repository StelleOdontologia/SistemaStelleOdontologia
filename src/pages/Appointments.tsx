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
      slots.push(format(new Date().setHours(h, 0), 'HH:mm'))
    }
    return slots
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500 hover:bg-blue-600'
      case 'checked_in': return 'bg-yellow-500 hover:bg-yellow-600'
      case 'in_progress': return 'bg-purple-500 hover:bg-purple-600'
      case 'completed': return 'bg-green-500 hover:bg-green-600'
      case 'cancelled': return 'bg-red-500 hover:bg-red-600'
      default: return 'bg-gray-500'
    }
  }

  const getAppointmentForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointments.find(
      appt => appt.appointment_date === dateStr && appt.appointment_time === time
    )
  }

  const weekDays = getWeekDays()
  const timeSlots = getTimeSlots()

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-600">⏳ Carregando...</div></div>

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-full">
        {/* Calendário Linear no Topo */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentDate(addDays(currentDate, -7))}
                className="p-2 hover:bg-gray-200 rounded-lg"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                Hoje
              </button>
              <button
                onClick={() => setCurrentDate(addDays(currentDate, 7))}
                className="p-2 hover:bg-gray-200 rounded-lg"
              >
                →
              </button>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Novo Agendamento
            </button>
          </div>

          {/* Linha de datas */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              {Array.from({ length: 30 }, (_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i - 7)).map(date => {
                const isToday = isSameDay(date, new Date())
                const isInWeek = weekDays.some(d => isSameDay(d, date))
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setCurrentDate(date)}
                    className={`px-4 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : isInWeek
                        ? 'bg-orange-400 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <div>{format(date, 'EEE', { locale: ptBR }).toUpperCase()}</div>
                    <div>{format(date, 'dd')}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal Novo Agendamento */}
        {showForm && selectedSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">
                📝 Novo Agendamento
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
          </div>
        )}

        {/* Grid Calendário */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header com dias */}
          <div className="grid gap-px" style={{ gridTemplateColumns: '80px repeat(6, 1fr)' }}>
            <div className="bg-gray-100 p-3 font-bold text-sm text-center">Hora</div>
            {weekDays.map(day => (
              <div
                key={day.toISOString()}
                className="bg-blue-600 text-white p-3 text-center font-bold"
              >
                <div className="text-sm uppercase">{format(day, 'EEEE', { locale: ptBR })}</div>
                <div className="text-lg">{format(day, 'dd')}</div>
                <div className="text-xs">{format(day, 'MMM', { locale: ptBR })}</div>
              </div>
            ))}
          </div>

          {/* Grid de horários e agendamentos */}
          <div className="grid gap-px bg-gray-200" style={{ gridTemplateColumns: '80px repeat(6, 1fr)' }}>
            {timeSlots.map(time => (
              <div key={time} className="contents">
                <div className="bg-gray-50 p-3 text-center font-semibold text-sm border-r border-gray-200">
                  {time}
                </div>
                {weekDays.map(day => {
                  const appt = getAppointmentForSlot(day, time)
                  const patientName = patients.find(p => p.id === appt?.patient_id)?.name
                  return (
                    <div
                      key={`${day.toISOString()}-${time}`}
                      className="bg-white p-2 min-h-20 border-b border-r border-gray-200 hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => {
                        if (!appt) {
                          setSelectedSlot({ date: day, time })
                          setShowForm(true)
                        }
                      }}
                    >
                      {appt ? (
                        <div
                          className={`${getStatusBgColor(appt.status)} text-white rounded p-2 text-xs font-medium h-full flex flex-col`}
                        >
                          <div className="font-bold truncate">{patientName?.split(' ')[0]}</div>
                          <div className="truncate text-xs">{appt.procedure}</div>
                          <div className="text-xs mt-auto">{appt.duration_minutes}min</div>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center text-xl">+</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          💡 Clique em qualquer célula vazia para criar um novo agendamento
        </div>
      </div>
    </div>
  )
}
