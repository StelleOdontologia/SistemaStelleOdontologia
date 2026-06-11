import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BudgetTypeModal } from './BudgetTypeModal'
import { BudgetFormModal } from './BudgetFormModal'

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
  created_at: string
}

interface Props {
  patientId: string
  patientName: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-800 border-green-300' },
  recusado: { label: 'Recusado', color: 'bg-red-100 text-red-800 border-red-300' },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  concluido: { label: 'Concluído', color: 'bg-blue-100 text-blue-800 border-blue-300' }
}

const TYPE_LABELS: Record<string, string> = {
  particular: 'Particular',
  convenio_interno: 'Convênio Interno',
  operadora: 'Operadora',
  empresa_conv: 'Empresa Conv'
}

export function BudgetsTab({ patientId, patientName }: Props) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [formType, setFormType] = useState<any | null>(null)

  useEffect(() => { load() }, [patientId])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('patient_id', patientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setBudgets(data || [])
    setLoading(false)
  }

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
        <div className="space-y-2">
          {budgets.map(b => {
            const st = STATUS_LABELS[b.status] || STATUS_LABELS.aguardando_aprovacao
            return (
              <div
                key={b.id}
                className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-gray-900">{b.title || 'Orçamento'}</h4>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                      {TYPE_LABELS[b.budget_type] || b.budget_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 flex gap-3 flex-wrap">
                    <span>📅 Emissão: {format(parseISO(b.emission_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    {b.validity_date && (
                      <span>⏳ Validade: {format(parseISO(b.validity_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    )}
                    {b.professional && <span>👤 {b.professional}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-500">Total Líquido</div>
                  <div className="font-bold text-green-700 text-lg">
                    R$ {(b.total_net || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showTypeModal && (
        <BudgetTypeModal
          patientName={patientName}
          onSelect={type => { setFormType(type); setShowTypeModal(false) }}
          onClose={() => setShowTypeModal(false)}
        />
      )}

      {formType && (
        <BudgetFormModal
          patientId={patientId}
          patientName={patientName}
          budgetType={formType}
          onSaved={() => { setFormType(null); load() }}
          onClose={() => setFormType(null)}
        />
      )}
    </div>
  )
}
