import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Tab = 'geral' | 'procedimentos' | 'pagamento'

interface BudgetFull {
  id: string
  title?: string
  budget_type: string
  professional?: string
  emission_date: string
  validity_date?: string
  discount_pct: number
  status: string
  total_gross: number
  total_net: number
  total_payable?: number
  extra_charge?: number
  extra_discount_pct?: number
  observations?: string
  installments_count?: number
}

interface BudgetItem {
  id: string
  procedure_code?: string
  procedure_name: string
  tooth_number?: string
  quantity: number
  unit_price: number
  discount_pct: number
  total: number
}

interface Installment {
  id: string
  position: number
  due_date: string
  is_entry: boolean
  payment_method: string
  amount: number
  paid: boolean
}

interface Props {
  budgetId: string
  patientId: string
  patientName: string
  onClose: () => void
  onChanged: () => void
  onEdit: () => void
}

const TYPE_LABELS: Record<string, string> = {
  particular: 'Particular',
  convenio_interno: 'Convênio Interno',
  operadora: 'Operadora',
  empresa_conv: 'Empresa Conv'
}

const STATUS_LABEL: Record<string, { label: string; bar: string; bg: string }> = {
  aguardando_aprovacao: { label: 'Aguardando Aprovação', bar: 'bg-gray-400', bg: 'bg-gray-100 text-gray-800' },
  aprovado: { label: 'Aprovado', bar: 'bg-green-600', bg: 'bg-green-100 text-green-800' },
  recusado: { label: 'Recusado', bar: 'bg-red-600', bg: 'bg-red-100 text-red-800' },
  cancelado: { label: 'Cancelado', bar: 'bg-red-600', bg: 'bg-red-100 text-red-800' },
  concluido: { label: 'Concluído', bar: 'bg-blue-600', bg: 'bg-blue-100 text-blue-800' }
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  carteira: 'Carteira', dinheiro: 'Dinheiro', pix: 'PIX',
  cartao_credito: 'Cartão Crédito', cartao_debito: 'Cartão Débito',
  boleto: 'Boleto', cheque: 'Cheque', transferencia: 'Transferência'
}

