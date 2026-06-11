import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ClinicService {
  id?: string
  name: string
  description?: string
  nfse_code: string
  nfse_description: string
  accounting_code?: string
  accounting_description?: string
  is_active: boolean
}

const DEFAULT_SERVICES: ClinicService[] = [
  {
    name: 'Prevenção',
    description: 'Tratamento Odontológico de Prevenção',
    nfse_code: '0301',
    nfse_description: 'Aluguel de Equipamentos Científicos, Médicos e Hospitalares, Sem Operador',
    accounting_code: '1.1.1.XX',
    accounting_description: 'Prevenção',
    is_active: true
  },
  {
    name: 'Dentística',
    description: 'Tratamento Odontológico em Dentística',
    nfse_code: '0301',
    nfse_description: 'Aluguel de Equipamentos Científicos, Médicos e Hospitalares, Sem Operador',
    accounting_code: '1.1.1.13',
    accounting_description: 'Dentística',
    is_active: true
  },
  {
    name: 'ORTO',
    description: 'Tratamento Ortodôntico',
    nfse_code: '0301',
    nfse_description: 'Aluguel de Equipamentos Científicos, Médicos e Hospitalares, Sem Operador',
    accounting_code: '1.1.2.5 - 1.1.2.6',
    accounting_description: 'Aparelho Fixo / Retirada + Contenção',
    is_active: true
  },
  {
    name: 'Alinhador Digital',
    description: 'Tratamento Ortodôntico com Alinhador Digital',
    nfse_code: '0301',
    nfse_description: 'Aluguel de Equipamentos Científicos, Médicos e Hospitalares, Sem Operador',
    accounting_code: '1.1.1.11',
    accounting_description: 'Alinhadores Stelle Odontologia',
    is_active: true
  }
]

export function AdministrationNfseServices() {
  const [services, setServices] = useState<ClinicService[]>(DEFAULT_SERVICES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('clinic_services').select('*').order('name')
    if (data && data.length > 0) {
      setServices(data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Deletar todos e recriar
      await supabase.from('clinic_services').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // Inserir novos
      const { error } = await supabase.from('clinic_services').insert(
        services.map(s => ({
          name: s.name,
          description: s.description,
          nfse_code: s.nfse_code,
          nfse_description: s.nfse_description,
          accounting_code: s.accounting_code,
          accounting_description: s.accounting_description,
          is_active: s.is_active
        }))
      )

      if (error) throw error

      setMessage({ type: 'success', text: '✅ Serviços salvos com sucesso!' })
      setEditId(null)
      setTimeout(() => setMessage(null), 3000)
    } catch (e: any) {
      setMessage({ type: 'error', text: `❌ Erro: ${e?.message}` })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">⏳ Carregando...</div>
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Serviços NFS-e</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-bold"
        >
          {saving ? '⏳ Salvando...' : '✅ Salvar Alterações'}
        </button>
      </div>

      <div className="p-6">
        {message && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          {services.map((service, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Coluna 1: Serviço */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 text-sm uppercase mb-2 text-blue-700">
                    Serviço
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={service.name}
                      onChange={e => {
                        const newServices = [...services]
                        newServices[idx].name = e.target.value
                        setServices(newServices)
                        setEditId(idx.toString())
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={service.description || ''}
                      onChange={e => {
                        const newServices = [...services]
                        newServices[idx].description = e.target.value
                        setServices(newServices)
                        setEditId(idx.toString())
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`active_${idx}`}
                      checked={service.is_active}
                      onChange={e => {
                        const newServices = [...services]
                        newServices[idx].is_active = e.target.checked
                        setServices(newServices)
                        setEditId(idx.toString())
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`active_${idx}`} className="text-sm text-gray-700">
                      Ativo
                    </label>
                  </div>
                </div>

                {/* Coluna 2: NFS-e */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 text-sm uppercase mb-2 text-green-700">
                    NFS-e
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                      Código
                    </label>
                    <input
                      type="text"
                      value={service.nfse_code}
                      onChange={e => {
                        const newServices = [...services]
                        newServices[idx].nfse_code = e.target.value
                        setServices(newServices)
                        setEditId(idx.toString())
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={service.nfse_description}
                      onChange={e => {
                        const newServices = [...services]
                        newServices[idx].nfse_description = e.target.value
                        setServices(newServices)
                        setEditId(idx.toString())
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                      Código Contábil
                    </label>
                    <input
                      type="text"
                      value={service.accounting_code || ''}
                      onChange={e => {
                        const newServices = [...services]
                        newServices[idx].accounting_code = e.target.value
                        setServices(newServices)
                        setEditId(idx.toString())
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                      placeholder="Ex: 1.1.1.13"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                      Descrição Contábil
                    </label>
                    <input
                      type="text"
                      value={service.accounting_description || ''}
                      onChange={e => {
                        const newServices = [...services]
                        newServices[idx].accounting_description = e.target.value
                        setServices(newServices)
                        setEditId(idx.toString())
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-800">
          <p className="font-semibold mb-1">💡 Informação</p>
          <p>Todos os serviços estão mapeados para o código NFS-e <strong>0301</strong> (Aluguel de Equipamentos Científicos, Médicos e Hospitalares).</p>
          <p className="mt-1">Os códigos contábeis permitem rastrear cada tipo de serviço internamente.</p>
        </div>
      </div>
    </div>
  )
}
