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
    landline: (patient as any)?.landline || '',
    email: (patient as any)?.email || '',
    birth_date: (patient as any)?.birth_date || '',
    patient_code: (patient as any)?.patient_code || '',
    nickname: (patient as any)?.nickname || '',
    street: patient?.street || '',
    number: patient?.number || '',
    complement: (patient as any)?.complement || '',
    neighborhood: patient?.neighborhood || '',
    city: (patient as any)?.city || 'Rio de Janeiro',
    zip_code: (patient as any)?.zip_code || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Limpar campos vazios para não salvar string vazia em vez de NULL
      const payload: any = {}
      Object.entries(formData).forEach(([key, value]) => {
        if (value && value.toString().trim() !== '') {
          payload[key] = value
        } else if (key === 'name' || key === 'gender') {
          payload[key] = value
        }
      })

      // CPF obrigatório - gerar temporário se vazio
      if (!payload.cpf) {
        payload.cpf = String(Date.now()).slice(-11)
      }

      if (patient) {
        const { error } = await supabase
          .from('patients')
          .update(payload)
          .eq('id', patient.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('patients')
          .insert([payload])
        if (error) throw error
      }
      onSuccess()
    } catch (error: any) {
      console.error('Erro:', error)
      alert(`Erro ao salvar paciente: ${error?.message || 'Desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* DADOS PESSOAIS */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
          👤 Dados Pessoais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Nome completo"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Apelido</label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="Como gosta de ser chamado"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nº Prontuário</label>
            <input
              type="text"
              name="patient_code"
              value={formData.patient_code}
              onChange={handleChange}
              placeholder="Ex: 7646"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">CPF</label>
            <input
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              placeholder="123.456.789-00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Sexo</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Data de Nascimento</label>
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* CONTATO */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
          📞 Contato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📱 WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(21) 99999-9999"
              className="w-full px-4 py-2 border-2 border-green-300 bg-green-50 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            />
            <p className="text-xs text-green-700 mt-1 font-medium">
              💬 Usado para envio de confirmações de consulta
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">📞 Telefone Fixo</label>
            <input
              type="tel"
              name="landline"
              value={formData.landline}
              onChange={handleChange}
              placeholder="(21) 3333-3333"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">✉️ Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@exemplo.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* ENDEREÇO */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
          🏠 Endereço
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Rua / Avenida</label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              placeholder="Ex: Rua das Flores"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Número</label>
            <input
              type="text"
              name="number"
              value={formData.number}
              onChange={handleChange}
              placeholder="123"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-gray-700 mb-2">Complemento</label>
            <input
              type="text"
              name="complement"
              value={formData.complement}
              onChange={handleChange}
              placeholder="Ap 302, Bloco A"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Bairro</label>
            <input
              type="text"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleChange}
              placeholder="Centro"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Cidade</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Rio de Janeiro"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">CEP</label>
            <input
              type="text"
              name="zip_code"
              value={formData.zip_code}
              onChange={handleChange}
              placeholder="22000-000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* BOTÕES */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-bold transition shadow-md"
        >
          {loading ? '⏳ Salvando...' : patient ? '✏️ Atualizar Paciente' : '✅ Criar Paciente'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-bold transition"
        >
          ❌ Cancelar
        </button>
      </div>
    </form>
  )
}
