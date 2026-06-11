import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface NfseTaxRates {
  id?: string
  aliquota_iss: number
  aliquota_pis: number
  aliquota_cofins: number
  aliquota_inss: number
  aliquota_ir: number
  aliquota_csll: number
  retencao_iss: boolean
  reducao_iss: number
  data_vigencia: string
}

export function AdministrationNfseTaxRates() {
  const [rates, setRates] = useState<NfseTaxRates>({
    aliquota_iss: 3.0,
    aliquota_pis: 0,
    aliquota_cofins: 0,
    aliquota_inss: 0,
    aliquota_ir: 0,
    aliquota_csll: 0,
    retencao_iss: false,
    reducao_iss: 0,
    data_vigencia: new Date().toISOString().split('T')[0]
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
    const { data } = await supabase
      .from('clinic_nfse_tax_rates')
      .select('*')
      .order('data_vigencia', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setRates(data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      if (rates.id) {
        // Atualizar
        const { error } = await supabase
          .from('clinic_nfse_tax_rates')
          .update(rates)
          .eq('id', rates.id)
        if (error) throw error
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('clinic_nfse_tax_rates')
          .insert([rates])
        if (error) throw error
      }

      setMessage({ type: 'success', text: '✅ Alíquotas salvas com sucesso!' })
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
        <h2 className="text-lg font-bold text-gray-900">Alíquotas NFS-e</h2>
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
          {/* COLUNA 1: Alíquotas */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-sm uppercase text-blue-700 mb-3">
              Alíquotas (%)
            </h3>

            <TaxField
              label="ISS (Imposto sobre Serviços)"
              value={rates.aliquota_iss}
              onChange={v => setRates({ ...rates, aliquota_iss: v })}
              disabled={!editMode}
            />

            <TaxField
              label="PIS (Programa de Integração Social)"
              value={rates.aliquota_pis}
              onChange={v => setRates({ ...rates, aliquota_pis: v })}
              disabled={!editMode}
            />

            <TaxField
              label="COFINS (Contribuição para Financiamento da Seguridade Social)"
              value={rates.aliquota_cofins}
              onChange={v => setRates({ ...rates, aliquota_cofins: v })}
              disabled={!editMode}
            />

            <TaxField
              label="INSS (Contribuição Previdenciária)"
              value={rates.aliquota_inss}
              onChange={v => setRates({ ...rates, aliquota_inss: v })}
              disabled={!editMode}
            />

            <TaxField
              label="IR (Imposto de Renda)"
              value={rates.aliquota_ir}
              onChange={v => setRates({ ...rates, aliquota_ir: v })}
              disabled={!editMode}
            />

            <TaxField
              label="CSLL (Contribuição Social sobre o Lucro Líquido)"
              value={rates.aliquota_csll}
              onChange={v => setRates({ ...rates, aliquota_csll: v })}
              disabled={!editMode}
            />
          </div>

          {/* COLUNA 2: Configurações e Deduções */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-sm uppercase text-green-700 mb-3">
              Configurações
            </h3>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="retencao_iss"
                  checked={rates.retencao_iss}
                  onChange={e => setRates({ ...rates, retencao_iss: e.target.checked })}
                  disabled={!editMode}
                  className="w-4 h-4"
                />
                <label htmlFor="retencao_iss" className="text-sm font-semibold text-gray-900">
                  Retenção de ISS
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2 ml-7">
                Marque se há retenção de ISS na origem
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                Redução de ISS
              </label>
              <div className="relative">
                <input
                  type="number"
                  step={0.01}
                  min={0}
                  value={rates.reducao_iss}
                  onChange={e => setRates({ ...rates, reducao_iss: parseFloat(e.target.value) || 0 })}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
                />
                <span className="absolute right-3 top-2 text-gray-500 text-sm">R$</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Valor de redução ou incentivo fiscal</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                Data de Vigência
              </label>
              <input
                type="date"
                value={rates.data_vigencia}
                onChange={e => setRates({ ...rates, data_vigencia: e.target.value })}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">A partir de quando estas alíquotas são válidas</p>
            </div>

            <div className="pt-4 border-t border-gray-200 mt-6">
              <h4 className="font-bold text-gray-900 text-sm text-orange-700 mb-3">
                📊 Resumo Calculado
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de Alíquotas:</span>
                  <span className="font-bold text-gray-900">
                    {(
                      rates.aliquota_iss +
                      rates.aliquota_pis +
                      rates.aliquota_cofins +
                      rates.aliquota_inss +
                      rates.aliquota_ir +
                      rates.aliquota_csll
                    ).toFixed(2)}
                    %
                  </span>
                </div>

                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">ISS (Principal):</span>
                  <span className="font-bold text-blue-700">{rates.aliquota_iss.toFixed(2)}%</span>
                </div>

                {rates.reducao_iss > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Redução ISS:</span>
                    <span className="font-bold text-green-700">R$ {rates.reducao_iss.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-xs text-yellow-800">
          <p className="font-semibold mb-1">⚠️ Importante</p>
          <p>Estas alíquotas são fornecidas conforme configuração no <strong>Emissor Nacional NFS-e</strong>.</p>
          <p className="mt-1">
            Para Simples Nacional, a maioria das taxas (PIS, COFINS, INSS, IR, CSLL) não se aplica individualmente.
          </p>
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

function TaxField({
  label,
  value,
  onChange,
  disabled
}: {
  label: string
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          step={0.01}
          min={0}
          max={100}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 text-gray-900"
        />
        <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
      </div>
    </div>
  )
}
