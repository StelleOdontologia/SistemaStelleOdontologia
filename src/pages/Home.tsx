import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            Dashboard
          </h1>
          <p className="text-lg text-blue-700">
            Bem-vindo ao Sistema de Gestão da Stelle Odontologia
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/pacientes"
            className="p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition text-center"
          >
            <div className="text-4xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">
              Pacientes
            </h2>
            <p className="text-gray-600">
              Gerenciar cadastro de pacientes
            </p>
          </Link>

          <Link
            to="/agendamentos"
            className="p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition text-center"
          >
            <div className="text-4xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">
              Agendamentos
            </h2>
            <p className="text-gray-600">
              Visualizar e gerenciar agendamentos
            </p>
          </Link>

          <Link
            to="/fluxo"
            className="p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition text-center"
          >
            <div className="text-4xl mb-4">⏱️</div>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">
              Fluxo na Clínica
            </h2>
            <p className="text-gray-600">
              Gerenciar fluxo do dia com cronômetros
            </p>
          </Link>
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow">
          <h3 className="font-bold text-gray-900 mb-2">Status do Sistema</h3>
          <p className="text-sm text-gray-600">
            ✅ Supabase conectado<br/>
            ✅ Domínio configurado<br/>
            ✅ Deploy ao vivo
          </p>
        </div>
      </div>
    </div>
  )
}
