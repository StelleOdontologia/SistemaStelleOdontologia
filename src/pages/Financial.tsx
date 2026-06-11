import { useState } from 'react'
import { AccountsReceivableGlobal } from '@/components/financial/AccountsReceivableGlobal'
import { FinancialDashboard } from '@/components/financial/FinancialDashboard'
import { ReceiptsPanel } from '@/components/financial/ReceiptsPanel'

type Section =
  | 'dashboard'
  | 'faturamento'
  | 'contas_receber'
  | 'recebimentos'
  | 'contas_pagar'
  | 'fluxo_caixa'
  | 'comissionamentos'
  | 'fechamento_caixas'
  | 'caixa_administrativo'
  | 'conciliacao'
  | 'boletos'

export default function Financial() {
  const [section, setSection] = useState<Section>('dashboard')

  const sections: { id: Section; label: string; icon: string; available: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', available: true },
    { id: 'faturamento', label: 'Faturamento', icon: '🧾', available: false },
    { id: 'contas_receber', label: 'Contas a Receber', icon: '💰', available: true },
    { id: 'recebimentos', label: 'Recebimentos', icon: '💵', available: true },
    { id: 'contas_pagar', label: 'Contas a Pagar', icon: '💸', available: false },
    { id: 'fluxo_caixa', label: 'Fluxo de Caixa', icon: '📈', available: false },
    { id: 'comissionamentos', label: 'Comissionamentos', icon: '💼', available: false },
    { id: 'fechamento_caixas', label: 'Fechamento de Caixas', icon: '⚖️', available: false },
    { id: 'caixa_administrativo', label: 'Caixa Administrativo', icon: '🏛️', available: false },
    { id: 'conciliacao', label: 'Conciliação Bancária', icon: '🏦', available: false },
    { id: 'boletos', label: 'Controle Boletos', icon: '📄', available: false }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          💰 Gestão Financeira
        </h1>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="bg-blue-900 text-white rounded-xl p-2 shadow-sm">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => s.available && setSection(s.id)}
                  disabled={!s.available}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 mb-1 ${
                    section === s.id
                      ? 'bg-blue-500 shadow-inner'
                      : s.available
                      ? 'text-blue-100 hover:bg-blue-800'
                      : 'text-blue-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <span>{s.label}</span>
                  {!s.available && <span className="ml-auto text-xs opacity-75">em breve</span>}
                </button>
              ))}
            </nav>
          </aside>

          {/* Conteúdo */}
          <main className="flex-1 min-w-0">
            {section === 'dashboard' && <FinancialDashboard />}
            {section === 'contas_receber' && <AccountsReceivableGlobal />}
            {section === 'recebimentos' && <ReceiptsPanel />}
            {!['dashboard', 'contas_receber', 'recebimentos'].includes(section) && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="text-5xl mb-3 opacity-40">🚧</div>
                <p className="text-gray-500 font-medium">Esta seção está em desenvolvimento</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
