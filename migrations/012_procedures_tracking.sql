-- =============================================================
-- Migration: Rastreamento de Procedimentos por Contrato
-- Um procedimento por item de orçamento (budget_item), criado ao
-- aprovar o orçamento. Status nunca é editado direto — é sempre
-- recalculado a partir do evento (log de execução) mais recente.
-- Contrato tem status legal/administrativo próprio (ativo/cancelado);
-- o andamento clínico (Aguardando Início / Em Andamento X% / Concluído)
-- é derivado dos procedimentos via view contracts_treatment_status.
-- =============================================================

CREATE TABLE IF NOT EXISTS procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_item_id UUID NOT NULL UNIQUE REFERENCES budget_items(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'em_aberto'
    CHECK (status IN ('em_aberto', 'em_andamento', 'concluido', 'cancelado', 'manutencao')),
  designated_professional VARCHAR(100),
  expected_completion_date DATE,
  cost NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procedures_contract ON procedures(contract_id);
CREATE INDEX IF NOT EXISTS idx_procedures_patient ON procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedures_status ON procedures(status);

ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "procedures all" ON procedures;
CREATE POLICY "procedures all" ON procedures FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS procedure_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('em_andamento', 'concluido')),
  professional VARCHAR(100) NOT NULL,
  description TEXT,
  observations TEXT,
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procedure_events_procedure ON procedure_events(procedure_id);

ALTER TABLE procedure_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "procedure_events all" ON procedure_events;
CREATE POLICY "procedure_events all" ON procedure_events FOR ALL USING (true) WITH CHECK (true);

-- Recalcula procedures.status a partir do evento não-anulado mais recente
CREATE OR REPLACE FUNCTION recalc_procedure_status()
RETURNS TRIGGER AS $$
DECLARE
  v_procedure_id UUID;
  v_latest_status VARCHAR(20);
BEGIN
  v_procedure_id := COALESCE(NEW.procedure_id, OLD.procedure_id);

  SELECT status INTO v_latest_status
  FROM procedure_events
  WHERE procedure_id = v_procedure_id AND voided_at IS NULL
  ORDER BY event_date DESC, created_at DESC
  LIMIT 1;

  UPDATE procedures
  SET status = COALESCE(v_latest_status, 'em_aberto'), updated_at = NOW()
  WHERE id = v_procedure_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_procedure_event_recalc ON procedure_events;
CREATE TRIGGER trg_procedure_event_recalc
AFTER INSERT OR UPDATE OR DELETE ON procedure_events
FOR EACH ROW EXECUTE FUNCTION recalc_procedure_status();

-- Status de tratamento agregado por contrato (Aguardando Início / Em Andamento % / Concluído)
CREATE OR REPLACE VIEW contracts_treatment_status AS
SELECT
  c.id AS contract_id,
  COUNT(p.id) AS total_procedures,
  COUNT(p.id) FILTER (WHERE p.status = 'concluido') AS completed_procedures,
  CASE
    WHEN COUNT(p.id) = 0 THEN 'sem_procedimentos'
    WHEN COUNT(p.id) FILTER (WHERE p.status = 'concluido') = COUNT(p.id) THEN 'concluido'
    WHEN COUNT(p.id) FILTER (WHERE p.status IN ('em_andamento', 'concluido')) = 0 THEN 'aguardando_inicio'
    ELSE 'em_andamento'
  END AS treatment_status,
  ROUND(100.0 * COUNT(p.id) FILTER (WHERE p.status = 'concluido') / NULLIF(COUNT(p.id), 0), 1) AS pct_complete
FROM contracts c
LEFT JOIN procedures p ON p.contract_id = c.id
GROUP BY c.id;
