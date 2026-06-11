import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ReceiptCompletedModal } from './ReceiptCompletedModal'

type Tab = 'recebimento' | 'adicionais' | 'titulo' | 'observacoes'

interface Receivable {
  id: string
  patient_id: string
  title_number?: string
  due_date: string
  amount: number
  payment_method?: string
  plan_account?: string
  professional?: string
}

interface Props {
  receivable: Receivable
  patientName: string
  onProcessed: () => void
  onClose: () => void
}

const CASH_ACCOUNTS = ['Inter', 'Itaú', 'Bradesco', 'Caixa Loja', 'Dinheiro Físico']
const RECEIPT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'cartao_credito_rotativo', label: 'Cartão de Crédito - Rotativo' },
  { value: 'cartao_credito_parcelado', label: 'Cartão de Crédito - Parcelado' },
  { value: 'cartao_credito_recorrente', label: 'Cartão de Crédito - Recorrente' },
  { value: 'deposito', label: 'Depósito em Conta' },
  { value: 'transferencia', label: 'Transferência Bancária' },
  { value: 'boleto', label: 'Compensação de Boleto' },
  { value: 'credito_em_conta', label: 'Crédito em Conta' }
]
const CARD_BRANDS = ['Visa', 'Mastercard', 'Elo', 'Hipercard', 'American Express', 'Outro']

