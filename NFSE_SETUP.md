# Setup NFS-e - Emissor Nacional

## ✅ Pré-requisitos
- [x] Certificado digital A1 (.pfx)
- [x] Senha do certificado
- [x] CNPJ: 30736143000127
- [x] Inscrição Municipal: 11162320
- [x] Código IBGE: 3304557
- [x] Token de integração: 32c05a21-6fe0-419c-a699-c441f8ba0500

---

## 1️⃣ CONVERTER CERTIFICADO .PFX PARA BASE64

### No Windows (PowerShell):
```powershell
# Ir para a pasta com o .pfx
cd "C:\caminho\para\seu\certificado"

# Converter para base64
$pfxFile = "seu_certificado.pfx"
$base64Content = [Convert]::ToBase64String([IO.File]::ReadAllBytes($pfxFile))
$base64Content | Set-Clipboard

# Agora está no clipboard (Ctrl+V para colar em qualquer lugar)
# Salvar em um arquivo também:
$base64Content | Out-File -Encoding UTF8 "cert_base64.txt"
```

### No Linux/Mac:
```bash
# Converter para base64
base64 -i seu_certificado.pfx -o cert_base64.txt

# Ou direto no terminal:
cat seu_certificado.pfx | base64
```

---

## 2️⃣ SETAR SECRETS NO SUPABASE

Após converter o certificado, siga estes passos:

### Via CLI Supabase (RECOMENDADO):

```bash
# 1. Login no Supabase CLI
supabase login

# 2. Setar o certificado em base64
supabase secrets set CERT_PFX_BASE64 --project-id kcdmsvtcrddflfojmcvd < cert_base64.txt

# 3. Setar a senha do certificado
supabase secrets set CERT_PASSWORD --project-id kcdmsvtcrddflfojmcvd "sua_senha_do_certificado"

# 4. Setar token de integração
supabase secrets set NFSE_TOKEN --project-id kcdmsvtcrddflfojmcvd "32c05a21-6fe0-419c-a699-c441f8ba0500"

# 5. Listar secrets (verificar que foram criados)
supabase secrets list --project-id kcdmsvtcrddflfojmcvd
```

### Via Dashboard Supabase (ALTERNATIVO):

1. Acesse: https://app.supabase.com/project/kcdmsvtcrddflfojmcvd/settings/secrets
2. Click em "Add secret"
3. Adicione:
   - **Name:** `CERT_PFX_BASE64`
   - **Value:** (cole o conteúdo do cert_base64.txt)
4. Click "Save"
5. Repita para `CERT_PASSWORD` e `NFSE_TOKEN`

---

## 3️⃣ RODAS AS MIGRAÇÕES SQL

### Via Supabase CLI:

```bash
# 1. Verificar migrações pendentes
supabase db list-migrations --project-id kcdmsvtcrddflfojmcvd

# 2. Executar migração 004_financial.sql (com as novas colunas de NFS-e)
supabase db execute --project-id kcdmsvtcrddflfojmcvd --file migrations/004_financial.sql
```

### Via Dashboard Supabase (SQL Editor):

1. Acesse: https://app.supabase.com/project/kcdmsvtcrddflfojmcvd/sql/new
2. Cole o conteúdo de `migrations/004_financial.sql`
3. Click "RUN"

### Verificar se as colunas foram criadas:

```sql
-- No SQL Editor do Supabase, execute:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'receipts'
AND column_name LIKE 'invoice_%'
ORDER BY column_name;
```

Deve retornar todas essas colunas:
- `invoice_access_key`
- `invoice_cancelled_at`
- `invoice_emitted_at`
- `invoice_error`
- `invoice_id`
- `invoice_number`
- `invoice_pdf_url`
- `invoice_rps_number`
- `invoice_status`
- `invoice_url`
- `invoice_verified_at`
- `invoice_xml_url`

---

## 4️⃣ DEPLOY DA EDGE FUNCTION

### Via CLI Supabase:

