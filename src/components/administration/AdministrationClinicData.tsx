import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ClinicConfig {
  id?: string
  razao_social: string
  nome_fantasia?: string
  cnpj: string
  inscricao_municipal: string
  codigo_ibge: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  zip_code?: string
  state?: string
  email?: string
  phone?: string
  regime_tributario: string
  optante_simples_nacional: boolean
  incentivador_cultural: boolean
  regime_especial_tributacao?: string
  layout_nfse: string
  ambiente_nfse: string
  certificado_nome?: string
  certificado_cn?: string
  certificado_serial?: string
  certificado_valid_until?: string
}

export function AdministrationClinicData() {
  const [config, setConfig] = useState<ClinicConfig>({
    razao_social: '',
    cnpj: '',
    inscricao_municipal: '',
    codigo_ibge: '',
    regime_tributario: 'SN',
    optante_simples_nacional: true,
    incentivador_cultural: false,
    layout_nfse: 'INTEGRACAO1',
    ambiente_nfse: 'PRODUCAO'
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('clinic_config').select('*').single()
    if (data) {
      setConfig(data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      if (config.id) {
        // Atualizar
        const { error } = await supabase
          .from('clinic_config')
          .update(config)
          .eq('id', config.id)
        if (error) throw error
      } else {
        // Criar
        const { error } = await supabase
          .from('clinic_config')
          .insert([config])
        if (error) throw error
      }

      setMessage({ type: 'success', text: '✅ Dados salvos com sucesso!' })
      setEditMode(false)
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
        <h2 className="text-lg font-bold text-gray-900">Dados da Clínica</h2>
        <button
          onClick={() => setEditMode(!editMode)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold"
        >
          {editMode ? '✕ Cancelar' : '✏️ Editar'}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUNA 1: Dados Básicos */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-sm uppercase text-blue-700 mb-3">
              Dados Básicos
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Razão Social *
              </label>
              <input
                type="text"
                value={config.razao_social}
                onChange={e => setConfig({ ...config, razao_social: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={config.nome_fantasia || ''}
                onChange={e => setConfig({ ...config, nome_fantasia: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                CNPJ *
              </label>
              <input
                type="text"
                value={config.cnpj}
                onChange={e => setConfig({ ...config, cnpj: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Inscrição Municipal *
              </label>
              <input
                type="text"
                value={config.inscricao_municipal}
                onChange={e => setConfig({ ...config, inscricao_municipal: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Código IBGE *
              </label>
              <input
                type="text"
                value={config.codigo_ibge}
                onChange={e => setConfig({ ...config, codigo_ibge: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
              />
            </div>
          </div>

          {/* COLUNA 2: NFS-e e Certificado */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-sm uppercase text-green-700 mb-3">
              Configuração NFS-e
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Regime Tributário
              </label>
              <select
                value={config.regime_tributario}
                onChange={e => setConfig({ ...config, regime_tributario: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
              >
                <option value="SN">Simples Nacional</option>
                <option value="LR">Lucro Real</option>
                <option value="LE">Lucro Estimado</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="optante_simples"
                checked={config.optante_simples_nacional}
                onChange={e => setConfig({ ...config, optante_simples_nacional: e.target.checked })}
                disabled={!editMode}
                className="w-4 h-4"
              />
              <label htmlFor="optante_simples" className="text-sm text-gray-700">
                Optante Simples Nacional
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="incentivador"
                checked={config.incentivador_cultural}
                onChange={e => setConfig({ ...config, incentivador_cultural: e.target.checked })}
                disabled={!editMode}
                className="w-4 h-4"
              />
              <label htmlFor="incentivador" className="text-sm text-gray-700">
                Incentivador Cultural
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Layout NFS-e
              </label>
              <input
                type="text"
                value={config.layout_nfse}
                disabled={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Padrão: INTEGRACAO1</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Ambiente
              </label>
              <select
                value={config.ambiente_nfse}
                onChange={e => setConfig({ ...config, ambiente_nfse: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
              >
                <option value="PRODUCAO">Produção</option>
                <option value="HOMOLOGACAO">Homologação</option>
              </select>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-xs font-bold text-gray-700 uppercase text-orange-700 mb-3">
                Certificado Digital
              </h4>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={config.certificado_nome || ''}
                  onChange={e => setConfig({ ...config, certificado_nome: e.target.value })}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
                  placeholder="Ex: Stelle (A1 - CN=AC)"
                />
              </div>

              <div className="mt-3">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  CN
                </label>
                <input
                  type="text"
                  value={config.certificado_cn || ''}
                  onChange={e => setConfig({ ...config, certificado_cn: e.target.value })}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
                />
              </div>

              <div className="mt-3">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Serial
                </label>
                <input
                  type="text"
                  value={config.certificado_serial || ''}
                  onChange={e => setConfig({ ...config, certificado_serial: e.target.value })}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
                />
              </div>

              <div className="mt-3">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Válido Até
                </label>
                <input
                  type="date"
                  value={config.certificado_valid_until || ''}
                  onChange={e => setConfig({ ...config, certificado_valid_until: e.target.value })}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>

        {editMode && (
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => {
                setEditMode(false)
                load()
              }}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"
            >
              ✕ Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-bold"
            >
              {saving ? '⏳ Salvando...' : '✅ Salvar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
