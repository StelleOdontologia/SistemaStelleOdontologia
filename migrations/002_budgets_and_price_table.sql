-- =============================================================
-- Migration: Sistema de Orçamentos e Tabela de Preços
-- =============================================================

-- 1) Tabela de Preços (catálogo de procedimentos)
CREATE TABLE IF NOT EXISTS price_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty VARCHAR(100),
  internal_code VARCHAR(20),
  tiss_code VARCHAR(20),
  name TEXT NOT NULL,
  shortcut VARCHAR(50),
  price NUMERIC(10,2),
  cost NUMERIC(10,2),
  min_price NUMERIC(10,2),
  max_price NUMERIC(10,2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_table_specialty ON price_table(specialty);
CREATE INDEX IF NOT EXISTS idx_price_table_active ON price_table(active);
CREATE INDEX IF NOT EXISTS idx_price_table_search ON price_table USING gin (to_tsvector('portuguese', name));

-- RLS - leitura aberta para usuários autenticados (catálogo)
ALTER TABLE price_table ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price_table read" ON price_table;
CREATE POLICY "price_table read" ON price_table FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "price_table write" ON price_table;
CREATE POLICY "price_table write" ON price_table FOR ALL USING (auth.uid() IS NOT NULL);

-- 2) Orçamentos (header)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title VARCHAR(200),
  budget_type VARCHAR(30) NOT NULL DEFAULT 'particular'
    CHECK (budget_type IN ('particular', 'convenio_interno', 'operadora', 'empresa_conv')),
  professional VARCHAR(100),
  emission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_date DATE,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  payment_method TEXT,
  observations TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'aguardando_aprovacao'
    CHECK (status IN ('aguardando_aprovacao', 'aprovado', 'recusado', 'cancelado', 'concluido')),
  total_gross NUMERIC(12,2) DEFAULT 0,
  total_net NUMERIC(12,2) DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_patient ON budgets(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status) WHERE deleted_at IS NULL;

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budgets all" ON budgets;
CREATE POLICY "budgets all" ON budgets FOR ALL USING (auth.uid() IS NOT NULL);

-- 3) Itens do orçamento
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  price_table_id UUID REFERENCES price_table(id),
  procedure_code VARCHAR(20),
  procedure_name TEXT NOT NULL,
  tooth_number VARCHAR(20),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON budget_items(budget_id);

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budget_items all" ON budget_items;
CREATE POLICY "budget_items all" ON budget_items FOR ALL USING (auth.uid() IS NOT NULL);

-- 4) Trigger para recalcular totais do orçamento ao mudar itens
CREATE OR REPLACE FUNCTION recalculate_budget_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_id UUID;
  v_gross NUMERIC(12,2);
  v_discount NUMERIC(5,2);
  v_net NUMERIC(12,2);
BEGIN
  v_budget_id := COALESCE(NEW.budget_id, OLD.budget_id);

  SELECT COALESCE(SUM(total), 0) INTO v_gross
  FROM budget_items WHERE budget_id = v_budget_id;

  SELECT COALESCE(discount_pct, 0) INTO v_discount
  FROM budgets WHERE id = v_budget_id;

  v_net := v_gross * (1 - v_discount / 100);

  UPDATE budgets SET total_gross = v_gross, total_net = v_net, updated_at = NOW()
  WHERE id = v_budget_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_items_recalc ON budget_items;
CREATE TRIGGER trg_budget_items_recalc
AFTER INSERT OR UPDATE OR DELETE ON budget_items
FOR EACH ROW EXECUTE FUNCTION recalculate_budget_totals();
