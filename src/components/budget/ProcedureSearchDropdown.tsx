import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface PriceTableRow {
  id: string
  specialty?: string
  internal_code?: string
  tiss_code?: string
  name: string
  shortcut?: string
  price?: number
}

interface Props {
  onSelect: (row: PriceTableRow) => void
  onClose: () => void
}

export function ProcedureSearchDropdown({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PriceTableRow[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    loadInitial()
  }, [])

  const loadInitial = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('price_table')
      .select('id, specialty, internal_code, tiss_code, name, shortcut, price')
      .eq('active', true)
      .order('specialty')
      .order('name')
      .limit(50)
    setResults(data || [])
    setLoading(false)
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) return loadInitial()
      setLoading(true)
      const { data } = await supabase
        .from('price_table')
        .select('id, specialty, internal_code, tiss_code, name, shortcut, price')
        .eq('active', true)
        .or(`name.ilike.%${query}%,shortcut.ilike.%${query}%,internal_code.ilike.%${query}%`)
        .order('specialty')
        .limit(50)
      setResults(data || [])
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="absolute z-30 bg-white border-2 border-blue-400 rounded-lg shadow-xl w-full max-w-2xl mt-2 overflow-hidden">
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar procedimento por nome, código ou atalho..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-gray-900"
        />
        <button
          onClick={onClose}
          className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
        >
          ✕
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-gray-500 text-sm">⏳ Carregando...</div>
        ) : results.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">Nenhum procedimento encontrado</div>
        ) : (
          results.map(row => (
            <button
              key={row.id}
              onClick={() => onSelect(row)}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 transition flex items-center gap-3"
            >
              <div className="flex-shrink-0 w-20">
                <div className="text-xs font-bold text-gray-500 uppercase truncate">
                  {row.specialty || '—'}
                </div>
                {row.internal_code && (
                  <div className="text-xs text-gray-400">#{row.internal_code}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{row.name}</div>
                {row.shortcut && (
                  <div className="text-xs text-blue-600">↳ {row.shortcut}</div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-green-700">
                  {row.price != null
                    ? `R$ ${row.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '—'}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
