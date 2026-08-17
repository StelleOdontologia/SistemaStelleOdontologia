# 📋 ANÁLISE: Funcionalidade de Relacionamentos entre Pacientes

**Data:** 17 de Agosto de 2026  
**Status:** 🔍 EM ANÁLISE (Aguardando aprovação para implementação)  
**Prioridade:** ⭐⭐⭐ Alta (Impacta faturamento e responsabilidade legal)

---

## 🎯 O Que É Esta Funcionalidade?

A funcionalidade de **Relacionamentos** permite:
1. **Linkar pacientes entre si** por grau de parentesco
2. **Designar responsáveis** (pai, mãe, responsável legal)
3. **Usar responsável para faturamento** (emitir nota fiscal em nome de quem paga)
4. **Gerenciar famílias** de forma integrada

---

## 📊 Análise do Controle Odonto

### Como Funciona Atualmente:

```
Paciente: Daniel Agnello Torres (adulto)
    ↓
Aba "Relacionamentos" permite:
    ├─ Adicionar relacionamento
    ├─ Escolher grau (Entendo, Amigo, Avó, Cônjuge, Cunhado, Filho, Irmão, Namorado, Neto, Noivo, Outro)
    └─ Registrar o outro paciente (Ronaldo Ferreira Torres - PAI)

Paciente: Filho/Criança
    ↓
Aba "Dados Clínicos" → "Documentação" → Campo "Responsável"
    └─ Geiza Almeida Rosa (MÃE - responsável legal)
    └─ Mostra CPF do responsável
    └─ Mostra filiação

Uso para Faturamento:
    └─ Nota fiscal pode ser emitida em nome do Responsável
    └─ Importante para menores de idade ou dependentes
```

---

## 🗄️ Banco de Dados Necessário

### Tabela: `patient_relationships`

```sql
CREATE TABLE patient_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Paciente A (aquele que está vendo o relacionamento)
  patient_a_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Paciente B (o relacionado)
  patient_b_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Tipo de relacionamento (como visto por A)
  relationship_type VARCHAR NOT NULL,
  -- Valores: 'pai', 'mãe', 'filho', 'filha', 'irmão', 'irmã', 
  --         'avô', 'avó', 'neto', 'neta', 'cônjuge', 'amigo', 
  --         'cunhado', 'tio', 'tia', 'primo', 'responsável_legal', 'outro'
  
  -- Se A é responsável por B
  is_responsible BOOLEAN DEFAULT FALSE,
  
  -- Se este relacionamento é bidirecional (auto-sincronizado)
  bidirectional BOOLEAN DEFAULT TRUE,
  
  -- Anotações
  notes TEXT,
  
  -- Auditoria
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(patient_a_id, patient_b_id),
  CHECK (patient_a_id != patient_b_id)
);

-- Índices para performance
CREATE INDEX idx_patient_relationships_patient_a ON patient_relationships(patient_a_id);
CREATE INDEX idx_patient_relationships_patient_b ON patient_relationships(patient_b_id);
CREATE INDEX idx_patient_relationships_responsible ON patient_relationships(is_responsible);
```

### Atualizar Tabela: `patients`

```sql
-- Adicionar campo de responsável
ALTER TABLE patients 
ADD COLUMN responsible_id UUID REFERENCES patients(id);

-- Índice para buscar pacientes de um responsável
CREATE INDEX idx_patients_responsible ON patients(responsible_id);
```

---

## 🏗️ Arquitetura da Solução

### **Componentes Necessários:**

```
src/components/
├── RelationshipForm.tsx         (Modal para adicionar relacionamento)
├── RelationshipList.tsx         (Lista de relacionamentos do paciente)
├── ResponsibleSelector.tsx      (Seletor de responsável)
└── PatientFamilyTree.tsx        (Árvore visual da família - opcional)

src/pages/
├── PatientDetail.tsx            (Adicionar aba "Relacionamentos")

src/lib/
├── relationships.ts             (Funções de gerenciamento de relacionamentos)
└── supabase.ts                  (Adicionar tipos)
```

---

## 📋 Fluxos de Uso

### **Cenário 1: Criança com Responsável**

