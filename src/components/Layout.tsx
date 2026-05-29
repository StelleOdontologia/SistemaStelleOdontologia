import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const menuItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/pacientes', icon: '👥', label: 'Pacientes' },
    { path: '/agendamentos', icon: '📅', label: 'Agendamentos' },
    { path: '/fluxo', icon: '⏱️', label: 'Fluxo na Clínica' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Superior */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🦷</div>
            <h1 className="text-2xl font-bold">Stelle Odontologia</h1>
          </div>
          <nav className="hidden md:flex gap-6">
            {menuItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  location.pathname === item.path
                    ? 'bg-white text-blue-600'
                    : 'text-white hover:bg-blue-500'
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Menu Mobile */}
        <div className="md:hidden px-4 pb-3 flex gap-2 overflow-x-auto">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                location.pathname === item.path
                  ? 'bg-white text-blue-600'
                  : 'text-white hover:bg-blue-500'
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="min-h-screen">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 text-center py-4 mt-12">
        <p className="text-sm">Stelle Odontologia © 2026 | Sistema de Gestão de Clínica</p>
      </footer>
    </div>
  )
}
