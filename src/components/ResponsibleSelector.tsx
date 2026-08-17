import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ResponsibleSelectorProps {
  patientId: string
  value?: string | null
  onChange: (responsibleId: string | null) => void
  disabled?: boolean
}

interface Responsible {
  id: string
  name: string
  cpf?: string
  relationship_type?: string
}

export function ResponsibleSelector({ patientId, value, onChange, disabled }: ResponsibleSelectorProps) {
  const [responsibles, setResponsibles] = useState<Responsible[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadResponsibles()
  }, [patientId])

  const loadResponsibles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('patient_relationships')
        .select(`
          patient_b_id,
          relationship_type,
          patients:patient_b_id (id, name, cpf)
        `)
        .eq('patient_a_id', patientId)
        .eq('is_responsible', true)

      if (error) throw error

      const responsibleList = (data || []).map(rel => ({
        id: rel.patient_b_id,
        name: rel.patients?.name || 'Sem nome',
        cpf: rel.patients?.cpf,
        relationship_type: rel.relationship_type,
      }))

      setResponsibles(responsibleList)
    } catch (error) {
      console.error('Erro ao carregar responsáveis:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Responsável Legal
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled || loading}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      >
        <option value="">
          {loading ? '⏳ Carregando...' : 'Nenhum responsável designado'}
        </option>
        {responsibles.map(resp => (
          <option key={resp.id} value={resp.id}>
            {resp.name} ({resp.relationship_type})
          </option>
        ))}
      </select>
      {value && responsibles.length === 0 && (
        <p className="text-sm text-red-600 mt-1">
          ⚠️ Responsável não encontrado. Configure os relacionamentos primeiro.
        </p>
      )}
    </div>
  )
}
