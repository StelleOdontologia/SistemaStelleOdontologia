import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'

interface ProcedureRow {
  id: string
  status: string
  contract_id: string
  budget_item: {
    procedure_name: string
    tooth_number: string | null
    total: number
  }
  contract: {
    number: string
    start_date: string
    professional: string | null
  }
  events: ProcedureEvent[]
}

interface ProcedureEvent {
  id: string
  event_date: string
  status: string
  professional: string
  description: string | null
  observations: string | null
  voided_at: string | null
  created_at: string
}

interface Props {
  patientId: string
  patientName: string
}

const STATUS_BADGE: Record<string, { label: string; bar: string; text: string }> = {
  em_aberto: { label: 'EM ABERTO', bar: 'bg-gray-300', text: 'text-gray-700' },
  em_andamento: { label: 'EM ANDAMENTO', bar: 'bg-orange-500', text: 'text-orange-700' },
  concluido: { label: 'CONCLUÍDO', bar: 'bg-blue-400', text: 'text-blue-700' },
  cancelado: { label: 'CANCELADO', bar: 'bg-red-600', text: 'text-red-700' },
  manutencao: { label: 'MANUTENÇÃO', bar: 'bg-purple-500', text: 'text-purple-700' }
}

const MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

export function ProceduresTab({ patientId }: Props) {
  const [procedures, setProcedures] = useState<ProcedureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [eventModal, setEventModal] = useState<ProcedureRow | null>(null)

  useEffect(() => { load() }, [patientId])

  const load = async () => {
    setLoading(true)
    const { data: procs } = await supabase
      .from('procedures')
      .select(`
        id, status, contract_id,
        budget_item:budget_items(procedure_name, tooth_number, total),
        contract:contracts(number, start_date, professional)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true })

    if (procs && procs.length > 0) {
      const ids = procs.map((p: any) => p.id)
      const { data: events } = await supabase
        .from('procedure_events')
        .select('*')
        .in('procedure_id', ids)
        .order('event_date', { ascending: false })

      const eventsByProc: Record<string, ProcedureEvent[]> = {}
      ;(events || []).forEach((e: any) => {
        (eventsByProc[e.procedure_id] ||= []).push(e)
      })

      setProcedures(procs.map((p: any) => ({ ...p, events: eventsByProc[p.id] || [] })))
    } else {
      setProcedures([])
    }
    setLoading(false)
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const summary = procedures.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const filtered = statusFilter ? procedures.filter(p => p.status === statusFilter) : procedures

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Procedimentos</h3>

      {!loading && procedures.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(['em_aberto', 'em_andamento', 'concluido', 'manutencao', 'cancelado'] as const).map(status => {
            const count = summary[status] || 0
            if (count === 0) return null
            const st = STATUS_BADGE[status]
            const active = statusFilter === status
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(active ? null : status)}
                className={`border rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm transition ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <span className={`${st.bar} text-white font-bold text-xs px-2 py-0.5 rounded`}>{count}</span>
                <span className="text-gray-700">{st.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">⏳ Carregando...</div>
      ) : procedures.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="text-5xl mb-3 opacity-40">🦷</div>
          <p className="font-medium text-gray-500">Nenhum procedimento gerado</p>
          <p className="text-sm mt-1">Procedimentos são criados automaticamente quando um orçamento com itens é aprovado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const st = STATUS_BADGE[p.status] || STATUS_BADGE.em_aberto
            const isOpen = expanded.has(p.id)
            const date = parseISO(p.contract.start_date)
            const activeEvents = p.events.filter(e => !e.voided_at)

            return (
              <div key={p.id} className="flex items-stretch border border-gray-200 rounded-xl overflow-hidden">
                <div className={`${st.bar} text-white font-bold text-xs flex items-center justify-center px-2 py-3`}
                     style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.05em', minWidth: '32px' }}>
                  {st.label}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <button onClick={() => toggleExpand(p.id)} className="font-bold text-blue-700 hover:underline text-left">
                        {p.budget_item.procedure_name}
                      </button>
                      {p.budget_item.tooth_number && (
                        <div className="text-xs text-gray-600">Dente {p.budget_item.tooth_number}</div>
                      )}
                      <div className="mt-1">
                        <span className="inline-block bg-gray-700 text-white text-xs font-bold px-2 py-0.5 rounded">
                          Contrato {p.contract.number}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {format(date, 'dd')} {MONTH_ABBR[date.getMonth()]} {format(date, 'yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">R$</div>
                        <div className="font-bold text-gray-900">
                          {Number(p.budget_item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      {p.status !== 'concluido' && p.status !== 'cancelado' && (
                        <button
                          onClick={() => setEventModal(p)}
                          className="px-3 py-1.5 border border-blue-300 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-50 whitespace-nowrap"
                        >
                          + Novo Evento
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-3 border-t border-gray-100 pt-2">
                      <div className="text-xs font-bold text-gray-700 mb-1">Eventos</div>
                      {activeEvents.length === 0 ? (
                        <div className="text-xs text-gray-400 italic">Nenhum evento registrado ainda</div>
                      ) : (
                        <div className="space-y-2">
                          {activeEvents.map(e => (
                            <div key={e.id} className="bg-gray-50 rounded-lg p-2 text-xs flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-gray-800">
                                  {format(parseISO(e.event_date), 'dd/MM/yyyy')}
                                </span>{' '}
                                <span className={STATUS_BADGE[e.status]?.text || ''}>
                                  {STATUS_BADGE[e.status]?.label}
                                </span>
                                {e.description && <div className="text-gray-600 mt-0.5">{e.description}</div>}
                                <div className="text-gray-400 mt-0.5">{e.professional}</div>
                              </div>
                              <button
                                onClick={() => voidEvent(e.id, load)}
                                className="text-red-500 hover:underline whitespace-nowrap"
                              >
                                Anular
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {eventModal && (
        <EventModal
          procedure={eventModal}
          onClose={() => setEventModal(null)}
          onSaved={() => { setEventModal(null); load() }}
        />
      )}
    </div>
  )
}

async function voidEvent(eventId: string, reload: () => void) {
  if (!confirm('Anular este evento?')) return
  await supabase.from('procedure_events').update({ voided_at: new Date().toISOString() }).eq('id', eventId)
  reload()
}

function EventModal({ procedure, onClose, onSaved }: { procedure: ProcedureRow; onClose: () => void; onSaved: () => void }) {
  const [professional, setProfessional] = useState(procedure.contract.professional || 'Dra Késya')
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [status, setStatus] = useState<'em_andamento' | 'concluido'>('em_andamento')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('procedure_events').insert({
      procedure_id: procedure.id,
      event_date: eventDate,
      status,
      professional,
      description: description || null
    })
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="font-bold text-gray-900">Registrar Evento — {procedure.budget_item.procedure_name}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Dentista</label>
            <input
              value={professional}
              onChange={e => setProfessional(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Data do Evento</label>
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Situação Atual</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStatus('em_andamento')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border ${status === 'em_andamento' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-600'}`}
              >
                Em Andamento
              </button>
              <button
                onClick={() => setStatus('concluido')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border ${status === 'concluido' ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 text-gray-600'}`}
              >
                Concluído
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Descrição (opcional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Ex: Limpeza + moldagem para coroa"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 text-sm font-medium">Fechar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
