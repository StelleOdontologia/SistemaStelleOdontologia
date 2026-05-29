import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Patient } from '@/lib/supabase'
import { format } from 'date-fns'

interface AppointmentFormProps {
  date: Date
  time: string
  patients: Patient[]
  onSuccess: () => void
  onCancel: () => void
}

export function AppointmentForm({
  date,
  time,
  patients,
  onSuccess,
  onCancel
}: AppointmentFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    procedure: '',
    duration_minutes: '30',
    observations: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.patient_id || !formData.procedure) {
      alert('Preencha paciente e procedimento')
      return
    }

    setLoading(true)

    try {
      const dateStr = format(date, 'yyyy-MM-dd')

      const { error } = await supabase
        .from('appointments')
        .insert([{
          patient_id: formData.patient_id,
          appointment_date: dateStr,
          appointment_time: time,
          duration_minutes: parseInt(formData.duration_minutes),
          procedure: formData.procedure,
          status: 'scheduled',
          observations: formData.observations,
          professional_id: '00000000-0000-0000-0000-000000000000'
        }])

      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao criar agendamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Data/Hora</label>
        <input
          type="text"
          disabled
          value={`${format(date, 'dd/MM/yyyy')} às ${time}`}
          className="w-full px-3 py-2 border rounded bg-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Paciente</label>
        <select
          name="patient_id"
          value={formData.patient_id}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">Selecione um paciente</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Procedimento</label>
        <input
          type="text"
          name="procedure"
          value={formData.procedure}
          onChange={handleChange}
          placeholder="Ex: Limpeza, Obturação, Consulta"
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Duração</label>
        <select
          name="duration_minutes"
          value={formData.duration_minutes}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="15">15 minutos</option>
          <option value="30">30 minutos</option>
          <option value="45">45 minutos</option>
          <option value="60">60 minutos</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Observações</label>
        <textarea
          name="observations"
          value={formData.observations}
          onChange={handleChange}
          placeholder="Notas adicionais..."
          rows={3}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Agendamento'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
