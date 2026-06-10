import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PatientForm } from '@/components/PatientForm'
import type { Patient } from '@/lib/supabase'
import { format, parseISO, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type TabType = 'search' | 'birthdays'
type SearchMode = 'simple' | 'advanced' | string  // string = letter A-Z

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('search')
  const [searchMode, setSearchMode] = useState<SearchMode>('simple')
  const [searchQuery, setSearchQuery] = useState('')
  const [now] = useState(new Date())

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) throw error
      setPatients(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar pacientes:', error)
      setError(error?.message || 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePatient = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este paciente?\n\nIsso também excluirá todos os agendamentos dele.')) return

    try {
      const { error } = await supabase.rpc('soft_delete_patient', { p_patient_id: id })
      if (error) throw error
      loadPatients()
    } catch (error: any) {
      console.error('Erro ao excluir:', error)
      alert(`Erro ao excluir: ${error?.message || ''}`)
    }
  }

  // Filtra pacientes
  const filterPatients = (): any[] => {
    let result = patients

    if (searchMode === 'simple' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.cpf?.includes(q) ||
        p.phone?.includes(q) ||
        p.patient_code?.includes(q) ||
        p.nickname?.toLowerCase().includes(q)
      )
    } else if (typeof searchMode === 'string' && searchMode.length === 1) {
      // Filtro por letra A-Z
      result = result.filter(p =>
        p.name?.toUpperCase().startsWith(searchMode)
      )
    }

    return result
  }

  // Aniversariantes do mês
  const getBirthdayPatients = (): any[] => {
    const currentMonth = now.getMonth() + 1
    return patients.filter(p => {
      if (!p.birth_date) return false
      try {
        const date = parseISO(p.birth_date)
        return date.getMonth() + 1 === currentMonth
      } catch {
        return false
      }
    }).sort((a, b) => {
      const dateA = parseISO(a.birth_date)
      const dateB = parseISO(b.birth_date)
      return dateA.getDate() - dateB.getDate()
    })
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

  // Cor do avatar baseada no nome
  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-orange-500', 'bg-red-500', 'bg-green-500', 'bg-blue-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Form mode
  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => { setShowForm(false); setEditingPatient(null) }}
            className="mb-4 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            ← Voltar
          </button>
          <h1 className="text-3xl font-bold mb-6 text-gray-900">
            {editingPatient ? '✏️ Editar Paciente' : '➕ Novo Paciente'}
          </h1>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <PatientForm
              patient={editingPatient || undefined}
              onSuccess={() => { setShowForm(false); setEditingPatient(null); loadPatients() }}
              onCancel={() => { setShowForm(false); setEditingPatient(null) }}
            />
          </div>
        </div>
      </div>
    )
  }

  const filteredPatients = activeTab === 'birthdays' ? getBirthdayPatients() : filterPatients()
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  const getTitleForCurrentView = (): string => {
    if (activeTab === 'birthdays') {
      return `Aniversariantes de ${format(now, 'MMMM', { locale: ptBR })}`
    }
    if (typeof searchMode === 'string' && searchMode.length === 1) {
      return `Pacientes com letra ${searchMode}`
    }
    if (searchQuery.trim()) {
      return `Pacientes encontrados: "${searchQuery}"`
    }
    return 'Todos os Pacientes'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>👥</span> Prontuários
            <span className="text-base font-normal text-gray-500">
              ({patients.length} {patients.length === 1 ? 'paciente' : 'pacientes'})
            </span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setEditingPatient(null); setShowForm(true) }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow"
            >
              <span>➕</span> Cadastrar Paciente
            </button>
            <button
              onClick={loadPatients}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg text-sm"
              title="Recarregar"
            >
              ↻
            </button>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-300 rounded text-red-700 text-sm">
            ❌ Erro ao carregar: {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-t-lg border-b-2 border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-3 font-semibold text-sm transition ${
                activeTab === 'search'
                  ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pesquisar
            </button>
            <button
              onClick={() => setActiveTab('birthdays')}
              className={`px-6 py-3 font-semibold text-sm transition ${
                activeTab === 'birthdays'
                  ? 'text-blue-600 border-b-4 border-blue-600 -mb-0.5'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎂 Aniversariantes
              {getBirthdayPatients().length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full text-xs font-bold">
                  {getBirthdayPatients().length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="bg-white rounded-b-lg shadow-sm flex flex-col md:flex-row">

          {/* Sidebar de busca (só na aba Pesquisar) */}
          {activeTab === 'search' && (
            <div className="md:w-56 border-b md:border-b-0 md:border-r border-gray-200 p-2 md:max-h-[calc(100vh-220px)] md:overflow-y-auto">
              <button
                onClick={() => { setSearchMode('simple'); setSearchQuery('') }}
                className={`w-full text-left px-4 py-2 text-sm rounded mb-1 ${
                  searchMode === 'simple'
                    ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Pesquisa Simples
              </button>
              <button
                disabled
                className="w-full text-left px-4 py-2 text-sm rounded mb-1 text-gray-400 cursor-not-allowed"
                title="Em breve"
              >
                Pesquisa Avançada (em breve)
              </button>

              <div className="mt-3 grid grid-cols-2 gap-1">
                {letters.map(letter => {
                  const count = patients.filter(p => p.name?.toUpperCase().startsWith(letter)).length
                  return (
                    <button
                      key={letter}
                      onClick={() => { setSearchMode(letter); setSearchQuery('') }}
                      className={`px-2 py-1.5 text-sm rounded flex items-center justify-between ${
                        searchMode === letter
                          ? 'bg-blue-50 text-blue-700 font-bold border border-blue-300'
                          : count > 0
                          ? 'text-gray-700 hover:bg-gray-50'
                          : 'text-gray-400'
                      }`}
                      disabled={count === 0}
                    >
                      <span>{letter}</span>
                      {count > 0 && <span className="text-xs text-gray-500">{count}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Lista */}
          <div className="flex-1 p-4 md:p-6">

            {/* Barra de busca (só pesquisa simples) */}
            {activeTab === 'search' && searchMode === 'simple' && (
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Buscar por nome, CPF, telefone, código ou apelido..."
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                />
              </div>
            )}

            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              {getTitleForCurrentView()}
              <span className="text-base font-normal bg-gray-200 px-2 py-0.5 rounded-full text-gray-700">
                {filteredPatients.length}
              </span>
            </h2>

            {loading ? (
              <div className="text-center py-12 text-gray-500">⏳ Carregando...</div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3 opacity-40">👥</div>
                <p className="text-gray-500">
                  {activeTab === 'birthdays'
                    ? 'Nenhum aniversariante este mês'
                    : 'Nenhum paciente encontrado'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPatients.map((patient: any) => {
                  const birthInfo = formatBirthInfo(patient.birth_date)
                  const avatarColor = getAvatarColor(patient.name || '?')
                  const initials = getInitials(patient.name || '?')

                  return (
                    <div
                      key={patient.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition cursor-pointer bg-white"
                      onClick={() => { setEditingPatient(patient); setShowForm(true) }}
                    >
                      <div className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-blue-700 text-base">{patient.name}</h3>
                          {patient.patient_code && (
                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                              {patient.patient_code}
                            </span>
                          )}
                          {patient.nickname && (
                            <span className="text-sm text-gray-600">{patient.nickname}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-3 flex-wrap">
                          {birthInfo && (
                            <span>🎂 {birthInfo.birthStr} ({birthInfo.age} anos)</span>
                          )}
                          {patient.phone && <span>📱 {patient.phone}</span>}
                          {patient.cpf && !patient.cpf.match(/^\d{11}$/) && (
                            <span>📋 {patient.cpf}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingPatient(patient)
                            setShowForm(true)
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-sm font-medium"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePatient(patient.id) }}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded text-sm font-medium"
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
