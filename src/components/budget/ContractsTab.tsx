import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'

interface Contract {
  id: string
  number: string
  budget_id: string | null
  professional?: string
  start_date: string
  total_amount: number
  status: string
  items_count?: number
  titles_count?: number
  treatment_status?: string
  pct_complete?: number | null
}

interface Props {
  patientId: string
  patientName: string
}

// Status legal do contrato (cancelado/suspenso) tem prioridade sobre o andamento clínico
const LEGAL_BADGE: Record<string, { label: string; bar: string }> = {
  cancelado: { label: 'CANCELADO', bar: 'bg-red-600' },
  suspenso: { label: 'SUSPENSO', bar: 'bg-gray-400' }
}

// Andamento clínico, derivado dos procedimentos (view contracts_treatment_status)
const TREATMENT_BADGE: Record<string, { label: string; bar: string }> = {
  aguardando_inicio: { label: 'AGUARDANDO INÍCIO', bar: 'bg-gray-400' },
  em_andamento: { label: 'TRATAMENTO INICIADO', bar: 'bg-orange-500' },
  concluido: { label: 'TRATAMENTO CONCLUÍDO', bar: 'bg-green-600' },
  sem_procedimentos: { label: 'SEM PROCEDIMENTOS', bar: 'bg-gray-300' }
}

const MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

export function ContractsTab({ patientId }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [patientId])

  const load = async () => {
    setLoading(true)
    const { data: contractsData } = await supabase
      .from('contracts')
      .select('*')
      .eq('patient_id', patientId)
      .order('start_date', { ascending: true })

    if (contractsData && contractsData.length > 0) {
      const budgetIds = contractsData.map(c => c.budget_id).filter(Boolean)
      const contractIds = contractsData.map(c => c.id)

      const [{ data: items }, { data: titles }, { data: treatment }] = await Promise.all([
        budgetIds.length
          ? supabase.from('budget_items').select('budget_id').in('budget_id', budgetIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from('accounts_receivable').select('contract_id').in('contract_id', contractIds),
        supabase.from('contracts_treatment_status').select('*').in('contract_id', contractIds)
      ])

      const itemsByBudget: Record<string, number> = {}
      ;(items || []).forEach((r: any) => { itemsByBudget[r.budget_id] = (itemsByBudget[r.budget_id] || 0) + 1 })
      const titlesByContract: Record<string, number> = {}
      ;(titles || []).forEach((r: any) => { titlesByContract[r.contract_id] = (titlesByContract[r.contract_id] || 0) + 1 })
      const treatmentByContract: Record<string, any> = {}
      ;(treatment || []).forEach((r: any) => { treatmentByContract[r.contract_id] = r })

      setContracts(contractsData.map(c => ({
        ...c,
        items_count: c.budget_id ? (itemsByBudget[c.budget_id] || 0) : 0,
        titles_count: titlesByContract[c.id] || 0,
        treatment_status: treatmentByContract[c.id]?.treatment_status,
        pct_complete: treatmentByContract[c.id]?.pct_complete
      })))
    } else {
      setContracts([])
    }
    setLoading(false)
  }

  const badgeFor = (c: Contract) => LEGAL_BADGE[c.status] || TREATMENT_BADGE[c.treatment_status || 'sem_procedimentos']

  const summary = contracts.reduce((acc, c) => {
    const key = LEGAL_BADGE[c.status] ? c.status : (c.treatment_status || 'sem_procedimentos')
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Contratos</h3>
      </div>

      {!loading && contracts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary).map(([key, count]) => {
            const st = LEGAL_BADGE[key] || TREATMENT_BADGE[key]
            return (
              <div key={key} className="border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                <span className={`${st.bar} text-white font-bold text-xs px-2 py-0.5 rounded`}>{count}</span>
                <span className="text-gray-700">{st.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">⏳ Carregando...</div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="text-5xl mb-3 opacity-40">📄</div>
          <p className="font-medium text-gray-500">Nenhum contrato gerado</p>
          <p className="text-sm mt-1">Um contrato é gerado automaticamente quando um orçamento é aprovado</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {contracts.map((c, idx) => {
            const st = badgeFor(c)
            const date = parseISO(c.start_date)
            const day = format(date, 'dd')
            const month = MONTH_ABBR[date.getMonth()]
            const year = format(date, 'yyyy')
            const isLast = idx === contracts.length - 1
            const showPct = !LEGAL_BADGE[c.status] && c.treatment_status === 'em_andamento' && c.pct_complete != null

            return (
              <div
                key={c.id}
                className={`flex items-stretch ${!isLast ? 'border-b border-gray-200' : ''}`}
              >
                <div className={`${st.bar} text-white font-bold text-xs flex items-center justify-center px-2 py-3`}
                     style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.05em', minWidth: '32px' }}>
                  {st.label}
                </div>

                <div className="flex flex-col items-center justify-center px-4 py-3 min-w-[80px]">
                  <div className="text-3xl font-bold text-gray-800 leading-none">{day}</div>
                  <div className="text-xs font-bold text-gray-500 mt-1">{month}</div>
                  <div className="text-xs text-gray-500">{year}</div>
                </div>

                <div className="flex-1 px-3 py-3 min-w-0">
                  <div className="font-bold text-gray-900">{c.professional || '—'}</div>
                  <span className="inline-block bg-gray-700 text-white text-xs font-bold px-2 py-0.5 rounded mt-0.5">
                    Contrato {c.number}
                  </span>
                  {showPct && (
                    <span className="text-xs text-orange-700 font-semibold ml-2">({c.pct_complete}%)</span>
                  )}
                  <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
                    <span>❯ {c.items_count || 0} {c.items_count === 1 ? 'Procedimento Clínico' : 'Procedimentos Clínicos'}</span>
                    <span>❯ {c.titles_count || 0} {c.titles_count === 1 ? 'Título' : 'Títulos'}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-center px-4 py-3 min-w-[120px]">
                  <div className="text-xs text-gray-500">R$</div>
                  <div className="font-bold text-lg text-gray-900">
                    {Number(c.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
