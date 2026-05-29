import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard,
  Target, Lightbulb, Bell, Landmark, CalendarCheck,
} from 'lucide-react';

const navItems = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { path: '/contas',       icon: Landmark,        label: 'Contas'       },
  { path: '/transacoes',   icon: ArrowLeftRight,  label: 'Transações'   },
  { path: '/contas-fixas', icon: CalendarCheck,   label: 'Contas Fixas' },
  { path: '/dividas',      icon: CreditCard,      label: 'Dívidas'      },
  { path: '/orcamento',    icon: Target,          label: 'Orçamento'    },
  { path: '/insights',     icon: Lightbulb,       label: 'Insights'     },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-16 lg:w-56 fixed top-0 left-0 h-full border-r border-border/50 bg-card/40 backdrop-blur-xl flex flex-col py-5 z-50">
        <div className="px-4 mb-8">
          <h1 className="text-xl font-display font-bold hidden lg:block tracking-tight">
            <span className="text-primary">Fin</span>Hub
          </h1>
          <span className="text-primary font-bold text-xl lg:hidden">F</span>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  active
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="hidden lg:block text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 mt-4 hidden lg:block">
          <p className="text-xs text-muted-foreground/50">FinHub v2.0</p>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 ml-16 lg:ml-56 min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-border/50 px-6 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
          <div className="flex items-center justify-end gap-2">
            <button
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Notificações"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">VC</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
