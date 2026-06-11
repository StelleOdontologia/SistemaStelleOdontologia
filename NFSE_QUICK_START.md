# NFS-e Quick Start - Comandos Exatos

## ⚡ 1. CONVERTER CERTIFICADO (WINDOWS POWERSHELL)

Abra PowerShell e execute:

```powershell
# Trocar para pasta do certificado
cd "C:\Users\Home\Downloads"  # ou onde está o .pfx

# Converter para base64 e salvar em arquivo
$pfxFile = "seu_certificado.pfx"  # nome do seu arquivo
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($pfxFile))
$base64 | Out-File -Encoding UTF8 "cert_base64.txt"

# Verificar que foi criado (deve ter muitos caracteres)
Get-Content cert_base64.txt | Select-Object -First 1 | Measure-Object -Character
```

Salvar `cert_base64.txt` em local seguro. Você precisará do conteúdo completo desse arquivo.

---

## ⚡ 2. INSTALAR SUPABASE CLI (SE NÃO TIVER)

```powershell
# Verificar se já tem instalado
supabase --version

# Se não tiver, instalar via Scoop ou Chocolatey:
# Via Scoop:
scoop install supabase

# Ou via Chocolatey:
choco install supabase
```

---

## ⚡ 3. LOGIN NO SUPABASE

```bash
supabase login
```

Isso vai abrir um navegador para você fazer login. Confirme no navegador.

---

## ⚡ 4. SETAR OS SECRETS (COPIAR E COLAR)

### 4A. CERTIFICADO (Base64)

```bash
# Abra o arquivo cert_base64.txt, copie TODO o conteúdo, e execute:
supabase secrets set CERT_PFX_BASE64 --project-id kcdmsvtcrddflfojmcvd

# Vai pedir para você COLAR o conteúdo. Cole tudo e pressione ENTER duas vezes.
```

### 4B. SENHA DO CERTIFICADO

```bash
# Trocar "sua_senha_aqui" pela senha real do certificado
supabase secrets set CERT_PASSWORD --project-id kcdmsvtcrddflfojmcvd
# Digite: sua_senha_aqui
# Pressione ENTER
```

### 4C. TOKEN DE INTEGRAÇÃO

```bash
supabase secrets set NFSE_TOKEN --project-id kcdmsvtcrddflfojmcvd
# Digite: 32c05a21-6fe0-419c-a699-c441f8ba0500
# Pressione ENTER
```

### 4D. VERIFICAR SECRETS (OPCIONAL)

```bash
supabase secrets list --project-id kcdmsvtcrddflfojmcvd

# Deve retornar:
# CERT_PASSWORD=****
# CERT_PFX_BASE64=****
# NFSE_TOKEN=****
```

---

## ⚡ 5. EXECUTAR MIGRATION SQL

Duas opções:

### OPÇÃO A: Via CLI Supabase

```bash
cd D:\Claude\SistemaStelleOdontologia

supabase db execute --project-id kcdmsvtcrddflfojmcvd --file migrations/004_financial.sql
```

### OPÇÃO B: Via Dashboard Supabase

1. Abra: https://app.supabase.com/project/kcdmsvtcrddflfojmcvd/sql/new
2. Cole todo o conteúdo de `migrations/004_financial.sql`
3. Click "RUN" (botão azul no canto inferior direito)
4. Verifique que não houve erro

---

## ⚡ 6. DEPLOY DA EDGE FUNCTION

```bash
cd D:\Claude\SistemaStelleOdontologia

supabase functions deploy emit-nfse --project-id kcdmsvtcrddflfojmcvd
```

Deve retornar algo como:
```
✅ Function deployed successfully
Deployed to: https://kcdmsvtcrddflfojmcvd.supabase.co/functions/v1/emit-nfse
```

---

## ⚡ 7. AGUARDAR DEPLOY NO VERCEL

A migração e o código do frontend estão commitados e pushed. Aguarde:
- ~2 minutos para Vercel fazer o build
- Você verá "Deployment successful" em https://vercel.com/StelleOdontologia/

---

## ⚡ 8. TESTAR NO FRONTEND

1. Hard refresh da aplicação (Ctrl+Shift+R)
2. Vá a **Financeiro** → clique 💵 em um título
3. Processe um recebimento
4. Na modal "Recebimento Concluído", clique "🧾 Nota Fiscal Eletrônica"
5. Deve mostrar a emissão em progresso

---

## ✅ CHECKLIST DE VERIFICAÇÃO

- [ ] Certificado convertido para base64
- [ ] CERT_PFX_BASE64 setado no Supabase
- [ ] CERT_PASSWORD setado no Supabase
- [ ] NFSE_TOKEN setado no Supabase
- [ ] Migration 004_financial.sql executada
- [ ] Edge Function deploy-nfse deployada
- [ ] Vercel deployment concluído
- [ ] Página recarregada com hard refresh
- [ ] Testado fluxo de emissão

---

## ❌ SE DER ERRO

### Erro: "CERT_PFX_BASE64 not found"
```bash
# Redeployer a função após setar secrets
supabase functions deploy emit-nfse --project-id kcdmsvtcrddflfojmcvd
```

### Erro: "receipt não encontrado"
- Certifique-se que você processou um recebimento antes
- Copie o ID correto do recebimento

### Erro: "Paciente sem CPF"
- Edite o paciente e adicione o CPF
- Tente novamente

### Erro: "Erro ao comunicar com SEFAZ"
- A integração está em **modo simulado** por enquanto
- Você verá uma NFS-e fake com sucesso
- Quando quiser produção real, edite a função `enviarParaSefaz()` em `supabase/functions/emit-nfse/index.ts`

---

## 📞 PRÓXIMAS ETAPAS

Quando tiver tudo testado e funcionando:

1. **Integração real com SEFAZ:**
   - Vou implementar o suporte a mTLS
   - Parsear certificado .pfx
   - Fazer requisições reais para https://adn.nfse.gov.br

2. **Relatórios de NFS-e:**
   - Dashboard de NFS-e emitidas
   - Rastreamento de status
   - Reemissão automática

3. **Contrato (futuro):**
   - Gerar contrato antes de orçamento
   - Vincular NFS-e ao contrato
   - Fluxo contrato → orçamento → NFS-e

---

**Qualquer dúvida durante o setup, avise!**