```
1. Registrar paciente "João Silva" (3 anos)
2. Ir para aba "Relacionamentos"
3. Clique em "+ Adicionar Relacionamento"
4. Selecione o tipo: "Filho de"
5. Busque/selecione paciente "Maria Silva" (mãe)
6. Marque "É responsável legal"
7. Salvar
8. Resultado:
   - João tem vínculo com Maria
   - Maria aparece como responsável de João
   - Ao emitir NF de João, pode usar dados de Maria
```

### **Cenário 2: Paciente Adulto com Convênio**

```
1. Registrar paciente "Pedro Silva" (45 anos)
2. Pedro tem convênio empresarial
3. Registrar "Empresa XYZ" como paciente empresa
4. Adicionar relacionamento: Pedro é "Funcionário de" Empresa XYZ
5. Ao emitir NF, pode escolher faturar para empresa ou para Pedro
```

### **Cenário 3: Casal em Relacionamento**

```
1. Paciente "Ana" e Paciente "Bruno"
2. Adicionar relacionamento: Ana ↔ Bruno (Cônjuges - bidirecional)
3. Ambos veem um ao outro como cônjuge
4. Para faturamento familiar: pode usar dados de um ou outro
```

---

## 🎨 Interface Proposta

### **Aba Relacionamentos (no PatientDetail)**

```
┌─────────────────────────────────────────┐
│ Relacionamentos                 [+ Novo] │
├─────────────────────────────────────────┤
│                                         │
│ PAI / MÃE / RESPONSÁVEL:                │
│ ┌─────────────────────────────────────┐ │
│ │ Maria Silva (Mãe)                   │ │
│ │ CPF: 123.456.789-00                 │ │
│ │ ⭐ Responsável Legal                 │ │
│ │ [Editar] [Remover]                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ RELACIONAMENTOS (outros):               │
│ ┌─────────────────────────────────────┐ │
│ │ Carlos Silva (Irmão)                │ │
│ │ CPF: 987.654.321-00                 │ │
│ │ [Editar] [Remover]                  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Ana Silva (Cônjuge)                 │ │
│ │ CPF: 111.222.333-44                 │ │
│ │ [Editar] [Remover]                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### **Modal: Adicionar Relacionamento**

```
┌──────────────────────────────────────┐
│ ➕ Adicionar Relacionamento          │
├──────────────────────────────────────┤
│                                      │
│ Grau de Relacionamento:              │
│ [Escolher ▼]                         │
│  - Pai                               │
│  - Mãe                               │
│  - Filho                             │
│  - Filha                             │
│  - Irmão                             │
│  - Cônjuge                           │
│  - Responsável Legal                 │
│  - Outro                             │
│                                      │
│ Buscar Paciente:                     │
│ [Maria Silva____________] 🔍         │
│  └─ Maria Silva (45 anos, CPF...)   │
│  └─ Maria Silva Junior (20 anos)    │
│                                      │
│ ☑️ É Responsável Legal               │
│ ☑️ Relacionamento Bidirecional       │
│                                      │
│ Observações:                         │
│ [_____________________________]      │
│                                      │
│      [Cancelar] [Salvar]             │
│                                      │
└──────────────────────────────────────┘
```

---

## 🔄 Integração com Importação

### Dados do Controle Odonto:
```
Quando importar paciente com responsável:

Paciente: João Silva
  ↓
Campo "Responsável" = "Maria Silva" ou "Mãe: Geiza Almeida Rosa"
  ↓
Sistema deve:
  1. Buscar paciente "Maria Silva" ou "Geiza Almeida Rosa"
  2. Se existir: criar relacionamento automaticamente
  3. Se não existir: avisar e permitir ignorar
```

---

## ✅ Checklist de Implementação

### **Fase 1: Banco de Dados**
- [ ] Criar tabela `patient_relationships`
- [ ] Adicionar campo `responsible_id` em `patients`
- [ ] Criar índices para performance
- [ ] Migration SQL

### **Fase 2: Backend (Supabase)**
- [ ] Row-Level Security (RLS) para relacionamentos
- [ ] Funções para gerenciar relacionamentos
- [ ] Validações de relacionamentos válidos

### **Fase 3: Frontend - Componentes**
- [ ] RelationshipForm.tsx (criar/editar)
- [ ] RelationshipList.tsx (listar)
- [ ] ResponsibleSelector.tsx (dropdown)
- [ ] RelationshipModal.tsx (visualizar)

### **Fase 4: Frontend - Integração**
- [ ] Adicionar aba "Relacionamentos" em PatientDetail.tsx
- [ ] Adicionar campo "Responsável" em PatientForm.tsx
- [ ] Integrar em ImportData para importar relacionamentos

### **Fase 5: Faturamento**
- [ ] Adicionar opção de usar responsável em emissão de NF
- [ ] Mostrar responsável na tela de agendamento

### **Fase 6: Testes**
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Teste com dados reais do CO

---

## 🔐 Considerações de Segurança

```
❌ RISCOS:
  1. Vincular pacientes errados (responsabilidade legal)
  2. Exposição de dados de menores
  3. Faturar em nome errado
  4. Cadeia de responsabilidade infinita

