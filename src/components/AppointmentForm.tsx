import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Patient } from '@/lib/supabase'
import { PatientSearch } from './PatientSearch'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [newPatientName, setNewPatientName] = useState('')
  const [formData, setFormData] = useState({
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

    if (!selectedPatient && !newPatientName.trim()) {
      alert('Selecione ou crie um paciente')
      return
    }

    if (!formData.procedure) {
      alert('Informe o procedimento')
      return
    }

    setLoading(true)

    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const patientId = selectedPatient?.id || await createQuickPatient()

      if (!patientId) {
        alert('Erro ao processar paciente')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('appointments')
        .insert([{
          patient_id: patientId,
          appointment_date: dateStr,
          appointment_time: time,
          duration_minutes: parseInt(formData.duration_minutes),
          procedure: formData.procedure,
          status: 'scheduled',
          observations: formData.observations,
          professional_id: '00000000-0000-0000-0000-000000000000',
          whatsapp_confirmed: false
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

  const createQuickPatient = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([{
          name: newPatientName.trim(),
          cpf: '',
          gender: 'M',
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single()

      if (error) throw error
      return data?.id
    } catch (error) {
      console.error('Erro ao criar paciente rápido:', error)
      return null
    }
  }

  const procedureOptions = [
    'Consulta',
    'Limpeza',
    'Avaliação Cirurgia',
    'Avaliação Clínico',
    'Obturação',
    'Canal',
    'Extração',
    'Prótese',
    'Implante'
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Data e Hora */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Data e Hora</label>
        <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-900 font-medium">
            {format(date, 'EEEE, dd MMM yyyy', { locale: ptBR })} às <span className="font-bold">{time}</span>
          </p>
        </div>
      </div>

      {/* Busca de Paciente */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Paciente</label>
        <PatientSearch
          patients={patients}
          onSelect={setSelectedPatient}
          onNewPatient={setNewPatientName}
        />

        {/* Card do paciente selecionado */}
        {selectedPatient && (
          <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                👤
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{selectedPatient.name}</h4>
                <p className="text-sm text-gray-600">CPF: {selectedPatient.cpf}</p>
                {selectedPatient.phone && (
                  <p className="text-sm text-gray-600">Tel: {selectedPatient.phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Aviso para paciente novo */}
        {newPatientName && !selectedPatient && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">📋 Paciente Não Cadastrado</span>
              <br />
              Será cadastrado quando chegar para consulta
            </p>
          </div>
        )}
      </div>

      {/* Procedimento */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Atendimento</label>
        <select
          name="procedure"
          value={formData.procedure}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione...</option>
          {procedureOptions.map(proc => (
            <option key={proc} value={proc}>{proc}</option>
          ))}
        </select>
      </div>

      {/* Duração */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Duração</label>
        <select
          name="duration_minutes"
          value={formData.duration_minutes}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="15">15 minutos</option>
          <option value="30">30 minutos</option>
          <option value="45">45 minutos</option>
          <option value="60">1 hora</option>
          <option value="90">1h 30min</option>
          <option value="120">2 horas</option>
        </select>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Observações</label>
        <textarea
          name="observations"
          value={formData.observations}
          onChange={handleChange}
          placeholder="Notas adicionais sobre o agendamento..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading || (!selectedPatient && !newPatientName.trim())}
          className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {loading ? '⏳ Salvando...' : '✓ Salvar Agendamento'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
