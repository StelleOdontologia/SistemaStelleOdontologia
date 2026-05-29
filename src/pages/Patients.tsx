import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Patient } from '@/lib/supabase'

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="p-8">Carregando...</div>

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Pacientes</h1>
      <p className="text-gray-600">Total: {patients.length} pacientes</p>
      
      <div className="mt-8">
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Novo Paciente
        </button>
      </div>

      <div className="mt-8 grid gap-4">
        {patients.map(patient => (
          <div key={patient.id} className="p-4 border rounded">
            <p className="font-bold">{patient.name}</p>
            <p className="text-sm text-gray-600">{patient.cpf}</p>
            <p className="text-sm text-gray-600">{patient.phone}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
