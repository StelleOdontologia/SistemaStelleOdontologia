import { useState } from 'react'

interface Props {
  onEmitInvoice: () => void
  onPrintReceipt: () => void
  onClose: () => void
}

export function ReceiptCompletedModal({ onEmitInvoice, onPrintReceipt, onClose }: Props) {
  const [emitting, setEmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleEmit = async () => {
    setEmitting(true)
    setFeedback(null)
    try {
      await onEmitInvoice()
      setFeedback('✅ Solicitação registrada. A integração com a SEFAZ municipal ainda não está configurada.')
    } catch (e: any) {
      setFeedback(`⚠️ ${e?.message || 'Falha ao emitir nota'}`)
    } finally {
      setEmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden">
        <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold">Recebimento Concluído</h3>
          <button onClick={onClose} className="text-white hover:opacity-80">✕</button>
        </div>

        <div className="p-5">
          <p className="text-gray-700 text-sm text-center mb-4">Deseja emitir o comprovante agora?</p>

          <div className="space-y-2">
            <button
              onClick={handleEmit}
              disabled={emitting}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
            >
              🧾 {emitting ? 'Emitindo...' : 'Nota Fiscal Eletrônica'}
            </button>
            <button
              onClick={onPrintReceipt}
              className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
            >
              🖨️ Processar Recibo
            </button>
          </div>

          {feedback && (
            <div className="mt-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              {feedback}
            </div>
          )}
        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"
          >
            ✕ Agora Não
          </button>
        </div>
      </div>
    </div>
  )
}
