import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type PeriodFilter = 'hoje' | 'ontem' | 'semana' | 'semana_passada' | 'mes' | 'personalizado'
type TimePeriod = 'hoje' | 'ontem' | 'esta_semana' | 'semana_passada' | string // 'YYYY-MM' para mes

interface Receipt {
  id: string
  paid_at: string
  receipt_method: string
  amount: number
  patient_id: string
  patients?: { name: string }
  observations?: string
}

interface DayGroup {
  date: string
  items: Receipt[]
  total: number
}

const RECEIPT_METHOD_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão de Débito',
  cartao_credito_rotativo: 'Cartão de Crédito - Rotativo',
  cartao_credito_parcelado: 'Cartão de Crédito - Parcelado',
  cartao_credito_recorrente: 'Cartão de Crédito - Recorrente',
  deposito: 'Depósito em Conta',
  transferencia: 'Transferência Bancária',
  boleto: 'Boleto',
  credito_em_conta: 'Crédito em Conta'
}

const MONTHS = [
  { num: 1, label: 'Janeiro' },
  { num: 2, label: 'Fevereiro' },
  { num: 3, label: 'Março' },
  { num: 4, label: 'Abril' },
  { num: 5, label: 'Maio' },
  { num: 6, label: 'Junho' },
  { num: 7, label: 'Julho' },
  { num: 8, label: 'Agosto' },
  { num: 9, label: 'Setembro' },
  { num: 10, label: 'Outubro' },
  { num: 11, label: 'Novembro' },
  { num: 12, label: 'Dezembro' }
]

