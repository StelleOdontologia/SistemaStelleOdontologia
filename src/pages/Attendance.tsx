import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { format, parseISO, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AppointmentData {
  id: string
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  procedure: string
  status: string
  flow_status?: string
  waiting_at?: string
  started_at?: string
  observations?: string
  patient_id: string
  patient?: {
    id: string
    name: string
    patient_code?: string
    nickname?: string
    phone?: string
    birth_date?: string
    gender?: string
    photo_url?: string
  }
}

interface ClinicalRecord {
  id: string
  appointment_id: string
  patient_id: string
  procedure: string
  clinical_notes: string
  record_date: string
  created_at: string
}

type TabType = 'clinical' | 'treatment' | 'planning' | 'budget' | 'contract' | 'guides'

export default function Attendance() {
  const { id: appointmentId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = (location.state as any)?.returnTo as string | undefined
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [history, setHistory] = useState<ClinicalRecord[]>([])
  const [currentRecord, setCurrentRecord] = useState<ClinicalRecord | null>(null)
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('clinical')
  const [now, setNow] = useState(new Date())
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [confirmingFinish, setConfirmingFinish] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)

  useEffect(() => {
    if (appointmentId) loadData()
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [appointmentId])

  const loadData = async () => {
    try {
      // Carrega o agendamento
      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, name, patient_code, nickname, phone, birth_date, gender, photo_url)
        `)
        .eq('id', appointmentId)
        .single()

      if (apptError) throw apptError
      setAppointment(apptData)

      // Carrega registro existente desta consulta
      const { data: recordData, error: recordError } = await supabase
        .from('clinical_records')
        .select('*')
        .eq('appointment_id', appointmentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recordData) {
        setCurrentRecord(recordData)
        setClinicalNotes(recordData.clinical_notes || '')
      } else if (recordError) {
        console.error('Erro ao carregar clinical_record:', recordError)
      }

      // Carrega histórico de outros atendimentos do paciente
      if (apptData?.patient_id) {
        const { data: historyData } = await supabase
          .from('clinical_records')
          .select('*')
          .eq('patient_id', apptData.patient_id)
          .neq('appointment_id', appointmentId)
          .is('deleted_at', null)
          .order('record_date', { ascending: false })
          .limit(20)
        setHistory(historyData || [])
      }
    } catch (error: any) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!appointment) return

    setFinishError(null)
    setSaving(true)
    try {
      // Salva o registro clínico
      const recordPayload: any = {
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        procedure: appointment.procedure,
        clinical_notes: clinicalNotes,
        record_date: appointment.appointment_date
      }

      if (currentRecord) {
        const { error } = await supabase
          .from('clinical_records')
          .update(recordPayload)
          .eq('id', currentRecord.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('clinical_records')
          .insert([recordPayload])
        if (error) throw error
      }

      // Marca agendamento como completed
      const { data: updatedRows, error: apptError } = await supabase
        .from('appointments')
        .update({
          flow_status: 'completed',
          status: 'completed'
        })
        .eq('id', appointment.id)
        .select()

      if (apptError) throw apptError
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Nenhuma linha atualizada — possível bloqueio de RLS ou ID inválido. Verifique permissões no Supabase.')
      }
      // Confirma que o status realmente mudou no banco
      const updated = updatedRows[0]
      if (updated.status !== 'completed' || updated.flow_status !== 'completed') {
        throw new Error(`Banco rejeitou os valores: status=${updated.status}, flow_status=${updated.flow_status}`)
      }

      navigate(returnTo || '/fluxo')
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      setFinishError(error?.message || error?.details || JSON.stringify(error) || 'Erro desconhecido')
      setConfirmingFinish(false)
    } finally {
      setSaving(false)
    }
  }

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

  const frozenMinutes = (startedAt?: string, endedAt?: string): number => {
    if (!startedAt) return 0
    const start = parseISO(startedAt)
    const end = endedAt ? parseISO(endedAt) : new Date()
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000))
  }

  const formatBirthFull = (birthDate?: string) => {
    if (!birthDate) return null
    try {
      const date = parseISO(birthDate)
      const age = differenceInYears(now, date)
      const birthStr = format(date, "dd/MMM", { locale: ptBR }).replace('.', '')
      const ageMonths = Math.floor((now.getTime() - date.getTime()) / (30 * 24 * 60 * 60 * 1000)) % 12
      return { age, birthStr, ageMonths }
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">⏳ Carregando atendimento...</div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Atendimento não encontrado</div>
      </div>
    )
  }

  const patient = appointment.patient
  const birthInfo = formatBirthFull(patient?.birth_date)
  const isCompleted = appointment.status === 'completed' || appointment.flow_status === 'completed'
  const completedAt = (appointment as any).completed_at as string | undefined
  const frozenTimer = (startedAt?: string, endedAt?: string): string => {
    if (!startedAt) return '00:00:00'
    const start = parseISO(startedAt)
    const end = endedAt ? parseISO(endedAt) : new Date()
    const totalSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000))
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    const s = String(totalSeconds % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
  }
  const consultTimer = isCompleted
    ? frozenTimer(appointment.started_at, completedAt)
    : elapsedTime(appointment.started_at)
  const waitedMinutes = frozenMinutes(appointment.waiting_at, appointment.started_at)

  const tabs: { id: TabType; label: string; available: boolean }[] = [
    { id: 'clinical', label: 'Desenvolvimento Clínico', available: true },
    { id: 'treatment', label: 'Tratamento', available: false },
    { id: 'planning', label: 'Planejamentos', available: false },
    { id: 'budget', label: 'Orçamentos', available: false },
    { id: 'contract', label: 'Contratos', available: false },
    { id: 'guides', label: 'Guias', available: false }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Voltar */}
        <button
          onClick={() => navigate(returnTo || '/fluxo')}
          className="mb-3 text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          ← {returnTo ? 'Voltar ao Prontuário' : 'Voltar ao Fluxo'}
        </button>

        {/* Header com dados do paciente */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg flex items-center gap-2">
            <span>🕐</span>
            <span className="font-bold">Atendimento</span>
          </div>

          <div className="p-5 flex flex-col md:flex-row gap-5">
            {/* Foto + nome + dados */}
            <div className="flex gap-4 flex-1">
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-4xl flex-shrink-0 overflow-hidden">
                {patient?.photo_url ? (
                  <img src={patient.photo_url} alt={patient.name} className="w-full h-full object-cover" />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-blue-700 text-xl">{patient?.name}</h2>
                <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-2">
                  {patient?.patient_code && (
                    <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">Cód. {patient.patient_code}</span>
                  )}
                  {patient?.nickname && (
                    <span>{patient.gender === 'F' ? 'Sra.' : 'Sr.'} {patient.nickname}</span>
                  )}
                </div>
                {birthInfo && (
                  <div className="text-sm text-gray-700 mt-1 flex items-center gap-2">
                    <span>🎂</span>
                    <span>{birthInfo.birthStr}</span>
                    <span className="text-gray-500">({birthInfo.age} anos)</span>
                  </div>
                )}
                <div className="mt-2">
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                    DRA KÉSYA
                  </span>
                </div>
              </div>
            </div>

            {/* Cronômetro + ações */}
            <div className="flex flex-col items-center gap-2 sm:w-64">
              <div className={`border rounded-lg p-3 w-full text-center ${isCompleted ? 'bg-green-50 border-green-300' : 'bg-gray-100 border-gray-300'}`}>
                {isCompleted && (
                  <div className="text-sm font-bold text-green-800 mb-1">
                    📅 {format(parseISO(appointment.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                )}
                <div className={`text-3xl font-mono font-bold ${isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                  {consultTimer}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {isCompleted ? '✅ Atendimento concluído' : waitedMinutes > 0 ? `${waitedMinutes} min na Sala de Espera` : 'Sem espera'}
                </div>
              </div>

              {isCompleted ? (
                <div className="w-full px-4 py-3 bg-green-100 border border-green-400 text-green-800 rounded-lg font-bold text-sm text-center">
                  ✅ Consulta Finalizada
                </div>
              ) : !confirmingFinish ? (
                <button
                  onClick={() => setConfirmingFinish(true)}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md"
                >
                  <span>⚙️</span>
                  Concluir Atendimento
                </button>
              ) : (
                <div className="w-full space-y-2">
                  <p className="text-sm text-gray-700 text-center font-medium">Confirmar conclusão?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFinish}
                      disabled={saving}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-sm"
                    >
                      {saving ? 'Salvando...' : '✓ Sim, concluir'}
                    </button>
                    <button
                      onClick={() => setConfirmingFinish(false)}
                      disabled={saving}
                      className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-bold text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-600 w-full bg-gray-50 border border-gray-200 rounded p-2">
                <div><strong>Procedimento:</strong> {appointment.procedure}</div>
                <div><strong>Dentista:</strong> Dra Késya</div>
                <div><strong>Agendado:</strong> {appointment.appointment_time.substring(0, 5)}</div>
              </div>

              {finishError && (
                <div className="w-full bg-red-50 border border-red-400 rounded-lg p-3 text-xs text-red-800 break-all">
                  <strong>❌ Erro:</strong> {finishError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Restrições Clínicas (placeholder) */}
        {patient?.birth_date && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 p-4">
            <h3 className="font-bold text-red-600 mb-2 flex items-center gap-2">
              <span>⚠️</span> Restrições Clínicas
            </h3>
            <p className="text-sm text-gray-500 italic">
              Nenhuma restrição clínica cadastrada para este paciente
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => tab.available && setActiveTab(tab.id)}
                disabled={!tab.available}
                className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                    : tab.available
                    ? 'text-gray-700 hover:text-gray-900'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                {tab.label}
                {!tab.available && <span className="ml-2 text-xs">(em breve)</span>}
              </button>
            ))}
          </div>

          {/* Conteúdo das abas */}
          <div className="p-5">
            {activeTab === 'clinical' && (
              <div>
                {/* Dados do Clinical Record se existir */}
                {currentRecord && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                    <h4 className="font-bold text-blue-900 mb-2">📋 Dados Clínicos do Atendimento</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <div><strong>Procedimento:</strong> {currentRecord.procedure}</div>
                      <div><strong>Data do Registro:</strong> {format(parseISO(currentRecord.record_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
                      {currentRecord.clinical_notes && (
                        <div className="mt-2 p-2 bg-white rounded border border-blue-100">
                          <strong className="text-xs text-gray-600">Anotações:</strong>
                          <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{currentRecord.clinical_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <h3 className="font-bold text-xl text-gray-900 mb-3">Desenvolvimento Clínico</h3>
                <textarea
                  value={clinicalNotes}
                  onChange={(e) => !isCompleted && setClinicalNotes(e.target.value)}
                  readOnly={isCompleted}
                  placeholder="Descreva aqui um resumo sobre este atendimento..."
                  rows={12}
                  className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 resize-y ${
                    isCompleted
                      ? 'bg-gray-50 border-gray-200 cursor-default'
                      : 'border-gray-300 focus:outline-none focus:border-blue-500'
                  }`}
                />
                {!isCompleted && (
                  <div className="text-xs text-gray-500 mt-1 italic">
                    💡 O texto será salvo definitivamente ao clicar em "Concluir Atendimento"
                  </div>
                )}

                {/* Histórico do paciente */}
                {history.length > 0 && (
                  <div className="mt-8">
                    <div className="border-t border-gray-200 pt-5">
                      <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                        <span>📋</span> Histórico de Atendimentos
                      </h3>
                      <div className="space-y-2">
                        {history.map(rec => {
                          const recDate = parseISO(rec.record_date)
                          const isExpanded = expandedRecord === rec.id
                          return (
                            <div key={rec.id} className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => setExpandedRecord(isExpanded ? null : rec.id)}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                              >
                                <div className="bg-gray-100 border border-gray-300 rounded p-1 text-center w-12 flex-shrink-0">
                                  <div className="text-xs font-bold text-gray-700">
                                    {format(recDate, 'dd', { locale: ptBR })}
                                  </div>
                                  <div className="text-xs text-gray-500 uppercase">
                                    {format(recDate, 'MMM', { locale: ptBR }).replace('.', '')}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {format(recDate, 'yyyy', { locale: ptBR })}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-blue-700">{rec.procedure}</div>
                                  <div className="text-xs text-gray-500">por Dra Késya</div>
                                  {!isExpanded && rec.clinical_notes && (
                                    <div className="text-sm text-gray-600 truncate mt-1">
                                      {rec.clinical_notes}
                                    </div>
                                  )}
                                </div>
                                <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                              </button>
                              {isExpanded && (
                                <div className="px-3 pb-3 border-t border-gray-200 bg-gray-50">
                                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans mt-2">
                                    {rec.clinical_notes || '(sem anotações)'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab !== 'clinical' && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-5xl mb-3 opacity-40">🚧</div>
                <p>Funcionalidade em breve</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
