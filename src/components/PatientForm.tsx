import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Patient } from '@/lib/supabase'

interface PatientFormProps {
  patient?: Patient
  onSuccess: () => void
  onCancel: () => void
}

export function PatientForm({ patient, onSuccess, onCancel }: PatientFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: patient?.name || '',
    cpf: patient?.cpf || '',
    gender: patient?.gender || 'M',
    phone: patient?.phone || '',
    street: patient?.street || '',
    number: patient?.number || '',
    neighborhood: patient?.neighborhood || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (patient) {
        // Editar paciente existente
        const { error } = await supabase
          .from('patients')
          .update(formData)
          .eq('id', patient.id)
        if (error) throw error
      } else {
        // Criar novo paciente
        const { error } = await supabase
          .from('patients')
          .insert([formData])
        if (error) throw error
      }
      onSuccess()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao salvar paciente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nome</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">CPF</label>
        <input
          type="text"
          name="cpf"
          value={formData.cpf}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Sexo</label>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Telefone</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Rua</label>
        <input
          type="text"
          name="street"
          value={formData.street}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Número</label>
        <input
          type="text"
          name="number"
          value={formData.number}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Bairro</label>
        <input
          type="text"
          name="neighborhood"
          value={formData.neighborhood}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : patient ? 'Atualizar' : 'Criar Paciente'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
