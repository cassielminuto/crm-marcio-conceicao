# Evolução do CRM — Plano Técnico (Aquisição Paga)

> **Status:** APROVADO
> **Data de aprovação:** 22 de abril de 2026
> **Aprovado por:** Cassiel Minuto
> **Branch base:** `main`
> **Tempo estimado total:** ~84h (~2-3 semanas dedicadas)

---

## Decisões arquiteturais aprovadas (D1–D7)

| # | Decisão | Resposta final |
|---|---------|----------------|
| **D1** | Recorrência Hubla | **(c) Híbrido** — 1ª cobrança paga = `Venda` com `recorrencia=false`. Cobranças subsequentes do mesmo lead = `Venda` nova com `recorrencia=true`. Permite calcular CAC (filtra `recorrencia=false`) e LTV (soma todas) sem perder histórico. |
| **D2** | Scoring novo vs antigo | **(a) Substitui.** Todos os formulários mudam perguntas. `scoreEngine.js` é descontinuado; passa a usar `scoreEngineV2.js` (escala 0-86, 4 faixas). **Não coexiste.** |
| **D3** | Campos de score/classe no Lead | **Reusar `Lead.pontuacao`** (Int existente) mudando escala lógica de 0-100 para 0-86. **Adicionar `Lead.classificacao` String?** com valores `sql_hot \| mql_quente \| mql_morno \| nao_qualificado`. **Manter `Lead.classe` (enum A/B/C) inerte** no schema — para de ser usado mas não é removido nesta fase (rollback-safe). |
| **D4** | Tela `pages/Vendas.jsx` | **(a) Vira CRUD de `Venda`** — lista, edita, cria, remove Vendas (não Leads). Edição inline migra de Lead pra Venda. |
| **D5** | Pipeline em `EtapaFunil` | **(a) Adicionar coluna `pipeline`** em `etapas_funil` (default `'comercial'`). Permite slugs iguais entre pipelines diferentes (ex: "novo" no comercial vs "novo" no intensivão). |
| **D6** | Dashboard novo | **(a) Tela separada** — nome: **"Dashboard de Aquisição"**. Rota: **`/dashboard/aquisicao`**. Acessível só por admin/gestor. Dashboard atual (closers) permanece intocado. |
| **D7** | Mapa de formulários Respondi | **Mapa configurável.** Nomes exatos dos `form_name` no Respondi serão fornecidos depois — usar **placeholders** documentados no código por enquanto. **Nada de hardcode** estilo `FORM_SDR_INBOUND = '...'` (lição aprendida do typo "Diagonóstico"). |

---

## 1. Sumário executivo

O briefing pede 5 capabilities novas no CRM:

| # | Capability | Dimensão real |
|---|------------|---------------|
| A | Scoring novo (0–86, 4 faixas SQL Hot/MQL/NQ) | Substitui `scoreEngine.js` (0–100, A/B/C) — D2 |
| B | Entidades `Campanha` + `Criativo` | Greenfield, FK opcional em Lead/Venda |
| C | Entidade `Venda` separada do Lead | **Refatora 7 arquivos de leitura + 4 telas** |
| D | Meta Marketing API (sync diário de gasto/impressões/CTR) | OAuth + job BullMQ + sync incremental |
| E | Dashboard de Aquisição (40+ KPIs, custos por etapa por campanha) | Reaproveita 11 funções de `dashboard.controller.js` + adiciona ~15 |

**Capability C (Venda separada)** é a mais arriscada e **pré-requisito** das demais com cálculo financeiro. Capabilities **A** e **B** podem ser desbloqueadas em paralelo. **D** depende de **B**. **E** depende de B+C+D.

Estimativa por fase: F1 ~12h · F2 ~32h · F3 ~16h · F4 ~24h.

---

## 2. Estado atual mapeado (evidência da investigação)

### 2.1 Stack confirmada
- **Backend:** Node.js + Express 5 + Prisma 6.19 + PostgreSQL + Redis (BullMQ) + OpenAI + Socket.io + Zod. JavaScript puro (sem TS).
- **Frontend:** React 19 + Vite 7 + Tailwind 4 + Recharts + FullCalendar + axios + hello-pangea/dnd. JSX (sem TS).
- **Deploy:** Docker via Easypanel. `prisma migrate deploy` no start do container.

### 2.2 Schema atual relevante (Lead — `prisma/schema.prisma:211`)

| Campo | Tipo | Já existe? | Uso atual |
|---|---|---|---|
| `pontuacao` | Int default 0 | ✅ | Score 0-100 calculado por `scoreEngine.js` — **vai virar 0-86 (D3)** |
| `classe` | enum `ClasseLead` (A/B/C) | ✅ | Derivada de pontuacao — **fica inerte (D3)** |
| `canal` | enum `CanalLead` (bio/anuncio/evento) | ✅ | Identificado via `formularioTitulo` |
| `formularioTitulo` | String | ✅ | Texto livre do form Respondi |
| `vendaRealizada` | Boolean default false | ✅ | Flag única — não suporta venda recorrente |
| `valorVenda` | Decimal(10,2) nullable | ✅ | Único valor por lead |
| `dataConversao` | DateTime nullable | ✅ | Data da venda |
| `dataAbordagem` | DateTime nullable | ✅ | Já existe |
| `produtoHubla` | String nullable | ✅ existe no schema, mas CLAUDE.md§"Filtros de produto" diz pra NÃO usar | Inconsistência a resolver na Fase 2 |
| `dadosRespondi` | Json nullable | ✅ | Único lugar onde UTMs e payload Hubla pousam hoje |
| `campanhaId` | — | ❌ | Cria na Fase 2 |
| `criativoId` | — | ❌ | Cria na Fase 2 |
| `fbclid`, `gclid` | — | ❌ | Cria na Fase 1 |
| `classificacao` | — | ❌ | Cria na Fase 1 (D3) |

