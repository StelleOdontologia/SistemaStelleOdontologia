import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AppointmentForm } from '@/components/AppointmentForm'
import type { Appointment, Patient } from '@/lib/supabase'
import { addDays, startOfWeek, format, isSameDay, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Appointments() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null)
  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null)
  const [dragOver, setDragOver] = useState<{ date: Date; time: string } | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [actionMenu, setActionMenu] = useState<{ appt: Appointment; x: number; y: number } | null>(null)
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null)

  // Atualizar status do agendamento
  const updateApptStatus = async (apptId: string, newStatus: Appointment['status']) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', apptId)

      if (error) throw error
      await loadData()
      setActionMenu(null)
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error)
      alert(`Erro: ${error?.message || 'Erro desconhecido'}`)
    }
  }

  // Excluir agendamento
  const deleteAppt = async (apptId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', apptId)

      if (error) throw error
      await loadData()
      setActionMenu(null)
    } catch (error: any) {
      console.error('Erro ao excluir:', error)
      alert(`Erro: ${error?.message || 'Erro desconhecido'}`)
    }
  }

  // Função para mover agendamento via drag-and-drop
  const handleDrop = async (newDate: Date, newTime: string) => {
    if (!draggedAppt) return

    const newDateStr = format(newDate, 'yyyy-MM-dd')

    // Se for o mesmo slot, cancela
    if (draggedAppt.appointment_date === newDateStr &&
        draggedAppt.appointment_time.substring(0, 5) === newTime) {
      setDraggedAppt(null)
      setDragOver(null)
      return
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDateStr,
          appointment_time: newTime
        })
        .eq('id', draggedAppt.id)

      if (error) throw error

      await loadData()
    } catch (error: any) {
      console.error('Erro ao mover agendamento:', error)
      alert(`Erro ao mover: ${error?.message || 'Erro desconhecido'}`)
    } finally {
      setDraggedAppt(null)
      setDragOver(null)
    }
  }

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

  const get15MinSlots = () => {
    const slots = []
    for (let h = 8; h < 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        slots.push(format(new Date().setHours(h, m), 'HH:mm'))
      }
    }
    return slots
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500'
      case 'confirmed': return 'bg-green-500'
      case 'checked_in': return 'bg-yellow-500'
      case 'in_progress': return 'bg-purple-500'
      case 'completed': return 'bg-green-600'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointments.filter(appt => appt.appointment_date === dateStr)
  }

  const getSlotRowspan = (durationMinutes: number) => {
    return durationMinutes / 15
  }

  // Normaliza horário para "HH:mm" (remove segundos se houver)
  const normalizeTime = (time: string) => time.substring(0, 5)

  const isSlotOccupied = (date: Date, time: string, appointments: Appointment[]) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointments.some(appt => {
      const apptTime = normalizeTime(appt.appointment_time)
      const apptStart = parse(apptTime, 'HH:mm', new Date())
      const apptEnd = new Date(apptStart.getTime() + appt.duration_minutes * 60000)
      const slotTime = parse(time, 'HH:mm', new Date())

      return appt.appointment_date === dateStr &&
             slotTime >= apptStart &&
             slotTime < apptEnd
    })
  }

  const getAppointmentAtSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointments.find(appt => {
      if (appt.appointment_date !== dateStr) return false
      return normalizeTime(appt.appointment_time) === time
    })
  }

  const weekDays = getWeekDays()
  const timeSlots = get15MinSlots()
  const dayAppointments = weekDays.map(day => getAppointmentsForDay(day))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">⏳ Carregando...</div>
    </div>
  )

  return (
    <div
      className="min-h-screen bg-gray-50 p-4"
      onDragOver={(e) => {
        if (draggedAppt) {
          setMousePos({ x: e.clientX, y: e.clientY })
        }
      }}
    >
      <div className="max-w-full">
        {/* Header com navegação */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(addDays(currentDate, -7))}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                title="Semana anterior"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700"
              >
                Hoje
              </button>
              <button
                onClick={() => setCurrentDate(addDays(currentDate, 7))}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                title="Próxima semana"
              >
                →
              </button>
              <span className="ml-4 text-sm font-medium text-gray-600">
                {format(weekDays[0], 'dd MMM', { locale: ptBR })} - {format(weekDays[5], 'dd MMM yyyy', { locale: ptBR })}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedSlot(null)
                setShowForm(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              + Novo Agendamento
            </button>
          </div>
        </div>

        {/* Timeline de datas */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-4 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {Array.from({ length: 14 }, (_, i) => {
              const date = addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i - 3)
              const isCurrentWeek = weekDays.some(d => isSameDay(d, date))
              const isToday = isSameDay(date, new Date())

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setCurrentDate(date)}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                    isToday
                      ? 'bg-blue-600 text-white'
                      : isCurrentWeek
                      ? 'bg-orange-100 text-orange-700 border border-orange-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-xs uppercase">{format(date, 'EEE', { locale: ptBR })}</div>
                  <div className="text-lg">{format(date, 'dd')}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Modal Novo Agendamento */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                  📝
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Novo Agendamento</h2>
                  {selectedSlot && (
                    <p className="text-sm text-gray-500">
                      {format(selectedSlot.date, 'EEEE, dd MMM', { locale: ptBR })} às {selectedSlot.time}
                    </p>
                  )}
                </div>
              </div>
              <AppointmentForm
                date={selectedSlot?.date || new Date()}
                time={selectedSlot?.time || '08:00'}
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

        {/* Grid Calendário com slots de 15 min */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="bg-gray-50 p-2 w-16 text-center font-bold text-xs text-gray-700 border-r border-gray-300">
                  Hora
                </th>
                {weekDays.map(day => (
                  <th
                    key={day.toISOString()}
                    className="bg-blue-600 text-white p-3 text-center font-bold border-r border-blue-700"
                    style={{ width: '160px' }}
                  >
                    <div className="text-xs uppercase">{format(day, 'EEE', { locale: ptBR })}</div>
                    <div className="text-xl font-bold">{format(day, 'dd')}</div>
                    <div className="text-xs opacity-90">{format(day, 'MMM', { locale: ptBR })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, timeIdx) => (
                <tr key={`row-${timeIdx}`} className="border-b border-gray-200" style={{ height: '32px' }}>
                  <td
                    className={`bg-gray-50 p-1 text-center border-r border-gray-300 text-gray-700 ${
                      timeIdx % 4 === 0 ? 'font-bold text-xs' : 'text-xs text-gray-400'
                    }`}
                    style={{ height: '32px' }}
                  >
                    {timeIdx % 4 === 0 ? <div>{time}</div> : ''}
                  </td>

                  {weekDays.map((day, dayIdx) => {
                    const appt = getAppointmentAtSlot(day, time)
                    const patient = appt ? patients.find(p => p.id === appt.patient_id) : null
                    const rowSpan = appt ? getSlotRowspan(appt.duration_minutes) : undefined
                    const isOccupied = isSlotOccupied(day, time, dayAppointments[dayIdx])
                    const isDragTarget = dragOver?.date && isSameDay(dragOver.date, day) && dragOver.time === time

                    if (isOccupied && !appt) {
                      return null
                    }

                    return (
                      <td
                        key={`${day.toISOString()}-${time}`}
                        className={`border-r border-gray-200 cursor-pointer transition ${
                          appt ? 'p-0' : 'p-0 bg-white hover:bg-gray-50'
                        } ${isDragTarget ? 'bg-blue-200 ring-2 ring-blue-500' : ''}`}
                        rowSpan={rowSpan}
                        style={{ height: appt ? `${rowSpan ? rowSpan * 32 : 32}px` : '32px' }}
                        onClick={() => {
                          if (!appt) {
                            setSelectedSlot({ date: day, time })
                            setShowForm(true)
                          }
                        }}
                        onDragOver={(e) => {
                          if (draggedAppt) {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            if (!appt || appt.id !== draggedAppt.id) {
                              setDragOver({ date: day, time })
                            }
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (draggedAppt) {
                            handleDrop(day, time)
                          }
                        }}
                      >
                        {appt && (
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move'
                              setDraggedAppt(appt)
                            }}
                            onDragEnd={() => {
                              setDraggedAppt(null)
                              setDragOver(null)
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!draggedAppt) {
                                setActionMenu({ appt, x: e.clientX, y: e.clientY })
                              }
                            }}
                            className={`${getStatusBgColor(appt.status)} text-white rounded-sm m-0.5 p-1.5 h-full flex flex-col text-xs overflow-hidden cursor-pointer ${
                              draggedAppt?.id === appt.id ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="leading-tight">
                              <div className="font-bold text-xs">
                                {normalizeTime(appt.appointment_time)}
                              </div>
                              <div className="font-semibold truncate text-xs uppercase">
                                {patient?.name}
                              </div>
                              {patient?.phone && (
                                <div className="truncate opacity-90 text-xs">
                                  {patient.phone}
                                </div>
                              )}
                              <div className="truncate opacity-75 text-xs italic">
                                {appt.procedure}
                              </div>
                            </div>
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

        {/* Menu de Ações do Agendamento */}
        {actionMenu && (
          <>
            {/* Overlay para fechar ao clicar fora */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setActionMenu(null)}
            />
            <div
              className="fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-gray-200 py-2 min-w-[200px]"
              style={{
                left: Math.min(actionMenu.x, window.innerWidth - 220),
                top: Math.min(actionMenu.y, window.innerHeight - 250)
              }}
            >
              <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                <div className="font-bold text-sm text-gray-900 truncate">
                  {patients.find(p => p.id === actionMenu.appt.patient_id)?.name || 'Paciente'}
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(actionMenu.appt.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })} às {normalizeTime(actionMenu.appt.appointment_time)}
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingAppt(actionMenu.appt)
                  setActionMenu(null)
                }}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-blue-600 font-medium"
              >
                <span className="text-lg">✏️</span>
                <span>Editar</span>
              </button>

              <button
                onClick={() => updateApptStatus(actionMenu.appt.id, 'confirmed')}
                className="w-full text-left px-4 py-2 hover:bg-green-50 flex items-center gap-3 text-gray-700 font-medium"
              >
                <span className="text-lg">✓</span>
                <span>Confirmar</span>
              </button>

              <button
                onClick={() => updateApptStatus(actionMenu.appt.id, 'cancelled')}
                className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-3 text-gray-700 font-medium"
              >
                <span className="text-lg">📅</span>
                <span>Desmarcar</span>
              </button>

              <div className="border-t border-gray-200 my-1" />

              <button
                onClick={() => deleteAppt(actionMenu.appt.id)}
                className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-3 text-red-600 font-medium"
              >
                <span className="text-lg">🗑️</span>
                <span>Excluir</span>
              </button>
            </div>
          </>
        )}

        {/* Modal de Edição */}
        {editingAppt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">✏️ Editar Agendamento</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Tipo de Atendimento</label>
                  <select
                    value={editingAppt.procedure}
                    onChange={(e) => setEditingAppt({ ...editingAppt, procedure: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="Consulta">Consulta</option>
                    <option value="Limpeza">Limpeza</option>
                    <option value="Avaliação Cirurgia">Avaliação Cirurgia</option>
                    <option value="Avaliação Clínico">Avaliação Clínico</option>
                    <option value="Obturação">Obturação</option>
                    <option value="Canal">Canal</option>
                    <option value="Extração">Extração</option>
                    <option value="Prótese">Prótese</option>
                    <option value="Implante">Implante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Duração</label>
                  <select
                    value={editingAppt.duration_minutes}
                    onChange={(e) => setEditingAppt({ ...editingAppt, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h 30min</option>
                    <option value="120">2 horas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Observações</label>
                  <textarea
                    value={editingAppt.observations || ''}
                    onChange={(e) => setEditingAppt({ ...editingAppt, observations: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('appointments')
                        .update({
                          procedure: editingAppt.procedure,
                          duration_minutes: editingAppt.duration_minutes,
                          observations: editingAppt.observations
                        })
                        .eq('id', editingAppt.id)

                      if (error) throw error
                      await loadData()
                      setEditingAppt(null)
                    } catch (error: any) {
                      alert(`Erro: ${error?.message}`)
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                >
                  ✓ Salvar
                </button>
                <button
                  onClick={() => setEditingAppt(null)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 font-bold rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tooltip flutuante durante drag */}
        {draggedAppt && dragOver && (
          <div
            className="fixed pointer-events-none z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-xl border-2 border-blue-800"
            style={{
              left: mousePos.x + 15,
              top: mousePos.y + 15
            }}
          >
            <div className="text-xs opacity-90">Mover para:</div>
            <div className="font-bold text-sm">
              {format(dragOver.date, 'EEEE, dd/MM', { locale: ptBR })}
            </div>
            <div className="font-bold text-lg">{dragOver.time}</div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          💡 Clique em uma célula vazia para criar agendamento • Arraste um agendamento para movê-lo
        </div>
      </div>
    </div>
  )
}
