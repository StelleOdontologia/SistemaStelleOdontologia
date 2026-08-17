-- Migration: Add patient relationships table
-- Description: Support for tracking family relationships between patients
-- Date: 2026-08-17

-- Create patient_relationships table
CREATE TABLE IF NOT EXISTS patient_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Paciente A (aquele que está vendo o relacionamento)
  patient_a_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Paciente B (o relacionado)
  patient_b_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Tipo de relacionamento (como visto por A)
  relationship_type VARCHAR NOT NULL CHECK (relationship_type IN (
    'pai', 'mãe', 'filho', 'filha', 'irmão', 'irmã', 'avó', 'avô',
    'neto', 'neta', 'cônjuge', 'cunhado', 'cunhada', 'tio', 'tia', 'primo', 'prima', 'amigo', 'responsável_legal', 'outro'
  )),

  -- Se A é responsável por B (usado para faturamento)
  is_responsible BOOLEAN DEFAULT FALSE,

  -- Se este relacionamento é bidirecional (auto-sincronizado)
  bidirectional BOOLEAN DEFAULT TRUE,

  -- Anotações
  notes TEXT,

  -- Auditoria
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(patient_a_id, patient_b_id),
  CHECK (patient_a_id != patient_b_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_patient_relationships_patient_a
  ON patient_relationships(patient_a_id);

CREATE INDEX IF NOT EXISTS idx_patient_relationships_patient_b
  ON patient_relationships(patient_b_id);

CREATE INDEX IF NOT EXISTS idx_patient_relationships_responsible
  ON patient_relationships(is_responsible)
  WHERE is_responsible = TRUE;

-- Atualizar tabela patients com campo responsible_id
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES patients(id) ON DELETE SET NULL;

-- Índice para buscar pacientes de um responsável
CREATE INDEX IF NOT EXISTS idx_patients_responsible
  ON patients(responsible_id);

-- Add comment
COMMENT ON TABLE patient_relationships IS 'Relacionamentos entre pacientes (familia, responsáveis, etc)';
COMMENT ON COLUMN patient_relationships.is_responsible IS 'Se patient_a é responsável legal/financeiro por patient_b';
COMMENT ON COLUMN patient_relationships.bidirectional IS 'Se deve sincronizar automaticamente a relação inversa';

-- Enable RLS
ALTER TABLE patient_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Usuários podem ver relacionamentos de pacientes que tem acesso
CREATE POLICY "Users can view relationships for accessible patients"
  ON patient_relationships
  FOR SELECT
  USING (TRUE); -- Simplificado por enquanto, adicionar auth checks depois

-- RLS Policy: Usuários autenticados podem criar/editar relacionamentos
CREATE POLICY "Users can manage relationships"
  ON patient_relationships
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update relationships"
  ON patient_relationships
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete relationships"
  ON patient_relationships
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_patient_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_relationships_updated_at
  BEFORE UPDATE ON patient_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_relationships_updated_at();