### 2.3 Pontos de código que tocam venda HOJE

**Backend (writes):**
1. `webhook.controller.js:323-341` — cria Lead via Respondi (sem campos venda)
2. `hubla.controller.js:115-125` — único caminho automático que seta `vendaRealizada/valorVenda/dataConversao`
3. `hubla.controller.js:92-110` — recorrência: cria `Interacao` tipo nota (vai mudar pra Venda na Fase 2 — D1)
4. `leads.controller.js:170-192` — `criar` aceita `venda_realizada` + `valor_venda` no body
5. `leads.controller.js:240-313` — `atualizar` permite editar todos os campos venda
6. `leads.controller.js:339-353` — `moverEtapa` pra `fechado_ganho` seta `vendaRealizada=true` + `dataConversao=now()`
7. `sdrInboundService.js:46-64` — `executarHandoff` cria Lead novo (sem venda)

**Backend (reads que usam vendaRealizada/valorVenda/dataConversao):**
1. `dashboard.controller.js:36-50` — `buildWheres` separa whereLeads/whereVendas
2. `dashboard.controller.js` — 11 funções: `calcularKpis`, `calcularRanking`, `calcularFunil`, `calcularTempoMedio`, `calcularPerformanceSdr` (linha 199 usa `leadCloser.vendaRealizada`), `calcularPorCanal`, `calcularTopAnuncios`, `calcularPipeline`, `calcularReunioes`, `calcularHeatmap`, `calcularAtividade`
3. `metas.controller.js:20-43` — `calcularRealizadoPeriodo` agrega `Lead.valorVenda`
4. `metas.controller.js:189-205` — `listarEmpresa` reusa `calcularRealizadoPeriodo`
5. `relatorios.controller.js` — 4 funções (geral, porCanal, porClasse, porCloser) duplicam lógica de leitura
6. `leads.controller.js:785-907` — `listarFunil` usa `aggregate _sum: valorVenda`
7. `leads.controller.js:965-1016` — `listarVendas` (endpoint `/leads/vendas`)
8. `leads.controller.js:1018-1062` — `metricasAnuncio`
9. `deduplicador.js:137` — `mergearLeads` mantém pontuação maior (não toca venda)

**Frontend (consome esses endpoints):**

| Página | Endpoints | Edita venda? |
|---|---|---|
| `Vendas.jsx` | GET `/leads/vendas`, PATCH `/leads/{id}` (valorVenda, dadosRespondi.hubla.produto, dataConversao), PATCH `/leads/{id}/vendedor` | ✅ inline em valor/produto/data |
| `Dashboard.jsx` | GET `/dashboard/metricas`, `/leads/vendas`, `/leads/funil`, `/leads/metricas-anuncio`, `/metas/empresa`, `/leads/por-dia` | ❌ leitura só |
| `Metas.jsx` | GET `/metas?periodo`, `/metas/empresa?periodo`, POST `/metas/empresa`, `/metas/distribuir` | ❌ |
| `Ranking.jsx` | GET `/vendedores`, `/vendedores/{id}/dashboard` | ❌ |
| `Funil.jsx` | GET `/leads/funil`, PATCH `/leads/{id}` (valorVenda), DELETE `/leads/{id}` | ✅ inline valor |
| `Relatorios.jsx` | GET endpoints de `relatorios.controller.js` | ❌ |

**14 componentes em `frontend/src/components/dashboard/`** consomem dados já agregados pelo `/dashboard/metricas` — refatoração de Venda fica TRANSPARENTE pra eles desde que o backend mantenha o contrato de saída.

### 2.4 Fricções descobertas

| # | Fricção | Onde | Status pós decisão |
|---|---|---|---|
| F1 | `produtoHubla` no schema vs CLAUDE.md§"Filtros de produto" diz pra não usar | `schema.prisma:240` | Resolver na Fase 2: produto vai pra `Venda.produto` (campo dedicado), `Lead.produtoHubla` fica inerte |
| F2 | `scoreEngine.js` 0-100 vs novo 0-86 | `services/scoreEngine.js` | **D2: substituir** |
| F3 | `Lead.classe` (A/B/C) vs `classificacao` (4 faixas) | schema vs briefing | **D3: adicionar `classificacao`, `classe` fica inerte** |
| F4 | Recorrência Hubla = `Interacao` tipo nota | `hubla.controller.js:92-110` | **D1: vira Venda com `recorrencia=true`** |
| F5 | `Funil.jsx` e `Vendas.jsx` editam `valorVenda` inline | `pages/Funil.jsx`, `pages/Vendas.jsx` | Resolver na Fase 2: Funil mostra `valorVendaTotal` agregado read-only; Vendas edita Venda específica (D4) |
| F6 | `EtapaFunil` é tabela única sem campo "pipeline" | `schema.prisma:361` | **D5: adicionar coluna `pipeline`** |
| F7 | Form SDR Inbound hardcoded com typo `'Diagonóstico'` | `webhook.controller.js:8` | **D7: mapa configurável** |
| F8 | `Lead.canal` enum só tem `bio/anuncio/evento` | `schema.prisma:27` | Resolver na Fase 2 — possivelmente adicionar `intensivao_pago` ou usar `Campanha.estrategia` como discriminador |
| F9 | Sem unique `(vendedorId, periodo)` em `Meta` | `metas.controller.js:282` | Manter; fora de escopo |
| F10 | Distribuição atual é Cassiel/Lucas/Gabriel (`distribuicaoLeads.js`), não Lucas/Emília como CLAUDE.md diz | `distribuicaoLeads.js:4` | CLAUDE.md desatualizado; fora de escopo |
| F11 | `Interacao.tipo` enum não tem "venda recorrente" | `schema.prisma:63` | Recorrência migra pra Venda (D1); enum não precisa mudar |

