-- Tabela de configuração da clínica
CREATE TABLE IF NOT EXISTS clinic_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dados básicos
  razao_social VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(200),
  cnpj VARCHAR(14) NOT NULL UNIQUE,
  inscricao_municipal VARCHAR(20) NOT NULL,
  codigo_ibge VARCHAR(10) NOT NULL,

  -- Endereço
  street VARCHAR(255),
  number VARCHAR(20),
  complement VARCHAR(255),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  zip_code VARCHAR(10),
  state VARCHAR(2),

  -- Contato
  email VARCHAR(100),
  phone VARCHAR(20),

  -- Regime tributário
  regime_tributario VARCHAR(50), -- 'SN' (Simples Nacional), 'LR' (Lucro Real), 'LE' (Lucro Estimado)
  optante_simples_nacional BOOLEAN DEFAULT true,
  incentivador_cultural BOOLEAN DEFAULT false,
  regime_especial_tributacao VARCHAR(100),

  -- NFS-e
  layout_nfse VARCHAR(50), -- 'INTEGRACAO1'
  ambiente_nfse VARCHAR(20), -- 'PRODUCAO' ou 'HOMOLOGACAO'

  -- Certificado
  certificado_nome VARCHAR(200),
  certificado_cn VARCHAR(200), -- CN do certificado
  certificado_serial VARCHAR(100),
  certificado_valid_until DATE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_cnpj ON clinic_config(cnpj);

ALTER TABLE clinic_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_config all" ON clinic_config;
CREATE POLICY "clinic_config all" ON clinic_config FOR ALL USING (true) WITH CHECK (true);

-- Tabela de serviços prestados (mapeamento para NFS-e)
CREATE TABLE IF NOT EXISTS clinic_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  name VARCHAR(255) NOT NULL, -- Ex: "Prevenção", "Dentística"
  description TEXT,

  -- Código NFS-e
  nfse_code VARCHAR(20) NOT NULL, -- Ex: "0301"
  nfse_description VARCHAR(255), -- Ex: "Aluguel de Equipamentos Científicos..."

  -- Plano de contas
  accounting_code VARCHAR(50), -- Ex: "1.1.1.13"
  accounting_description VARCHAR(255),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_services_nfse_code ON clinic_services(nfse_code);
CREATE INDEX IF NOT EXISTS idx_clinic_services_active ON clinic_services(is_active);

ALTER TABLE clinic_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_services all" ON clinic_services;
CREATE POLICY "clinic_services all" ON clinic_services FOR ALL USING (true) WITH CHECK (true);

-- Tabela de alíquotas NFS-e
CREATE TABLE IF NOT EXISTS clinic_nfse_tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Taxas
  aliquota_iss NUMERIC(5,2) DEFAULT 3.0,
  aliquota_pis NUMERIC(5,2) DEFAULT 0,
  aliquota_cofins NUMERIC(5,2) DEFAULT 0,
  aliquota_inss NUMERIC(5,2) DEFAULT 0,
  aliquota_ir NUMERIC(5,2) DEFAULT 0,
  aliquota_csll NUMERIC(5,2) DEFAULT 0,

  -- Retenção
  retencao_iss BOOLEAN DEFAULT false,
  reducao_iss NUMERIC(10,2) DEFAULT 0,

  -- Data de vigência
  data_vigencia DATE DEFAULT CURRENT_DATE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinic_nfse_tax_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_nfse_tax_rates all" ON clinic_nfse_tax_rates;
CREATE POLICY "clinic_nfse_tax_rates all" ON clinic_nfse_tax_rates FOR ALL USING (true) WITH CHECK (true);
