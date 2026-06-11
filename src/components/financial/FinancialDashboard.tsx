import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO, startOfMonth, endOfMonth, startOfToday, isBefore } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Stats {
  monthRevenue: number       // recebido no mês
  openTotal: number          // títulos em aberto
  overdueTotal: number       // títulos vencidos
  receivedCount: number
  openCount: number
  overdueCount: number
  topPatients: { name: string; total: number }[]
  byMethod: { method: string; total: number }[]
}

const METHOD_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'PIX',
  cartao_debito: 'Cartão Débito',
  cartao_credito_rotativo: 'Cartão Crédito (Rotativo)',
  cartao_credito_parcelado: 'Cartão Crédito (Parcelado)',
  cartao_credito_recorrente: 'Cartão Crédito (Recorrente)',
  deposito: 'Depósito', transferencia: 'Transferência',
  boleto: 'Boleto', credito_em_conta: 'Crédito em Conta'
}

export function FinancialDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const now = new Date()
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
    const today = format(startOfToday(), 'yyyy-MM-dd')

    const [recvRes, openRes, receiptsRes] = await Promise.all([
      // Tudo recebido no mês
      supabase
        .from('receipts')
        .select('amount, receipt_method, patient_id, patients(name)')
        .gte('paid_at', monthStart)
        .lte('paid_at', monthEnd),
      // Tudo em aberto (não recebido, não cancelado)
      supabase
        .from('accounts_receivable')
        .select('amount, due_date, status')
        .eq('status', 'em_aberto')
        .is('deleted_at', null),
      // Todos recebimentos (para topPatients)
      supabase
        .from('receipts')
        .select('amount, patient_id, patients(name)')
    ])

    const monthRevenue = (recvRes.data || []).reduce((acc: number, r: any) => acc + (r.amount || 0), 0)
    const receivedCount = recvRes.data?.length || 0

    const openItems = openRes.data || []
    const openTotal = openItems.reduce((acc: number, r: any) => acc + (r.amount || 0), 0)
    const openCount = openItems.length
    const overdueItems = openItems.filter((r: any) => isBefore(parseISO(r.due_date), startOfToday()))
    const overdueTotal = overdueItems.reduce((acc: number, r: any) => acc + (r.amount || 0), 0)
    const overdueCount = overdueItems.length

    // Top pacientes por receita
    const patientMap: Record<string, { name: string; total: number }> = {}
    ;(receiptsRes.data || []).forEach((r: any) => {
      const name = r.patients?.name || '—'
      if (!patientMap[r.patient_id]) patientMap[r.patient_id] = { name, total: 0 }
      patientMap[r.patient_id].total += r.amount || 0
    })
    const topPatients = Object.values(patientMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Por método (mês atual)
    const methodMap: Record<string, number> = {}
    ;(recvRes.data || []).forEach((r: any) => {
      const m = r.receipt_method || 'outro'
      methodMap[m] = (methodMap[m] || 0) + (r.amount || 0)
    })
    const byMethod = Object.entries(methodMap)
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total)

    setStats({ monthRevenue, openTotal, overdueTotal, receivedCount, openCount, overdueCount, topPatients, byMethod })
    setLoading(false)
  }

  if (loading || !stats) {
    return <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">⏳ Carregando...</div>
  }

  const monthName = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })
  const maxMethodValue = Math.max(...stats.byMethod.map(m => m.total), 1)

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KPI label={`Receita em ${monthName}`} value={stats.monthRevenue} count={stats.receivedCount} color="green" icon="📈" />
        <KPI label="Em Aberto" value={stats.openTotal} count={stats.openCount} color="blue" icon="⏳" />
        <KPI label="Vencidos" value={stats.overdueTotal} count={stats.overdueCount} color="red" icon="⚠️" />
      </div>

      {/* Top Pacientes */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          🏆 Top 5 Pacientes (faturamento total)
        </h3>
        {stats.topPatients.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-6">Nenhum recebimento ainda</div>
        ) : (
          <div className="space-y-2">
            {stats.topPatients.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                  ['bg-yellow-500', 'bg-gray-400', 'bg-orange-700', 'bg-blue-500', 'bg-purple-500'][i]
                }`}>{i + 1}</div>
                <div className="flex-1 font-medium text-gray-800">{p.name}</div>
                <div className="font-bold text-green-700">R$ {p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Por método de pagamento */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          💳 Recebimentos por método ({monthName})
        </h3>
        {stats.byMethod.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-6">Sem dados no mês</div>
        ) : (
          <div className="space-y-2">
            {stats.byMethod.map(m => (
              <div key={m.method}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{METHOD_LABEL[m.method] || m.method}</span>
                  <span className="font-bold text-gray-800">R$ {m.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(m.total / maxMethodValue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function KPI({ label, value, count, color, icon }: { label: string; value: number; count: number; color: string; icon: string }) {
  const colors: Record<string, string> = {
    green: 'border-green-200 bg-green-50',
    blue: 'border-blue-200 bg-blue-50',
    red: 'border-red-200 bg-red-50'
  }
  const text: Record<string, string> = {
    green: 'text-green-700',
    blue: 'text-blue-700',
    red: 'text-red-700'
  }
  return (
    <div className={`rounded-xl border-2 ${colors[color]} p-4`}>
      <div className="text-xs uppercase font-bold text-gray-600 flex items-center gap-1">
        <span>{icon}</span> {label}
      </div>
      <div className={`text-2xl font-bold mt-2 ${text[color]}`}>
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </div>
      <div className="text-xs text-gray-500 mt-1">{count} {count === 1 ? 'título' : 'títulos'}</div>
    </div>
  )
}
