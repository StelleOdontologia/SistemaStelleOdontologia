import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { format, parseISO, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppointmentTimingButtons } from '@/components/AppointmentTimingButtons'

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  procedure: string
  status: string
  flow_status?: string
  confirmation_status?: string
  whatsapp_confirmed?: boolean
  observations?: string
  room_number?: number
  arrived_at?: string
  waiting_at?: string
  started_at?: string
  completed_at?: string
  patient_id: string
  patient?: {
    id: string
    name: string
    patient_code?: string
    nickname?: string
    phone?: string
    birth_date?: string
    gender?: string
  }
}

type ColumnType = 'scheduled' | 'waiting' | 'in_progress'

export default function ClinicFlow() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ColumnType | null>(null)
  const [startModal, setStartModal] = useState<Appointment | null>(null)
  const [startForm, setStartForm] = useState({
    dentist: 'Dra Késya',
    convenio: '',
    procedure: '',
    room: 'CONSULTÓRIO 1',
    redirectToAttendance: false
  })

  useEffect(() => {
    loadAppointments()
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const loadAppointments = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, name, patient_code, nickname, phone, birth_date, gender)
        `)
        .eq('appointment_date', today)
        .is('deleted_at', null)
        .order('appointment_time', { ascending: true })

      if (error) throw error
      setAppointments(data || [])
    } catch (error: any) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateFlowStatus = async (
    appointmentId: string,
    newFlowStatus: string,
    extraFields: any = {}
  ) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          flow_status: newFlowStatus,
          ...extraFields,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
      if (error) throw error
      await loadAppointments()
    } catch (error: any) {
      console.error('Erro ao atualizar:', error)
      alert(`Erro: ${error?.message || 'Desconhecido'}`)
    }
  }

  const handleCheckIn = (appt: Appointment) => {
    updateFlowStatus(appt.id, 'waiting', {
      waiting_at: new Date().toISOString(),
      arrived_at: new Date().toISOString()
    })
  }

  const handleStartAppointment = (appt: Appointment) => {
    setStartModal(appt)
    setStartForm({
      dentist: 'Dra Késya',
      convenio: '',
      procedure: appt.procedure || 'Consulta',
      room: `CONSULTÓRIO ${appt.room_number || 1}`,
      redirectToAttendance: false
    })
  }

  const handleConfirmStart = async () => {
    if (!startModal) return
    const apptId = startModal.id
    await updateFlowStatus(apptId, 'in_progress', {
      started_at: new Date().toISOString(),
      procedure: startForm.procedure
    })
    const redirect = startForm.redirectToAttendance
    setStartModal(null)
    if (redirect) {
      navigate(`/atendimento/${apptId}`)
    }
  }

  const handleFinish = (appt: Appointment) => {
    if (!confirm('Concluir atendimento?')) return
    updateFlowStatus(appt.id, 'completed', {
      completed_at: new Date().toISOString(),
      status: 'completed'
    })
  }

  // Drag-and-drop entre colunas
  const handleDragStart = (appt: Appointment) => {
    setDraggedAppt(appt)
  }

  const handleDragEnd = () => {
    setDraggedAppt(null)
    setDragOverColumn(null)
  }

  const handleColumnDragOver = (e: React.DragEvent, col: ColumnType) => {
    if (!draggedAppt) return
    e.preventDefault()
    setDragOverColumn(col)
  }

  const handleColumnDrop = (col: ColumnType) => {
    if (!draggedAppt) return
    const currentCol = getColumnOf(draggedAppt)
    if (currentCol === col) {
      setDragOverColumn(null)
      return
    }

    if (col === 'scheduled') {
      // Voltar para agendados (cancela check-in)
      updateFlowStatus(draggedAppt.id, 'pending', {
        waiting_at: null,
        arrived_at: null,
        started_at: null
      })
    } else if (col === 'waiting') {
      // Mover para sala de espera
      updateFlowStatus(draggedAppt.id, 'waiting', {
        waiting_at: new Date().toISOString(),
        arrived_at: draggedAppt.arrived_at || new Date().toISOString(),
        started_at: null
      })
    } else if (col === 'in_progress') {
      // Mover para atendimento
      handleStartAppointment(draggedAppt)
    }
    setDragOverColumn(null)
  }

  const getColumnOf = (appt: Appointment): ColumnType => {
    if (appt.flow_status === 'in_progress') return 'in_progress'
    if (appt.flow_status === 'waiting') return 'waiting'
    return 'scheduled'
  }

  // Tempo decorrido (ao vivo)
  const elapsedTime = (startedAt?: string): string => {
    if (!startedAt) return '00:00'
    const start = parseISO(startedAt)
    const diffMs = now.getTime() - start.getTime()
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
    const s = String(totalSeconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  // Tempo congelado
  const frozenTime = (startedAt?: string, endedAt?: string): string => {
    if (!startedAt) return '0min'
    const start = parseISO(startedAt)
    const end = endedAt ? parseISO(endedAt) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const totalMinutes = Math.max(0, Math.floor(diffMs / 60000))
    if (totalMinutes < 60) return `${totalMinutes}min`
    return `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60}min`
  }

  const formatBirthInfo = (birthDate?: string) => {
    if (!birthDate) return null
    try {
      const date = parseISO(birthDate)
      const age = differenceInYears(now, date)
      const birthStr = format(date, "dd/MMM", { locale: ptBR }).replace('.', '')
      return { age, birthStr }
    } catch {
      return null
    }
  }

  const formatTime = (time: string) => time.substring(0, 5)

  // Separar agendamentos por coluna
  const scheduledAppts = appointments.filter(a =>
    (!a.flow_status || a.flow_status === 'pending') &&
    a.status !== 'cancelled' &&
    a.status !== 'no_show'
  )
  const waitingAppts = appointments.filter(a => a.flow_status === 'waiting')
  const inProgressAppts = appointments.filter(a => a.flow_status === 'in_progress')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">⏳ Carregando fluxo...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>⏱️</span> Fluxo na Clínica
          </h1>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2">
              <span>📅</span> Encaixar Atendimento
            </button>
            <button className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-md flex items-center gap-2">
              <span>📷</span>
              <div className="text-left">
                <div>Registrar Chegada</div>
                <div className="text-xs font-normal opacity-90">Reconhecimento Facial ou QR Code</div>
              </div>
            </button>
          </div>
        </div>

        {/* KANBAN: 3 colunas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* COLUNA 1: AGUARDANDO PARA HOJE */}
          <ColumnContainer
            color="blue"
            title="Aguardando Para Hoje"
            icon="📅"
            count={scheduledAppts.length}
            isDragOver={dragOverColumn === 'scheduled' && draggedAppt !== null && getColumnOf(draggedAppt) !== 'scheduled'}
            onDragOver={(e) => handleColumnDragOver(e, 'scheduled')}
            onDrop={() => handleColumnDrop('scheduled')}
            onDragLeave={() => setDragOverColumn(null)}
          >
            {scheduledAppts.length === 0 ? (
              <EmptyState icon="📅" text="Nenhum agendamento neste filtro" />
            ) : (
              scheduledAppts.map(appt => (
                <ScheduledCard
                  key={appt.id}
                  appt={appt}
                  patient={appt.patient}
                  birthInfo={formatBirthInfo(appt.patient?.birth_date)}
                  isDragging={draggedAppt?.id === appt.id}
                  onDragStart={() => handleDragStart(appt)}
                  onDragEnd={handleDragEnd}
                  onCheckIn={() => handleCheckIn(appt)}
                  formatTime={formatTime}
                />
              ))
            )}
          </ColumnContainer>

          {/* COLUNA 2: EM ESPERA */}
          <ColumnContainer
            color="orange"
            title="Em Espera"
            icon="🪑"
            count={waitingAppts.length}
            isDragOver={dragOverColumn === 'waiting' && draggedAppt !== null && getColumnOf(draggedAppt) !== 'waiting'}
            onDragOver={(e) => handleColumnDragOver(e, 'waiting')}
            onDrop={() => handleColumnDrop('waiting')}
            onDragLeave={() => setDragOverColumn(null)}
          >
            {waitingAppts.length === 0 ? (
              <EmptyState icon="🪑" text="Nenhum Paciente em Espera" />
            ) : (
              waitingAppts.map(appt => (
                <WaitingCard
                  key={appt.id}
                  appt={appt}
                  patient={appt.patient}
                  birthInfo={formatBirthInfo(appt.patient?.birth_date)}
                  timer={elapsedTime(appt.waiting_at)}
                  isDragging={draggedAppt?.id === appt.id}
                  onDragStart={() => handleDragStart(appt)}
                  onDragEnd={handleDragEnd}
                  onStart={() => handleStartAppointment(appt)}
                  onCancel={() => updateFlowStatus(appt.id, 'pending', { waiting_at: null, arrived_at: null })}
                  formatTime={formatTime}
                />
              ))
            )}
          </ColumnContainer>

          {/* COLUNA 3: EM ATENDIMENTO */}
          <ColumnContainer
            color="green"
            title="Em Atendimento"
            icon="🩺"
            count={inProgressAppts.length}
            isDragOver={dragOverColumn === 'in_progress' && draggedAppt !== null && getColumnOf(draggedAppt) !== 'in_progress'}
            onDragOver={(e) => handleColumnDragOver(e, 'in_progress')}
            onDrop={() => handleColumnDrop('in_progress')}
            onDragLeave={() => setDragOverColumn(null)}
          >
            {inProgressAppts.length === 0 ? (
              <EmptyState icon="🩺" text="Nenhum atendimento em andamento" />
            ) : (
              inProgressAppts.map(appt => (
                <InProgressCard
                  key={appt.id}
                  appt={appt}
                  patient={appt.patient}
                  birthInfo={formatBirthInfo(appt.patient?.birth_date)}
                  timer={elapsedTime(appt.started_at)}
                  waitedTime={frozenTime(appt.waiting_at, appt.started_at)}
                  isDragging={draggedAppt?.id === appt.id}
                  onDragStart={() => handleDragStart(appt)}
                  onDragEnd={handleDragEnd}
                  onOpen={() => navigate(`/atendimento/${appt.id}`)}
                  onFinish={() => handleFinish(appt)}
                  formatTime={formatTime}
                />
              ))
            )}
          </ColumnContainer>

        </div>
      </div>

      {/* Modal: Iniciar Atendimento */}
      {startModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="bg-blue-600 text-white px-5 py-3 rounded-t-lg flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span>➡️</span> Registrar Início do Atendimento
              </h3>
              <button onClick={() => setStartModal(null)} className="text-white hover:bg-blue-700 rounded p-1">✕</button>
            </div>
            <div className="p-5">
              <h4 className="text-xl font-bold text-blue-700 mb-4">{startModal.patient?.name}</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Dentista</label>
                  <select
                    value={startForm.dentist}
                    onChange={(e) => setStartForm({ ...startForm, dentist: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                  >
                    <option>Dra Késya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Convênio</label>
                  <select
                    value={startForm.convenio}
                    onChange={(e) => setStartForm({ ...startForm, convenio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                  >
                    <option value="">Particular</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Atendimento</label>
                  <select
                    value={startForm.procedure}
                    onChange={(e) => setStartForm({ ...startForm, procedure: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                  >
                    <option value="Consulta">Consulta</option>
                    <option value="Limpeza">Limpeza</option>
                    <option value="Avaliação Cirurgia">Avaliação Cirurgia</option>
                    <option value="Avaliação Clínico">Avaliação Clínico</option>
                    <option value="Tratamento Clínico Continuação">Tratamento Clínico Continuação</option>
                    <option value="Obturação">Obturação</option>
                    <option value="Canal">Canal</option>
                    <option value="Extração">Extração</option>
                    <option value="Prótese">Prótese</option>
                    <option value="Implante">Implante</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Sala/Consultório</label>
                  <select
                    value={startForm.room}
                    onChange={(e) => setStartForm({ ...startForm, room: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                  >
                    <option>CONSULTÓRIO 1</option>
                    <option>CONSULTÓRIO 2</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={startForm.redirectToAttendance}
                    onChange={(e) => setStartForm({ ...startForm, redirectToAttendance: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5"></div>
                </label>
                <span className="text-sm text-gray-700">Abrir ficha do atendimento</span>
              </div>
            </div>
            <div className="border-t border-gray-200 px-5 py-3 flex justify-end gap-2">
              <button onClick={() => setStartModal(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-medium">
                ✕ Fechar
              </button>
              <button onClick={handleConfirmStart} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex items-center gap-1">
                ➡️ Iniciar Atendimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ========== COMPONENTES INTERNOS ==========

function ColumnContainer({ color, title, icon, count, isDragOver, children, onDragOver, onDrop, onDragLeave }: any) {
  const colorMap: { [key: string]: { border: string; bg: string; text: string; ring: string } } = {
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-400' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-400' },
    green: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-400' }
  }
  const c = colorMap[color]

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      className={`bg-white rounded-lg border-t-4 ${c.border} shadow-sm flex flex-col min-h-[500px] transition ${
        isDragOver ? `ring-4 ${c.ring} bg-opacity-50` : ''
      }`}
    >
      {/* Header da coluna */}
      <div className={`px-4 py-3 ${c.bg} border-b border-gray-200 flex items-center justify-between rounded-t-lg`}>
        <div className={`font-bold ${c.text} flex items-center gap-2`}>
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        <span className={`${c.text} bg-white bg-opacity-80 px-2.5 py-0.5 rounded-full text-sm font-bold`}>
          {count}
        </span>
      </div>

      {/* Lista */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

function EmptyState({ icon, text }: any) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-2 opacity-40">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  )
}

function ScheduledCard({ appt, patient, birthInfo, isDragging, onDragStart, onDragEnd, onCheckIn, formatTime }: any) {
  const isConfirmed = appt.status === 'confirmed' || appt.whatsapp_confirmed

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="font-bold text-blue-700 text-base">{formatTime(appt.appointment_time)}</div>
        <div className="text-xs text-gray-500">({appt.duration_minutes}min)</div>
        {isConfirmed && (
          <span className="ml-auto bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded">
            ✓ Confirmado
          </span>
        )}
      </div>
      <div className="font-bold text-gray-900 text-sm">{patient?.name}</div>
      {patient?.patient_code && (
        <div className="text-xs text-gray-500">Cód. {patient.patient_code}</div>
      )}
      {birthInfo && (
        <div className="text-xs text-gray-500">🎂 {birthInfo.age} anos</div>
      )}
      <div className="text-xs text-gray-600 mt-1">{appt.procedure}</div>
      <button
        onClick={onCheckIn}
        className="w-full mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1"
      >
        ➡️ Registrar Chegada
      </button>
    </div>
  )
}

function WaitingCard({ appt, patient, birthInfo, timer, isDragging, onDragStart, onDragEnd, onStart, onCancel, formatTime }: any) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-600">Agendado: {formatTime(appt.appointment_time)}</div>
        <div className="bg-orange-100 text-orange-700 font-mono text-sm font-bold px-2 py-0.5 rounded">
          ⏱️ {timer}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-lg">👤</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-sm truncate">{patient?.name}</div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            {patient?.patient_code && <span>Cód. {patient.patient_code}</span>}
            {birthInfo && <span>· {birthInfo.age} anos</span>}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-600 mb-2">{appt.procedure}</div>
      <div className="flex gap-1">
        <button
          onClick={onStart}
          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1"
        >
          ➡️ Atender
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 rounded text-xs"
          title="Cancelar chegada"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

function InProgressCard({ appt, patient, birthInfo, timer, waitedTime, isDragging, onDragStart, onDragEnd, onOpen, onFinish, formatTime }: any) {
  const [showTiming, setShowTiming] = useState(false)
  const [appointment, setAppointment] = useState(appt)

  const handleUpdateAppointment = (updated: any) => {
    setAppointment(updated)
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white border-2 border-green-300 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="text-xs text-green-700 font-bold mb-2">DRA KÉSYA</div>
      <div className="flex items-start gap-2 mb-2">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg flex-shrink-0">👤</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-sm">{patient?.name}</div>
          <div className="text-xs text-gray-500">
            {patient?.patient_code && `Cód. ${patient.patient_code}`}
            {birthInfo && ` · ${birthInfo.age} anos`}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-600 mb-2">{appt.procedure}</div>
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-green-100 text-green-700 font-mono text-sm font-bold px-2 py-0.5 rounded">
          ⏱️ {timer}
        </div>
        <div className="text-xs text-gray-500">🪑 {waitedTime} esperou</div>
      </div>
      <div className="text-xs text-gray-500 mb-2">📅 Agendado: {formatTime(appt.appointment_time)}</div>

      {/* Botões de Timing */}
      {showTiming && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <AppointmentTimingButtons
            appointment={appointment}
            onUpdate={handleUpdateAppointment}
          />
        </div>
      )}

      <div className="flex gap-1">
        <button
          onClick={() => setShowTiming(!showTiming)}
          className="flex-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1"
          title="Registrar tempos de entrada/início/término"
        >
          {showTiming ? '⏱️ Ocultar Tempos' : '⏱️ Registrar Tempos'}
        </button>
        <button
          onClick={onOpen}
          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1"
          title="Abrir ficha do atendimento"
        >
          📋 Ficha
        </button>
        <button
          onClick={onFinish}
          className="px-3 py-1.5 bg-white border-2 border-green-600 hover:bg-green-50 text-green-700 rounded text-xs font-bold"
          title="Concluir atendimento"
        >
          ✓
        </button>
      </div>
    </div>
  )
}
