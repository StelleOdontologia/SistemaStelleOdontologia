-- Adicionar controle para ativar/desativar envio de confirmações com link
ALTER TABLE message_policies
ADD COLUMN IF NOT EXISTS enable_confirmation_responses BOOLEAN DEFAULT true;

-- Adicionar coluna para armazenar URL base da aplicação
ALTER TABLE whatsapp_config
ADD COLUMN IF NOT EXISTS app_url VARCHAR(255) DEFAULT 'https://sistema.stelleodontologia.com.br';

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_message_logs_status ON message_logs(status);
CREATE INDEX IF NOT EXISTS idx_message_logs_sent_at ON message_logs(sent_at);
