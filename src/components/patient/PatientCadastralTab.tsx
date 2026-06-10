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
    <div className="flex flex-col md:flex-row gap-4">
      {/* Sidebar */}
      <div className="md:w-56 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-1 gap-1">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`text-left px-3 py-2 rounded text-sm transition flex items-center gap-2 ${
                activeSubTab === tab.id
                  ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        {activeSubTab === 'main' && <PatientMainDataSection patient={patient} onUpdate={onUpdate} />}
        {activeSubTab === 'documentation' && <PatientDocumentationSection patient={patient} onUpdate={onUpdate} />}
        {activeSubTab === 'phones' && <PatientPhonesSection patient={patient} onUpdate={onUpdate} />}
        {activeSubTab === 'addresses' && <PatientAddressSection patient={patient} onUpdate={onUpdate} />}
        {activeSubTab === 'relationships' && <PatientRelationshipsSection patient={patient} />}
      </div>
    </div>
  )
}
