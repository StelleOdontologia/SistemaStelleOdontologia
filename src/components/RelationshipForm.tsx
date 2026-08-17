import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PatientRelationship, RelationshipType } from '@/lib/supabase'

interface RelationshipFormProps {
  patientId: string
  onSuccess: () => void
  onCancel: () => void
}

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'pai', label: 'Pai' },
  { value: 'mãe', label: 'Mãe' },
  { value: 'filho', label: 'Filho' },
  { value: 'filha', label: 'Filha' },
  { value: 'irmão', label: 'Irmão' },
  { value: 'irmã', label: 'Irmã' },
  { value: 'avó', label: 'Avó' },
  { value: 'avô', label: 'Avô' },
  { value: 'neto', label: 'Neto' },
  { value: 'neta', label: 'Neta' },
  { value: 'cônjuge', label: 'Cônjuge' },
  { value: 'cunhado', label: 'Cunhado' },
  { value: 'cunhada', label: 'Cunhada' },
  { value: 'tio', label: 'Tio' },
  { value: 'tia', label: 'Tia' },
  { value: 'primo', label: 'Primo' },
  { value: 'prima', label: 'Prima' },
  { value: 'amigo', label: 'Amigo' },
  { value: 'responsável_legal', label: 'Responsável Legal' },
  { value: 'outro', label: 'Outro' },
]

export function RelationshipForm({ patientId, onSuccess, onCancel }: RelationshipFormProps) {
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [formData, setFormData] = useState({
    patient_b_id: '',
    relationship_type: 'pai' as RelationshipType,
    is_responsible: false,
    bidirectional: true,
    notes: '',
  })

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, cpf')
        .or(`name.ilike.%${query}%,cpf.ilike.%${query}%`)
        .neq('id', patientId)
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.patient_b_id) {
      alert('Selecione um paciente')
      return
    }

    setLoading(true)

    try {
      // Criar relacionamento A -> B
      const { error: error1 } = await supabase
        .from('patient_relationships')
        .insert([{
          patient_a_id: patientId,
          patient_b_id: formData.patient_b_id,
          relationship_type: formData.relationship_type,
          is_responsible: formData.is_responsible,
          bidirectional: formData.bidirectional,
          notes: formData.notes || null,
        }])

      if (error1) throw error1

      // Se bidirecional, criar relacionamento B -> A com tipo inverso
      if (formData.bidirectional) {
        const inverseType = getInverseRelationship(formData.relationship_type)
        const { error: error2 } = await supabase
          .from('patient_relationships')
          .insert([{
            patient_a_id: formData.patient_b_id,
            patient_b_id: patientId,
            relationship_type: inverseType,
            is_responsible: false, // Não usa is_responsible no inverso
            bidirectional: true,
            notes: formData.notes || null,
          }])

        if (error2) throw error2
      }

      onSuccess()
    } catch (error) {
      console.error('Erro ao criar relacionamento:', error)
      alert('Erro ao criar relacionamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Relacionamento
        </label>
        <select
          value={formData.relationship_type}
          onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value as RelationshipType })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {RELATIONSHIP_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Buscar Paciente
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Nome ou CPF..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
              {searchResults.map(patient => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, patient_b_id: patient.id })
                    setSearchQuery(`${patient.name} (${patient.cpf})`)
                    setSearchResults([])
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0"
                >
                  <div className="font-medium">{patient.name}</div>
                  <div className="text-sm text-gray-600">{patient.cpf}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {formData.patient_b_id && (
          <div className="mt-2 text-sm text-green-600">✓ Paciente selecionado</div>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_responsible}
            onChange={(e) => setFormData({ ...formData, is_responsible: e.target.checked })}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">
            É responsável legal/financeiro
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.bidirectional}
            onChange={(e) => setFormData({ ...formData, bidirectional: e.target.checked })}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">
            Sincronizar relacionamento automaticamente
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações (opcional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Ex: Responsável durante o período escolar..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? '⏳ Salvando...' : '✅ Salvar Relacionamento'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 font-medium"
        >
          ❌ Cancelar
        </button>
      </div>
    </form>
  )
}

function getInverseRelationship(type: RelationshipType): RelationshipType {
  const inverseMap: Record<RelationshipType, RelationshipType> = {
    'pai': 'filho',
    'mãe': 'filha',
    'filho': 'pai',
    'filha': 'mãe',
    'irmão': 'irmão',
    'irmã': 'irmã',
    'avó': 'neto',
    'avô': 'neto',
    'neto': 'avô',
    'neta': 'avó',
    'cônjuge': 'cônjuge',
    'cunhado': 'cunhada',
    'cunhada': 'cunhado',
    'tio': 'primo',
    'tia': 'prima',
    'primo': 'tio',
    'prima': 'tia',
    'amigo': 'amigo',
    'responsável_legal': 'filho',
    'outro': 'outro',
  }
  return inverseMap[type] || type
}