```bash
# Fazer deploy da função emit-nfse
supabase functions deploy emit-nfse --project-id kcdmsvtcrddflfojmcvd

# Verificar logs da função
supabase functions download emit-nfse --project-id kcdmsvtcrddflfojmcvd

# Ver logs em tempo real
supabase functions delete emit-nfse --project-id kcdmsvtcrddflfojmcvd  # para redeployer
supabase functions deploy emit-nfse --project-id kcdmsvtcrddflfojmcvd
```

### Testar a função (curl):

```bash
# 1. Criar um teste: adicionar um receipt no banco de dados manualmente
# (ou processe um recebimento na interface)

# 2. Pegar o receipt_id

# 3. Chamar a função:
curl -X POST https://kcdmsvtcrddflfojmcvd.supabase.co/functions/v1/emit-nfse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu_anon_key" \
  -d '{"receipt_id": "seu_receipt_id_aqui"}'
```

---

## 5️⃣ TESTAR INTEGRAÇÃO NO FRONTEND

1. Acesse a aplicação em Vercel
2. Processe um recebimento (Financeiro → Processar Recebimento)
3. Na modal "Recebimento Concluído", clique em "Nota Fiscal Eletrônica"
4. A função será chamada e você verá o status em tempo real

### Cenários de Teste:

**Sucesso:** 
- Paciente com CPF cadastrado
- Valor acima de R$ 0
- Sem erros de validação

**Erro de CPF:**
- Paciente sem CPF → erro claro: "Paciente sem CPF cadastrado"

**Erro de API:**
- Se SEFAZ estiver indisponível → erro: "Erro ao comunicar com SEFAZ"

**Reemissão:**
- Clique no botão "Tentar Novamente" para reemitir após erro

---

## 6️⃣ INTEGRAÇÃO REAL COM SEFAZ (PRÓXIMO PASSO)

Quando quiser ativar a emissão real (não simulada), edite `supabase/functions/emit-nfse/index.ts`:

Na função `enviarParaSefaz()`, implemente:

1. **Carregar certificado:**
```typescript
const certPfxBase64 = Deno.env.get('CERT_PFX_BASE64')
const certPassword = Deno.env.get('CERT_PASSWORD')
const certBin = Deno.core.ops.op_decode_to_binary(certPfxBase64)
// Parsear certificado .pfx
```

2. **Configurar mTLS:**
```typescript
const tlsClient = new Deno.HttpClient({
  certChain: cert,
  privateKey: key,
  caData: rootCa // CA da SEFAZ
})
```

3. **Fazer POST:**
```typescript
const response = await fetch('https://adn.nfse.gov.br/nfse', {
  method: 'POST',
  body: xmlSinado,
  headers: {
    'Content-Type': 'application/xml',
    'Authorization': `Bearer ${token}`
  },
  client: tlsClient
})
```

4. **Processar resposta XML:**
```typescript
const responseXml = await response.text()
// Parsear XML de resposta
// Extrair: número, chave de acesso, status
// Salvar no banco
```

---

## 7️⃣ TROUBLESHOOTING

### "CERT_PFX_BASE64 not found"
- Verificar se o secret foi criado: `supabase secrets list`
- Redeloyer a função: `supabase functions deploy emit-nfse`

### "Paciente sem CPF"
- Editar dados do paciente em Pacientes → Dados Cadastrais
- Adicionar CPF
- Tentar novamente

### "Edge Function não responde"
- Verificar logs: Dashboard Supabase → Functions → emit-nfse → Logs
- Redeployer a função
- Verificar se há erros de sintaxe TypeScript

### "Erro ao comunicar com SEFAZ"
- SEFAZ pode estar em manutenção (verificar status)
- Certificado pode estar inválido
- mTLS pode não estar configurado corretamente

---

## 📚 REFERÊNCIAS

- [Emissor Nacional NFS-e](https://www.nfse.gov.br/)
- [Documentação Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Deno.land Manual](https://deno.land/manual)
