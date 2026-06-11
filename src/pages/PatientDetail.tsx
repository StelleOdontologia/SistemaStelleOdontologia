import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { format, parseISO, differenceInYears, differenceInMonths, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PatientCadastralTab } from '@/components/patient/PatientCadastralTab'
import { PatientClinicalTab } from '@/components/patient/PatientClinicalTab'
import { PatientPhotoUpload } from '@/components/patient/PatientPhotoUpload'

interface Patient {
  id: string
  name: string
  patient_code?: string
  nickname?: string
  cpf?: string
  rg?: string
  rg_emissor?: string
  gender?: string
  marital_status?: string
  profession?: string
  birth_date?: string
  email?: string
  phone?: string
  landline?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  zip_code?: string
  naturalidade?: string
  nacionalidade?: string
  observations?: string
  photo_url?: string
}

interface LastAppointment {
  date: string
  dentist: string
  appointment_id: string
}

type MainTab = 'cadastral' | 'clinical' | 'crm' | 'history' | 'financial'

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [lastAppt, setLastAppt] = useState<LastAppointment | null>(null)
  const [activeTab, setActiveTab] = useState<MainTab>('cadastral')
  const [loading, setLoading] = useState(true)
  const [now] = useState(new Date())

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    try {
      const { data: patientData, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      setPatient(patientData)

      // Carrega último atendimento
      const { data: apptData } = await supabase
        .from('appointments')
        .select('id, appointment_date')
        .eq('patient_id', id)
        .is('deleted_at', null)
        .order('appointment_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (apptData) {
        setLastAppt({
          date: apptData.appointment_date,
          dentist: 'Dra Késya',
          appointment_id: apptData.id
        })
      }
    } catch (err: any) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatAgeFull = (birthDate?: string): string | null => {
    if (!birthDate) return null
    try {
      const date = parseISO(birthDate)
      const years = differenceInYears(now, date)
      const lastBirthday = new Date(now.getFullYear(), date.getMonth(), date.getDate())
      const referenceDate = now < lastBirthday
        ? new Date(now.getFullYear() - 1, date.getMonth(), date.getDate())
        : lastBirthday
      const months = differenceInMonths(now, referenceDate)
      const monthsRef = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + months, referenceDate.getDate())
      const days = differenceInDays(now, monthsRef)
      return `${years} anos ${months} meses ${days} dias`
    } catch {
      return null
    }
  }

  const getInitials = (name?: string): string => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getAvatarColor = (name?: string): string => {
    if (!name) return 'bg-gray-400'
    const colors = ['bg-orange-500', 'bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500']
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">⏳ Carregando prontuário...</div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Paciente não encontrado</div>
      </div>
    )
  }

  const ageFull = formatAgeFull(patient.birth_date)
  const birthShort = patient.birth_date
    ? format(parseISO(patient.birth_date), "dd/MMM", { locale: ptBR }).replace('.', '')
    : null

  const mainTabs: { id: MainTab; label: string; icon: string; available: boolean }[] = [
    { id: 'cadastral', label: 'Dados Cadastrais', icon: '👤', available: true },
    { id: 'clinical', label: 'Dados Clínicos', icon: '🦷', available: true },
    { id: 'crm', label: 'CRM', icon: '📊', available: false },
    { id: 'history', label: 'Histórico', icon: '📋', available: false },
    { id: 'financial', label: 'Financeiro', icon: '💰', available: false }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">

        {/* Voltar */}
        <button
          onClick={() => navigate('/pacientes')}
          className="mb-3 text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Voltar à lista
        </button>

        {/* Título */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Prontuário</h1>

        {/* Header com dados do paciente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Foto com upload */}
            <div className="flex-shrink-0">
              <PatientPhotoUpload
                patientId={patient.id}
                patientName={patient.name}
                currentPhotoUrl={patient.photo_url}
                onUpdate={loadData}
                size="lg"
              />
            </div>

            {/* Dados */}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-2xl sm:text-3xl text-gray-800 leading-tight">{patient.name}</h2>
              <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-2 items-center">
                {patient.patient_code && (
                  <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                    {patient.patient_code}
                  </span>
                )}
                {patient.nickname && (
                  <span className="font-medium">
                    {patient.gender === 'F' ? 'Sra.' : 'Sr.'} {patient.nickname}
                  </span>
                )}
              </div>
              {birthShort && (
                <div className="text-sm text-gray-700 mt-1 flex items-center gap-2">
                  <span>🎂</span>
                  <span>{birthShort}</span>
                  {ageFull && <span className="text-gray-500">({ageFull})</span>}
                </div>
              )}
              <div className="mt-2">
                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  👤 DRA KÉSYA
                </span>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2 flex-wrap">
              <ActionButton icon="🔗" title="Copiar link" />
              <ActionButton icon="🖨️" title="Imprimir" />
              <ActionButton icon="⏱️" title="Histórico" />
              <ActionButton icon="📅" title="Agendamentos" onClick={() => navigate('/agendamentos')} />
              <ActionButton icon="💬" title="WhatsApp" color="green" />
            </div>
          </div>
        </div>

        {/* Último Atendimento */}
        {lastAppt && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500 uppercase font-medium">Último<br/>Atendimento</div>
              <div className="font-bold text-gray-900">
                {format(parseISO(lastAppt.date), "dd/MMM/yy", { locale: ptBR }).replace('.', '')} · {lastAppt.dentist}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/atendimento/${lastAppt.appointment_id}`)}
                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-sm font-medium flex items-center gap-1"
              >
                <span>↗</span> Acessar
              </button>
              <button className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-sm font-medium flex items-center gap-1">
                <span>+</span> Novo
              </button>
            </div>
          </div>
        )}

        {/* Tabs principais */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 flex overflow-x-auto">
            {mainTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => tab.available && setActiveTab(tab.id)}
                disabled={!tab.available}
                className={`px-3 sm:px-5 py-3 text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                    : tab.available
                    ? 'text-gray-700 hover:text-gray-900'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {!tab.available && <span className="text-xs">(em breve)</span>}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            {activeTab === 'cadastral' && (
              <PatientCadastralTab patient={patient} onUpdate={loadData} />
            )}
            {activeTab === 'clinical' && (
              <PatientClinicalTab patientId={patient.id} />
            )}
            {activeTab !== 'cadastral' && activeTab !== 'clinical' && (
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

function ActionButton({ icon, title, color = 'blue', onClick }: { icon: string; title: string; color?: 'blue' | 'green'; onClick?: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-10 h-10 rounded-full ${
        color === 'green' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
      } text-white flex items-center justify-center text-lg shadow-sm transition`}
    >
      {icon}
    </button>
  )
}
