-- Migration: Add appointment timing fields for clinic flow tracking
-- Description: Track arrival, start, and end times for performance metrics
-- Date: 2026-08-26

-- Add timing columns to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS start_time TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;

-- Create computed fields for metrics (store as generated columns)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS delay_minutes INT GENERATED ALWAYS AS (
  CASE
    WHEN arrival_time IS NOT NULL THEN
      EXTRACT(EPOCH FROM (arrival_time - (appointment_date::timestamp + appointment_time::interval)))::int / 60
    ELSE NULL
  END
) STORED;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS wait_minutes INT GENERATED ALWAYS AS (
  CASE
    WHEN arrival_time IS NOT NULL AND start_time IS NOT NULL THEN
      EXTRACT(EPOCH FROM (start_time - arrival_time))::int / 60
    ELSE NULL
  END
) STORED;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS attendance_minutes INT GENERATED ALWAYS AS (
  CASE
    WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN
      EXTRACT(EPOCH FROM (end_time - start_time))::int / 60
    ELSE NULL
  END
) STORED;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_arrival_time ON appointments(arrival_time DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_end_time ON appointments(end_time DESC);

-- Add comments
COMMENT ON COLUMN appointments.arrival_time IS 'Hora quando o paciente chegou na clínica';
COMMENT ON COLUMN appointments.start_time IS 'Hora quando o atendimento iniciou';
COMMENT ON COLUMN appointments.end_time IS 'Hora quando o atendimento terminou';
COMMENT ON COLUMN appointments.delay_minutes IS 'Tempo de atraso em minutos (calculado automaticamente)';
COMMENT ON COLUMN appointments.wait_minutes IS 'Tempo na sala de espera em minutos (calculado automaticamente)';
COMMENT ON COLUMN appointments.attendance_minutes IS 'Tempo de atendimento em minutos (calculado automaticamente)';

SELECT 'SUCCESS: Appointment timing fields added' as status;
