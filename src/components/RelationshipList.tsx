import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PatientRelationship } from '@/lib/supabase'

interface RelationshipListProps {
  patientId: string
  onDeleteSuccess?: () => void
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  'pai': 'Pai',
  'mãe': 'Mãe',
  'filho': 'Filho',
  'filha': 'Filha',
  'irmão': 'Irmão',
  'irmã': 'Irmã',
  'avó': 'Avó',
  'avô': 'Avô',
  'neto': 'Neto',
  'neta': 'Neta',
  'cônjuge': 'Cônjuge',
  'cunhado': 'Cunhado',
  'cunhada': 'Cunhada',
  'tio': 'Tio',
  'tia': 'Tia',
  'primo': 'Primo',
  'prima': 'Prima',
  'amigo': 'Amigo',
  'responsável_legal': 'Responsável Legal',
  'outro': 'Outro',
}

interface RelationshipWithPatient extends PatientRelationship {
  related_patient?: {
    id: string
    name: string
    cpf?: string
  }
}

export function RelationshipList({ patientId, onDeleteSuccess }: RelationshipListProps) {
  const [relationships, setRelationships] = useState<RelationshipWithPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadRelationships()
  }, [patientId])

  const loadRelationships = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('patient_relationships')
        .select(`
          id,
          patient_a_id,
          patient_b_id,
          relationship_type,
          is_responsible,
          bidirectional,
          notes,
          created_at,
          updated_at
        `)
        .eq('patient_a_id', patientId)

      if (error) throw error

      // Buscar dados dos pacientes relacionados
      const relationshipsWithPatients: RelationshipWithPatient[] = []

      for (const rel of data || []) {
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select('id, name, cpf')
          .eq('id', rel.patient_b_id)
          .single()

        if (!patientError && patient) {
          relationshipsWithPatients.push({
            ...rel,
            related_patient: patient,
          })
        }
      }

      setRelationships(relationshipsWithPatients)
    } catch (error) {
      console.error('Erro ao carregar relacionamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (relationshipId: string) => {
    if (!confirm('Tem certeza que deseja remover este relacionamento?')) {
      return
    }

    setDeleting(relationshipId)

    try {
      // Encontrar o relacionamento para obter os IDs
      const rel = relationships.find(r => r.id === relationshipId)
      if (!rel) return

      // Deletar relacionamento A -> B
      const { error: error1 } = await supabase
        .from('patient_relationships')
        .delete()
        .eq('id', relationshipId)

      if (error1) throw error1

      // Se bidirecional, deletar também B -> A
      if (rel.bidirectional) {
        const { error: error2 } = await supabase
          .from('patient_relationships')
          .delete()
          .eq('patient_a_id', rel.patient_b_id)
          .eq('patient_b_id', rel.patient_a_id)

        if (error2) throw error2
      }

      setRelationships(relationships.filter(r => r.id !== relationshipId))
      onDeleteSuccess?.()
    } catch (error) {
      console.error('Erro ao deletar relacionamento:', error)
      alert('Erro ao remover relacionamento')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-600">⏳ Carregando relacionamentos...</div>
  }

  if (relationships.length === 0) {
    return <div className="text-center py-8 text-gray-600">Nenhum relacionamento registrado</div>
  }

  // Separar por responsáveis e outros
  const responsible = relationships.filter(r => r.is_responsible)
  const others = relationships.filter(r => !r.is_responsible)

  return (
    <div className="space-y-6">
      {responsible.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>⭐</span> Responsáveis
          </h3>
          <div className="space-y-3">
            {responsible.map(rel => (
              <div
                key={rel.id}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {rel.related_patient?.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-xs font-medium">
                        {RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type}
                      </span>
                    </div>
                    {rel.related_patient?.cpf && (
                      <div className="text-sm text-gray-600 mt-1">
                        CPF: {rel.related_patient.cpf}
                      </div>
                    )}
                    {rel.notes && (
                      <div className="text-sm text-gray-600 mt-2">
                        📝 {rel.notes}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(rel.id)}
                    disabled={deleting === rel.id}
                    className="px-3 py-1 text-red-600 hover:bg-red-100 rounded text-sm font-medium disabled:opacity-50"
                  >
                    {deleting === rel.id ? '⏳' : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Outros Relacionamentos
          </h3>
          <div className="space-y-3">
            {others.map(rel => (
              <div
                key={rel.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {rel.related_patient?.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="bg-gray-200 text-gray-900 px-2 py-1 rounded text-xs font-medium">
                        {RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type}
                      </span>
                    </div>
                    {rel.related_patient?.cpf && (
                      <div className="text-sm text-gray-600 mt-1">
                        CPF: {rel.related_patient.cpf}
                      </div>
                    )}
                    {rel.notes && (
                      <div className="text-sm text-gray-600 mt-2">
                        📝 {rel.notes}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(rel.id)}
                    disabled={deleting === rel.id}
                    className="px-3 py-1 text-red-600 hover:bg-red-100 rounded text-sm font-medium disabled:opacity-50"
                  >
                    {deleting === rel.id ? '⏳' : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