---

## 3. As 5 perguntas obrigatórias (CLAUDE.md§Fluxo)

### Pergunta 1: O que essa mudança faz?
Adiciona 4 entidades novas (`Campanha`, `Criativo`, `Venda`, `FormularioResposta`), substitui o scoring (passa de 0-100 A/B/C pra 0-86 SQL/MQL/NQ — D2), separa "venda" do "lead" (1:N — D1), integra Meta Marketing API pra sync diário de gasto/impressões/CTR, e cria tela "Dashboard de Aquisição" (D6) com 40+ KPIs de aquisição paga (CAC, ROAS, custo por etapa por campanha, performance de criativos).

### Pergunta 2: Quais partes do sistema essa mudança TOCA?

**Backend — arquivos a modificar:**
- `prisma/schema.prisma` — 4 models novos + 4 campos novos em Lead + coluna `pipeline` em EtapaFunil
- `prisma/migrations/` — 5+ migrations novas
- `src/controllers/` — `dashboard.controller.js`, `leads.controller.js`, `metas.controller.js`, `relatorios.controller.js`, `webhook.controller.js`, `hubla.controller.js`
- `src/controllers/` — **NOVOS:** `vendas.controller.js`, `campanhas.controller.js`, `criativos.controller.js`, `meta.controller.js` (Meta Ads OAuth+sync), `dashboardAquisicao.controller.js`
- `src/routes/` — equivalentes
- `src/services/` — `scoreEngine.js` (descontinuado — D2), **NOVOS:** `scoreEngineV2.js`, `metaMarketingService.js`, `vendaService.js`, `utmExtractor.js`, `metricsService.js` (extração da Fase 4)
- `src/jobs/` — **NOVO:** `metaSyncDaily.job.js`

**Frontend — arquivos a modificar:**
- `pages/Vendas.jsx` — vira CRUD de Venda (D4)
- `pages/Dashboard.jsx` — sem mudança visual (backend mantém contrato)
- `pages/Metas.jsx` — `realizadoEmpresa` muda de fonte
- `pages/Ranking.jsx` — query backend muda mas display talvez não
- `pages/Funil.jsx` — `vendaRealizada` derivado (`lead.vendas?.length > 0`); valorVenda agregado pelo backend
- `components/dashboard/*` — 14 componentes; uns 4-6 mudam (Ranking, Forecast, ValorPipeline, TopAnuncios)
- `components/FiltroUnificado.jsx` — adicionar filtro Campanha/Criativo
- `utils/produtos.js` — extrair de Venda em vez de dadosRespondi.hubla

**Frontend — arquivos NOVOS:**
- `pages/Campanhas.jsx`, `pages/Criativos.jsx` (CRUD admin)
- `pages/DashboardAquisicao.jsx` (D6)
- 10-15 componentes novos em `components/dashboard-aquisicao/`

**Banco — tabelas:**
- Novas: `campanhas`, `criativos`, `vendas`, `formulario_respostas`
- Alteradas: `leads` (+4 colunas — `classificacao`, `fbclid`, `gclid`, `campanhaId`, `criativoId` — sendo `classificacao/fbclid/gclid` na Fase 1 e FKs de Campanha/Criativo na Fase 2), `etapas_funil` (+ coluna `pipeline` — Fase 2)
- Backfill: criar Venda pra cada Lead com `vendaRealizada=true` (Fase 2)

### Pergunta 3: Quais partes do sistema essa mudança PODE QUEBRAR?

| Risco | Componente | Probabilidade | Mitigação |
|---|---|---|---|
| Dashboard mostra faturamento zerado durante migração | `dashboard.controller.js` | Alta se feature flag falhar | Migration roda antes do deploy de código que lê de Venda; backfill garante paridade |
| Vendas.jsx quebra edição inline | `pages/Vendas.jsx` | Alta | Refatorar Vendas.jsx no MESMO commit que move backend |
| Metas zeradas após migration | `metas.controller.js` | Alta | `calcularRealizadoPeriodo` migrada antes de remover leitura de Lead.valorVenda |
| Hubla webhook gera Venda duplicada | `hubla.controller.js` + novo `vendaService.js` | Média | Unique constraint `hubla_invoice_id` |
| Funil.jsx mostra valor errado por lead com N vendas | `pages/Funil.jsx` | Média | Backend retorna `valorVendaTotal` agregado por lead |
| Slugs colidem entre pipelines | `EtapaFunil` | Baixa após D5 | Coluna `pipeline` |
| `pontuacao` desincroniza entre leads antigos (0-100) e novos (0-86) | `Lead`, scoring | Alta | Aceito (D2: substitui). Histórico fica com escala antiga; Dashboard pode adicionar disclaimer "antes de XX/04/2026 escala diferente" |
| Mapa de formulários sem nome real (D7) | `webhook.controller.js` | Alta | Placeholder + log "form não reconhecido" + fallback pra scoring com defaults conservadores |
| Sync Meta API estoura rate limit | novo job | Média | Backoff exponencial + token refresh + circuit breaker |
| OAuth Meta exige domínio HTTPS público | novo job | Alta no dev local | Configurar callback no Easypanel produção; pular OAuth em dev |
| Dashboard Aquisição lento (40+ KPIs) | `dashboardAquisicao.controller.js` | Média-alta | Cache em memória 30s; considerar materialized view |
| Recorrência Hubla histórica vira Venda dupla | `vendaService.js` | Baixa | Backfill marca todas as antigas como `recorrencia=false` (1ª venda); recorrências históricas (em Interacao) podem ser opcionalmente migradas em script separado |

