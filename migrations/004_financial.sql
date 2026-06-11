-- Tabela de títulos a receber (Contas a Receber)
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
  installment_id UUID REFERENCES budget_installments(id) ON DELETE SET NULL,
  contract_id UUID,
  title_number VARCHAR(50),
  position INTEGER DEFAULT 1,
  total_positions INTEGER DEFAULT 1,
  due_date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(40) DEFAULT 'carteira',
  plan_account VARCHAR(100) DEFAULT 'Serviços Odontológicos',
  professional VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'em_aberto'
    CHECK (status IN ('em_aberto', 'vencido', 'recebido', 'cancelado')),
  paid_at TIMESTAMPTZ,
  amount_paid NUMERIC(10,2),
  observations TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_patient ON accounts_receivable(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ar_status ON accounts_receivable(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ar_due ON accounts_receivable(due_date) WHERE deleted_at IS NULL;

ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "accounts_receivable all" ON accounts_receivable;
CREATE POLICY "accounts_receivable all" ON accounts_receivable FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES accounts_receivable(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  cash_account VARCHAR(100),
  receipt_method VARCHAR(50),
  card_brand VARCHAR(50),
  species_number VARCHAR(50),
  late_fee NUMERIC(10,2) DEFAULT 0,
  interest NUMERIC(10,2) DEFAULT 0,
  expenses NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  amount NUMERIC(10,2) NOT NULL,
  plan_account VARCHAR(100),
  agreement VARCHAR(100),
  professional VARCHAR(100),
  seller VARCHAR(100),
  fiscal_note VARCHAR(50),
  occurrence_date DATE,
  owner_name VARCHAR(200),
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_receivable ON receipts(receivable_id);
CREATE INDEX IF NOT EXISTS idx_receipts_paid_at ON receipts(paid_at);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receipts all" ON receipts;
CREATE POLICY "receipts all" ON receipts FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION mark_receivable_paid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE accounts_receivable
  SET status = 'recebido',
      paid_at = NEW.created_at,
      amount_paid = NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.receivable_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_receipt_marks_paid ON receipts;
CREATE TRIGGER trg_receipt_marks_paid
AFTER INSERT ON receipts
FOR EACH ROW EXECUTE FUNCTION mark_receivable_paid();
