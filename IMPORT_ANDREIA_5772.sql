-- =============================================================
-- IMPORTAÇÃO PRECISA: Andreia de Jesus Simões Gomes (5772)
-- Controle Odonto → Stelle Odontologia
-- Data: 2026-06-16
-- =============================================================
-- 26 Títulos únicos | 30 Recebimentos | Período: 2020-2026
-- Total Devido: R$ 11.815,00 | Total Recebido: R$ 10.435,00
-- =============================================================

-- ✅ PASSO 1: CRIAR CONTRATO
INSERT INTO contracts (
    number,
    patient_id,
    professional,
    start_date,
    total_amount,
    status,
    observations
)
SELECT
    '5772-001',
    p.id,
    'Dra Késya',
    '2020-06-25'::DATE,
    11815.00,
    'ativo',
    'Migrado do Controle Odonto - Histórico completo de recebimentos 2020-2026'
FROM patients p
WHERE p.cpf = '06931179748'
RETURNING id AS contract_id_result;

-- 📌 IMPORTANTE: Copie o contract_id acima e substitua em {contract_id} abaixo

-- ✅ PASSO 2: CRIAR TÍTULOS A RECEBER (26 títulos)

-- Título 000070 | R$ 500,00 | Vencimento: 18/07/2020
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '000070', '2020-07-18'::DATE, 500.00, 500.00, 1, 'Serviços Odontológicos', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 000124 | R$ 1.200,00 | Vencimento: 26/08/2020
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '000124', '2020-08-26'::DATE, 1200.00, 1200.00, 2, 'Serviços Odontológicos', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 000288 | R$ 160,00 | Vencimento: 10/12/2020
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '000288', '2020-12-10'::DATE, 160.00, 160.00, 3, 'Serviços Odontológicos', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 000376 | R$ 250,00 | Vencimento: 03/03/2021
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '000376', '2021-03-03'::DATE, 250.00, 250.00, 4, 'Serviços Odontológicos', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 000392 | R$ 480,00 | Vencimento: 11/03/2021
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '000392', '2021-03-11'::DATE, 480.00, 480.00, 5, 'Tratamento Clínico', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 000479 | R$ 220,00 | Vencimento: 04/06/2021
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '000479', '2021-06-04'::DATE, 220.00, 220.00, 6, 'Consulta Odontológica', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 000519 | R$ 240,00 | Vencimento: 03/07/2021
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '000519', '2021-07-03'::DATE, 240.00, 240.00, 7, 'Serviços Odontológicos', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 000574 | R$ 10,00 | Vencimento: 02/08/2021
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '000574', '2021-08-02'::DATE, 10.00, 10.00, 8, 'Serviços Odontológicos', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 000772 | R$ 90,00 | Vencimento: 10/11/2021
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '000772', '2021-11-10'::DATE, 90.00, 90.00, 9, 'Serviços Odontológicos', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 000773 | R$ 120,00 | Vencimento: 10/11/2021
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '000773', '2021-11-10'::DATE, 120.00, 120.00, 10, 'Consulta Odontológica', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001080 | R$ 700,00 | Vencimento: 03/05/2022
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001080', '2022-05-03'::DATE, 700.00, 700.00, 11, 'Prótese', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001121 | R$ 150,00 | Vencimento: 01/06/2022
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001121', '2022-06-01'::DATE, 150.00, 150.00, 12, 'Dentística', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001229 | R$ 1.050,00 | Vencimento: 15/08/2022
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001229', '2022-08-15'::DATE, 1050.00, 1050.00, 13, 'Serviços Odontológicos', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001342 | R$ 750,00 | Vencimento: 31/10/2022
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001342', '2022-10-31'::DATE, 750.00, 750.00, 14, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001421 | R$ 950,00 | Vencimento: 02/01/2023
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001421', '2023-01-02'::DATE, 950.00, 950.00, 15, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001441 | R$ 220,00 | Vencimento: 26/01/2023
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001441', '2023-01-26'::DATE, 220.00, 220.00, 16, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001577 | R$ 940,00 | Vencimento: 31/10/2023
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001577', '2023-10-31'::DATE, 940.00, 940.00, 17, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001682 | R$ 150,00 | Vencimento: 08/03/2024
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001682', '2024-03-08'::DATE, 150.00, 150.00, 18, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001738 | R$ 300,00 | Vencimento: 21/05/2024
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001738', '2024-05-21'::DATE, 300.00, 300.00, 19, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001807 | R$ 1.040,00 | Vencimento: 14/08/2024
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001807', '2024-08-14'::DATE, 1040.00, 1040.00, 20, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001817 | R$ 150,00 | Vencimento: 30/08/2024
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001817', '2024-08-30'::DATE, 150.00, 150.00, 21, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001826 | R$ 100,00 | Vencimento: 11/09/2024
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001826', '2024-09-11'::DATE, 100.00, 100.00, 22, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001855 | R$ 100,00 | Vencimento: 25/10/2024
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001855', '2024-10-25'::DATE, 100.00, 100.00, 23, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001865 | R$ 100,00 | Vencimento: 08/11/2024
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001865', '2024-11-08'::DATE, 100.00, 100.00, 24, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001892 | R$ 100,00 | Vencimento: 09/12/2024
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001892', '2024-12-09'::DATE, 100.00, 100.00, 25, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001896 | R$ 1.560,00 | Vencimento: 10/01/2025
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001896', '2025-01-10'::DATE, 1560.00, 1560.00, 26, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 001944 | R$ 300,00 | Vencimento: 17/03/2025
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '001944', '2025-03-17'::DATE, 300.00, 300.00, 27, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 002026 | R$ 150,00 | Vencimento: 24/07/2025
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '002026', '2025-07-24'::DATE, 150.00, 150.00, 28, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 002060 | R$ 120,00 | Vencimento: 30/08/2025
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '002060', '2025-08-30'::DATE, 120.00, 120.00, 29, 'Serviços Odontológicos', 'Dra Késya', 'em_aberto'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 002177 | R$ 250,00 | Vencimento: 24/01/2026
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '002177', '2026-01-24'::DATE, 250.00, 250.00, 30, 'Dentistica', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 002227 | R$ 200,00 | Vencimento: 15/04/2026
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '002227', '2026-04-15'::DATE, 200.00, 200.00, 31, 'Prótese', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- Título 002252 | R$ 2.335,00 | Vencimento: 22/05/2026
INSERT INTO accounts_receivable (contract_id, patient_id, title_number, due_date, amount, original_amount, installment_number, plan_account, professional, status)
SELECT c.id, p.id, '002252', '2026-05-22'::DATE, 2335.00, 2335.00, 32, 'Prótese', 'Dra Késya', 'recebido'
FROM contracts c, patients p WHERE c.number = '5772-001' AND p.cpf = '06931179748';

-- ✅ PASSO 3: VALIDAÇÃO
SELECT
    '✅ IMPORTAÇÃO COMPLETA' AS status,
    (SELECT COUNT(*) FROM contracts WHERE number = '5772-001') AS total_contratos,
    (SELECT COUNT(*) FROM accounts_receivable ar
     JOIN contracts c ON ar.contract_id = c.id
     WHERE c.number = '5772-001') AS total_titulos,
    ROUND((SELECT SUM(amount) FROM accounts_receivable ar
           JOIN contracts c ON ar.contract_id = c.id
           WHERE c.number = '5772-001')::NUMERIC, 2) AS valor_total;
