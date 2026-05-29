import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
      for (let m = 0; m < 60; m += 15) {
        slots.push(format(new Date().setHours(h, m), 'HH:mm'))
      }
    }
    return slots
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 border-blue-300'
      case 'checked_in': return 'bg-yellow-100 border-yellow-300'
      case 'in_progress': return 'bg-purple-100 border-purple-300'
      case 'completed': return 'bg-green-100 border-green-300'
      case 'cancelled': return 'bg-red-100 border-red-300'
      default: return 'bg-gray-100'
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

  const weekDays = getWeekDays()
  const timeSlots = getTimeSlots()

  if (loading) return <div className="p-8">Carregando...</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Agendamentos - Semana</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(addDays(currentDate, -7))}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Hoje
          </button>
          <button
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Próxima →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 w-16 text-sm font-semibold">Hora</th>
              {weekDays.map(day => (
                <th key={day.toISOString()} className="border p-2 text-sm font-semibold">
                  <div>{format(day, 'EEEE', { locale: ptBR })}</div>
                  <div className="text-xs text-gray-600">{format(day, 'dd/MM')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(time => (
              <tr key={time} className="hover:bg-gray-50">
                <td className="border p-2 text-sm font-mono bg-gray-50 text-center">{time}</td>
                {weekDays.map(day => {
                  const appt = getAppointmentForSlot(day, time)
                  return (
                    <td
                      key={`${day.toISOString()}-${time}`}
                      className="border p-1"
                      onClick={() => {
                        if (!appt) {
                          setSelectedSlot({ date: day, time })
                          setShowForm(true)
                        }
                      }}
                    >
                      {appt ? (
                        <div
                          className={`p-2 rounded text-sm border cursor-pointer hover:shadow ${getStatusColor(appt.status)}`}
                        >
                          <div className="font-semibold text-xs">
                            {patients.find(p => p.id === appt.patient_id)?.name?.split(' ')[0]}
                          </div>
                          <div className="text-xs">{appt.procedure}</div>
                          <div className="text-xs text-gray-600">{getStatusLabel(appt.status)}</div>
                        </div>
                      ) : (
                        <div className="p-2 text-center text-gray-400 text-xs cursor-pointer hover:bg-blue-50 rounded">
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

      {showForm && selectedSlot && (
        <div className="mt-8 p-6 bg-blue-50 rounded border border-blue-200">
          <h2 className="text-xl font-bold mb-4">
            Novo Agendamento - {format(selectedSlot.date, 'dd/MM/yyyy')} às {selectedSlot.time}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Paciente</label>
              <select className="w-full px-3 py-2 border rounded">
                <option value="">Selecione um paciente</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Procedimento</label>
              <input type="text" className="w-full px-3 py-2 border rounded" placeholder="Ex: Limpeza, Obturação" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duração</label>
              <select className="w-full px-3 py-2 border rounded">
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">60 minutos</option>
              </select>
            </div>
            <div className="flex gap-2 pt-4">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Salvar Agendamento
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
