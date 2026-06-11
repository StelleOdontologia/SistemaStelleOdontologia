import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ClinicalRecord {
  id: string
  appointment_id: string
  patient_id: string
  procedure: string
  clinical_notes: string
  record_date: string
  created_at: string
}

interface ClinicalRecordWithAppt extends ClinicalRecord {
  appointment?: {
    id: string
    appointment_time: string
    duration_minutes: number
    status: string
  }
}

interface Props {
  patientId: string
}

export function PatientClinicalTab({ patientId }: Props) {
  const navigate = useNavigate()
  const [records, setRecords] = useState<ClinicalRecordWithAppt[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    loadRecords()
  }, [patientId])

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('clinical_records')
        .select(`
          *,
          appointment:appointments(id, appointment_time, duration_minutes, status)
        `)
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecords(data || [])
    } catch (err) {
      console.error('Erro ao carregar registros clínicos:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <span>⏳ Carregando registros clínicos...</span>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3 opacity-40">🦷</div>
        <p className="font-medium text-gray-500">Nenhum registro clínico encontrado</p>
        <p className="text-sm mt-1">Os registros aparecem aqui após um atendimento</p>
      </div>
    )
  }

  // Agrupa por ano/mês
  const grouped: Record<string, ClinicalRecordWithAppt[]> = {}
  for (const rec of records) {
    const key = format(parseISO(rec.record_date), 'MMMM yyyy', { locale: ptBR })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(rec)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Histórico Clínico</h3>
        <span className="text-sm text-gray-500">{records.length} registro{records.length !== 1 ? 's' : ''}</span>
      </div>

      {Object.entries(grouped).map(([month, recs]) => (
        <div key={month}>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>{month}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="space-y-3">
            {recs.map(rec => {
              const isExpanded = expanded === rec.id
              const date = parseISO(rec.record_date)
              const time = rec.appointment?.appointment_time?.substring(0, 5)

              return (
                <div
                  key={rec.id}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition"
                >
                  {/* Header do registro */}
                  <button
                    className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 transition"
                    onClick={() => setExpanded(isExpanded ? null : rec.id)}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0 mt-0.5">
                      {format(date, 'dd')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">
                          {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                        {time && (
                          <span className="text-xs text-gray-500">às {time}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                          🦷 {rec.procedure}
                        </span>
                        {rec.appointment?.duration_minutes && (
                          <span className="text-xs text-gray-500">
                            {rec.appointment.duration_minutes} min
                          </span>
                        )}
                      </div>
                      {!isExpanded && rec.clinical_notes && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                          {rec.clinical_notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/atendimento/${rec.appointment_id}`)
                        }}
                        className="text-xs text-blue-600 hover:underline px-2 py-1 rounded hover:bg-blue-50"
                        title="Abrir atendimento"
                      >
                        ↗ Abrir
                      </button>
                      <span className="text-gray-400 text-sm">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {/* Conteúdo expandido */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                      <div className="pt-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Anotações Clínicas
                        </p>
                        {rec.clinical_notes ? (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-white border border-gray-200 rounded-lg p-3">
                            {rec.clinical_notes}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Sem anotações neste atendimento</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
