import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  patient: any
  onUpdate: () => void
}

export function PatientPhonesSection({ patient, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    phone: patient.phone || '',
    landline: patient.landline || ''
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('patients')
        .update({ phone: data.phone || null, landline: data.landline || null })
        .eq('id', patient.id)
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
        <h3 className="text-xl font-bold text-gray-900">Telefones</h3>
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
        <Row label="📱 WhatsApp" value={data.phone} editing={editing} onChange={(v) => setData({...data, phone: v})} placeholder="(21) 99999-9999" highlight />
        <Row label="📞 Telefone Fixo" value={data.landline} editing={editing} onChange={(v) => setData({...data, landline: v})} placeholder="(21) 3333-3333" />
      </div>

      {!editing && data.phone && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          💬 WhatsApp configurado para envio de confirmações de consulta.
        </div>
      )}
    </div>
  )
}

function Row({ label, value, editing, onChange, placeholder, highlight }: any) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 px-3 py-2.5 ${highlight && value ? 'bg-green-50' : ''}`}>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="sm:col-span-2">
        {!editing ? (
          <span className="text-gray-900 font-medium">{value || '—'}</span>
        ) : (
          <input
            type="tel"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-2 py-1 border rounded text-sm ${highlight ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
          />
        )}
      </div>
    </div>
  )
}