✅ PROTEÇÕES:
  1. Validação de relacionamentos (não permite ciclos)
  2. Auditoria completa (quem criou, quando, por quê)
  3. Confirmação dupla para mudar responsável
  4. Regras RLS no Supabase
  5. Log de todas as mudanças
```

---

## 📊 Impacto nos Dados Atuais

```
Pacientes Existentes:
  └─ TODOS continuam funcionando normalmente
  └─ Campo `responsible_id` fica NULL até vinculação manual

Importação do CO:
  └─ Sistema sugere responsáveis baseado em sobrenome
  └─ Usuário confirma ou ignora
  └─ Nunca auto-vincula sem verificação
```

---

## 🚀 Impacto em Funcionalidades Futuras

```
✅ SMS/WhatsApp:
  └─ Pode enviar confirmação para responsável também

✅ Financeiro:
  └─ Agrupar pacientes da mesma família
  └─ Relatórios de gastos familiares

✅ Histórico Clínico:
  └─ Ver histórico de parentes
  └─ Verificar alergias compartilhadas

✅ Agendamentos:
  └─ Agendar pai + filho no mesmo horário
  └─ Reminder para responsável
```

---

## 📈 Complexidade vs. Valor

```
Complexidade: ⭐⭐⭐ (Média-Alta)
  - DB: 1 tabela nova + 1 campo
  - Frontend: 4-5 componentes
  - Integração: Médias
  - Testes: Necessários

Valor: ⭐⭐⭐⭐⭐ (Muito Alto)
  - CRÍTICO para menores de idade
  - Essencial para faturamento correto
  - Requisito legal de responsabilidade
  - Qualidade de vida dos dados

Tempo Estimado:
  - Backend: 4-6 horas
  - Frontend: 6-8 horas
  - Integração: 4-6 horas
  - Testes: 4-6 horas
  Total: 18-26 horas (2-3 dias de desenvolvimento)
```

---

## ⚠️ Dependências

```
Antes de Implementar:
  ✅ ImportData deve estar funcional (já está)
  ✅ PatientDetail page deve estar pronto
  ✅ Supabase RLS configurado
  ✅ Testes do PatientForm completos

Bloqueadores Identificados:
  ❌ NENHUM (pode ser implementado em paralelo)
```

---

## 📋 Próximas Ações

### **Aprovação do Usuário Necessária:**

1. **Escopo:** Implement todos os graus de relacionamento ou apenas os essenciais?
   - Essenciais: Pai, Mãe, Responsável Legal, Filho, Cônjuge
   - Completo: Todos os 15 tipos do CO

2. **Bidirecionário:** Todos os relacionamentos são automáticos?
   - Ex: Se Maria é mãe de João, João automaticamente fica com Maria como mãe?

3. **Prioridade:** Implementar agora ou depois da importação estar 100% estável?

4. **Arquivo de Teste:** Onde está o arquivo de teste com dados de relacionamentos?

---

## 🎓 Recomendação

**IMPLEMENTAR NA PRÓXIMA FASE** ✅

Razões:
1. Funcionalidade crítica para menores
2. Não bloqueia importação básica
3. Pode ser feito em paralelo
4. Valor muito alto
5. Escalona bem para futuro

**Sequência Sugerida:**
1. ✅ Importação básica (FEITA)
2. ⏭️ Relacionamentos (ESTA)
3. ⏭️ SMS/WhatsApp (DEPOIS)
4. ⏭️ Financeiro aprimorado (DEPOIS)

---

**Status:** Aguardando aprovação para implementação  
**Próximo Passo:** Enviar arquivo de teste e confirmar requisitos

