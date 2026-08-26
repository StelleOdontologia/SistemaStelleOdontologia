import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Appointment } from '@/lib/supabase'

interface AppointmentTimingButtonsProps {
  appointment: Appointment
  onUpdate: (updated: Appointment) => void
}

export function AppointmentTimingButtons({ appointment, onUpdate }: AppointmentTimingButtonsProps) {
  const [loading, setLoading] = useState<'arrival' | 'start' | 'end' | null>(null)

  const handleRecordArrival = async () => {
    if (appointment.arrival_time) {
      if (!confirm('Chegada já registrada. Deseja sobrescrever?')) return
    }

    setLoading('arrival')
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('appointments')
        .update({ arrival_time: now })
        .eq('id', appointment.id)
        .select()
        .single()

      if (error) throw error
      onUpdate(data)
    } catch (error) {
      console.error('Erro ao registrar chegada:', error)
      alert('Erro ao registrar chegada')
    } finally {
      setLoading(null)
    }
  }

  const handleRecordStart = async () => {
    if (!appointment.arrival_time) {
      alert('⚠️ Registre a chegada do paciente primeiro!')
      return
    }

    if (appointment.start_time) {
      if (!confirm('Início já registrado. Deseja sobrescrever?')) return
    }

    setLoading('start')
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('appointments')
        .update({ start_time: now, status: 'in_progress' })
        .eq('id', appointment.id)
        .select()
        .single()

      if (error) throw error
      onUpdate(data)
    } catch (error) {
      console.error('Erro ao registrar início:', error)
      alert('Erro ao registrar início')
    } finally {
      setLoading(null)
    }
  }

  const handleRecordEnd = async () => {
    if (!appointment.start_time) {
      alert('⚠️ Registre o início do atendimento primeiro!')
      return
    }

    if (appointment.end_time) {
      if (!confirm('Término já registrado. Deseja sobrescrever?')) return
    }

    setLoading('end')
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('appointments')
        .update({ end_time: now, status: 'completed' })
        .eq('id', appointment.id)
        .select()
        .single()

      if (error) throw error
      onUpdate(data)
    } catch (error) {
      console.error('Erro ao registrar término:', error)
      alert('Erro ao registrar término')
    } finally {
      setLoading(null)
    }
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return null
    const date = new Date(isoString)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-3">
      {/* Botão Chegada */}
      <button
        onClick={handleRecordArrival}
        disabled={loading === 'arrival'}
        className={`w-full px-4 py-3 rounded-lg font-semibold text-white text-sm flex items-center justify-between transition ${
          appointment.arrival_time
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-blue-600 hover:bg-blue-700'
        } disabled:opacity-50`}
      >
        <span>🚪 {appointment.arrival_time ? 'Chegada Registrada' : 'Registrar Chegada'}</span>
        {appointment.arrival_time && (
          <span className="text-sm font-normal">{formatTime(appointment.arrival_time)}</span>
        )}
      </button>

      {/* Botão Início */}
      <button
        onClick={handleRecordStart}
        disabled={loading === 'start' || !appointment.arrival_time}
        className={`w-full px-4 py-3 rounded-lg font-semibold text-white text-sm flex items-center justify-between transition ${
          appointment.start_time
            ? 'bg-green-600 hover:bg-green-700'
            : appointment.arrival_time
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-400 cursor-not-allowed'
        } disabled:opacity-50`}
        title={!appointment.arrival_time ? 'Registre a chegada primeiro' : ''}
      >
        <span>▶️ {appointment.start_time ? 'Atendimento Iniciado' : 'Iniciar Atendimento'}</span>
        {appointment.start_time && (
          <span className="text-sm font-normal">{formatTime(appointment.start_time)}</span>
        )}
      </button>

      {/* Botão Término */}
      <button
        onClick={handleRecordEnd}
        disabled={loading === 'end' || !appointment.start_time}
        className={`w-full px-4 py-3 rounded-lg font-semibold text-white text-sm flex items-center justify-between transition ${
          appointment.end_time
            ? 'bg-green-600 hover:bg-green-700'
            : appointment.start_time
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-400 cursor-not-allowed'
        } disabled:opacity-50`}
        title={!appointment.start_time ? 'Inicie o atendimento primeiro' : ''}
      >
        <span>⏹️ {appointment.end_time ? 'Atendimento Terminado' : 'Terminar Atendimento'}</span>
        {appointment.end_time && (
          <span className="text-sm font-normal">{formatTime(appointment.end_time)}</span>
        )}
      </button>

      {/* Exibir Métricas */}
      {appointment.arrival_time && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {appointment.delay_minutes !== undefined && appointment.delay_minutes !== null && (
              <div>
                <div className="font-semibold text-red-600">{appointment.delay_minutes}m</div>
                <div className="text-gray-600">Atraso</div>
              </div>
            )}
            {appointment.wait_minutes !== undefined && appointment.wait_minutes !== null && (
              <div>
                <div className="font-semibold text-yellow-600">{appointment.wait_minutes}m</div>
                <div className="text-gray-600">Espera</div>
              </div>
            )}
            {appointment.attendance_minutes !== undefined && appointment.attendance_minutes !== null && (
              <div>
                <div className="font-semibold text-blue-600">{appointment.attendance_minutes}m</div>
                <div className="text-gray-600">Atendimento</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
