import { useState } from 'react'
import { AdministrationClinicData } from '@/components/administration/AdministrationClinicData'
import { AdministrationNfseServices } from '@/components/administration/AdministrationNfseServices'
import { AdministrationNfseTaxRates } from '@/components/administration/AdministrationNfseTaxRates'

type Section = 'clinic_data' | 'nfse_services' | 'nfse_tax_rates'

export default function Administration() {
  const [section, setSection] = useState<Section>('clinic_data')

  const sections: { id: Section; label: string; icon: string }[] = [
    { id: 'clinic_data', label: 'Dados da Clínica', icon: '🏥' },
    { id: 'nfse_services', label: 'Serviços NFS-e', icon: '🧾' },
    { id: 'nfse_tax_rates', label: 'Alíquotas NFS-e', icon: '📊' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          ⚙️ Administração
        </h1>

        {/* Sidebar */}
        <div className="flex flex-col lg:flex-row gap-4">
          <aside className="lg:w-56 flex-shrink-0">
            <nav className="bg-blue-900 text-white rounded-xl p-2 shadow-sm">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 mb-1 ${
                    section === s.id
                      ? 'bg-blue-500 shadow-inner'
                      : 'text-blue-100 hover:bg-blue-800'
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Conteúdo */}
          <main className="flex-1 min-w-0">
            {section === 'clinic_data' && <AdministrationClinicData />}
            {section === 'nfse_services' && <AdministrationNfseServices />}
            {section === 'nfse_tax_rates' && <AdministrationNfseTaxRates />}
          </main>
        </div>
      </div>
    </div>
  )
}
