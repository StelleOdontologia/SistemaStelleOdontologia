-- =============================================================
-- Migration: Numeração automática de contratos
-- Contratos migrados do Controle Odonto usam o número real de origem
-- (passado explicitamente no INSERT). Contratos novos, criados pelo
-- fluxo de aprovação do Stelle, recebem número sequencial automático.
-- Sequência inicia em 900000 para nunca colidir com números reais
-- migrados do Controle Odonto (observados até ~02305).
-- =============================================================

CREATE SEQUENCE IF NOT EXISTS contract_number_seq START WITH 900000 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
BEGIN
  RETURN LPAD(nextval('contract_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE contracts ALTER COLUMN number SET DEFAULT generate_contract_number();