### Pergunta 4: Como vou TESTAR antes de declarar pronto?

Para CADA fase, rodar o checklist do CLAUDE.md§"Checklist Obrigatório por Feature" (CRIAR / EDITAR / TRANSICIONAR / EXCLUIR / ERRO) na entidade nova/alterada. Cenários específicos detalhados em cada fase abaixo (seção 7).

### Pergunta 5: Se quebrar em produção, como REVERTO?

| Fase | Plano de rollback |
|---|---|
| 1 (Scoring) | Migration `down` remove coluna `classificacao`, `fbclid`, `gclid` e tabela `formulario_respostas`; revert do PR. **Atenção:** `pontuacao` muda de escala in-place — leads novos terão valores 0-86 mesmo após rollback do código. Não há rollback automático pra escala. **Mitigação:** se rollback necessário em <24h após deploy, rollback de código volta scoreEngine antigo, mas leads novos do dia ficam com pontuacao 0-86 — operacionalmente irrelevante (são poucos). |
| 2 (Venda separada) | **Não-trivial.** Migration cria Venda mas NÃO remove `vendaRealizada/valorVenda/dataConversao` na mesma migration — coexistem por 2 deploys. Backend lê de Venda mas tem fallback pra Lead via env flag `READ_VENDA_FROM_LEAD=true`. Migration de remoção dos campos órfãos só na fase 2.5, semanas depois, com confiança operacional. |
| 3 (Meta API) | Job pode ser desligado por flag `META_SYNC_ENABLED=false`. Tabelas `campanhas`/`criativos` não são tocadas por outros fluxos. |
| 4 (Dashboard Aquisição) | Tela nova `pages/DashboardAquisicao.jsx` separada — desligar acesso pela rota. Dashboard existente continua intocada. |

---

## 4. Mapeamento de impacto por entidade nova

### 4.1 `Lead` — campos novos (Fase 1)

```prisma
// Adições em Lead na Fase 1:
classificacao    String?   @db.VarChar(20)  // sql_hot | mql_quente | mql_morno | nao_qualificado
fbclid           String?   @db.VarChar(255)
gclid            String?   @db.VarChar(255)
formularioRespostas FormularioResposta[]

// Adições em Lead na Fase 2:
campanhaId       Int?      @map("campanha_id")
criativoId       Int?      @map("criativo_id")
campanha         Campanha?  @relation(fields: [campanhaId], references: [id])
criativo         Criativo?  @relation(fields: [criativoId], references: [id])
vendas           Venda[]
```

`pontuacao` continua existindo (Int) mas a função que escreve nele agora calcula 0-86 em vez de 0-100. `classe` (A/B/C) fica inerte — schema mantém, código novo não escreve.

### 4.2 `FormularioResposta` (Fase 1)

```prisma
model FormularioResposta {
  id                Int       @id @default(autoincrement())
  leadId            Int       @map("lead_id")
  formularioTipo    String    @map("formulario_tipo") @db.VarChar(50)  // placeholder por enquanto (D7)
  formularioOrigem  String?   @map("formulario_origem") @db.VarChar(255)  // form_name do Respondi
  respostas         Json
  scoreCalculado    Int?      @map("score_calculado")  // 0-86
  classificacao     String?   @db.VarChar(20)
  submittedAt       DateTime  @map("submitted_at")
  createdAt         DateTime  @default(now()) @map("created_at")

  lead              Lead      @relation(fields: [leadId], references: [id])

  @@index([leadId])
  @@index([formularioTipo, submittedAt])
  @@map("formulario_respostas")
}
```

Por que separar do `Lead.dadosRespondi`: lead pode preencher múltiplos forms ao longo do tempo (Diag Gratuito → depois Intensivão). `dadosRespondi` é único, apaga histórico.

### 4.3 `Campanha` (Fase 2)

```prisma
model Campanha {
  id              Int       @id @default(autoincrement())
  metaCampaignId  String?   @unique @map("meta_campaign_id") @db.VarChar(50)
  nome            String    @db.VarChar(255)
  estrategia      String    @db.VarChar(50)  // "intensivao_pago" | "diag_gratuito_n1" | "diag_gratuito_n2"
  status          String    @default("ativa") @db.VarChar(20)  // "ativa" | "pausada" | "encerrada"
  budgetDiario    Decimal?  @map("budget_diario") @db.Decimal(10, 2)
  gastoAcumulado  Decimal   @default(0) @map("gasto_acumulado") @db.Decimal(12, 2)
  dataInicio      DateTime? @map("data_inicio")
  dataFim         DateTime? @map("data_fim")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  criativos       Criativo[]
  leads           Lead[]
  vendas          Venda[]

  @@index([estrategia, status])
  @@map("campanhas")
}
```

### 4.4 `Criativo` (Fase 2)

