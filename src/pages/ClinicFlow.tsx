import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parse, parseISO, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

type TabType = 'scheduled' | 'waiting' | 'in_progress'
type FilterType = 'all' | 'kesya' | 'cancelled' | 'pending'

export default function ClinicFlow() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('scheduled')
  const [filter, setFilter] = useState<FilterType>('all')
  const [now, setNow] = useState(new Date())
  const [expandedDetails, setExpandedDetails] = useState<{ [key: string]: { telefones?: boolean; info?: boolean } }>({})

  useEffect(() => {
    loadAppointments()
    // Atualiza cronômetros a cada segundo
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
    updateFlowStatus(appt.id, 'in_progress', {
      started_at: new Date().toISOString()
    })
  }

  const handleFinish = (appt: Appointment) => {
    if (!confirm('Finalizar atendimento?')) return
    updateFlowStatus(appt.id, 'completed', {
      completed_at: new Date().toISOString(),
      status: 'completed'
    })
  }

  const handleNoShow = (appt: Appointment) => {
    if (!confirm('Marcar como falta?')) return
    updateFlowStatus(appt.id, 'absent', {
      status: 'no_show'
    })
  }

  // Calcula tempo decorrido
  const elapsedTime = (startedAt?: string): string => {
    if (!startedAt) return '00:00:00'
    const start = parseISO(startedAt)
    const diffMs = now.getTime() - start.getTime()
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    const s = String(totalSeconds % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  // Idade e nascimento
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

  // AGENDADOS = não estão em fluxo + não cancelados/faltaram
  const scheduledAppts = appointments.filter(a =>
    (!a.flow_status || a.flow_status === 'pending') &&
    a.status !== 'cancelled' &&
    a.status !== 'no_show' &&
    a.flow_status !== 'absent'
  )

  const waitingAppts = appointments.filter(a => a.flow_status === 'waiting')
  const inProgressAppts = appointments.filter(a => a.flow_status === 'in_progress')
  const cancelledAppts = appointments.filter(a => a.status === 'cancelled' || a.flow_status === 'absent')

  // Aplica filtro lateral
  const applyFilter = (list: Appointment[]) => {
    if (filter === 'cancelled') {
      return cancelledAppts
    }
    if (filter === 'kesya') return list
    return list
  }

  const formatTime = (time: string) => time.substring(0, 5)

  const toggleExpanded = (id: string, field: 'telefones' | 'info') => {
    setExpandedDetails(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: !prev[id]?.[field] }
    }))
  }

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

        {/* Abas */}
        <div className="bg-white rounded-t-lg border-b-2 border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-6 py-3 font-semibold text-sm transition ${
                activeTab === 'scheduled'
                  ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Agendados Para Hoje
              {scheduledAppts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                  {scheduledAppts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('waiting')}
              className={`px-6 py-3 font-semibold text-sm transition ${
                activeTab === 'waiting'
                  ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Na Sala de Espera
              {waitingAppts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-white rounded-full text-xs font-bold">
                  {waitingAppts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-6 py-3 font-semibold text-sm transition ${
                activeTab === 'in_progress'
                  ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Nos Consultórios
              {inProgressAppts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-purple-500 text-white rounded-full text-xs font-bold">
                  {inProgressAppts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conteúdo: Sidebar + Lista */}
        <div className="bg-white rounded-b-lg shadow-sm flex flex-col md:flex-row">

          {/* Sidebar filtros - SÓ na aba Agendados */}
          {activeTab === 'scheduled' && (
            <div className="md:w-56 border-b md:border-b-0 md:border-r border-gray-200 p-2">
              <button
                onClick={() => setFilter('all')}
                className={`w-full text-left px-4 py-3 text-sm rounded transition ${
                  filter === 'all'
                    ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('kesya')}
                className={`w-full text-left px-4 py-3 text-sm rounded transition ${
                  filter === 'kesya'
                    ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Dra Késya
                <span className="ml-2 text-gray-500">({scheduledAppts.length})</span>
              </button>
              <button
                onClick={() => setFilter('cancelled')}
                className={`w-full text-left px-4 py-3 text-sm rounded transition flex items-center justify-between ${
                  filter === 'cancelled'
                    ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Desmarcados</span>
                {cancelledAppts.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white rounded text-xs font-bold">{cancelledAppts.length}</span>
                )}
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`w-full text-left px-4 py-3 text-sm rounded transition flex items-center justify-between ${
                  filter === 'pending'
                    ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Pendências</span>
                <span className="px-2 py-0.5 bg-red-500 text-white rounded text-xs font-bold">0</span>
              </button>
            </div>
          )}

          {/* Conteúdo principal */}
          <div className="flex-1 p-4 md:p-6">

            {/* ===== ABA 1: AGENDADOS PARA HOJE ===== */}
            {activeTab === 'scheduled' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Agendados Para Hoje</h2>

                {applyFilter(scheduledAppts).length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <div className="text-5xl mb-3">📋</div>
                    <p>Nenhum agendamento para hoje</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applyFilter(scheduledAppts).map(appt => {
                      const isConfirmed = appt.status === 'confirmed' || appt.whatsapp_confirmed
                      const isCancelled = appt.status === 'cancelled'
                      const patient = appt.patient
                      const birthInfo = formatBirthInfo(patient?.birth_date)
                      const exp = expandedDetails[appt.id] || {}

                      return (
                        <div
                          key={appt.id}
                          className="flex border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition"
                        >
                          {/* Tag lateral CONFIRMADO/DESMARCADO */}
                          {(isConfirmed || isCancelled) && (
                            <div
                              className={`flex items-center justify-center px-3 ${
                                isConfirmed ? 'bg-green-600' : 'bg-red-600'
                              } text-white font-bold text-xs`}
                              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            >
                              {isConfirmed ? 'CONFIRMADO' : 'DESMARCADO'}
                            </div>
                          )}

                          {/* Conteúdo */}
                          <div className="flex-1 flex flex-col sm:flex-row p-4 gap-4">
                            {/* Horário */}
                            <div className="sm:w-20">
                              <div className="font-bold text-2xl text-blue-700">
                                {formatTime(appt.appointment_time)}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <span>⏱️</span>
                                <span>{String(Math.floor(appt.duration_minutes / 60)).padStart(2, '0')}:{String(appt.duration_minutes % 60).padStart(2, '0')}</span>
                              </div>
                            </div>

                            {/* Info paciente */}
                            <div className="flex-1">
                              <div className="flex items-start gap-2 flex-wrap">
                                <span className="font-bold text-blue-700 text-lg">{patient?.name}</span>
                                {patient?.patient_code && (
                                  <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                                    {patient.patient_code}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-700 mt-1">
                                <span className="font-semibold">CONSULTÓRIO {appt.room_number || 1}</span>
                                {' '}
                                <span className="text-blue-600">Dra Késya, </span>
                                <span className="text-blue-600">{appt.procedure}</span>
                              </div>
                              {appt.observations && (
                                <div className="text-sm text-gray-500 italic mt-1">
                                  {appt.observations}
                                </div>
                              )}

                              {/* Expansíveis */}
                              <div className="mt-2 space-y-1">
                                <button
                                  onClick={() => toggleExpanded(appt.id, 'telefones')}
                                  className="text-sm text-gray-700 hover:text-blue-600 flex items-center gap-1"
                                >
                                  <span>{exp.telefones ? '▼' : '▶'}</span> Telefones
                                </button>
                                {exp.telefones && (
                                  <div className="ml-4 text-sm text-gray-600">
                                    📞 {patient?.phone || '—'}
                                  </div>
                                )}
                                <button
                                  onClick={() => toggleExpanded(appt.id, 'info')}
                                  className="text-sm text-gray-700 hover:text-blue-600 flex items-center gap-1"
                                >
                                  <span>{exp.info ? '▼' : '▶'}</span> Informações Adicionais
                                </button>
                                {exp.info && (
                                  <div className="ml-4 text-sm text-gray-600 space-y-1">
                                    {birthInfo && <div>🎂 {birthInfo.birthStr} ({birthInfo.age} anos)</div>}
                                    {patient?.gender && <div>⚧ {patient.gender === 'M' ? 'Masculino' : 'Feminino'}</div>}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Ações */}
                            <div className="flex sm:flex-col gap-2 items-center sm:items-end">
                              {!isCancelled && (
                                <button
                                  onClick={() => handleCheckIn(appt)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center gap-1 shadow"
                                >
                                  ➡️ Chegada
                                </button>
                              )}
                              <button
                                onClick={() => handleNoShow(appt)}
                                className="text-xs text-red-600 hover:underline"
                                title="Marcar como falta"
                              >
                                Faltou
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Rodapé com resumo */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-700 space-y-1">
                        {Object.entries(
                          applyFilter(scheduledAppts).reduce<{ [proc: string]: number }>((acc, a) => {
                            acc[a.procedure] = (acc[a.procedure] || 0) + 1
                            return acc
                          }, {})
                        ).map(([proc, count]) => (
                          <div key={proc} className="border-l-4 border-gray-300 pl-2">
                            {count} {proc}
                          </div>
                        ))}
                        <div className="border-l-4 border-blue-500 pl-2 font-bold text-gray-900 pt-1">
                          {applyFilter(scheduledAppts).length} Paciente{applyFilter(scheduledAppts).length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== ABA 2: NA SALA DE ESPERA ===== */}
            {activeTab === 'waiting' && (
              <div>
                <h2 className="text-xl font-bold text-blue-700 mb-2">Na Sala de Espera</h2>

                {waitingAppts.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <div className="text-5xl mb-3">🪑</div>
                    <p>Nenhum paciente na sala de espera</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold text-blue-700 mb-2">Dra Késya</h3>
                    <button className="text-sm text-gray-600 mb-3 hover:text-gray-900">
                      ▶ Dados do Dentista
                    </button>

                    <div className="space-y-4">
                      {waitingAppts.map(appt => {
                        const patient = appt.patient
                        const birthInfo = formatBirthInfo(patient?.birth_date)
                        const timer = elapsedTime(appt.waiting_at)
                        const exp = expandedDetails[appt.id] || {}

                        return (
                          <div key={appt.id} className="border border-gray-300 rounded-lg overflow-hidden">
                            {/* Header com procedimento e consultório */}
                            <div className="bg-gray-100 px-4 py-2 text-sm text-gray-700">
                              <span className="font-medium">{appt.procedure}</span>
                              <span className="mx-2">→</span>
                              <span className="font-bold">CONSULTÓRIO {appt.room_number || 1}</span>
                            </div>

                            {/* Conteúdo */}
                            <div className="p-4 flex flex-col sm:flex-row gap-4 items-start">
                              {/* Avatar + cronômetro */}
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl">
                                  👤
                                </div>
                                <div className="bg-red-700 text-white font-mono text-xl font-bold px-3 py-1 rounded shadow-inner">
                                  {timer}
                                </div>
                                <div className="text-xs text-gray-600 flex items-center gap-1">
                                  📅 Agendado para {formatTime(appt.appointment_time)}
                                </div>
                              </div>

                              {/* Dados */}
                              <div className="flex-1">
                                <div className="font-bold text-blue-700 text-lg">{patient?.name}</div>
                                <div className="text-sm text-gray-700 flex items-center gap-2 flex-wrap mt-1">
                                  {patient?.nickname && <span>{patient.gender === 'F' ? 'Sra.' : 'Sr.'} {patient.nickname}</span>}
                                  {patient?.patient_code && (
                                    <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">{patient.patient_code}</span>
                                  )}
                                  {birthInfo && (
                                    <>
                                      <span className="text-gray-500">{birthInfo.age} anos</span>
                                      <span className="text-gray-500">🎂 ({birthInfo.birthStr})</span>
                                    </>
                                  )}
                                </div>

                                <div className="mt-2 space-y-1">
                                  <button
                                    onClick={() => toggleExpanded(appt.id, 'info')}
                                    className="text-sm text-gray-700 hover:text-blue-600 flex items-center gap-1"
                                  >
                                    <span>{exp.info ? '▼' : '▶'}</span> Dados Adicionais
                                  </button>
                                  {exp.info && (
                                    <div className="ml-4 text-sm text-gray-600">
                                      📞 {patient?.phone || '—'}
                                    </div>
                                  )}
                                </div>

                                {appt.observations && (
                                  <div className="text-sm text-blue-600 italic mt-2">
                                    {appt.observations}
                                  </div>
                                )}
                              </div>

                              {/* Ações */}
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  onClick={() => handleStartAppointment(appt)}
                                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm flex items-center gap-1 shadow"
                                >
                                  ➡️ Atender
                                </button>
                                <div className="flex gap-1 mt-1">
                                  <button className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100" title="Perfil">
                                    👤
                                  </button>
                                  <button className="w-8 h-8 rounded-full border border-blue-300 text-blue-600 hover:bg-blue-50" title="Comentário">
                                    💬
                                  </button>
                                  <button
                                    onClick={() => updateFlowStatus(appt.id, 'pending', { waiting_at: null, arrived_at: null })}
                                    className="w-8 h-8 rounded-full border border-red-300 text-red-600 hover:bg-red-50"
                                    title="Cancelar check-in"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== ABA 3: NOS CONSULTÓRIOS ===== */}
            {activeTab === 'in_progress' && (
              <div>
                <h2 className="text-xl font-bold text-purple-700 mb-4">Nos Consultórios</h2>

                {inProgressAppts.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <div className="text-5xl mb-3">🦷</div>
                    <p>Nenhum atendimento em andamento</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inProgressAppts.map(appt => {
                      const patient = appt.patient
                      const timer = elapsedTime(appt.started_at)

                      return (
                        <div key={appt.id} className="border-2 border-purple-300 rounded-lg overflow-hidden bg-purple-50">
                          <div className="bg-purple-600 text-white px-4 py-2 text-sm font-bold flex items-center gap-2">
                            <span>🦷</span>
                            <span>CONSULTÓRIO {appt.room_number || 1} - Em Atendimento</span>
                          </div>

                          <div className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                            <div className="w-16 h-16 rounded-full bg-purple-200 flex items-center justify-center text-2xl">
                              👤
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-purple-900 text-lg">{patient?.name}</div>
                              <div className="text-sm text-gray-700">{appt.procedure}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Iniciado às {appt.started_at ? format(parseISO(appt.started_at), 'HH:mm') : '—'}
                              </div>
                            </div>
                            <div className="bg-purple-700 text-white font-mono text-xl font-bold px-4 py-2 rounded shadow-inner">
                              {timer}
                            </div>
                            <button
                              onClick={() => handleFinish(appt)}
                              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow"
                            >
                              ✅ Finalizar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
