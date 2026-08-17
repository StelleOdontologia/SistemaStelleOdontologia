-- =============================================================
-- Migration: Sistema de Contratos e Precisão Financeira
-- Vinculação entre Orçamentos → Contratos → Títulos → Recebimentos
-- =============================================================

-- 1) Criar tabela de contratos
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number VARCHAR(20) NOT NULL UNIQUE,  -- Sequencial: 001, 002, etc ou número do Controle Odonto
  budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional VARCHAR(100),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  total_amount NUMERIC(12,2),
  status VARCHAR(30) DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'concluído', 'cancelado', 'suspenso')),
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_number ON contracts(number);
CREATE INDEX IF NOT EXISTS idx_contracts_patient ON contracts(patient_id);
CREATE INDEX IF NOT EXISTS idx_contracts_budget ON contracts(budget_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contracts all" ON contracts;
CREATE POLICY "contracts all" ON contracts FOR ALL USING (true) WITH CHECK (true);

-- 2) Adicionar fields de precisão em accounts_receivable (se não existirem)
ALTER TABLE accounts_receivable
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS installment_number INTEGER,  -- qual parcela (1, 2, 3...)
ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12,2),  -- valor original do título
ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(12,2),  -- saldo restante
ADD COLUMN IF NOT EXISTS document_number VARCHAR(50);  -- referência do documento

CREATE INDEX IF NOT EXISTS idx_ar_contract ON accounts_receivable(contract_id);
CREATE INDEX IF NOT EXISTS idx_ar_installment ON accounts_receivable(installment_number);

-- 3) Adicionar campos de precisão em receipts (se não existirem)
ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS late_fee NUMERIC(10,2) DEFAULT 0,  -- multa por atraso
ADD COLUMN IF NOT EXISTS boleto_number VARCHAR(50),  -- número do boleto
ADD COLUMN IF NOT EXISTS bank_fee NUMERIC(10,2) DEFAULT 0,  -- taxa bancária (separado de expenses)
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(50);  -- número de referência/comprovante

CREATE INDEX IF NOT EXISTS idx_receipts_boleto ON receipts(boleto_number);
CREATE INDEX IF NOT EXISTS idx_receipts_reference ON receipts(reference_number);

-- 4) Função para calcular saldo restante de um título
CREATE OR REPLACE FUNCTION update_receivable_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM receipts
  WHERE receivable_id = NEW.receivable_id;

  UPDATE accounts_receivable
  SET remaining_balance = amount - v_total_paid,
      updated_at = NOW()
  WHERE id = NEW.receivable_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_balance ON receipts;
CREATE TRIGGER trg_update_balance
AFTER INSERT OR UPDATE ON receipts
FOR EACH ROW EXECUTE FUNCTION update_receivable_balance();

-- 5) View de resumo financeiro por contrato
CREATE OR REPLACE VIEW contracts_financial_summary AS
SELECT
  c.id,
  c.number,
  c.patient_id,
  p.name AS patient_name,
  c.total_amount,
  COUNT(ar.id) AS total_titles,
  COALESCE(SUM(ar.amount), 0) AS total_receivable,
  COALESCE(SUM(ar.amount_paid), 0) AS total_paid,
  COALESCE(SUM(ar.remaining_balance), 0) AS total_pending,
  c.status,
  c.created_at
FROM contracts c
LEFT JOIN accounts_receivable ar ON c.id = ar.contract_id
LEFT JOIN patients p ON c.patient_id = p.id
GROUP BY c.id, c.number, c.patient_id, p.name, c.total_amount, c.status, c.created_at;

-- 6) View de detalhes de recebimentos
CREATE OR REPLACE VIEW receipts_detailed AS
SELECT
  r.id,
  r.paid_at,
  r.receipt_method,
  r.amount,
  r.late_fee,
  r.interest,
  r.discount,
  r.expenses + COALESCE(r.bank_fee, 0) AS total_fees,
  ar.title_number,
  ar.amount AS title_amount,
  ar.remaining_balance,
  p.name AS patient_name,
  p.cpf,
  c.number AS contract_number,
  r.plan_account,
  r.professional
FROM receipts r
LEFT JOIN accounts_receivable ar ON r.receivable_id = ar.id
LEFT JOIN patients p ON r.patient_id = p.id
LEFT JOIN contracts c ON ar.contract_id = c.id
ORDER BY r.paid_at DESC;