```prisma
model Criativo {
  id               Int       @id @default(autoincrement())
  campanhaId       Int       @map("campanha_id")
  metaAdId         String?   @unique @map("meta_ad_id") @db.VarChar(50)
  nome             String    @db.VarChar(255)
  formato          String    @db.VarChar(30)
  angulo           String?   @db.VarChar(30)
  narrativa        String?   @db.VarChar(30)
  origemProducao   String?   @map("origem_producao") @db.VarChar(20)
  gastoAcumulado   Decimal   @default(0) @map("gasto_acumulado") @db.Decimal(12, 2)
  impressoes       BigInt    @default(0)
  cliques          Int       @default(0)
  ctr              Float?
  cpc              Decimal?  @db.Decimal(8, 4)
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  campanha         Campanha  @relation(fields: [campanhaId], references: [id])
  leads            Lead[]
  vendas           Venda[]

  @@index([campanhaId])
  @@map("criativos")
}
```

### 4.5 `Venda` (Fase 2 — refator central)

```prisma
model Venda {
  id                  Int       @id @default(autoincrement())
  leadId              Int       @map("lead_id")
  campanhaId          Int?      @map("campanha_id")
  criativoId          Int?      @map("criativo_id")
  hublaInvoiceId      String?   @unique @map("hubla_invoice_id") @db.VarChar(100)
  produto             String?   @db.VarChar(255)
  valorTotal          Decimal   @map("valor_total") @db.Decimal(10, 2)  // bruto
  taxas               Decimal   @default(0) @db.Decimal(10, 2)
  valorLiquido        Decimal?  @map("valor_liquido") @db.Decimal(10, 2)
  metodoPagamento     String?   @map("metodo_pagamento") @db.VarChar(30)
  parcelas            Int?
  orderBumpsAceitos   Json?     @map("order_bumps_aceitos")
  utmsCheckout        Json?     @map("utms_checkout")
  fbclidCheckout      String?   @map("fbclid_checkout") @db.VarChar(255)
  closerResponsavelId Int?      @map("closer_responsavel_id")
  origemVenda         String?   @map("origem_venda") @db.VarChar(50)
  recorrencia         Boolean   @default(false)  // D1
  dataPagamento       DateTime  @map("data_pagamento")
  cicloVendaDias      Int?      @map("ciclo_venda_dias")
  createdAt           DateTime  @default(now()) @map("created_at")

  lead                Lead       @relation(fields: [leadId], references: [id])
  campanha            Campanha?  @relation(fields: [campanhaId], references: [id])
  criativo            Criativo?  @relation(fields: [criativoId], references: [id])
  closerResponsavel   Vendedor?  @relation("VendaCloser", fields: [closerResponsavelId], references: [id])

  @@index([leadId])
  @@index([dataPagamento])
  @@index([campanhaId, dataPagamento])
  @@index([recorrencia, dataPagamento])
  @@map("vendas")
}
```

### 4.6 `EtapaFunil` (Fase 2 — coluna `pipeline`)

```prisma
// Alteração:
pipeline   String   @default("comercial") @db.VarChar(30)  // "comercial" | "intensivao" | "diag_gratuito"
@@unique([slug, pipeline])  // permite mesmo slug em pipelines diferentes
```

---

## 5. Plano de migração de dados (Fase 2)

### 5.1 Backfill de Venda a partir de Lead.vendaRealizada=true

```sql
INSERT INTO vendas (lead_id, valor_total, data_pagamento, produto, recorrencia, created_at)
SELECT
  id AS lead_id,
  COALESCE(valor_venda, 0) AS valor_total,
  COALESCE(data_conversao, updated_at) AS data_pagamento,
  COALESCE(
    dados_respondi->'hubla'->>'produto',
    dados_respondi->'hubla'->'produtos'->>0,
    NULL
  ) AS produto,
  false AS recorrencia,
  COALESCE(data_conversao, updated_at) AS created_at
FROM leads
WHERE venda_realizada = true;
```

**Onde mora o script:** `src/scripts/backfillVendas.js` — segue padrão CLAUDE.md§"Limpeza de dados em produção" (script de investigação primeiro, validação prévia, transação atômica, validação final).

**Validação prévia:** comparar `SUM(leads.valor_venda WHERE venda_realizada=true)` com `SUM(vendas.valor_total)` — devem bater até centavo.

**Recorrências históricas (D1=c):** opcional — script separado scaneia `Interacao WHERE tipo='nota' AND conteudo LIKE 'Pagamento recorrente Hubla%'` e cria Venda com `recorrencia=true`. Quantidade estimada: poucas dezenas.

### 5.2 Coexistência Lead.vendaRealizada vs Venda

Por **2 deploys** (sprint inteira):
- Backend escreve em **ambos** (Venda + Lead.vendaRealizada+valorVenda+dataConversao)
- Backend lê de **Venda** (com env flag `READ_VENDA_FROM_LEAD=false`)
- Se quebrar, flip `READ_VENDA_FROM_LEAD=true` reverte leitura

Após 2 deploys estáveis (~2 semanas), migration **remove** os campos órfãos do Lead.

---

## 6. Faseamento detalhado

### Fase 1 — Scoring novo + Classificação (sem refator de Venda)

**Objetivo:** desbloquear leads novos com score 0-86 e 4 faixas, capturar fbclid/gclid, criar histórico de FormularioResposta — sem mexer em venda/dashboard.

