import { useState } from 'react'

type BudgetType = 'particular' | 'convenio_interno' | 'operadora' | 'empresa_conv'

interface Props {
  patientName: string
  onSelect: (type: BudgetType) => void
  onClose: () => void
}

export function BudgetTypeModal({ patientName, onSelect, onClose }: Props) {
  const [selected, setSelected] = useState<BudgetType>('particular')

  const options: { id: BudgetType; label: string; enabled: boolean }[] = [
    { id: 'particular', label: 'Particular', enabled: true },
    { id: 'convenio_interno', label: 'Convênio Interno', enabled: false },
    { id: 'operadora', label: 'Operadora', enabled: false },
    { id: 'empresa_conv', label: 'Empresa Conv', enabled: false }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
        <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span>➕</span>
            <span>Elaborar Orçamento</span>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-80 text-lg">✕</button>
        </div>

        <div className="p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-blue-700 font-bold text-lg">{patientName}</h3>
            <span className="text-sm text-gray-500">Novo Orçamento</span>
          </div>

          <div className="border-t border-dashed border-gray-300 my-4" />

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex gap-1">
            {options.map(opt => (
              <button
                key={opt.id}
                disabled={!opt.enabled}
                onClick={() => opt.enabled && setSelected(opt.id)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold transition ${
                  selected === opt.id && opt.enabled
                    ? 'bg-green-500 text-white shadow'
                    : opt.enabled
                    ? 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"
          >
            ✕ Fechar
          </button>
          <button
            onClick={() => onSelect(selected)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center gap-2"
          >
            ▶ Prosseguir
          </button>
        </div>
      </div>
    </div>
  )
}