export function BudgetDetailModal({ budgetId, patientId, patientName, onClose, onChanged, onEdit }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('geral')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [confirmAction, setConfirmAction] = useState<null | 'aprovar' | 'cancelar'>(null)
  const [error, setError] = useState<string | null>(null)
  const [budget, setBudget] = useState<BudgetFull | null>(null)
  const [items, setItems] = useState<BudgetItem[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])

  useEffect(() => { load() }, [budgetId])

  const load = async () => {
    setLoading(true)
    const [b, it, ins] = await Promise.all([
      supabase.from('budgets').select('*').eq('id', budgetId).single(),
      supabase.from('budget_items').select('*').eq('budget_id', budgetId).order('position'),
      supabase.from('budget_installments').select('*').eq('budget_id', budgetId).order('position')
    ])
    setBudget(b.data)
    setItems(it.data || [])
    setInstallments(ins.data || [])
    setLoading(false)
  }

  const updateStatus = async (newStatus: string) => {
    setActing(true)
    setError(null)
    try {
      // Se aprovando: gera o contrato e os títulos no Contas a Receber a partir das parcelas
      if (newStatus === 'aprovado' && installments.length > 0 && budget) {
        const { data: contract, error: contractErr } = await supabase
          .from('contracts')
          .insert({
            budget_id: budgetId,
            patient_id: patientId,
            professional: budget.professional || 'Dra Késya',
            start_date: budget.emission_date,
            total_amount: budget.total_payable ?? budget.total_net,
            status: 'ativo'
          })
          .select()
          .single()
        if (contractErr) throw contractErr

        const titles = installments.map(p => ({
          patient_id: patientId,
          budget_id: budgetId,
          contract_id: contract.id,
          installment_id: p.id,
          title_number: `${contract.number} ${p.position}/${installments.length}`,
          position: p.position,
          total_positions: installments.length,
          due_date: p.due_date,
          amount: p.amount,
          payment_method: p.payment_method,
          plan_account: 'Serviços Odontológicos',
          professional: budget.professional || 'Dra Késya',
          status: 'em_aberto'
        }))
        const { error: arErr } = await supabase.from('accounts_receivable').insert(titles)
        if (arErr) throw arErr

        // Gera um procedimento rastreável por item do orçamento (aba Procedimentos)
        if (items.length > 0) {
          const procedures = items.map(it => ({
            budget_item_id: it.id,
            contract_id: contract.id,
            patient_id: patientId,
            status: 'em_aberto'
          }))
          const { error: procErr } = await supabase.from('procedures').insert(procedures)
          if (procErr) throw procErr
        }
      }

      const { error: bErr } = await supabase.from('budgets').update({ status: newStatus }).eq('id', budgetId)
      if (bErr) throw bErr

      onChanged()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Erro ao atualizar status')
    } finally {
      setActing(false)
      setConfirmAction(null)
    }
  }

  if (loading || !budget) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="text-white">⏳ Carregando...</div>
      </div>
    )
  }

  const st = STATUS_LABEL[budget.status] || STATUS_LABEL.aguardando_aprovacao
  const isFinalized = ['aprovado', 'cancelado', 'recusado'].includes(budget.status)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full overflow-hidden my-8">
        {/* Header */}
        <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span>🔍</span>
            <span>Dados do Orçamento</span>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-80 text-lg">✕</button>
        </div>

        <div className="px-5 pt-4 pb-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-blue-700 font-bold text-lg">{patientName}</h3>
            <span className="text-sm text-gray-500">{TYPE_LABELS[budget.budget_type] || budget.budget_type}</span>
          </div>
          <div className="border-t border-dashed border-gray-300 mt-3" />
        </div>

        {/* Tabs (sem manutenções/observações no detalhe) */}
        <div className="px-5 border-b border-gray-200">
          <div className="flex gap-1">
            {([
              { id: 'geral', label: 'Geral' },
              { id: 'procedimentos', label: 'Procedimentos' },
              { id: 'pagamento', label: 'Pagamento' }
            ] as { id: Tab; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 ${
                  activeTab === t.id ? 'text-blue-600 border-blue-600' : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 min-h-[260px]">
          {activeTab === 'geral' && (
            <div className="space-y-3">
              <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
                <tbody>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-gray-700">Dentista</td>
                    <td className="px-3 py-2 font-semibold text-gray-700">Emissão</td>
                    <td className="px-3 py-2 font-semibold text-gray-700">Validade</td>
                    <td className="px-3 py-2 font-semibold text-gray-700">Desc/Pontualidade</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-bold text-gray-900">{budget.professional || '—'}</td>
                    <td className="px-3 py-2 font-bold text-gray-900">{format(parseISO(budget.emission_date), 'dd/MM/yyyy')}</td>
                    <td className="px-3 py-2 font-bold text-gray-900">{budget.validity_date ? format(parseISO(budget.validity_date), 'dd/MM/yyyy') : '—'}</td>
                    <td className="px-3 py-2 font-bold text-gray-900">{budget.discount_pct || 0} %</td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 text-gray-600 w-1/3">Título</td>
                    <td className="px-3 py-2 font-bold text-gray-900">{budget.title || '—'}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 text-gray-600">Plano de Contas</td>
                    <td className="px-3 py-2 font-bold text-gray-900">Serviços Odontológicos</td>
                  </tr>
                  {budget.observations && (
                    <tr>
                      <td className="px-3 py-2 text-gray-600 align-top">Observações</td>
                      <td className="px-3 py-2 text-gray-900 whitespace-pre-wrap">{budget.observations}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className={`${st.bg} border rounded-lg p-3 text-center`}>
                <div className="text-xs text-gray-600">Situação do Orçamento</div>
                <div className="font-bold text-sm mt-1 uppercase">{st.label}</div>
              </div>
            </div>
          )}

          {activeTab === 'procedimentos' && (
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-2 py-2 text-left">Procedimento</th>
                    <th className="px-2 py-2 w-14">Dente</th>
                    <th className="px-2 py-2 w-12">Qtd</th>
                    <th className="px-2 py-2 w-24 text-right">Unitário</th>
                    <th className="px-2 py-2 w-14 text-right">Desc</th>
                    <th className="px-2 py-2 w-28 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-t border-gray-200">
                      <td className="px-2 py-2 text-gray-900">
                        {it.procedure_code && <span className="text-xs text-gray-400 mr-1">#{it.procedure_code}</span>}
                        {it.procedure_name}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-700">{it.tooth_number || '—'}</td>
                      <td className="px-2 py-2 text-center text-gray-700">{it.quantity}</td>
                      <td className="px-2 py-2 text-right text-gray-700">R$ {it.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-2 py-2 text-right text-gray-700">{it.discount_pct}%</td>
                      <td className="px-2 py-2 text-right font-bold text-gray-900">R$ {it.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={5} className="px-2 py-2 text-right font-bold text-gray-700">Total Líquido</td>
                    <td className="px-2 py-2 text-right font-bold text-green-700">
                      R$ {(budget.total_net || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {activeTab === 'pagamento' && (
            <div>
              {installments.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Sem parcelas cadastradas</div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-2 py-2 w-10 text-center">#</th>
                        <th className="px-2 py-2">Vencimento</th>
                        <th className="px-2 py-2 text-center">Entrada</th>
                        <th className="px-2 py-2">Espécie</th>
                        <th className="px-2 py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map(p => (
                        <tr key={p.id} className="border-t border-gray-200">
                          <td className="px-2 py-2 text-center font-bold text-gray-700">{p.position}.</td>
                          <td className="px-2 py-2 text-gray-900">{format(parseISO(p.due_date), "dd/MM/yyyy", { locale: ptBR })}</td>
                          <td className="px-2 py-2 text-center">{p.is_entry ? '✓' : '—'}</td>
                          <td className="px-2 py-2 text-gray-700">{PAYMENT_METHOD_LABEL[p.payment_method] || p.payment_method}</td>
                          <td className="px-2 py-2 text-right font-bold text-gray-900">R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-2 py-2 text-right font-bold text-gray-700">Total a Pagar</td>
                        <td className="px-2 py-2 text-right font-bold text-green-700">
                          R$ {((budget.total_payable ?? budget.total_net) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mb-3 px-3 py-2 bg-red-50 border border-red-300 rounded text-xs text-red-800">
            ❌ {error}
          </div>
        )}

        {/* Footer com ações por status */}
        <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex justify-end gap-2 flex-wrap">
          <button
            onClick={onClose}
            disabled={acting}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"
          >
            ✕ Fechar
          </button>

          {!isFinalized && !confirmAction && (
            <>
              <button
                onClick={onEdit}
                disabled={acting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"
              >
                ✏️ Editar
              </button>
              <button
                onClick={() => setConfirmAction('cancelar')}
                disabled={acting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={() => setConfirmAction('aprovar')}
                disabled={acting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"
              >
                ✓ Aprovar
              </button>
            </>
          )}
        </div>

        {/* Confirmação inline */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border-2 border-gray-200">
              <h4 className="font-bold text-gray-900 text-base">
                {confirmAction === 'aprovar'
                  ? 'Você confirma a APROVAÇÃO deste orçamento?'
                  : 'Você confirma o CANCELAMENTO deste orçamento?'}
              </h4>
              <p className="text-sm text-gray-600 mt-2">
                {confirmAction === 'aprovar'
                  ? 'Serão gerados os títulos no Contas a Receber. O contrato pode ser anexado posteriormente.'
                  : 'O orçamento ficará marcado como cancelado e não poderá mais ser editado.'}
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={acting}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => updateStatus(confirmAction === 'aprovar' ? 'aprovado' : 'cancelado')}
                  disabled={acting}
                  className={`px-4 py-2 text-white rounded-lg text-sm font-bold flex items-center gap-2 ${
                    confirmAction === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {acting ? '⏳ Processando...' : (confirmAction === 'aprovar' ? '⚙️ Sim, Aprovar' : '❌ Sim, Cancelar')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