**O que cria:**
- `prisma/migrations/<ts>_add_classificacao_e_formulario_respostas/` — adiciona `classificacao`, `fbclid`, `gclid` em Lead; cria tabela `formulario_respostas`
- `src/services/scoreEngineV2.js` — função `calcularScoreV2(respostas)` retorna `{ pontuacao: 0-86, classificacao: string }`
  - Bloco 1 (engajamento, P1-P3): 0 pts
  - Bloco 2 (gap/consciência, P4-P8): 40 pts
  - Bloco 3 (BANT, P9-P12): 40 pts
  - Bloco 4 (dados pessoais, P13-P15): 0 pts
  - Faixas: 70-86=`sql_hot`, 50-69=`mql_quente`, 30-49=`mql_morno`, 0-29=`nao_qualificado`
- `src/services/utmExtractor.js` — extrai `utm_*`, `fbclid`, `gclid` de payload Respondi (caminho `respondent.respondent_utms` per CLAUDE.md§"UTMs")
- `src/services/formularioMapper.js` — mapa configurável (placeholders D7) `{ form_name_real → formulario_tipo_canonico }`
- Testes unit em `tests/unit/scoreEngineV2.test.js` cobrindo as 4 faixas

**O que modifica:**
- `webhook.controller.js:8-9` — substitui constante `FORM_SDR_INBOUND` por chamada a `formularioMapper`
- `webhook.controller.js:177-194` — substitui `calcularScore` por `scoreEngineV2.calcularScoreV2`; grava `pontuacao` (agora 0-86), `classificacao`, cria `FormularioResposta`, captura `fbclid`, `gclid`
- `prisma/schema.prisma` — adiciona campos novos em Lead + model `FormularioResposta`

**O que NÃO modifica:**
- `scoreEngine.js` (continua existindo neste momento — descontinuado mas não removido até Fase 2 estabilizar; deletar antes pode quebrar import órfão em outro lugar)
- `Lead.classe` (continua no schema, fica inerte)
- Dashboard, Metas, Vendas (sem visibilidade ainda)

**Commits sugeridos:**
1. `feat(scoring): add scoreEngineV2 with 86-point scale and 4 tiers`
2. `feat(db): add classificacao field + formulario_respostas table`
3. `feat(webhook): route forms to scoreEngineV2 + capture utms/fbclid`

**Checklist QA (CRIAR / EDITAR / TRANSICIONAR / EXCLUIR / ERRO):**
- CRIAR: simular webhook Respondi com placeholder de form Diag Gratuito → lead criado com `pontuacao` (0-86), `classificacao`, `fbclid` (se enviado), `gclid` (se enviado), `FormularioResposta` registrado. Comparar com cálculo manual.
- CRIAR: simular form com nome desconhecido → lead criado com fallback (`pontuacao=0`, `classificacao=null`), log "form não reconhecido", NÃO crasha.
- EDITAR: PATCH `/leads/{id}` com novo campo `classificacao` aceita.
- TRANSICIONAR: lead com `classificacao=sql_hot` move pra etapa do funil (manual nesse momento — automação fica fase 2).
- EXCLUIR: deletar Lead também deleta `FormularioResposta` filhas (cascade ou deleteMany manual antes — definir).
- ERRO: webhook com payload incompleto → grava lead com `pontuacao=0`, `classificacao=null`, NÃO crasha.

**Estimativa:** 8-12h.

---

### Fase 2 — Entidades Campanha + Criativo + Venda (refator central)

**Objetivo:** entidade Venda separada do Lead com FK opcional pra Campanha/Criativo, com coexistência segura.

**Pré-requisito:** Fase 1 deployada e estável.

**O que cria:**
- `prisma/migrations/<ts>_add_campanha_criativo_venda/` — 3 tabelas + FKs em Lead
- `prisma/migrations/<ts>_add_pipeline_to_etapa_funil/` — coluna `pipeline` default `'comercial'`
- `src/controllers/vendas.controller.js` — CRUD: listar (com filtros), criar, atualizar, excluir
- `src/controllers/campanhas.controller.js` — CRUD admin
- `src/controllers/criativos.controller.js` — CRUD admin
- `src/services/vendaService.js` — `criarVendaDeHubla(payload, leadId)`, `criarVendaManual(input)`. Lógica de recorrência (D1) centralizada aqui: se já existe Venda pro mesmo lead com `recorrencia=false`, marca a nova como `recorrencia=true`.
- `src/scripts/backfillVendas.js` — backfill descrito em §5.1
- `src/scripts/validarBackfillVendas.js` — validação read-only
- `tests/unit/vendaService.test.js` — testa criação, dedup por hubla_invoice_id, recorrência (D1)
- `frontend/src/pages/Campanhas.jsx`, `Criativos.jsx` — CRUD admin

**O que modifica:**
- `prisma/schema.prisma` — adiciona Campanha, Criativo, Venda; adiciona FKs em Lead; adiciona `pipeline` em EtapaFunil
- `src/controllers/hubla.controller.js` — toda a lógica de seta `vendaRealizada/valorVenda` migra pra `vendaService.criarVendaDeHubla()`. Mantém escrita dupla (em Lead E em Venda) por 2 deploys. Recorrência: vira Venda nova com `recorrencia=true` (D1) — interação tipo nota antiga vira opcional.
- `src/controllers/leads.controller.js:965-1016` — `listarVendas` migra pra ler de Venda (com fallback flag)
- `src/controllers/dashboard.controller.js` — funções 1, 2, 5 (parcial), 7, 9 migram pra ler de Venda
- `src/controllers/metas.controller.js:20-43` — `calcularRealizadoPeriodo` migra pra Venda
- `src/controllers/relatorios.controller.js` — 4 funções migram (ou marcar deprecated e deixar pra Fase 4)
- `frontend/src/pages/Vendas.jsx` — vira CRUD de Venda (D4); endpoints novos `/vendas/*`
- `frontend/src/pages/Funil.jsx` — `vendaRealizada` derivado (`lead.vendas?.length > 0`); valorVenda agregado (`lead.valorVendaTotal`)
- `frontend/src/components/FiltroUnificado.jsx` — adiciona dropdowns Campanha/Criativo (opcional ligar/desligar por prop)
- `frontend/src/utils/produtos.js` — extrai produto de `lead.vendas[0].produto` em vez de `dadosRespondi.hubla.produto`

