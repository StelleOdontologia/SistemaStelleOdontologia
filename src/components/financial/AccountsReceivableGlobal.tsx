import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { format, parseISO, isBefore, startOfToday } from 'date-fns'
import { ReceiptModal } from './ReceiptModal'

type Filter = 'em_aberto' | 'vencidos' | 'a_vencer' | 'recebidos' | 'todos'

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
  patients?: { id: string; name: string }
}

const MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const PAYMENT_LABEL: Record<string, string> = {
  carteira: 'Carteira', dinheiro: 'Dinheiro', pix: 'PIX',
  cartao_credito: 'Cartão Crédito', cartao_debito: 'Cartão Débito',
  boleto: 'Boleto', cheque: 'Cheque', transferencia: 'Transferência'
}

export function AccountsReceivableGlobal() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Receivable[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('em_aberto')
  const [search, setSearch] = useState('')
  const [receiptOn, setReceiptOn] = useState<Receivable | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('accounts_receivable')
      .select(`*, patients:patient_id (id, name)`)
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

  const filtered = (() => {
    let base: Receivable[]
    switch (filter) {
      case 'vencidos': base = overdue; break
      case 'a_vencer': base = upcoming; break
      case 'em_aberto': base = open; break
      case 'recebidos': base = received; break
      default: base = items
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      base = base.filter(r =>
        r.patients?.name?.toLowerCase().includes(q) ||
        r.title_number?.toLowerCase().includes(q)
      )
    }
    return base
  })()

  const filtersDef: { id: Filter; label: string; count: number; color: string }[] = [
    { id: 'em_aberto', label: 'Em Aberto', count: open.length, color: 'bg-blue-100 text-blue-800' },
    { id: 'vencidos', label: 'Vencidos', count: overdue.length, color: 'bg-red-100 text-red-800' },
    { id: 'a_vencer', label: 'A Vencer', count: upcoming.length, color: 'bg-orange-100 text-orange-800' },
    { id: 'recebidos', label: 'Recebidos', count: received.length, color: 'bg-green-100 text-green-800' },
    { id: 'todos', label: 'Todos', count: items.length, color: 'bg-gray-100 text-gray-800' }
  ]

  const totalFiltered = filtered.reduce((acc, r) => acc + r.amount, 0)

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900 flex-1">Contas a Receber</h2>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar paciente ou nº título..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full md:w-72 text-gray-900"
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {filtersDef.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                filter === f.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${filter === f.id ? 'bg-white text-blue-700' : f.color}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">⏳ Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3 opacity-40">📭</div>
            <p className="text-sm">Nenhum título encontrado</p>
          </div>
        ) : (
          <>
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
                    isReceived ? 'bg-green-50' : isOverdue ? 'bg-red-50' : ''
                  }`}
                >
                  <div className="flex flex-col items-center justify-center px-3 py-3 min-w-[70px]">
                    <div className={`text-2xl font-bold leading-none ${isOverdue ? 'text-red-600' : 'text-blue-700'}`}>{day}</div>
                    <div className="text-xs font-bold text-gray-500 mt-1">{month}</div>
                    <div className="text-xs text-gray-500">{year}</div>
                  </div>

                  <div className="flex-1 px-3 py-3 min-w-0">
                    <button
                      onClick={() => r.patients?.id && navigate(`/pacientes/${r.patients.id}`)}
                      className="text-sm font-bold text-blue-700 hover:underline truncate block"
                    >
                      {r.patients?.name || '—'}
                    </button>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {PAYMENT_LABEL[r.payment_method || ''] || r.payment_method || 'Carteira'}
                      {r.title_number && <span className="text-gray-500 ml-2">{r.title_number}</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {r.plan_account} → {r.professional}
                    </div>
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
                Total <span className="text-lg text-green-700">R$ {totalFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
          </>
        )}
      </div>

      {receiptOn && (
        <ReceiptModal
          receivable={{
            id: receiptOn.id,
            patient_id: receiptOn.patient_id,
            title_number: receiptOn.title_number,
            due_date: receiptOn.due_date,
            amount: receiptOn.amount,
            payment_method: receiptOn.payment_method,
            plan_account: receiptOn.plan_account,
            professional: receiptOn.professional
          }}
          patientName={receiptOn.patients?.name || ''}
          onProcessed={() => { setReceiptOn(null); load() }}
          onClose={() => setReceiptOn(null)}
        />
      )}
    </div>
  )
}
