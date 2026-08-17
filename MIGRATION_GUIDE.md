# 📋 Guia de Migração: Controle Odonto → Stelle Odontologia

## 🎯 Objetivo
Migrar com **precisão total** os dados financeiros do Controle Odonto mantendo integridade referencial e rastreabilidade.

---

## 📊 Estrutura de Dados

### Fluxo Correto:

```
ORÇAMENTO (Budget)
  ├─ Aprovado
  └─ Plano de Pagamento (Installments)
      ├─ Parcela 1: R$ X
      └─ Parcela 2: R$ Y
         
    ↓ (ao aprovar)
    
CONTRATO (Contract)
  ├─ Número Sequencial (001, 002...) ou do Controle Odonto
  └─ Referencia o Orçamento
    
      ↓ (a partir do plano de pagamento)
      
CONTAS A RECEBER (Accounts Receivable)
  ├─ Título 1 (Parcela 1 do orçamento)
  │  ├─ Valor: R$ X
  │  ├─ Vencimento: data
  │  └─ Status: em_aberto → recebido
  │
  └─ Título 2 (Parcela 2 do orçamento)
     ├─ Valor: R$ Y
     ├─ Vencimento: data
     └─ Status: em_aberto → recebido
     
        ↓ (múltiplos recebimentos por título)
        
RECEBIMENTOS (Receipts)
  ├─ Recebimento 1: 22/05 - R$ 1.335,00 → Título 1
  └─ Recebimento 2: 02/06 - R$ 1.000,00 → Título 1
```

---

## 🔄 Migração Passo a Passo

### Passo 1: Criar Contrato
```sql
INSERT INTO contracts (
  number,              -- '5772-001' (patient_code + sequencial)
  patient_id,          -- UUID do paciente
  professional,        -- 'Dra Késya'
  start_date,          -- data do primeiro recebimento
  total_amount,        -- soma de todos os títulos
  observations         -- "Migrado do Controle Odonto"
)
```

### Passo 2: Criar Títulos a Receber
Para cada **título único** do Controle Odonto:
```sql
INSERT INTO accounts_receivable (
  patient_id,
  contract_id,        -- ← Link ao contrato
  title_number,       -- '000070' (do Controle Odonto)
  due_date,           -- data de vencimento
  amount,             -- valor total do título
  original_amount,    -- (mesmo que amount, para auditoria)
  installment_number, -- 1, 2, 3... (qual parcela)
  plan_account,       -- 'Serviços Odontológicos'
  professional,       -- 'Dra Késya'
  status,             -- 'recebido' (se já foi pago)
  paid_at,            -- data do pagamento
  amount_paid         -- valor pago
)
```

### Passo 3: Criar Recebimentos
Para cada **recebimento** do fluxo de caixa:
```sql
INSERT INTO receipts (
  receivable_id,      -- ← Link ao título
  patient_id,
  paid_at,            -- 22/05/2026
  receipt_method,     -- 'Dinheiro', 'Cartão Débito', etc
  amount,             -- valor recebido
  cash_account,       -- 'Caixa Local', 'Itaú', etc
  plan_account,       -- 'Serviços Odontológicos'
  professional,       -- 'Dra Késya'
  late_fee,           -- multa (se houver)
  interest,           -- juros
  discount,           -- descontos
  bank_fee,           -- taxa bancária
  boleto_number,      -- (se aplicável)
  fiscal_note         -- número da NFS-e
)
```

---

## 📈 Exemplo Real: Paciente Andreia (5772)

### Dados do Controle Odonto:
```
Título 000252 - Prótese
├─ Valor Devido: R$ 2.335,00
├─ Vencimento: 22/05/2026
├─ Recebimento 1: 22/05/2026 - R$ 1.335,00 (Transf. Bancária)
└─ Recebimento 2: 02/06/2026 - R$ 1.000,00 (Dinheiro)
```

### Migração para Stelle:

**1. Contrato:**
```sql
INSERT INTO contracts (
  number, patient_id, professional, start_date, total_amount
) VALUES (
  '5772-001', 'uuid-andreia', 'Dra Késya', '2026-05-22', 2335.00
)
-- Resultado: contract_id = 'uuid-contract-001'
```

**2. Título (Conta a Receber):**
```sql
INSERT INTO accounts_receivable (
  contract_id, patient_id, title_number, due_date, amount, installment_number
) VALUES (
  'uuid-contract-001', 'uuid-andreia', '000252', '2026-05-22', 2335.00, 1
)
-- Resultado: receivable_id = 'uuid-receivable-001'
```

**3. Recebimentos:**
```sql
-- Recebimento 1
INSERT INTO receipts (
  receivable_id, patient_id, paid_at, receipt_method, amount, cash_account
) VALUES (
  'uuid-receivable-001', 'uuid-andreia', '2026-05-22', 'Transferência Bancária', 1335.00, 'Nubank'
)

-- Recebimento 2
INSERT INTO receipts (
  receivable_id, patient_id, paid_at, receipt_method, amount, cash_account
) VALUES (
  'uuid-receivable-001', 'uuid-andreia', '2026-06-02', 'Dinheiro', 1000.00, 'Caixa Local'
)
```

### Resultado Final:
- ✅ **1 Contrato** vinculado ao orçamento
- ✅ **1 Título a Receber** (R$ 2.335,00)
- ✅ **2 Recebimentos** vinculados ao mesmo título
- ✅ **Saldo**: R$ 0 (título pago integralmente)

---

## 🔍 Validação de Dados

Use estas queries para verificar a integridade:

```sql
-- Ver contatos criados
SELECT * FROM contracts_financial_summary;

-- Ver detalhes de recebimentos
SELECT * FROM receipts_detailed;

-- Verificar saldos
SELECT
  ar.title_number,
  ar.amount,
  COALESCE(SUM(r.amount), 0) AS total_recebido,
  ar.amount - COALESCE(SUM(r.amount), 0) AS saldo_restante
FROM accounts_receivable ar
LEFT JOIN receipts r ON ar.id = r.receivable_id
GROUP BY ar.id, ar.title_number, ar.amount;
```

---

## ⚠️ Pontos Críticos

1. **Prontuário = patient_code**: Use sempre o número do prontuário do Controle Odonto
2. **Número do Contrato**: Pode ser sequencial (001, 002) ou número do Controle Odonto
3. **Título = Receivable**: 1 título por parcela do orçamento
4. **Recebimentos**: Múltiplos por título (não há limite)
5. **Saldo**: Calculado automaticamente (amount - sum(receipts.amount))
6. **Auditoria**: Sempre guardar dados originais em `original_amount`

---

## 📝 Checklist de Migração

- [ ] Todos os pacientes importados
- [ ] Todos os contratos criados
- [ ] Todos os títulos a receber criados
- [ ] Todos os recebimentos importados
- [ ] Saldos validados (payment_balance = 0 onde esperado)
- [ ] NFS-e números vinculados
- [ ] Profissionais e contas mapeadas
- [ ] Observações preenchidas

---

## 🚀 Scripts de Migração

Ver arquivos SQL em `migrations/`:
- `008_contracts_and_financial_precision.sql` - Estrutura
- `import_contratos_[paciente].sql` - Por paciente (a gerar)
