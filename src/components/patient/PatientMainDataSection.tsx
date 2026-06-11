import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  patient: any
  onUpdate: () => void
}

export function PatientMainDataSection({ patient, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    name: patient.name || '',
    nickname: patient.nickname || '',
    gender: patient.gender || 'M',
    birth_date: patient.birth_date || '',
    marital_status: patient.marital_status || '',
    profession: patient.profession || '',
    email: patient.email || '',
    naturalidade: patient.naturalidade || '',
    nacionalidade: patient.nacionalidade || 'Brasileira',
    observations: patient.observations || ''
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = {}
      Object.entries(data).forEach(([k, v]) => {
        if (v && v.toString().trim() !== '') payload[k] = v
        else payload[k] = null
      })
      payload.name = data.name  // sempre salva nome
      payload.gender = data.gender  // sempre salva gender

      const { error } = await supabase.from('patients').update(payload).eq('id', patient.id)
      if (error) throw error
      setEditing(false)
      onUpdate()
    } catch (err: any) {
      alert(`Erro: ${err?.message || ''}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Dados Principais</h3>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded text-sm font-bold flex items-center gap-1"
          >
            <span>✏️</span> Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(false); setData({
                name: patient.name || '', nickname: patient.nickname || '', gender: patient.gender || 'M',
                birth_date: patient.birth_date || '', marital_status: patient.marital_status || '',
                profession: patient.profession || '', email: patient.email || '',
                naturalidade: patient.naturalidade || '', nacionalidade: patient.nacionalidade || 'Brasileira',
                observations: patient.observations || ''
              }) }}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm font-bold"
            >
              {saving ? 'Salvando...' : '💾 Salvar'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-200">
        <FieldRow label="Apelido" editing={editing} value={data.nickname} onChange={(v) => setData({...data, nickname: v})} />
        <FieldRow label="Nome Completo" editing={editing} value={data.name} onChange={(v) => setData({...data, name: v})} required />
        <FieldRow label="Sexo" editing={editing} value={data.gender === 'M' ? 'Masculino' : 'Feminino'} type="gender" rawValue={data.gender} onChange={(v) => setData({...data, gender: v})} />
        <FieldRow label="Data de Nascimento" editing={editing} value={data.birth_date} type="date" onChange={(v) => setData({...data, birth_date: v})} />
        <FieldRow label="Estado Civil" editing={editing} value={data.marital_status} type="marital" onChange={(v) => setData({...data, marital_status: v})} />
        <FieldRow label="Profissão" editing={editing} value={data.profession} onChange={(v) => setData({...data, profession: v})} />
        <FieldRow label="Email" editing={editing} value={data.email} type="email" onChange={(v) => setData({...data, email: v})} />
        <FieldRow label="Naturalidade" editing={editing} value={data.naturalidade} onChange={(v) => setData({...data, naturalidade: v})} />
        <FieldRow label="Nacionalidade" editing={editing} value={data.nacionalidade} onChange={(v) => setData({...data, nacionalidade: v})} />
        <FieldRow label="Observações" editing={editing} value={data.observations} type="textarea" onChange={(v) => setData({...data, observations: v})} />
      </div>
    </div>
  )
}

function FieldRow({ label, value, editing, onChange, type = 'text', rawValue, required }: any) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-3 py-2.5 hover:bg-white transition">
      <div className="text-sm font-medium text-gray-600">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </div>
      <div className="sm:col-span-2">
        {!editing ? (
          <span className="text-gray-900 font-medium">{value || '—'}</span>
        ) : type === 'gender' ? (
          <select
            value={rawValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
          >
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        ) : type === 'marital' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
          >
            <option value="">—</option>
            <option value="Solteiro(a)">Solteiro(a)</option>
            <option value="Casado(a)">Casado(a)</option>
            <option value="Divorciado(a)">Divorciado(a)</option>
            <option value="Viúvo(a)">Viúvo(a)</option>
            <option value="União Estável">União Estável</option>
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-y"
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
            required={required}
          />
        )}
      </div>
    </div>
  )
}
