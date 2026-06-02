import { useState, useEffect } from 'react'
import type { Patient } from '@/lib/supabase'

interface PatientSearchProps {
  patients: Patient[]
  onSelect: (patient: Patient) => void
  onNewPatient?: (name: string) => void
}

export function PatientSearch({ patients, onSelect, onNewPatient }: PatientSearchProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf?.includes(search)
  )

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setSearch(patient.name)
    setIsOpen(false)
    onSelect(patient)
  }

  const handleCreateNew = () => {
    if (search.trim() && onNewPatient) {
      onNewPatient(search)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Procurar paciente..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setIsOpen(true)
          if (e.target.value !== selectedPatient?.name) {
            setSelectedPatient(null)
          }
        }}
        onFocus={() => setIsOpen(true)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {isOpen && search && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
          {filtered.length > 0 ? (
            <>
              {filtered.map(patient => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handleSelectPatient(patient)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition"
                >
                  <div className="font-medium text-gray-900">{patient.name}</div>
                  <div className="text-sm text-gray-500">
                    CPF: {patient.cpf} • Tel: {patient.phone || '—'}
                  </div>
                </button>
              ))}
            </>
          ) : (
            <>
              {search.trim() && onNewPatient && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="w-full text-left px-4 py-3 text-blue-600 hover:bg-blue-50 font-medium transition border-b border-gray-100"
                >
                  + Criar novo paciente: "{search}"
                </button>
              )}
              {search.trim() && !onNewPatient && (
                <div className="px-4 py-3 text-gray-500 text-sm text-center">
                  Nenhum paciente encontrado
                </div>
              )}
            </>
          )}
        </div>
      )}

      {selectedPatient && !isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="font-medium text-gray-900">{selectedPatient.name}</div>
          <div className="text-sm text-gray-500">CPF: {selectedPatient.cpf}</div>
          <div className="text-sm text-gray-500">Tel: {selectedPatient.phone || '—'}</div>
        </div>
      )}
    </div>
  )
}
