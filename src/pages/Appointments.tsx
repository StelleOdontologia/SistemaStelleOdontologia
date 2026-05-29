import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Appointment } from '@/lib/supabase'

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true })

      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Carregando...</div>

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Agendamentos de Hoje</h1>
      
      <div className="mt-8 grid gap-4">
        {appointments.length === 0 ? (
          <p className="text-gray-600">Nenhum agendamento hoje</p>
        ) : (
          appointments.map(appt => (
            <div key={appt.id} className="p-4 border rounded bg-blue-50">
              <p className="font-bold">{appt.appointment_time}</p>
              <p className="text-sm">{appt.procedure}</p>
              <p className="text-sm text-gray-600">{appt.duration_minutes} min</p>
              <p className="text-xs text-gray-500 mt-2">Status: {appt.status}</p>
            </div>
          ))
        )}
      </div>

      <button className="mt-8 px-4 py-2 bg-blue-600 text-white rounded">
        Novo Agendamento
      </button>
    </div>
  )
}
