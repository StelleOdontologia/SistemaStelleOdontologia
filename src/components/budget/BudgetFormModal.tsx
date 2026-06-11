import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ProcedureSearchDropdown, type PriceTableRow } from './ProcedureSearchDropdown'
import { format, addMonths } from 'date-fns'

type Tab = 'geral' | 'procedimentos' | 'manutencoes' | 'pagamento' | 'observacoes'
type BudgetType = 'particular' | 'convenio_interno' | 'operadora' | 'empresa_conv'

interface BudgetItemDraft {
  tempId: string
  price_table_id?: string
  procedure_code?: string
  procedure_name: string
  tooth_number: string
  quantity: number
  unit_price: number
  discount_pct: number
  total: number
}

interface Props {
  patientId: string
  patientName: string
  budgetType: BudgetType
  onSaved: () => void
  onClose: () => void
}

const TYPE_LABELS: Record<BudgetType, string> = {
  particular: 'Particular',
  convenio_interno: 'Convênio Interno',
  operadora: 'Operadora',
  empresa_conv: 'Empresa Conv'
}

export function BudgetFormModal({ patientId, patientName, budgetType, onSaved, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('geral')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  const today = new Date()
  const [form, setForm] = useState({
    title: 'Estimativa de Honorários',
    professional: 'Dra Késya',
    emission_date: format(today, 'yyyy-MM-dd'),
    validity_date: format(addMonths(today, 1), 'yyyy-MM-dd'),
    discount_pct: 0,
    payment_method: '',
    observations: ''
  })

  const [items, setItems] = useState<BudgetItemDraft[]>([])

  const updateItem = (tempId: string, patch: Partial<BudgetItemDraft>) => {
    setItems(prev => prev.map(it => {
      if (it.tempId !== tempId) return it
      const merged = { ...it, ...patch }
      merged.total = merged.quantity * merged.unit_price * (1 - merged.discount_pct / 100)
      return merged
    }))
  }

  const removeItem = (tempId: string) => setItems(prev => prev.filter(it => it.tempId !== tempId))

  const addProcedure = (row: PriceTableRow) => {
    const unit = row.price ?? 0
    setItems(prev => [...prev, {
      tempId: 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      price_table_id: row.id,
      procedure_code: row.internal_code,
      procedure_name: row.name,
      tooth_number: '',
      quantity: 1,
      unit_price: unit,
      discount_pct: 0,
      total: unit
    }])
    setShowSearch(false)
  }

  const totals = items.reduce(
    (acc, it) => {
      const gross = it.quantity * it.unit_price
      const discount = gross * (it.discount_pct / 100)
      acc.gross += gross
      acc.discount += discount
      acc.net += gross - discount
      return acc
    },
    { gross: 0, discount: 0, net: 0 }
  )

  const handleSave = async () => {
    if (items.length === 0) {
      setError('Adicione pelo menos um procedimento antes de salvar')
      setActiveTab('procedimentos')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const { data: budget, error: bErr } = await supabase
        .from('budgets')
        .insert([{
          patient_id: patientId,
          title: form.title,
          budget_type: budgetType,
          professional: form.professional,
          emission_date: form.emission_date,
          validity_date: form.validity_date || null,
          discount_pct: form.discount_pct,
          payment_method: form.payment_method || null,
          observations: form.observations || null,
          status: 'aguardando_aprovacao'
        }])
        .select()
        .single()

      if (bErr) throw bErr
      if (!budget) throw new Error('Orçamento não foi criado (verifique RLS)')

      const itemsPayload = items.map((it, i) => ({
        budget_id: budget.id,
        price_table_id: it.price_table_id || null,
        procedure_code: it.procedure_code || null,
        procedure_name: it.procedure_name,
        tooth_number: it.tooth_number || null,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_pct: it.discount_pct,
        total: it.total,
        position: i
      }))

      const { error: iErr } = await supabase.from('budget_items').insert(itemsPayload)
      if (iErr) throw iErr

      onSaved()
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Erro ao salvar orçamento')
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'geral', label: 'Geral' },
    { id: 'procedimentos', label: 'Procedimentos' },
    { id: 'manutencoes', label: 'Manutenções' },
    { id: 'pagamento', label: 'Pagamento' },
    { id: 'observacoes', label: 'Observações' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full overflow-hidden my-8">
        {/* Header */}
        <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span>➕</span>
            <span>Cadastrar Orçamento</span>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-80 text-lg">✕</button>
        </div>

        {/* Subheader paciente */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-blue-700 font-bold text-lg">{patientName}</h3>
            <span className="text-sm text-gray-500">{TYPE_LABELS[budgetType]}</span>
          </div>
          <div className="border-t border-dashed border-gray-300 mt-3" />
        </div>

        {/* Tabs */}
        <div className="px-5 border-b border-gray-200">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-5 min-h-[300px]">
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Título do Orçamento</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-gray-900"
                  placeholder="Estimativa de Honorários"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Profissional</label>
                  <select
                    value={form.professional}
                    onChange={e => setForm({ ...form, professional: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  >
                    <option>Dra Késya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Emissão</label>
                  <input
                    type="date"
                    value={form.emission_date}
                    onChange={e => setForm({ ...form, emission_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Validade</label>
                  <input
                    type="date"
                    value={form.validity_date}
                    onChange={e => setForm({ ...form, validity_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Desc/Pontualidade %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={form.discount_pct}
                    onChange={e => setForm({ ...form, discount_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center mt-4">
                <div className="text-xs text-gray-500 uppercase">Situação do Orçamento</div>
                <div className="font-bold text-gray-800 mt-1">AGUARDANDO APROVAÇÃO</div>
              </div>
            </div>
          )}

          {activeTab === 'procedimentos' && (
            <div>
              <div className="relative mb-3">
                <button
                  onClick={() => setShowSearch(true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <span className="text-lg leading-none">+</span> Adicionar Procedimento
                </button>
                {showSearch && (
                  <ProcedureSearchDropdown
                    onSelect={addProcedure}
                    onClose={() => setShowSearch(false)}
                  />
                )}
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  Nenhum procedimento adicionado ainda
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-2 py-2 text-left">Procedimento</th>
                        <th className="px-2 py-2 w-16">Dente</th>
                        <th className="px-2 py-2 w-14">Qtd</th>
                        <th className="px-2 py-2 w-24">Unitário</th>
                        <th className="px-2 py-2 w-16">Desc %</th>
                        <th className="px-2 py-2 w-28 text-right">Total</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(it => (
                        <tr key={it.tempId} className="border-t border-gray-200">
                          <td className="px-2 py-2 text-gray-900">
                            {it.procedure_code && <span className="text-xs text-gray-400 mr-1">#{it.procedure_code}</span>}
                            {it.procedure_name}
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={it.tooth_number}
                              onChange={e => updateItem(it.tempId, { tooth_number: e.target.value })}
                              className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
                              placeholder="—"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={e => updateItem(it.tempId, { quantity: parseInt(e.target.value) || 1 })}
                              className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={it.unit_price}
                              onChange={e => updateItem(it.tempId, { unit_price: parseFloat(e.target.value) || 0 })}
                              className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={it.discount_pct}
                              onChange={e => updateItem(it.tempId, { discount_pct: parseFloat(e.target.value) || 0 })}
                              className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-bold text-gray-900">
                            R$ {it.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              onClick={() => removeItem(it.tempId)}
                              className="text-red-500 hover:text-red-700 text-sm"
                              title="Remover"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">Total Bruto</div>
                  <div className="font-bold text-gray-800">R$ {totals.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">Acréscimos</div>
                  <div className="font-bold text-gray-800">R$ 0,00</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">Descontos</div>
                  <div className="font-bold text-red-700">R$ {totals.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-green-50 border border-green-300 rounded-lg p-2 text-center">
                  <div className="text-xs text-green-700">Total Líquido</div>
                  <div className="font-bold text-green-800">R$ {totals.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'manutencoes' || activeTab === 'pagamento' || activeTab === 'observacoes') && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3 opacity-40">🚧</div>
              <p className="text-sm">Em breve</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mb-3 px-3 py-2 bg-red-50 border border-red-300 rounded text-xs text-red-800">
            ❌ {error}
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"
          >
            ✕ Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-bold flex items-center gap-2"
          >
            {saving ? '⏳ Salvando...' : '☁️ Cadastrar Orçamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
