import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface MessagePolicy {
  id: string
  policy_type: string
  enable_confirmation_responses: boolean
  message_template: string
  confirmation_response: string
  cancellation_response: string
}

export function AdministrationMessagePolicy() {
  const [policy, setPolicy] = useState<MessagePolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    loadPolicy()
  }, [])

  const loadPolicy = async () => {
    try {
      setLoading(true)
      const { data } = await supabase
        .from('message_policies')
        .select('*')
        .eq('policy_type', 'next_day_reminder')
        .limit(1)
        .single()

      if (data) {
        setPolicy(data)
        setEnabled(data.enable_confirmation_responses ?? true)
      }
    } catch (error) {
      console.error('Erro ao carregar política:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async () => {
    if (!policy) return
    try {
      setSaving(true)
      const newStatus = !enabled

      const { error } = await supabase
        .from('message_policies')
        .update({ enable_confirmation_responses: newStatus })
        .eq('id', policy.id)

      if (error) throw error

      setEnabled(newStatus)
      toast.success(newStatus ? '✅ Confirmações ativadas' : '❌ Confirmações desativadas')
    } catch (error: any) {
      console.error('Erro ao atualizar:', error)
      toast.error('Erro ao atualizar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">⏳ Carregando...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">🔗 Link de Confirmação</h2>

      <div className="space-y-6">
        {/* Toggle Principal */}
        <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Enviar link de confirmação por WhatsApp
              </h3>
              <p className="text-sm text-gray-600">
                O sistema enviará um link para que o paciente confirme sua consulta
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={saving}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition ${
                enabled ? 'bg-green-500' : 'bg-gray-300'
              } ${saving ? 'opacity-50' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white transition ${
                  enabled ? 'translate-x-10' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Status Atual */}
        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Status Atual</p>
            <p className={`text-lg font-semibold mt-1 ${
              enabled ? 'text-green-600' : 'text-red-600'
            }`}>
              {enabled ? '✅ Ativado' : '❌ Desativado'}
            </p>
          </div>
        </div>

        {/* Informações */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-gray-900 mb-3">📋 Como funciona:</p>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>✅ Sistema envia mensagem com link no dia anterior à consulta</li>
            <li>✅ Paciente clica no link e vê a página de confirmação</li>
            <li>✅ Paciente pode confirmar ou cancelar a consulta</li>
            <li>✅ Status é atualizado automaticamente no calendário</li>
          </ul>
        </div>

        {/* Template de Mensagem */}
        {policy && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-semibold text-gray-900 mb-2">📝 Mensagem Base:</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{policy.message_template}</p>
            <p className="text-xs text-gray-600 mt-2">
              O link será automaticamente adicionado ao final da mensagem.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