export function ReceiptModal({ receivable, patientName, onProcessed, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('recebimento')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [savedReceiptId, setSavedReceiptId] = useState<string | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({
    cash_account: 'Inter',
    receipt_method: 'cartao_debito',
    card_brand: '',
    species_number: '',
    late_fee: 0,
    interest: 0,
    expenses: 0,
    discount: 0,
    plan_account: receivable.plan_account || 'Serviços Odontológicos',
    paid_at: today,
    agreement: '',
    professional: receivable.professional || 'Dra Késya',
    seller: '',
    fiscal_note: '',
    occurrence_date: today,
    owner_name: '',
    observations: ''
  })

  const subtotal = receivable.amount
  const adjustments = form.late_fee + form.interest + form.expenses - form.discount
  const total = subtotal + adjustments
  const saldo = total - total // 0 quando paga total; placeholder p/ pagamento parcial futuro

  const showCardBrand = form.receipt_method.startsWith('cartao_')

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    try {
      const { data: rData, error: rErr } = await supabase.from('receipts').insert([{
        receivable_id: receivable.id,
        patient_id: receivable.patient_id,
        paid_at: form.paid_at,
        cash_account: form.cash_account,
        receipt_method: form.receipt_method,
        card_brand: form.card_brand || null,
        species_number: form.species_number || null,
        late_fee: form.late_fee,
        interest: form.interest,
        expenses: form.expenses,
        discount: form.discount,
        amount: total,
        plan_account: form.plan_account,
        agreement: form.agreement || null,
        professional: form.professional,
        seller: form.seller || null,
        fiscal_note: form.fiscal_note || null,
        occurrence_date: form.occurrence_date || null,
        owner_name: form.owner_name || null,
        observations: form.observations || null
      }]).select().single()
      if (rErr) throw rErr
      setSavedReceiptId(rData?.id || null)
      setShowCompleted(true)
    } catch (e: any) {
      setError(e?.message || 'Erro ao processar recebimento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden my-8">
        <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span>💵</span>
            <span>Processar Recebimento</span>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-80 text-lg">✕</button>
        </div>

        <div className="px-5 pt-4 pb-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="text-blue-700 font-bold text-lg">{patientName} <span className="text-xs text-gray-500 ml-1">paciente</span></h3>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">{format(parseISO(receivable.due_date), 'dd/MM/yyyy', { locale: ptBR })} →</div>
              <div className="font-bold text-blue-700 text-lg">R$ {receivable.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
          <div className="border-t border-dashed border-gray-300 mt-3" />
        </div>

        <div className="px-5 border-b border-gray-200">
          <div className="flex gap-1 overflow-x-auto">
            {([
              { id: 'recebimento', label: 'Dados do Recebimento' },
              { id: 'adicionais', label: 'Dados Adicionais' },
              { id: 'titulo', label: 'Dados do Título' },
              { id: 'observacoes', label: 'Observações' }
            ] as { id: Tab; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 ${
                  activeTab === t.id ? 'text-blue-600 border-blue-600' : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 min-h-[280px]">
          {activeTab === 'recebimento' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Caixa</label>
                  <select
                    value={form.cash_account}
                    onChange={e => setForm({ ...form, cash_account: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  >
                    {CASH_ACCOUNTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Espécie de Recebimento</label>
                  <select
                    value={form.receipt_method}
                    onChange={e => setForm({ ...form, receipt_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  >
                    {RECEIPT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nº Espécie</label>
                  <input
                    type="text"
                    value={form.species_number}
                    onChange={e => setForm({ ...form, species_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bandeira</label>
                  <select
                    value={form.card_brand}
                    onChange={e => setForm({ ...form, card_brand: e.target.value })}
                    disabled={!showCardBrand}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 disabled:bg-gray-100"
                  >
                    <option value="">—</option>
                    {CARD_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-4 gap-3">
                  <NumField label="(+) Multa" value={form.late_fee} onChange={v => setForm({ ...form, late_fee: v })} />
                  <NumField label="(+) Juros" value={form.interest} onChange={v => setForm({ ...form, interest: v })} />
                  <NumField label="(+) Despesas" value={form.expenses} onChange={v => setForm({ ...form, expenses: v })} />
                  <NumField label="(-) Descontos" value={form.discount} onChange={v => setForm({ ...form, discount: v })} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-300">
                  <SummaryItem label="Subtotal" value={subtotal} />
                  <SummaryItem label="Ajustes" value={adjustments} color={adjustments >= 0 ? 'text-gray-800' : 'text-red-700'} />
                  <SummaryItem label="Total" value={total} color="text-green-700" bold />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'adicionais' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Plano de Contas</label>
                  <select
                    value={form.plan_account}
                    onChange={e => setForm({ ...form, plan_account: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  >
                    <option>Serviços Odontológicos</option>
                    <option>Produtos</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Recebimento</label>
                  <input
                    type="date"
                    value={form.paid_at}
                    onChange={e => setForm({ ...form, paid_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Convênio</label>
                  <input
                    type="text"
                    value={form.agreement}
                    onChange={e => setForm({ ...form, agreement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Dentista</label>
                  <select
                    value={form.professional}
                    onChange={e => setForm({ ...form, professional: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  >
                    <option>Dra Késya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Vendedor</label>
                  <input
                    type="text"
                    value={form.seller}
                    onChange={e => setForm({ ...form, seller: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nota Fiscal</label>
                  <input
                    type="text"
                    value={form.fiscal_note}
                    onChange={e => setForm({ ...form, fiscal_note: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Ocorrência</label>
                  <input
                    type="date"
                    value={form.occurrence_date}
                    onChange={e => setForm({ ...form, occurrence_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome do Titular</label>
                <input
                  type="text"
                  value={form.owner_name}
                  onChange={e => setForm({ ...form, owner_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  placeholder="—"
                />
              </div>
            </div>
          )}

          {activeTab === 'titulo' && (
            <div className="space-y-2">
              <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm">
                <DetailRow label="Nº do Título" value={receivable.title_number || '—'} />
                <DetailRow label="Vencimento" value={format(parseISO(receivable.due_date), 'dd/MM/yyyy', { locale: ptBR })} />
                <DetailRow label="Valor Original" value={`R$ ${receivable.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                <DetailRow label="Plano de Contas" value={receivable.plan_account || '—'} />
                <DetailRow label="Dentista" value={receivable.professional || '—'} />
                <DetailRow label="Espécie Original" value={receivable.payment_method || '—'} />
              </div>
            </div>
          )}

          {activeTab === 'observacoes' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Observações</label>
              <textarea
                value={form.observations}
                onChange={e => setForm({ ...form, observations: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 resize-y"
                placeholder="Notas sobre este recebimento..."
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mb-3 px-3 py-2 bg-red-50 border border-red-300 rounded text-xs text-red-800">
            ❌ {error}
          </div>
        )}

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
            {saving ? '⏳ Processando...' : '💵 Processar Recebimento'}
          </button>
        </div>
      </div>

      {showCompleted && savedReceiptId && (
        <ReceiptCompletedModal
          receiptId={savedReceiptId}
          onPrintReceipt={() => {
            window.print()
          }}
          onClose={() => {
            setShowCompleted(false)
            onProcessed()
          }}
        />
      )}
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        step={0.01}
        min={0}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right text-gray-900"
      />
    </div>
  )
}

function SummaryItem({ label, value, color = 'text-gray-800', bold = false }: { label: string; value: number; color?: string; bold?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`${color} ${bold ? 'font-bold text-lg' : 'font-semibold'}`}>
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-200 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  )
}