export function ReceiptsPanel() {
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('mes')
  const [selectedMonth, setSelectedMonth] = useState<string>(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
  const [selectedMethods, setSelectedMethods] = useState<Record<string, boolean>>({})

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('receipts')
      .select(`*, patients:patient_id (name)`)
      .order('paid_at', { ascending: false })
    const receipts = data || []
    setAllReceipts(receipts)

    // Inicializa seleção de métodos (todos checked)
    const methods: Record<string, boolean> = {}
    receipts.forEach(r => {
      const m = r.receipt_method || 'outro'
      if (!(m in methods)) methods[m] = true
    })
    setSelectedMethods(methods)
    setLoading(false)
  }

  // Calcula período conforme filtro
  const getDateRange = (): [Date, Date] => {
    const now = new Date()
    switch (periodFilter) {
      case 'hoje':
        return [startOfDay(now), endOfDay(now)]
      case 'ontem':
        return [startOfDay(subDays(now, 1)), endOfDay(subDays(now, 1))]
      case 'semana':
        return [startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })]
      case 'semana_passada':
        const lastWeekStart = subDays(startOfWeek(now, { weekStartsOn: 1 }), 7)
        return [lastWeekStart, endOfWeek(lastWeekStart, { weekStartsOn: 1 })]
      case 'mes': {
        const [year, month] = selectedMonth.split('-').map(Number)
        const date = new Date(year, month - 1, 1)
        return [startOfMonth(date), endOfMonth(date)]
      }
      default:
        return [startOfMonth(now), endOfMonth(now)]
    }
  }

  const [startDate, endDate] = getDateRange()
  const filtered = allReceipts.filter(r => {
    const d = parseISO(r.paid_at)
    const inRange = d >= startDate && d <= endDate
    const methodOk = selectedMethods[r.receipt_method] ?? true
    return inRange && methodOk
  })

  // Agrupa por data
  const grouped = filtered.reduce((acc: Record<string, Receipt[]>, r) => {
    const day = r.paid_at.split('T')[0]
    if (!acc[day]) acc[day] = []
    acc[day].push(r)
    return acc
  }, {})

  const dayGroups: DayGroup[] = Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, items]) => ({
      date: day,
      items: items.sort((a, b) => (b.amount || 0) - (a.amount || 0)),
      total: items.reduce((sum, i) => sum + (i.amount || 0), 0)
    }))

  // Estatísticas por método
  const methodStats = Object.entries(
    filtered.reduce((acc: Record<string, { count: number; total: number }>, r) => {
      const m = r.receipt_method || 'outro'
      if (!acc[m]) acc[m] = { count: 0, total: 0 }
      acc[m].count++
      acc[m].total += r.amount || 0
      return acc
    }, {})
  )
    .map(([method, stats]) => ({
      method,
      ...stats,
      percentage: ((stats.total / (filtered.reduce((sum, r) => sum + (r.amount || 0), 0) || 1)) * 100).toFixed(1)
    }))
    .sort((a, b) => b.total - a.total)

  const totalReceipts = filtered.reduce((sum, r) => sum + (r.amount || 0), 0)
  const periodLabel = periodFilter === 'mes'
    ? `em ${MONTHS.find(m => m.num === parseInt(selectedMonth.split('-')[1]))?.label}`
    : 'no Período'

  // Opções de período rápido
  const now = new Date()
  const months = [...Array(12)].map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Sidebar filtros */}
      <aside className="lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-4">
          {/* Período rápido */}
          <div>
            <div className="text-xs font-bold text-gray-600 uppercase mb-2">Período Rápido</div>
            <div className="space-y-1">
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'ontem', label: 'Ontem' },
                { id: 'semana', label: 'Esta Semana' },
                { id: 'semana_passada', label: 'Semana Passada' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPeriodFilter(p.id as PeriodFilter); setSelectedMonth(selectedMonth) }}
                  className={`block w-full text-left px-2 py-1.5 rounded text-sm transition ${
                    periodFilter === p.id
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meses */}
          <div className="border-t border-gray-200 pt-3">
            <div className="text-xs font-bold text-gray-600 uppercase mb-2">Meses</div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {months.map(m => {
                const [year, month] = m.split('-').map(Number)
                const monthLabel = MONTHS.find(mo => mo.num === month)?.label || ''
                const monthReceipts = allReceipts.filter(r => {
                  const d = parseISO(r.paid_at)
                  return d.getFullYear() === year && d.getMonth() === month - 1
                })
                const monthTotal = monthReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
                const isSelected = periodFilter === 'mes' && selectedMonth === m

                return (
                  <button
                    key={m}
                    onClick={() => { setPeriodFilter('mes'); setSelectedMonth(m) }}
                    className={`block w-full text-left px-2 py-1.5 rounded text-sm transition ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{monthLabel}</div>
                    <div className="text-xs text-gray-500">R$ {monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Recebidos {periodLabel}</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">⏳ Carregando...</div>
        ) : (
          <>
            {/* Espécies de Recebimento */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <h3 className="font-bold text-gray-900 mb-3">Espécies de Recebimento</h3>
              <div className="space-y-2">
                {methodStats.map(m => (
                  <label key={m.method} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMethods[m.method] ?? true}
                      onChange={e => setSelectedMethods({ ...selectedMethods, [m.method]: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <div className="flex-1 flex items-baseline gap-2">
                      <span className="text-sm text-gray-700">{RECEIPT_METHOD_LABEL[m.method] || m.method}</span>
                      <span className="text-xs text-gray-500">({m.count})</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">R$ {m.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="text-xs text-gray-500">{m.percentage}%</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-3 pt-3 font-bold text-gray-900 flex justify-between">
                <span>Total dos Recebimentos ({filtered.length})</span>
                <span className="text-blue-700 text-lg">R$ {totalReceipts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Lista por data */}
            {dayGroups.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-5xl mb-3 opacity-40">📭</div>
                <p>Nenhum recebimento neste período</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dayGroups.map(day => {
                  const d = parseISO(day.date)
                  const dayNum = format(d, 'dd')
                  const monthStr = format(d, 'MMM', { locale: ptBR }).toUpperCase()
                  const year = format(d, 'yyyy')

                  return (
                    <div key={day.date} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex items-center gap-4 p-4 border-b border-gray-200">
                        <div className="flex flex-col items-center min-w-[80px]">
                          <div className="text-2xl font-bold text-gray-900">{dayNum}</div>
                          <div className="text-xs text-gray-500 uppercase">{monthStr} {year}</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 uppercase">Recebimentos neste dia</div>
                          <div className="font-bold text-gray-900">{day.items.length} {day.items.length === 1 ? 'movimento' : 'movimentos'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Total</div>
                          <div className="text-lg font-bold text-green-700">R$ {day.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-200">
                        {day.items.map((r, idx) => (
                          <div key={r.id} className="p-4 hover:bg-gray-50 transition">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-blue-700">{RECEIPT_METHOD_LABEL[r.receipt_method] || r.receipt_method}</div>
                                <div className="text-sm text-gray-600 mt-0.5">{r.patients?.name || '—'}</div>
                                {r.observations && (
                                  <div className="text-xs text-gray-500 mt-1 truncate">{r.observations}</div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="font-bold text-gray-900">R$ {(r.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
