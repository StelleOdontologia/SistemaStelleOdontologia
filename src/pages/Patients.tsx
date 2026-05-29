import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PatientForm } from '@/components/PatientForm'
import type { Patient } from '@/lib/supabase'

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPatients(data || [])
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePatient = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este paciente?')) return

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadPatients()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert('Erro ao excluir paciente')
    }
  }

  if (loading) return <div className="p-8">Carregando...</div>

  if (showForm) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          {editingPatient ? 'Editar Paciente' : 'Novo Paciente'}
        </h1>
        <PatientForm
          patient={editingPatient || undefined}
          onSuccess={() => {
            setShowForm(false)
            setEditingPatient(null)
            loadPatients()
          }}
          onCancel={() => {
            setShowForm(false)
            setEditingPatient(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pacientes</h1>
          <p className="text-gray-600 mt-1">Total: {patients.length} pacientes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          + Novo Paciente
        </button>
      </div>

      <div className="grid gap-4">
        {patients.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum paciente cadastrado</p>
        ) : (
          patients.map(patient => (
            <div key={patient.id} className="p-4 border rounded-lg hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold text-lg">{patient.name}</p>
                  <p className="text-sm text-gray-600">CPF: {patient.cpf}</p>
                  {patient.phone && <p className="text-sm text-gray-600">Tel: {patient.phone}</p>}
                  {patient.street && (
                    <p className="text-sm text-gray-600">
                      {patient.street}, {patient.number} - {patient.neighborhood}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingPatient(patient)
                      setShowForm(true)
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeletePatient(patient.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