**Commits sugeridos (ordem importa):**
1. `feat(db): add campanhas, criativos tables (migration)` — empty data, sem leitura ainda
2. `feat(api): admin CRUD for campanhas + criativos`
3. `feat(ui): admin pages Campanhas + Criativos`
4. `feat(db): add vendas table + lead.campanha_id, criativo_id (migration)`
5. `feat(db): add pipeline column to etapas_funil (migration, default 'comercial')`
6. `feat(service): vendaService — central creation logic + dedup by hubla_invoice_id + D1 recorrência`
7. `feat(hubla): write to both Lead.venda* and new Venda table (dual-write, READ_VENDA_FROM_LEAD=true)`
8. `script(backfill): create Venda from existing Lead.vendaRealizada=true`
9. `feat(api): /vendas endpoints — read from Venda table`
10. `feat(dashboard): switch reads to Venda when READ_VENDA_FROM_LEAD=false`
11. `feat(metas): switch reads to Venda when READ_VENDA_FROM_LEAD=false`
12. `feat(ui): Vendas.jsx becomes Venda CRUD; Funil derives vendaRealizada from lead.vendas[]`
13. `feat(filters): FiltroUnificado supports campanha + criativo`
14. (semanas depois, separado) `feat(db): drop deprecated Lead.vendaRealizada/valorVenda/dataConversao`

**Checklist QA:**
- CRIAR: webhook Hubla cria Lead novo + Venda. Verificar paridade com Lead.vendaRealizada antigo (escrita dupla).
- CRIAR (D1): webhook Hubla recorrência cria Venda nova com `recorrencia=true`.
- CRIAR: criar Venda manual via `/vendas` (admin). Aparece em Vendas.jsx.
- EDITAR: editar valor/produto/data de Venda via Vendas.jsx. Persiste, UI atualiza.
- TRANSICIONAR: Lead movido pra `fechado_ganho` cria Venda automaticamente.
- EXCLUIR: deletar Venda zera o status do Lead (`vendaRealizada` derivado vira false). Confirmação obrigatória.
- ERRO: webhook Hubla duplicado (mesmo `hubla_invoice_id`) NÃO cria Venda 2x.
- DASHBOARD: faturamento total no Dashboard ANTES e DEPOIS da migração devem ser idênticos (até centavo).

**Estimativa:** 24-32h.

---

### Fase 3 — Meta Marketing API (sync diário)

**Objetivo:** popular `gastoAcumulado`, `impressoes`, `cliques`, `ctr`, `cpc` em Campanha e Criativo automaticamente.

**Pré-requisito:** Fase 2 deployada e estável.

**O que cria:**
- `src/services/metaMarketingService.js` — wrapper SDK ou fetch direto Graph API
- `src/jobs/metaSyncDaily.job.js` — cron BullMQ (rodar 03:00 BRT)
- `src/controllers/meta.controller.js` — endpoint OAuth callback + `POST /meta/sync` manual (admin)
- Variáveis de ambiente: `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`
- `frontend/src/pages/Admin.jsx` (modificar) — botão "Sync Meta agora" + status do último sync

**O que modifica:**
- `prisma/schema.prisma` — adicionar tabela auxiliar `meta_sync_log`
- `src/server.js` — registrar job no boot (com flag `META_SYNC_ENABLED`)

**Commits sugeridos:**
1. `feat(meta): metaMarketingService wrapper for Graph API`
2. `feat(db): meta_sync_log table for observability`
3. `feat(job): metaSyncDaily — fetches campanhas + criativos from Meta`
4. `feat(api): admin endpoint POST /meta/sync for manual trigger`
5. `feat(ui): admin button "Sync Meta agora" + last sync status`

**Checklist QA:**
- CRIAR: trigger manual `POST /meta/sync` busca dados, popula `gasto_acumulado` em campanhas existentes.
- EDITAR: rodar sync 2x — não duplica gasto, atualiza valores.
- TRANSICIONAR: campanha pausada recebe sync? Sim — capturar gasto residual.
- EXCLUIR: campanha deletada localmente — sync não recria.
- ERRO: token expirado → log de erro, job não derruba app, alerta no `meta_sync_log`.

**Estimativa:** 12-16h.

---

### Fase 4 — Dashboard de Aquisição (D6)

**Objetivo:** tela nova `/dashboard/aquisicao` com 40+ KPIs, custo por etapa por campanha, ranking de criativos.

**Pré-requisito:** Fases 2 e 3.

**O que cria:**
- `src/controllers/dashboardAquisicao.controller.js` — endpoints novos:
  - `GET /aquisicao/topo` — Bloco A (CPM, CPC, CTR, CPA, CPL, ACV, ROAS checkout, order bump %)
  - `GET /aquisicao/meio` — Bloco B (assistência, form→MQL, SLA Thomaz, agendamento, comparecimento, custo por call)
  - `GET /aquisicao/fundo` — Bloco C (conversão call, conversão final, ticket médio, CAC, ROAS total, ciclo, objeções)
  - `GET /aquisicao/closer` — Bloco D
  - `GET /aquisicao/criativos` — Bloco E (ranking, IA vs humano, N1 vs N2, por ângulo, por formato)
  - `GET /aquisicao/guardachuva` — Bloco F
  - `GET /aquisicao/custo-por-etapa?campanha_id=X` — Bloco etapas custo
