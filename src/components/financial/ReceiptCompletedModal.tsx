import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface NfseData {
  numero: string
  chaveAcesso: string
  status: string
  urlPdf?: string
}

interface Props {
  receiptId: string
  onPrintReceipt: () => void
  onClose: () => void
}

export function ReceiptCompletedModal({ receiptId, onPrintReceipt, onClose }: Props) {
  const [emitting, setEmitting] = useState(false)
  const [emissionStatus, setEmissionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [nfseData, setNfseData] = useState<NfseData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleEmitNfse = async () => {
    setEmitting(true)
    setError(null)
    setEmissionStatus('loading')
    setNfseData(null)

    try {
      // Chamar Edge Function
      const { data, error: invokeError } = await supabase.functions.invoke('emit-nfse', {
        body: { receipt_id: receiptId }
      })

      if (invokeError) {
        throw new Error(data?.error || invokeError.message)
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      // Sucesso
      setEmissionStatus('success')
      setNfseData(data.invoice)
    } catch (e: any) {
      setEmissionStatus('error')
      setError(e?.message || 'Erro ao emitir NFS-e')
    } finally {
      setEmitting(false)
    }
  }

  const handleRetry = () => {
    setEmissionStatus('idle')
    setError(null)
    setNfseData(null)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold">Recebimento Concluído</h3>
          <button onClick={onClose} className="text-white hover:opacity-80">✕</button>
        </div>

        <div className="p-5">
          {/* ESTADO INICIAL */}
          {emissionStatus === 'idle' && (
            <>
              <p className="text-gray-700 text-sm text-center mb-4">Deseja emitir o comprovante agora?</p>
              <div className="space-y-2">
                <button
                  onClick={handleEmitNfse}
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
            </>
          )}

          {/* ESTADO LOADING */}
          {emissionStatus === 'loading' && (
            <div className="text-center py-6">
              <div className="text-4xl mb-3 animate-spin">⏳</div>
              <p className="text-gray-700 font-semibold">Emitindo NFS-e...</p>
              <p className="text-xs text-gray-500 mt-2">Por favor, aguarde. Isso pode levar alguns segundos.</p>
            </div>
          )}

          {/* ESTADO SUCESSO */}
          {emissionStatus === 'success' && nfseData && (
            <>
              <div className="text-center py-4 mb-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-green-900 font-bold">NFS-e Autorizada!</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Número:</span>
                  <span className="font-bold text-gray-900">#{nfseData.numero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-bold text-green-700">{nfseData.status}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 mt-2">
                  <p className="text-xs text-gray-500 break-all">Chave: {nfseData.chaveAcesso}</p>
                </div>
              </div>

              <div className="space-y-2">
                {nfseData.urlPdf && (
                  <a
                    href={nfseData.urlPdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold text-center"
                  >
                    📄 Baixar PDF
                  </a>
                )}
                <button
                  onClick={onPrintReceipt}
                  className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                >
                  🖨️ Imprimir Recibo
                </button>
              </div>
            </>
          )}

          {/* ESTADO ERRO */}
          {emissionStatus === 'error' && (
            <>
              <div className="text-center py-4 mb-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-3xl mb-2">⚠️</div>
                <p className="text-red-900 font-bold">Erro ao emitir NFS-e</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-red-800 font-mono break-words">{error}</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleRetry}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                >
                  🔄 Tentar Novamente
                </button>
                <button
                  onClick={onPrintReceipt}
                  className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                >
                  🖨️ Processar Recibo
                </button>
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"
          >
            ✕ Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
