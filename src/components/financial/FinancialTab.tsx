import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO, isBefore, startOfToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ReceiptModal } from './ReceiptModal'

type SubTab = 'vencidos' | 'a_vencer' | 'em_aberto' | 'recebimentos' | 'a_faturar' | 'notas_fiscais' | 'excluidos'

interface Receivable {
  id: string
  patient_id: string
  title_number?: string
  position?: number
  total_positions?: number
  due_date: string
  amount: number
  payment_method?: string
  plan_account?: string
  professional?: string
  status: string
  paid_at?: string
  amount_paid?: number
}

interface Props {
  patientId: string
  patientName: string
}

const MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const PAYMENT_LABEL: Record<string, string> = {
  carteira: 'Carteira', dinheiro: 'Dinheiro', pix: 'PIX',
  cartao_credito: 'Cartão Crédito', cartao_debito: 'Cartão Débito',
  boleto: 'Boleto', cheque: 'Cheque', transferencia: 'Transferência'
}

export function FinancialTab({ patientId, patientName }: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>('em_aberto')
  const [items, setItems] = useState<Receivable[]>([])
  const [loading, setLoading] = useState(true)
  const [receiptOn, setReceiptOn] = useState<Receivable | null>(null)

  useEffect(() => { load() }, [patientId])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('accounts_receivable')
      .select('*')
      .eq('patient_id', patientId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }

  const today = startOfToday()
  const open = items.filter(i => i.status === 'em_aberto')
  const overdue = open.filter(i => isBefore(parseISO(i.due_date), today))
  const upcoming = open.filter(i => !isBefore(parseISO(i.due_date), today))
  const received = items.filter(i => i.status === 'recebido')

  const balance = open.reduce((acc, i) => acc + i.amount, 0)

  const filtered = (() => {
    switch (activeTab) {
      case 'vencidos': return overdue
      case 'a_vencer': return upcoming
      case 'em_aberto': return open
      case 'recebimentos': return received
      default: return []
    }
  })()

  const subTabs: { id: SubTab; label: string; count?: number; available: boolean }[] = [
    { id: 'vencidos', label: 'Vencidos', count: overdue.length, available: true },
    { id: 'a_vencer', label: 'A Vencer', count: upcoming.length, available: true },
    { id: 'em_aberto', label: 'Em Aberto', count: open.length, available: true },
    { id: 'recebimentos', label: 'Recebimentos', count: received.length, available: true },
    { id: 'a_faturar', label: 'A Faturar', available: false },
    { id: 'notas_fiscais', label: 'Notas Fiscais', available: false },
    { id: 'excluidos', label: 'Títulos Excluídos', available: false }
  ]

  const titleByTab: Record<SubTab, string> = {
    vencidos: 'Títulos Vencidos',
    a_vencer: 'Títulos A Vencer',
    em_aberto: 'Títulos Em Aberto',
    recebimentos: 'Recebimentos',
    a_faturar: 'A Faturar',
    notas_fiscais: 'Notas Fiscais',
    excluidos: 'Títulos Excluídos'
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Sidebar sub-abas */}
      <div className="lg:w-56 flex-shrink-0">
        <nav className="space-y-1 bg-white border border-gray-200 rounded-lg p-2">
          {subTabs.map(t => (
            <button
              key={t.id}
              onClick={() => t.available && setActiveTab(t.id)}
              disabled={!t.available}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition flex items-center justify-between ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white'
                  : t.available
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === t.id ? 'bg-white text-blue-700' : 'bg-gray-200 text-gray-700'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Balança Financeira</div>
          <div className="font-bold text-lg text-orange-600 mt-1">
            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 min-h-[300px]">
        <h3 className="text-lg font-bold text-gray-900 mb-3">{titleByTab[activeTab]}</h3>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">⏳ Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3 opacity-40">📭</div>
            <p className="text-sm">Nenhum título nesta categoria</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded overflow-hidden">
            {filtered.map((r, idx) => {
              const date = parseISO(r.due_date)
              const day = format(date, 'dd')
              const month = MONTH_ABBR[date.getMonth()]
              const year = format(date, 'yyyy')
              const isOverdue = r.status === 'em_aberto' && isBefore(date, today)
              const isReceived = r.status === 'recebido'
              const isLast = idx === filtered.length - 1

              return (
                <div
                  key={r.id}
                  className={`flex items-stretch ${!isLast ? 'border-b border-gray-200' : ''} ${
                    isReceived ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-center px-3">
                    <input type="checkbox" className="w-4 h-4" disabled />
                  </div>

                  <div className="flex flex-col items-center justify-center px-3 py-3 min-w-[70px]">
                    <div className={`text-2xl font-bold leading-none ${isOverdue ? 'text-red-600' : 'text-blue-700'}`}>{day}</div>
                    <div className="text-xs font-bold text-gray-500 mt-1">{month}</div>
                    <div className="text-xs text-gray-500">{year}</div>
                  </div>

                  <div className="flex-1 px-3 py-3 min-w-0">
                    <div className="text-sm font-semibold text-blue-700">
                      {PAYMENT_LABEL[r.payment_method || ''] || r.payment_method || 'Carteira'}
                      {r.title_number && <span className="text-xs text-gray-500 ml-2">{r.title_number}</span>}
                    </div>
                    <div className="text-xs text-blue-600 mt-0.5">
                      {r.plan_account} → {r.professional}
                    </div>
                    <button className="text-xs text-blue-500 hover:underline mt-1 flex items-center gap-1">
                      ❯ Informações Adicionais
                    </button>
                  </div>

                  <div className="flex items-center px-4 py-3 min-w-[140px] justify-end gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">R$</div>
                      <div className={`font-bold text-lg ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                        {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    {r.status === 'em_aberto' && (
                      <button
                        onClick={() => setReceiptOn(r)}
                        title="Efetuar Recebimento"
                        className="w-10 h-10 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center text-lg transition"
                      >
                        💵
                      </button>
                    )}
                    {isReceived && (
                      <span className="text-xs text-green-700 font-bold uppercase">✓ Recebido</span>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="bg-gray-50 border-t-2 border-gray-300 px-4 py-3 flex justify-between items-baseline">
              <span className="text-xs text-gray-600 uppercase">{filtered.length} {filtered.length === 1 ? 'Título' : 'Títulos'}</span>
              <span className="font-bold text-gray-800">
                Total <span className="text-lg text-green-700">R$ {filtered.reduce((a, b) => a + b.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {receiptOn && (
        <ReceiptModal
          receivable={receiptOn}
          patientName={patientName}
          onProcessed={() => { setReceiptOn(null); load() }}
          onClose={() => setReceiptOn(null)}
        />
      )}
    </div>
  )
}
