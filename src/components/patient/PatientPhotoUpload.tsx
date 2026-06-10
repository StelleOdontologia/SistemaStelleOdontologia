import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  patientId: string
  patientName: string
  currentPhotoUrl?: string | null
  onUpdate: () => void
  size?: 'sm' | 'md' | 'lg'
}

export function PatientPhotoUpload({ patientId, patientName, currentPhotoUrl, onUpdate, size = 'lg' }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)

  const sizeClass = {
    sm: 'w-16 h-16 text-lg',
    md: 'w-20 h-20 text-xl',
    lg: 'w-24 h-24 text-2xl'
  }[size]

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getAvatarColor = (name: string): string => {
    const colors = ['bg-orange-500', 'bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Valida tipo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione uma imagem')
      return
    }

    // Valida tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem muito grande! Máximo 5MB.')
      return
    }

    setPreviewFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setShowOptions(false)
  }

  const handleUpload = async () => {
    if (!previewFile) return

    setUploading(true)
    try {
      // Gera nome único: patientId/timestamp.ext
      const ext = previewFile.name.split('.').pop()
      const fileName = `${patientId}/${Date.now()}.${ext}`

      // Upload pro Storage
      const { error: uploadError } = await supabase.storage
        .from('patient-photos')
        .upload(fileName, previewFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Pega URL pública
      const { data: urlData } = supabase.storage
        .from('patient-photos')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      // Atualiza paciente
      const { error: updateError } = await supabase
        .from('patients')
        .update({ photo_url: publicUrl })
        .eq('id', patientId)

      if (updateError) throw updateError

      // Deleta foto antiga do storage (best-effort)
      if (currentPhotoUrl && currentPhotoUrl.includes('/patient-photos/')) {
        try {
          const oldPath = currentPhotoUrl.split('/patient-photos/')[1]
          if (oldPath) {
            await supabase.storage.from('patient-photos').remove([oldPath])
          }
        } catch {
          // ignora erros ao deletar foto antiga
        }
      }

      setPreviewFile(null)
      setPreviewUrl(null)
      onUpdate()
    } catch (err: any) {
      console.error('Erro upload:', err)
      alert(`Erro ao enviar foto: ${err?.message || 'Desconhecido'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remover foto do paciente?')) return
    setUploading(true)
    try {
      // Deleta do storage
      if (currentPhotoUrl && currentPhotoUrl.includes('/patient-photos/')) {
        const oldPath = currentPhotoUrl.split('/patient-photos/')[1]
        if (oldPath) {
          await supabase.storage.from('patient-photos').remove([oldPath])
        }
      }

      // Limpa do paciente
      const { error } = await supabase
        .from('patients')
        .update({ photo_url: null })
        .eq('id', patientId)

      if (error) throw error

      setShowOptions(false)
      onUpdate()
    } catch (err: any) {
      alert(`Erro: ${err?.message || ''}`)
    } finally {
      setUploading(false)
    }
  }

  const triggerFileSelect = (useCamera: boolean) => {
    if (fileInputRef.current) {
      if (useCamera) {
        fileInputRef.current.setAttribute('capture', 'user')
      } else {
        fileInputRef.current.removeAttribute('capture')
      }
      fileInputRef.current.click()
    }
  }

  return (
    <>
      {/* Avatar com botão de upload */}
      <div className="relative inline-block">
        {currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt={patientName}
            className={`${sizeClass} rounded-full object-cover border-2 border-white shadow-md`}
          />
        ) : (
          <div className={`${sizeClass} rounded-full ${getAvatarColor(patientName)} flex items-center justify-center text-white font-bold border-2 border-white shadow-md`}>
            {getInitials(patientName)}
          </div>
        )}

        {/* Botão flutuante de câmera */}
        <button
          onClick={() => setShowOptions(true)}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white text-sm"
          title="Alterar foto"
        >
          📷
        </button>
      </div>

      {/* Input hidden */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Modal: Opções */}
      {showOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">📷 Foto do Paciente</h3>
              <button onClick={() => setShowOptions(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => triggerFileSelect(true)}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
              >
                📸 Tirar Foto (Câmera)
              </button>
              <button
                onClick={() => triggerFileSelect(false)}
                className="w-full px-4 py-3 bg-white border-2 border-blue-600 text-blue-700 hover:bg-blue-50 rounded-lg font-bold flex items-center justify-center gap-2"
              >
                🖼️ Escolher da Galeria
              </button>
              {currentPhotoUrl && (
                <button
                  onClick={handleRemove}
                  className="w-full px-4 py-3 bg-white border-2 border-red-300 text-red-700 hover:bg-red-50 rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  🗑️ Remover Foto
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Preview e confirmação */}
      {previewUrl && previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">📷 Confirmar Foto</h3>
              <button
                onClick={() => { setPreviewFile(null); setPreviewUrl(null) }}
                className="text-gray-500 hover:text-gray-700"
                disabled={uploading}
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <div className="flex justify-center mb-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-48 h-48 rounded-full object-cover border-4 border-blue-200 shadow-lg"
                />
              </div>
              <div className="text-center text-sm text-gray-600 mb-4">
                <strong>Paciente:</strong> {patientName}<br/>
                <span className="text-xs text-gray-500">
                  {(previewFile.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPreviewFile(null); setPreviewUrl(null) }}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-bold"
                >
                  {uploading ? '⏳ Enviando...' : '✓ Salvar Foto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