- `src/routes/aquisicao.routes.js`
- `frontend/src/pages/DashboardAquisicao.jsx`
- `frontend/src/components/dashboard-aquisicao/` — ~12 componentes

**O que reusa:**
- 11 funções de `dashboard.controller.js` extraídas em `src/services/metricsService.js` (commit prep)
- Cache em memória 30s já existente
- Componentes `RankingVendedores`, `FunilVisual`

**Commits sugeridos:**
1. `refactor(metrics): extract dashboard calculations to metricsService (no behavior change)`
2. `feat(aquisicao): backend endpoints — Bloco A topo`
3. `feat(aquisicao): backend endpoints — Bloco B meio + custo por etapa`
4. `feat(aquisicao): backend endpoints — Bloco C fundo + Bloco D closers`
5. `feat(aquisicao): backend endpoints — Bloco E creative performance`
6. `feat(aquisicao): frontend page DashboardAquisicao + 12 components`
7. `feat(nav): link Aquisicao no menu (admin/gestor only)`

**Checklist QA:**
- CRIAR: tela carrega sem erro com dados existentes (mês atual).
- EDITAR: filtros (data, campanha, criativo) atualizam todos os blocos sem refresh.
- TRANSICIONAR: campanha pausada → KPIs continuam mostrando histórico.
- ERRO: campanha sem nenhuma venda → mostra "—" ou 0, não NaN.
- COMPARAÇÃO: faturamento total no Dashboard Aquisição == faturamento no Dashboard antigo (no mesmo período/filtros).

**Estimativa:** 18-24h.

---

## 7. Lista consolidada de riscos

| ID | Risco | Severidade | Fase | Mitigação |
|---|---|---|---|---|
| R1 | Dashboard zerar durante migração Venda | Alta | 2 | Dual-write + flag de leitura; backfill validado antes do flip |
| R2 | Hubla webhook duplicar Venda em retry | Alta | 2 | Unique constraint `hubla_invoice_id` |
| R3 | Vendas.jsx quebrar edição inline | Média | 2 | Refator backend e frontend no mesmo PR; QA cenário CRIAR→EDITAR |
| R4 | Funil.jsx mostrar valor inconsistente quando lead tem N vendas | Média | 2 | Backend retorna `valorVendaTotal` agregado por lead |
| R5 | Slugs colidem entre pipelines | Resolvido | 2 | D5 — coluna `pipeline` |
| R6 | scoreEngineV2 calcular score diferente do esperado pelo time | Média | 1 | Tabela de testes cobrindo faixas; Cassiel valida 5-10 leads reais antes do go-live |
| R7 | Token Meta API expirar e job parar silenciosamente | Média | 3 | Refresh token automático; alerta WhatsApp pra Cassiel se sync falhar 2x seguidas |
| R8 | Backfill rodar em produção e dar timeout | Baixa-Média | 2 | Script pagina por chunks de 500; testar local com cópia do dump prod |
| R9 | `dashboardAquisicao` lento (40+ KPIs) | Média | 4 | Cache 30s; considerar materialized view se P95 > 3s |
| R10 | Drop dos campos antigos no Lead — IMPOSSÍVEL voltar atrás | Alta | 2.5 | Drop só após 2-3 semanas estáveis; backup completo do banco antes |
| R11 | Operadores reais descobrirem bug em produção | Alta | todas | CLAUDE.md§"Operadora real testa por último" — Cassiel valida em janela anônima ANTES de avisar time |
| R12 | Mapa de formulários sem nome real (D7) | Alta | 1 | Placeholder + log "form não reconhecido" + fallback conservador |
| R13 | `pontuacao` com escala diferente entre leads antigos e novos | Média | 1 | Aceito (D2). Histórico fica com escala antiga. Disclaimer no Dashboard se relevante. |
| R14 | Recorrência Hubla histórica gera Venda dupla na migração | Baixa | 2 | Backfill marca tudo como `recorrencia=false`; recorrências históricas em Interacao migram opcionalmente em script separado |

---

## 8. Dependências entre fases

```
Fase 1 (Scoring) ─────────────────────────┐
                                          ├──► Fase 4 (Aquisição)
Fase 2 (Venda + Campanha + Criativo) ─────┤
                  │                       │
                  └──► Fase 3 (Meta API) ─┘
```

- **Fase 1** é totalmente independente — pode rodar em paralelo com Fase 2 (branches separadas)
- **Fase 2** precisa estar **estável em produção** (dual-write validado) antes de Fase 3 começar
- **Fase 3** pode começar antes de Fase 4 desde que Fase 2 esteja deployada
- **Fase 4** depende de TUDO estável

---

## 9. Próximos passos pós-aprovação

1. **Implementar Fase 1** seguindo a sequência aprovada (Commit 1 → diff → aprovação → Commit 2 → diff → aprovação → Commit 3 → diff → aprovação)
2. **Após Fase 1 estável em produção (~1 semana de validação),** abrir Fase 2
3. **Decisão D7 — receber nomes reais dos forms Respondi** antes de rodar Fase 1 em produção (no dev/staging os placeholders são suficientes pra implementar)

**Não vai acontecer sem autorização explícita:**
- Tocar `prisma/schema.prisma` em produção
- Rodar nenhuma migration em produção
- Fazer push pra `main` ou deploy
- Tocar variáveis de ambiente
