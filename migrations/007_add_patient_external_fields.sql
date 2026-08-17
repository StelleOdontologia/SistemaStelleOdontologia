-- Adicionar campos para migração de pacientes do Controle Odonto
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS preferred_dentist VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_appointment_at TIMESTAMP;

-- Índice para facilitar busca
CREATE INDEX IF NOT EXISTS idx_patients_last_appointment ON patients(last_appointment_at);

