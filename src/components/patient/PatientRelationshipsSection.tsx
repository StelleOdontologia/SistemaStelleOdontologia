import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { parseISO, differenceInYears, differenceInMonths, differenceInDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Patient {
  id: string
  name: string
  patient_code?: string
  nickname?: string
  birth_date?: string
  gender?: string
  cpf?: string
  phone?: string
  photo_url?: string
}

interface Relationship {
  id: string
  related_patient_id: string
  relationship_type: string
  related_patient?: Patient
}

interface Props {
  patient: Patient
}

const RELATIONSHIP_TYPES = [
  'Amigo(a)', 'Avô', 'Avó', 'Cônjuge', 'Cunhado(a)',
  'Enteado(a)', 'Filho', 'Filha', 'Irmão', 'Irmã',
  'Mãe', 'Madrasta', 'Namorado(a)', 'Neto', 'Neta',
  'Noivo(a)', 'Padrasto', 'Pai', 'Primo(a)', 'Responsável',
  'Sobrinho', 'Sobrinha', 'Sogro', 'Sogra', 'Tio', 'Tia', 'Outro'
]

export function PatientRelationshipsSection({ patient }: Props) {
  const navigate = useNavigate()
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [searchModal, setSearchModal] = useState(false)
  const [searchFilter, setSearchFilter] = useState<'name' | 'cpf' | 'phone'>('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [selectedNewPatient, setSelectedNewPatient] = useState<Patient | null>(null)
  const [relationshipType, setRelationshipType] = useState('Filho')
  const [now] = useState(new Date())

  useEffect(() => {
    loadRelationships()
  }, [patient.id])

  useEffect(() => {
    if (searchModal && searchQuery.trim().length >= 2) {
      doSearch()
    } else {
      setSearchResults([])
    }
  }, [searchQuery, searchFilter, searchModal])

  const loadRelationships = async () => {
    setLoading(true)
    try {
      // Busca os relacionamentos
      const { data: relsData, error: relsError } = await supabase
        .from('patient_relationships')
        .select('id, relationship_type, related_patient_id')
        .eq('patient_id', patient.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (relsError) throw relsError
      if (!relsData || relsData.length === 0) {
        setRelationships([])
        return
      }

      // Busca os dados dos pacientes relacionados
      const ids = relsData.map(r => r.related_patient_id)
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, patient_code, nickname, birth_date, gender, cpf, phone, photo_url')
        .in('id', ids)
        .is('deleted_at', null)

      if (patientsError) throw patientsError

      // Junta os dados
      const merged = relsData.map(r => ({
        ...r,
        related_patient: patientsData?.find(p => p.id === r.related_patient_id)
      }))

      setRelationships(merged as any)
    } catch (err: any) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  const doSearch = async () => {
    try {
      let query = supabase
        .from('patients')
        .select('id, name, patient_code, nickname, birth_date, gender, cpf, phone')
        .is('deleted_at', null)
        .neq('id', patient.id)
        .limit(10)

      if (searchFilter === 'name') {
        query = query.ilike('name', `%${searchQuery}%`)
      } else if (searchFilter === 'cpf') {
        query = query.ilike('cpf', `%${searchQuery}%`)
      } else if (searchFilter === 'phone') {
        query = query.ilike('phone', `%${searchQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setSearchResults(data || [])
    } catch (err: any) {
      console.error('Erro busca:', err)
    }
  }

  const handleAddRelationship = async () => {
    if (!selectedNewPatient) return
    try {
      const { error } = await supabase
        .from('patient_relationships')
        .insert([{
          patient_id: patient.id,
          related_patient_id: selectedNewPatient.id,
          relationship_type: relationshipType
        }])

      if (error) throw error

      // Cria também o inverso (Mirella tem João como filho → João tem Mirella como mãe)
      // Para simplificar, criamos apenas a relação direta. O inverso o usuário pode cadastrar manualmente.

      setSelectedNewPatient(null)
      setSearchModal(false)
      setSearchQuery('')
      loadRelationships()
    } catch (err: any) {
      console.error('Erro:', err)
      alert(`Erro: ${err?.message || 'Desconhecido'}`)
    }
  }

  const handleRemove = async (relId: string) => {
    if (!confirm('Remover este relacionamento?')) return
    try {
      const { error } = await supabase
        .from('patient_relationships')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', relId)
      if (error) throw error
      loadRelationships()
    } catch (err: any) {
      alert(`Erro: ${err?.message}`)
    }
  }

  const formatBirth = (birthDate?: string) => {
    if (!birthDate) return null
    try {
      const date = parseISO(birthDate)
      const years = differenceInYears(now, date)
      const lastBirthday = new Date(now.getFullYear(), date.getMonth(), date.getDate())
      const reference = now < lastBirthday
        ? new Date(now.getFullYear() - 1, date.getMonth(), date.getDate())
        : lastBirthday
      const months = differenceInMonths(now, reference)
      const monthsRef = new Date(reference.getFullYear(), reference.getMonth() + months, reference.getDate())
      const days = differenceInDays(now, monthsRef)
      const birthStr = format(date, "dd/MMM", { locale: ptBR }).replace('.', '')
      return `${birthStr} (${years} anos ${months} meses ${days} dias)`
    } catch {
      return null
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getAvatarColor = (name?: string) => {
    if (!name) return 'bg-gray-400'
    const colors = ['bg-orange-500', 'bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Relacionamentos</h3>
        <button
          onClick={() => { setSearchModal(true); setSearchQuery(''); setSelectedNewPatient(null) }}
          className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded text-sm font-bold flex items-center gap-1"
        >
          <span>➕</span> Cadastrar
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">⏳ Carregando...</div>
      ) : relationships.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3 opacity-40">👨‍👩‍👧‍👦</div>
          <p>Nenhum relacionamento cadastrado</p>
          <p className="text-sm mt-2">Clique em "+ Cadastrar" para adicionar parentes ou conhecidos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {relationships.map(rel => {
            const rp = rel.related_patient
            if (!rp) return null
            const birthInfo = formatBirth(rp.birth_date)
            return (
              <div
                key={rel.id}
                className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition cursor-pointer"
                onClick={() => navigate(`/pacientes/${rp.id}`)}
              >
                {/* Avatar */}
                {rp.photo_url ? (
                  <img src={rp.photo_url} alt={rp.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className={`w-14 h-14 rounded-full ${getAvatarColor(rp.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {getInitials(rp.name)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-blue-700 text-base">{rp.name}</h4>
                    <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded uppercase">
                      {rel.relationship_type}
                    </span>
                  </div>
                  {birthInfo && (
                    <div className="text-sm text-gray-600 mt-1">🎂 {birthInfo}</div>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(rel.id) }}
                  className="px-2 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm"
                  title="Remover relacionamento"
                >
                  🗑️
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL 1: Pesquisar Cadastro */}
      {searchModal && !selectedNewPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gray-100 px-4 py-3 rounded-t-lg flex items-center justify-between border-b border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span>👤</span> Pesquisar Cadastro
              </h3>
              <button onClick={() => setSearchModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="p-4">
              <div className="bg-gray-100 border border-gray-300 rounded p-3 mb-4 flex items-start gap-2 text-sm text-gray-700">
                <span>💬</span>
                <span>Para evitar duplicidades, primeiro pesquise se o paciente já está cadastrado.</span>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
                <div className="text-xs font-bold text-gray-600 uppercase mb-2 text-center">🔍 Escolha um filtro</div>
                <div className="flex gap-1 bg-white border border-gray-300 rounded-full p-0.5">
                  {(['name', 'cpf', 'phone'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setSearchFilter(f)}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-full transition ${
                        searchFilter === f
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {f === 'name' ? 'Nome' : f === 'cpf' ? 'CPF' : 'Telefone'}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Digite ${searchFilter === 'name' ? 'o nome' : searchFilter === 'cpf' ? 'o CPF' : 'o telefone'}...`}
                  className="w-full mt-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  autoFocus
                />

                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedNewPatient(p)}
                        className="w-full text-left flex items-center gap-2 p-2 bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition"
                      >
                        <div className={`w-9 h-9 rounded-full ${getAvatarColor(p.name)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                          {getInitials(p.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {p.patient_code && <span className="text-xs text-gray-500">{p.patient_code}</span>}
                            <span className="font-bold text-sm text-gray-900">{p.nickname || p.name.split(' ')[0]}</span>
                          </div>
                          <div className="text-xs text-gray-700 truncate font-medium">
                            {p.name}
                            {p.birth_date && ` · ${format(parseISO(p.birth_date), 'dd/MM/yyyy')}`}
                            {p.cpf && ` · ${p.cpf}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                  <p className="text-sm text-gray-500 mt-3 text-center italic">Nenhum paciente encontrado</p>
                )}
              </div>

              <button
                onClick={() => {
                  alert('Para cadastrar paciente novo, vá em "Cadastrar Paciente" na lista de pacientes primeiro.')
                  setSearchModal(false)
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm flex items-center justify-center gap-2"
              >
                <span>👤+</span>
                Já tenho certeza que o paciente não está cadastrado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Cadastrar Relacionamento */}
      {searchModal && selectedNewPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gray-100 px-4 py-3 rounded-t-lg flex items-center justify-between border-b border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span>👤</span> Cadastrar Relacionamento
              </h3>
              <button onClick={() => { setSelectedNewPatient(null); setSearchModal(false) }} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="p-4">
              {/* Paciente selecionado */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                {selectedNewPatient.photo_url ? (
                  <img src={selectedNewPatient.photo_url} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className={`w-16 h-16 rounded-full ${getAvatarColor(selectedNewPatient.name)} flex items-center justify-center text-white font-bold`}>
                    {getInitials(selectedNewPatient.name)}
                  </div>
                )}
                <div className="flex-1">
                  {selectedNewPatient.nickname && (
                    <div className="text-sm text-gray-600">{selectedNewPatient.nickname}</div>
                  )}
                  <h4 className="font-bold text-blue-700">{selectedNewPatient.name}</h4>
                  {selectedNewPatient.birth_date && (
                    <div className="text-xs text-gray-600">🎂 {formatBirth(selectedNewPatient.birth_date)}</div>
                  )}
                </div>
              </div>

              {/* Tipo */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">
                  Grau de Relacionamento
                </label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                >
                  {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setSelectedNewPatient(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium"
                >
                  Voltar
                </button>
                <button
                  onClick={handleAddRelationship}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex items-center gap-2"
                >
                  <span>📥</span> Cadastrar Relacionamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
