import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BudgetTypeModal } from './BudgetTypeModal'
import { BudgetFormModal } from './BudgetFormModal'
import { BudgetDetailModal } from './BudgetDetailModal'

interface Budget {
  id: string
  title?: string
  budget_type: string
  professional?: string
  emission_date: string
  validity_date?: string
  status: string
  total_gross: number
  total_net: number
  total_payable?: number
  extra_charge?: number
  extra_discount_pct?: number
  discount_pct?: number
  installments_count?: number
  created_at: string
  items_count?: number
}

interface Props {
  patientId: string
  patientName: string
}

const STATUS_BADGE: Record<string, { label: string; bar: string }> = {
  aguardando_aprovacao: { label: 'EM ABERTO', bar: 'bg-gray-400' },
  aprovado: { label: 'APROVADO', bar: 'bg-green-600' },
  recusado: { label: 'RECUSADO', bar: 'bg-red-600' },
  cancelado: { label: 'CANCELADO', bar: 'bg-red-600' },
  concluido: { label: 'CONCLUÍDO', bar: 'bg-blue-600' }
}

const MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

export function BudgetsTab({ patientId, patientName }: Props) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [formType, setFormType] = useState<any | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => { load() }, [patientId])

  const load = async () => {
    setLoading(true)
    const { data: budgetsData } = await supabase
      .from('budgets')
      .select('*')
      .eq('patient_id', patientId)
      .is('deleted_at', null)
      .order('emission_date', { ascending: true })

    // Conta procedimentos por orçamento
    if (budgetsData && budgetsData.length > 0) {
      const ids = budgetsData.map(b => b.id)
      const { data: itemCounts } = await supabase
        .from('budget_items')
        .select('budget_id')
        .in('budget_id', ids)
      const countMap: Record<string, number> = {}
      ;(itemCounts || []).forEach((r: any) => {
        countMap[r.budget_id] = (countMap[r.budget_id] || 0) + 1
      })
      setBudgets(budgetsData.map(b => ({ ...b, items_count: countMap[b.id] || 0 })))
    } else {
      setBudgets([])
    }
    setLoading(false)
  }

  // Totais agregados
  const agg = budgets.reduce((acc, b) => {
    if (b.status === 'cancelado' || b.status === 'recusado') return acc
    const net = b.total_payable ?? b.total_net ?? 0
    const extraDisc = ((b.total_net || 0) * (b.extra_discount_pct || 0) / 100)
    acc.total += net
    acc.discountAdd += extraDisc
    acc.extra += (b.extra_charge || 0)
    return acc
  }, { total: 0, discountAdd: 0, extra: 0 })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Orçamentos</h3>
        <button
          onClick={() => setShowTypeModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm"
        >
          <span className="text-lg leading-none">+</span> Elaborar Orçamento
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">⏳ Carregando...</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="text-5xl mb-3 opacity-40">💰</div>
          <p className="font-medium text-gray-500">Nenhum orçamento cadastrado</p>
          <p className="text-sm mt-1">Clique em "Elaborar Orçamento" para começar</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {budgets.map((b, idx) => {
            const st = STATUS_BADGE[b.status] || STATUS_BADGE.aguardando_aprovacao
            const date = parseISO(b.emission_date)
            const day = format(date, 'dd')
            const month = MONTH_ABBR[date.getMonth()]
            const year = format(date, 'yyyy')
            const extraDisc = ((b.total_net || 0) * (b.extra_discount_pct || 0) / 100)
            const totalDisplay = b.total_payable ?? b.total_net ?? 0
            const isLast = idx === budgets.length - 1

            return (
              <div
                key={b.id}
                onClick={() => setDetailId(b.id)}
                className={`flex items-stretch cursor-pointer hover:bg-blue-50 transition ${!isLast ? 'border-b border-gray-200' : ''}`}
              >
                {/* Badge lateral status */}
                <div className={`${st.bar} text-white font-bold text-xs flex items-center justify-center px-2 py-3`}
                     style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.05em', minWidth: '32px' }}>
                  {st.label}
                </div>

                {/* Data */}
                <div className="flex flex-col items-center justify-center px-4 py-3 min-w-[80px]">
                  <div className="text-3xl font-bold text-gray-800 leading-none">{day}</div>
                  <div className="text-xs font-bold text-gray-500 mt-1">{month}</div>
                  <div className="text-xs text-gray-500">{year}</div>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 px-3 py-3 min-w-0">
                  <div className="font-bold text-gray-900">{b.professional || '—'}</div>
                  <div className="text-xs uppercase text-gray-600 font-semibold mt-0.5">
                    {b.title || 'Estimativa de Honorários'}
                  </div>
                  <div className="text-xs text-gray-600">Serviços Odontológicos</div>
                  {extraDisc > 0 && (
                    <div className="text-xs text-red-600 font-bold mt-0.5">
                      Descontos Adicionais: {extraDisc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
                    <span>❯ {b.items_count || 0} {b.items_count === 1 ? 'Procedimento Clínico' : 'Procedimentos Clínicos'}</span>
                    <span>❯ {b.installments_count || 1} {b.installments_count === 1 ? 'Parcela' : 'Parcelas'}</span>
                  </div>
                </div>

                {/* Valor */}
                <div className="flex flex-col items-end justify-center px-4 py-3 min-w-[120px]">
                  <div className="text-xs text-gray-500">R$</div>
                  <div className="font-bold text-lg text-gray-900">
                    {totalDisplay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Footer agregado */}
          <div className="bg-gray-50 border-t-2 border-gray-300 px-4 py-3 text-sm">
            <div className="flex justify-between items-center text-gray-600">
              <span>Acréscimos: <strong className="text-gray-800">R$ {agg.extra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
              <span>Descontos: <strong className="text-gray-800">R$ {agg.discountAdd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
            </div>
            <div className="flex justify-between items-baseline mt-1 pt-1 border-t border-gray-200">
              <span className="font-bold text-gray-800">
                Total: R$ <span className="text-xl text-green-700">{agg.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </span>
              <span className="text-xs text-gray-500">({budgets.length} {budgets.length === 1 ? 'Orçamento' : 'Orçamentos'})</span>
            </div>
          </div>
        </div>
      )}

      {showTypeModal && (
        <BudgetTypeModal
          patientName={patientName}
          onSelect={type => { setFormType(type); setShowTypeModal(false) }}
          onClose={() => setShowTypeModal(false)}
        />
      )}

      {formType && !editingId && (
        <BudgetFormModal
          patientId={patientId}
          patientName={patientName}
          budgetType={formType}
          onSaved={() => { setFormType(null); load() }}
          onClose={() => setFormType(null)}
        />
      )}

      {editingId && (
        <BudgetFormModal
          patientId={patientId}
          patientName={patientName}
          budgetType="particular"
          editBudgetId={editingId}
          onSaved={() => { setEditingId(null); load() }}
          onClose={() => setEditingId(null)}
        />
      )}

      {detailId && !editingId && (
        <BudgetDetailModal
          budgetId={detailId}
          patientId={patientId}
          patientName={patientName}
          onClose={() => setDetailId(null)}
          onChanged={load}
          onEdit={() => { setEditingId(detailId); setDetailId(null) }}
        />
      )}
    </div>
  )
}
