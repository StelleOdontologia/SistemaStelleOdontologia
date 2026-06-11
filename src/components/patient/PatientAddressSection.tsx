import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  patient: any
  onUpdate: () => void
}

export function PatientAddressSection({ patient, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    street: patient.street || '',
    number: patient.number || '',
    complement: patient.complement || '',
    neighborhood: patient.neighborhood || '',
    city: patient.city || 'Rio de Janeiro',
    zip_code: patient.zip_code || ''
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = {}
      Object.entries(data).forEach(([k, v]) => {
        payload[k] = v && v.toString().trim() ? v : null
      })
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
        <h3 className="text-xl font-bold text-gray-900">Endereço</h3>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded text-sm font-bold flex items-center gap-1">
            <span>✏️</span> Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-gray-200 rounded text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold">
              {saving ? '...' : '💾 Salvar'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-200">
        <Row label="CEP" value={data.zip_code} editing={editing} onChange={(v) => setData({...data, zip_code: v})} placeholder="22000-000" />
        <Row label="Rua / Avenida" value={data.street} editing={editing} onChange={(v) => setData({...data, street: v})} placeholder="Ex: Rua das Flores" />
        <Row label="Número" value={data.number} editing={editing} onChange={(v) => setData({...data, number: v})} placeholder="123" />
        <Row label="Complemento" value={data.complement} editing={editing} onChange={(v) => setData({...data, complement: v})} placeholder="Apto, Bloco..." />
        <Row label="Bairro" value={data.neighborhood} editing={editing} onChange={(v) => setData({...data, neighborhood: v})} />
        <Row label="Cidade" value={data.city} editing={editing} onChange={(v) => setData({...data, city: v})} />
      </div>
    </div>
  )
}

function Row({ label, value, editing, onChange, placeholder }: any) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-3 py-2.5">
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="sm:col-span-2">
        {!editing ? (
          <span className="text-gray-900 font-medium">{value || '—'}</span>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 placeholder-gray-400"
          />
        )}
      </div>
    </div>
  )
}
