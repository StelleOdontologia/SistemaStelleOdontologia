import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type TabKey = 'whatsapp' | 'messages' | 'test'

interface WhatsAppConfig {
  id?: string
  evolution_api_url: string
  evolution_api_key: string
  instance_name: string
  clinic_name: string
  clinic_phone: string
  is_connected: boolean
}

interface MessagePolicy {
  id: string
  policy_type: string
  policy_name: string
  is_active: boolean
  message_template: string
  preparation_time: string
  send_time: string
  days_before: number
  send_monday_on_sunday: boolean
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>('whatsapp')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({
    evolution_api_url: '',
    evolution_api_key: '',
    instance_name: '',
    clinic_name: 'Stelle Odontologia',
    clinic_phone: '',
    is_connected: false
  })
  const [policies, setPolicies] = useState<MessagePolicy[]>([])
  const [editingPolicy, setEditingPolicy] = useState<MessagePolicy | null>(null)
  const [sending, setSending] = useState(false)
  const [testDate, setTestDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [testResults, setTestResults] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [configRes, policiesRes] = await Promise.all([
        supabase.from('whatsapp_config').select('*').limit(1).single(),
        supabase.from('message_policies').select('*').order('created_at')
      ])

      if (configRes.data) setWhatsappConfig(configRes.data)
      if (policiesRes.data) setPolicies(policiesRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveWhatsApp = async () => {
    setSaving(true)
    try {
      const dataToSave = { ...whatsappConfig, updated_at: new Date().toISOString() }

      if (whatsappConfig.id) {
        const { error } = await supabase
          .from('whatsapp_config')
          .update(dataToSave)
          .eq('id', whatsappConfig.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('whatsapp_config')
          .insert([dataToSave])
          .select()
          .single()
        if (error) throw error
        if (data) setWhatsappConfig(data)
      }

      alert('✅ Configurações salvas!')
    } catch (error: any) {
      console.error('Erro:', error)
      alert(`Erro ao salvar: ${error?.message || 'Desconhecido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!whatsappConfig.evolution_api_url || !whatsappConfig.evolution_api_key || !whatsappConfig.instance_name) {
      alert('Preencha URL, API Key e nome da instância antes de testar')
      return
    }

    setTesting(true)
    try {
      const url = `${whatsappConfig.evolution_api_url}/instance/connectionState/${whatsappConfig.instance_name}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': whatsappConfig.evolution_api_key,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const connected = data?.instance?.state === 'open' || data?.state === 'open'
        setWhatsappConfig({ ...whatsappConfig, is_connected: connected })
        alert(connected ? '✅ Conexão OK! WhatsApp conectado.' : '⚠️ API responde, mas WhatsApp não está conectado. Conecte via QR Code.')
      } else {
        alert(`❌ Erro: ${response.status} - Verifique URL e API Key`)
      }
    } catch (error: any) {
      alert(`❌ Erro ao conectar: ${error?.message || 'Verifique a URL'}`)
    } finally {
      setTesting(false)
    }
  }

  const handleSavePolicy = async (policy: MessagePolicy) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('message_policies')
        .update({
          is_active: policy.is_active,
          message_template: policy.message_template,
          preparation_time: policy.preparation_time,
          send_time: policy.send_time,
          days_before: policy.days_before,
          send_monday_on_sunday: policy.send_monday_on_sunday,
          updated_at: new Date().toISOString()
        })
        .eq('id', policy.id)

      if (error) throw error
      await loadData()
      setEditingPolicy(null)
      alert('✅ Política salva!')
    } catch (error: any) {
      console.error('Erro:', error)
      alert(`Erro: ${error?.message || 'Desconhecido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSendReminders = async (dryRun: boolean) => {
    setSending(true)
    setTestResults(null)
    try {
      const { data, error } = await supabase.rpc('send_appointment_reminders', {
        p_target_date: testDate,
        p_dry_run: dryRun
      })

      if (error) throw error
      setTestResults(data)
    } catch (error: any) {
      console.error('Erro:', error)
      alert(`Erro: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const handleTogglePolicy = async (policy: MessagePolicy) => {
    try {
      const { error } = await supabase
        .from('message_policies')
        .update({ is_active: !policy.is_active })
        .eq('id', policy.id)

      if (error) throw error
      await loadData()
    } catch (error: any) {
      alert(`Erro: ${error?.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">⏳ Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">⚙️ Configurações</h1>

        {/* Tabs */}
        <div className="bg-white rounded-t-lg shadow-sm border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'whatsapp'
                  ? 'border-b-4 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📱 Conexão WhatsApp
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'messages'
                  ? 'border-b-4 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💬 Política de Mensagens
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'test'
                  ? 'border-b-4 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🧪 Testar Envio
            </button>
          </div>
        </div>

        <div className="bg-white rounded-b-lg shadow-sm p-6">
          {/* TAB 1: WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Configuração da Evolution API</h2>
                <p className="text-sm text-gray-600 mb-4">Configure os dados para enviar mensagens via WhatsApp.</p>
              </div>

              {/* Status da Conexão */}
              <div className={`p-4 rounded-lg border-2 ${
                whatsappConfig.is_connected
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{whatsappConfig.is_connected ? '🟢' : '🔴'}</span>
                  <div>
                    <p className="font-bold text-gray-900">
                      {whatsappConfig.is_connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {whatsappConfig.is_connected
                        ? 'Pronto para enviar mensagens'
                        : 'Conecte a Evolution API e teste a conexão'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Campos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-2">URL da Evolution API</label>
                  <input
                    type="text"
                    placeholder="https://api.suaempresa.com.br"
                    value={whatsappConfig.evolution_api_url}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, evolution_api_url: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">API Key</label>
                  <input
                    type="password"
                    placeholder="Sua API Key"
                    value={whatsappConfig.evolution_api_key}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, evolution_api_key: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Nome da Instância</label>
                  <input
                    type="text"
                    placeholder="Ex: stelle-odonto"
                    value={whatsappConfig.instance_name}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, instance_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Nome da Clínica</label>
                  <input
                    type="text"
                    value={whatsappConfig.clinic_name}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, clinic_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Telefone da Clínica</label>
                  <input
                    type="text"
                    placeholder="(21) 99999-9999"
                    value={whatsappConfig.clinic_phone}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, clinic_phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveWhatsApp}
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving ? '⏳ Salvando...' : '💾 Salvar Configurações'}
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {testing ? '⏳ Testando...' : '🔌 Testar Conexão'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: POLÍTICA DE MENSAGENS */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Políticas de Mensagens</h2>
                <p className="text-sm text-gray-600 mb-4">Configure quando e como as mensagens serão enviadas.</p>
              </div>

              {/* Variáveis disponíveis */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2">📌 Variáveis disponíveis:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <code className="bg-white px-2 py-1 rounded">#nomeFantasia</code>
                  <code className="bg-white px-2 py-1 rounded">#paciente</code>
                  <code className="bg-white px-2 py-1 rounded">#dataAgenda</code>
                  <code className="bg-white px-2 py-1 rounded">#telefone</code>
                </div>
              </div>

              {/* Lista de Políticas */}
              <div className="space-y-4">
                {policies.map(policy => (
                  <div key={policy.id} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                    {/* Cabeçalho */}
                    <div className="p-4 bg-gray-50 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-gray-900">{policy.policy_name}</h3>
                        <p className="text-sm text-gray-600">
                          {policy.days_before} dia(s) antes • Envio às {policy.send_time.substring(0, 5)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleTogglePolicy(policy)}
                          className={`px-4 py-2 rounded-lg font-bold text-sm ${
                            policy.is_active
                              ? 'bg-green-600 text-white'
                              : 'bg-red-500 text-white'
                          }`}
                        >
                          {policy.is_active ? 'ATIVO' : 'INATIVO'}
                        </button>
                        <button
                          onClick={() => setEditingPolicy(editingPolicy?.id === policy.id ? null : policy)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700"
                        >
                          {editingPolicy?.id === policy.id ? 'Fechar' : '✏️ Editar'}
                        </button>
                      </div>
                    </div>

                    {/* Editor */}
                    {editingPolicy?.id === policy.id && (
                      <div className="p-4 space-y-4 border-t border-gray-200">
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">Texto da Mensagem</label>
                          <textarea
                            value={editingPolicy.message_template}
                            onChange={(e) => setEditingPolicy({ ...editingPolicy, message_template: e.target.value })}
                            rows={6}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 font-mono text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Horário de Preparação</label>
                            <input
                              type="time"
                              value={editingPolicy.preparation_time.substring(0, 5)}
                              onChange={(e) => setEditingPolicy({ ...editingPolicy, preparation_time: e.target.value + ':00' })}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                            />
                            <p className="text-xs text-gray-500 mt-1">Horário para apurar a lista de pacientes</p>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Horário do Envio</label>
                            <input
                              type="time"
                              value={editingPolicy.send_time.substring(0, 5)}
                              onChange={(e) => setEditingPolicy({ ...editingPolicy, send_time: e.target.value + ':00' })}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                            />
                            <p className="text-xs text-gray-500 mt-1">Horário do disparo das mensagens</p>
                          </div>
                        </div>

                        <div>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editingPolicy.send_monday_on_sunday}
                              onChange={(e) => setEditingPolicy({ ...editingPolicy, send_monday_on_sunday: e.target.checked })}
                              className="w-5 h-5"
                            />
                            <span className="font-medium text-gray-900">
                              Enviar agendamentos de Segunda-feira no Domingo
                            </span>
                          </label>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => handleSavePolicy(editingPolicy)}
                            disabled={saving}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                          >
                            {saving ? '⏳ Salvando...' : '💾 Salvar Política'}
                          </button>
                          <button
                            onClick={() => setEditingPolicy(null)}
                            className="px-6 py-3 bg-gray-300 text-gray-900 font-bold rounded-lg hover:bg-gray-400"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Preview */}
                    {editingPolicy?.id !== policy.id && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Mensagem:</h4>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                          {policy.message_template}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {policies.length === 0 && (
                <div className="text-center p-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Nenhuma política cadastrada ainda.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TESTAR ENVIO */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">🧪 Teste de Envio de Mensagens</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Envie lembretes para os pacientes com agendamento na data escolhida.
                  Use o "Preview" para ver as mensagens antes de enviar.
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Atenção:</strong> O envio "Real" dispara mensagens via WhatsApp imediatamente.
                  Use "Preview" para verificar antes.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Data dos Agendamentos
                </label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Por padrão: amanhã. Você pode mudar para qualquer data.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleSendReminders(true)}
                  disabled={sending}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {sending ? '⏳ Processando...' : '👁️ Preview (Não envia)'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja ENVIAR as mensagens agora?')) {
                      handleSendReminders(false)
                    }
                  }}
                  disabled={sending}
                  className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {sending ? '⏳ Enviando...' : '📤 Enviar Agora (REAL)'}
                </button>
              </div>

              {/* Resultados */}
              {testResults && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
                    <h3 className="font-bold text-gray-900 mb-2">📊 Resumo do Envio</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Data Alvo</p>
                        <p className="font-bold text-gray-900">{testResults.target_date}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Agendamentos</p>
                        <p className="font-bold text-gray-900">{testResults.total || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Status</p>
                        <p className="font-bold text-green-600">{testResults.ok ? '✅ OK' : '❌ ERRO'}</p>
                      </div>
                    </div>
                    {testResults.error && (
                      <p className="mt-2 text-red-600 font-bold">Erro: {testResults.error}</p>
                    )}
                    {testResults.message && (
                      <p className="mt-2 text-gray-700">{testResults.message}</p>
                    )}
                  </div>

                  {testResults.results && testResults.results.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-gray-900">📋 Detalhes por Paciente:</h3>
                      {testResults.results.map((r: any, idx: number) => (
                        <div key={idx} className={`p-4 border-2 rounded-lg ${
                          r.status === 'sent' ? 'bg-green-50 border-green-300' :
                          r.status === 'preview' ? 'bg-blue-50 border-blue-300' :
                          r.status === 'failed' ? 'bg-red-50 border-red-300' :
                          r.status === 'timeout' ? 'bg-orange-50 border-orange-300' :
                          'bg-yellow-50 border-yellow-300'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">{r.patient}</p>
                              <p className="text-sm text-gray-600">
                                📞 {r.phone || '—'}
                                {r.phone_formatted && (
                                  <span className="text-gray-400"> → {r.phone_formatted}</span>
                                )}
                              </p>
                              {r.reason && <p className="text-sm text-yellow-700 mt-1">⚠️ {r.reason}</p>}
                              {r.error && <p className="text-sm text-red-700 mt-1">❌ {r.error}</p>}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              r.status === 'sent' ? 'bg-green-600 text-white' :
                              r.status === 'preview' ? 'bg-blue-600 text-white' :
                              r.status === 'failed' ? 'bg-red-600 text-white' :
                              r.status === 'timeout' ? 'bg-orange-600 text-white' :
                              'bg-yellow-600 text-white'
                            }`}>
                              {r.status === 'sent' ? '✅ ENTREGUE' :
                               r.status === 'preview' ? '👁️ PREVIEW' :
                               r.status === 'failed' ? '❌ FALHOU' :
                               r.status === 'timeout' ? '⏱️ TIMEOUT' :
                               '⏭️ PULADO'}
                            </span>
                          </div>

                          {/* Detalhes HTTP - Evolution API */}
                          {(r.http_status !== undefined && r.http_status !== null) && (
                            <div className="mt-3 p-3 bg-gray-100 rounded border border-gray-300">
                              <p className="text-xs font-bold text-gray-700 uppercase mb-2">🔍 Resposta da Evolution API:</p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">Status HTTP:</span>
                                  <span className={`ml-2 font-bold ${
                                    r.http_status >= 200 && r.http_status < 300 ? 'text-green-700' : 'text-red-700'
                                  }`}>{r.http_status}</span>
                                </div>
                                {r.url_called && (
                                  <div className="col-span-2">
                                    <p className="text-xs text-gray-500 break-all">{r.url_called}</p>
                                  </div>
                                )}
                              </div>
                              {r.http_response && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-600 mb-1">Resposta:</p>
                                  <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto max-h-32">
                                    {r.http_response}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {r.message && (
                            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Mensagem Enviada:</p>
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{r.message}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
