import { useState } from 'react'
import { PatientRelationshipsSection } from './PatientRelationshipsSection'
import { PatientMainDataSection } from './PatientMainDataSection'
import { PatientDocumentationSection } from './PatientDocumentationSection'
import { PatientAddressSection } from './PatientAddressSection'
import { PatientPhonesSection } from './PatientPhonesSection'

interface PatientCadastralTabProps {
  patient: any
  onUpdate: () => void
}

type SubTab = 'main' | 'documentation' | 'phones' | 'addresses' | 'relationships'

export function PatientCadastralTab({ patient, onUpdate }: PatientCadastralTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('main')

  const subTabs: { id: SubTab; label: string; icon: string }[] = [
    { id: 'main', label: 'Dados Principais', icon: '📇' },
    { id: 'documentation', label: 'Documentação', icon: '📄' },
    { id: 'phones', label: 'Telefones', icon: '📱' },
    { id: 'addresses', label: 'Endereço', icon: '📍' },
    { id: 'relationships', label: 'Relacionamentos', icon: '👨‍👩‍👧‍👦' }
  ]

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 -mx-4 -my-5 md:m-0">
      {/* Sidebar vertical */}
      <aside className="md:w-60 flex-shrink-0 bg-white md:bg-transparent md:border-r border-gray-200 md:pr-2">
        {/* Mobile: dropdown horizontal scrollável */}
        <div className="md:hidden border-b border-gray-200 px-4 py-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {subTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition flex items-center gap-2 ${
                  activeSubTab === tab.id
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-300'
                    : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: sidebar vertical */}
        <nav className="hidden md:flex flex-col gap-0.5 py-2">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`text-left pl-4 pr-3 py-2.5 rounded-r-lg text-sm transition flex items-center gap-3 border-l-4 ${
                activeSubTab === tab.id
                  ? 'bg-blue-50 text-blue-700 font-bold border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 border-transparent hover:border-blue-200'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 px-4 md:px-0 py-4 md:py-2">
        {activeSubTab === 'main' && <PatientMainDataSection patient={patient} onUpdate={onUpdate} />}
        {activeSubTab === 'documentation' && <PatientDocumentationSection patient={patient} onUpdate={onUpdate} />}
        {activeSubTab === 'phones' && <PatientPhonesSection patient={patient} onUpdate={onUpdate} />}
        {activeSubTab === 'addresses' && <PatientAddressSection patient={patient} onUpdate={onUpdate} />}
        {activeSubTab === 'relationships' && <PatientRelationshipsSection patient={patient} />}
      </div>
    </div>
  )
}
