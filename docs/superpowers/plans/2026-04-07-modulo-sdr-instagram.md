# Modulo SDR Instagram — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Kanban-based SDR module to the existing CRM for managing Instagram social selling leads through 4 phases, with a structured handoff process that creates leads in the closer CRM with AI-generated conversation summaries.

**Architecture:** New Prisma models (`LeadSDR`, `PrintConversaSDR`) alongside existing models. New backend routes/controllers/services under `sdr.*` namespace following existing patterns (Express + Zod + Prisma). New frontend page `/sdr` with Kanban board reusing `@hello-pangea/dnd`. Handoff creates a standard `Lead` record in the closer pipeline. AI summary reuses existing `aiService.js` with a new GPT-4 Vision function.

**Tech Stack:** Node.js/Express backend, PostgreSQL/Prisma ORM, React/Tailwind frontend, @hello-pangea/dnd for drag-and-drop, OpenAI GPT-4 Vision for print analysis, Zod for validation, multer for file uploads.

**Spec:** `docs/superpowers/specs/2026-04-07-modulo-sdr-instagram-design.md`

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Add `LeadSDR`, `PrintConversaSDR` models + enums (modify) |
| `src/routes/sdr.routes.js` | SDR routes: CRUD, mover, handoff, prints, resumo-ia, metricas |
| `src/controllers/sdr.controller.js` | SDR controller: all handlers |
| `src/services/sdrService.js` | Business logic: validation per phase, handoff creation |
| `src/services/aiService.js` | Add `analisarPrintsSDR()` function (modify) |
| `src/server.js` | Register SDR routes (modify) |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/pages/SdrKanban.jsx` | Main SDR page with Kanban board + metrics bar |
| `frontend/src/components/SdrLeadCard.jsx` | Compact card for Kanban column |
| `frontend/src/components/SdrLeadModal.jsx` | Detail/edit modal for SDR lead |
| `frontend/src/components/HandoffModal.jsx` | Handoff form with print upload + AI summary |
| `frontend/src/components/Layout/Sidebar.jsx` | Add SDR nav item (modify) |
| `frontend/src/App.jsx` | Add `/sdr` route (modify) |

### Backend — Test Files
| File | Responsibility |
|------|---------------|
| `tests/unit/sdrService.test.js` | Phase validation logic, handoff logic |
| `tests/integration/sdr.routes.test.js` | API endpoint integration tests |

---

## Task 1: Prisma Schema — SDR Models + Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add SDR enums to schema.prisma**

Add these enums after the existing enums (after `StatusProposta`):

```prisma
enum TipoInteracaoSDR {
  curtiu
  comentou
  story
  seguiu
}

enum TemperaturaSDR {
  frio
  morno
  quente
}

enum TentouSolucao {
  sim
  nao
  parcialmente
}

enum DecisaoRota {
  convidar
  lixeira
}

enum AceitouDiagnostico {
  sim
  nao
  pendente
}

enum TomEmocional {
  desesperado
  racional
  resistente
  aberto
  fragil
}
```

- [ ] **Step 2: Add LeadSDR model to schema.prisma**

Add after the `Proposta` model:

```prisma
/// Tabela: leads_sdr
model LeadSDR {
  id                    Int                @id @default(autoincrement())
  nome                  String             @db.VarChar(255)
  instagram             String             @db.VarChar(255)
  tipoInteracao         TipoInteracaoSDR   @map("tipo_interacao")
  dataPrimeiroContato   DateTime           @default(now()) @map("data_primeiro_contato")
  mensagemEnviada       String?            @map("mensagem_enviada")

  // F2 - Conexao
  respostaLead          String?            @map("resposta_lead")
  temperaturaInicial    TemperaturaSDR?    @map("temperatura_inicial")
  dorAparente           String?            @map("dor_aparente")

  // F3 - Qualificacao
  tentouSolucaoAnterior TentouSolucao?     @map("tentou_solucao_anterior")
  temperaturaFinal      TemperaturaSDR?    @map("temperatura_final")
  decisaoRota           DecisaoRota?       @map("decisao_rota")
  detalheSituacao       String?            @map("detalhe_situacao")

  // F4 - Convite
  aceitouDiagnostico    AceitouDiagnostico? @map("aceitou_diagnostico")

  // Kanban
  etapa                 String             @default("f1_abertura") @db.VarChar(50)
  ordem                 Int                @default(0)

  // Handoff
  whatsapp              String?            @db.VarChar(20)
  dataReuniao           DateTime?          @map("data_reuniao")
  closerDestinoId       Int?               @map("closer_destino_id")
  resumoSituacao        String?            @map("resumo_situacao")
  tomEmocional          TomEmocional?      @map("tom_emocional")
  oqueFuncionou         String?            @map("oque_funcionou")
  oqueEvitar            String?            @map("oque_evitar")
  fraseChaveLead        String?            @map("frase_chave_lead")
  resumoIa              String?            @map("resumo_ia")

  // Referencia cruzada
  leadCloserId          Int?               @map("lead_closer_id")
  handoffRealizadoEm    DateTime?          @map("handoff_realizado_em")

  // Operador
  operadorId            Int                @map("operador_id")

  createdAt             DateTime           @default(now()) @map("created_at")
  updatedAt             DateTime           @updatedAt @map("updated_at")

  closerDestino         Vendedor?          @relation("SdrCloserDestino", fields: [closerDestinoId], references: [id])
  leadCloser            Lead?              @relation(fields: [leadCloserId], references: [id])
  operador              Vendedor           @relation("SdrOperador", fields: [operadorId], references: [id])
  prints                PrintConversaSDR[]

  @@map("leads_sdr")
}

/// Tabela: prints_conversa_sdr
model PrintConversaSDR {
  id          Int      @id @default(autoincrement())
  leadSdrId   Int      @map("lead_sdr_id")
  imagemUrl   String   @map("imagem_url") @db.VarChar(500)
  ordem       Int      @default(0)
  createdAt   DateTime @default(now()) @map("created_at")

  leadSdr     LeadSDR  @relation(fields: [leadSdrId], references: [id], onDelete: Cascade)

  @@map("prints_conversa_sdr")
}
```

- [ ] **Step 3: Add reverse relations to Vendedor and Lead models**

In the `Vendedor` model, add these two lines alongside the existing relations:

```prisma
  sdrLeadsComoOperador  LeadSDR[] @relation("SdrOperador")
  sdrLeadsComoCloser    LeadSDR[] @relation("SdrCloserDestino")
```

In the `Lead` model, add:

```prisma
  leadSdrOrigem         LeadSDR[]
```

Also add `acessoSdr` field to `Vendedor`:

```prisma
  acessoSdr             Boolean   @default(false) @map("acesso_sdr")
```

- [ ] **Step 4: Run migration**

Run: `cd /Users/cassielminuto/crm-marcio-conceicao && npx prisma migrate dev --name add_sdr_module`

Expected: Migration created and applied successfully. Prisma Client regenerated.

- [ ] **Step 5: Commit**

```bash
cd /Users/cassielminuto/crm-marcio-conceicao
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(sdr): add LeadSDR and PrintConversaSDR models with migration"
```

---

## Task 2: SDR Service — Business Logic

**Files:**
- Create: `src/services/sdrService.js`
- Test: `tests/unit/sdrService.test.js`

- [ ] **Step 1: Write failing tests for phase validation**

Create `tests/unit/sdrService.test.js`:

```js
const { validarMovimentacao, ETAPAS_SDR, camposObrigatoriosPorTransicao } = require('../../src/services/sdrService');

describe('sdrService', () => {
  describe('validarMovimentacao', () => {
    test('F1 -> F2 exige respostaLead e temperaturaInicial', () => {
      const lead = { etapa: 'f1_abertura', respostaLead: null, temperaturaInicial: null };
      const result = validarMovimentacao(lead, 'f2_conexao');
      expect(result.valido).toBe(false);
      expect(result.camposFaltando).toContain('respostaLead');
      expect(result.camposFaltando).toContain('temperaturaInicial');
    });

    test('F1 -> F2 aceita quando campos preenchidos', () => {
      const lead = { etapa: 'f1_abertura', respostaLead: 'Oi, tudo bem', temperaturaInicial: 'morno' };
      const result = validarMovimentacao(lead, 'f2_conexao');
      expect(result.valido).toBe(true);
      expect(result.camposFaltando).toEqual([]);
    });

    test('F2 -> F3 exige tentouSolucaoAnterior, temperaturaFinal, decisaoRota', () => {
      const lead = { etapa: 'f2_conexao', tentouSolucaoAnterior: null, temperaturaFinal: null, decisaoRota: null };
      const result = validarMovimentacao(lead, 'f3_qualificacao');
      expect(result.valido).toBe(false);
      expect(result.camposFaltando).toHaveLength(3);
    });

    test('F3 -> F4 exige aceitouDiagnostico', () => {
      const lead = { etapa: 'f3_qualificacao', aceitouDiagnostico: null };
      const result = validarMovimentacao(lead, 'f4_convite');
      expect(result.valido).toBe(false);
      expect(result.camposFaltando).toContain('aceitouDiagnostico');
    });

    test('F4 -> reuniao_marcada exige campos de handoff', () => {
      const lead = { etapa: 'f4_convite', whatsapp: null, dataReuniao: null, closerDestinoId: null, resumoSituacao: null, tomEmocional: null, oqueFuncionou: null };
      const result = validarMovimentacao(lead, 'reuniao_marcada');
      expect(result.valido).toBe(false);
      expect(result.camposFaltando).toContain('whatsapp');
      expect(result.camposFaltando).toContain('dataReuniao');
      expect(result.camposFaltando).toContain('closerDestinoId');
      expect(result.camposFaltando).toContain('resumoSituacao');
      expect(result.camposFaltando).toContain('tomEmocional');
      expect(result.camposFaltando).toContain('oqueFuncionou');
    });

    test('qualquer -> lixeira nao exige nada', () => {
      const lead = { etapa: 'f1_abertura' };
      const result = validarMovimentacao(lead, 'lixeira');
      expect(result.valido).toBe(true);
    });

    test('nao permite pular fases (F1 -> F3)', () => {
      const lead = { etapa: 'f1_abertura' };
      const result = validarMovimentacao(lead, 'f3_qualificacao');
      expect(result.valido).toBe(false);
      expect(result.erro).toMatch(/nao permitida/i);
    });

    test('lixeira -> F1 permite reativacao', () => {
      const lead = { etapa: 'lixeira' };
      const result = validarMovimentacao(lead, 'f1_abertura');
      expect(result.valido).toBe(true);
    });
  });

  describe('ETAPAS_SDR', () => {
    test('tem 6 etapas na ordem correta', () => {
      expect(ETAPAS_SDR).toEqual([
        'f1_abertura', 'f2_conexao', 'f3_qualificacao', 'f4_convite', 'reuniao_marcada', 'lixeira'
      ]);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/cassielminuto/crm-marcio-conceicao && npx jest tests/unit/sdrService.test.js --verbose`

Expected: FAIL — module not found

- [ ] **Step 3: Implement sdrService.js**

Create `src/services/sdrService.js`:

```js
const prisma = require('../config/database');
const logger = require('../utils/logger');

const ETAPAS_SDR = [
  'f1_abertura',
  'f2_conexao',
  'f3_qualificacao',
  'f4_convite',
  'reuniao_marcada',
  'lixeira',
];

const camposObrigatoriosPorTransicao = {
  'f1_abertura->f2_conexao': ['respostaLead', 'temperaturaInicial'],
  'f2_conexao->f3_qualificacao': ['tentouSolucaoAnterior', 'temperaturaFinal', 'decisaoRota'],
  'f3_qualificacao->f4_convite': ['aceitouDiagnostico'],
  'f4_convite->reuniao_marcada': ['whatsapp', 'dataReuniao', 'closerDestinoId', 'resumoSituacao', 'tomEmocional', 'oqueFuncionou'],
};

function validarMovimentacao(lead, etapaDestino) {
  // Qualquer -> lixeira: sempre permitido
  if (etapaDestino === 'lixeira') {
    return { valido: true, camposFaltando: [] };
  }

  // Lixeira -> F1: reativacao
  if (lead.etapa === 'lixeira' && etapaDestino === 'f1_abertura') {
    return { valido: true, camposFaltando: [] };
  }

  // Verificar se a transicao e sequencial
  const idxAtual = ETAPAS_SDR.indexOf(lead.etapa);
  const idxDestino = ETAPAS_SDR.indexOf(etapaDestino);

  if (idxDestino === -1) {
    return { valido: false, camposFaltando: [], erro: `Etapa "${etapaDestino}" nao existe` };
  }

  // Lixeira nao esta na sequencia linear, seu indice e 5
  // Reuniao marcada e indice 4. Sequencia valida: 0->1->2->3->4
  if (idxDestino !== idxAtual + 1) {
    return { valido: false, camposFaltando: [], erro: `Transicao de "${lead.etapa}" para "${etapaDestino}" nao permitida. Avance uma fase por vez.` };
  }

  // Verificar campos obrigatorios
  const chave = `${lead.etapa}->${etapaDestino}`;
  const camposExigidos = camposObrigatoriosPorTransicao[chave] || [];
  const camposFaltando = camposExigidos.filter((campo) => {
    const valor = lead[campo];
    return valor === null || valor === undefined || valor === '';
  });

  if (camposFaltando.length > 0) {
    return { valido: false, camposFaltando };
  }

  return { valido: true, camposFaltando: [] };
}

async function executarHandoff(leadSdr) {
  const novoLead = await prisma.lead.create({
    data: {
      nome: leadSdr.nome,
      telefone: leadSdr.whatsapp,
      canal: 'bio',
      classe: 'A',
      etapaFunil: 'qualificado',
      vendedorId: leadSdr.closerDestinoId,
      status: 'em_abordagem',
      dorPrincipal: [leadSdr.dorAparente, leadSdr.detalheSituacao].filter(Boolean).join(' — '),
      resumoConversa: [leadSdr.resumoSituacao, leadSdr.resumoIa].filter(Boolean).join('\n\n'),
      proximaAcao: 'Call de diagnostico',
      proximaAcaoData: leadSdr.dataReuniao,
      dataAtribuicao: new Date(),
      pontuacao: 85,
    },
  });

  // Criar interacao com briefing no lead do closer
  const briefingParts = [
    `## Briefing SDR — Lead Instagram`,
    `**Tom emocional:** ${leadSdr.tomEmocional}`,
    `**O que funcionou:** ${leadSdr.oqueFuncionou}`,
    leadSdr.oqueEvitar ? `**O que evitar:** ${leadSdr.oqueEvitar}` : null,
    leadSdr.fraseChaveLead ? `**Frase-chave:** "${leadSdr.fraseChaveLead}"` : null,
    leadSdr.resumoIa ? `\n**Resumo IA:**\n${leadSdr.resumoIa}` : null,
  ].filter(Boolean).join('\n');

  await prisma.interacao.create({
    data: {
      leadId: novoLead.id,
      vendedorId: leadSdr.closerDestinoId,
      tipo: 'nota',
      conteudo: briefingParts,
    },
  });

  // Atualizar LeadSDR com referencia cruzada
  await prisma.leadSDR.update({
    where: { id: leadSdr.id },
    data: {
      leadCloserId: novoLead.id,
      handoffRealizadoEm: new Date(),
    },
  });

  // Incrementar leads ativos do closer
  await prisma.vendedor.update({
    where: { id: leadSdr.closerDestinoId },
    data: { leadsAtivos: { increment: 1 } },
  });

  // Registrar no funil historico
  await prisma.funilHistorico.create({
    data: {
      leadId: novoLead.id,
      etapaAnterior: null,
      etapaNova: 'qualificado',
      vendedorId: leadSdr.closerDestinoId,
      motivo: `Handoff SDR Instagram — @${leadSdr.instagram}`,
    },
  });

  logger.info(`Handoff SDR: LeadSDR #${leadSdr.id} (@${leadSdr.instagram}) -> Lead #${novoLead.id} para closer #${leadSdr.closerDestinoId}`);

  return novoLead;
}

module.exports = {
  ETAPAS_SDR,
  camposObrigatoriosPorTransicao,
  validarMovimentacao,
  executarHandoff,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/cassielminuto/crm-marcio-conceicao && npx jest tests/unit/sdrService.test.js --verbose`

Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/cassielminuto/crm-marcio-conceicao
git add src/services/sdrService.js tests/unit/sdrService.test.js
git commit -m "feat(sdr): add sdrService with phase validation and handoff logic"
```

---

## Task 3: SDR Routes + Controller

**Files:**
- Create: `src/routes/sdr.routes.js`
- Create: `src/controllers/sdr.controller.js`
- Modify: `src/server.js`

- [ ] **Step 1: Create sdr.controller.js**

Create `src/controllers/sdr.controller.js`:

```js
const prisma = require('../config/database');
const { validarMovimentacao, executarHandoff, ETAPAS_SDR } = require('../services/sdrService');
const logger = require('../utils/logger');

async function listarKanban(req, res, next) {
  try {
    const leads = await prisma.leadSDR.findMany({
      where: { operadorId: req.usuario.vendedorId },
      orderBy: [{ etapa: 'asc' }, { ordem: 'asc' }],
      include: {
        closerDestino: { select: { id: true, nomeExibicao: true } },
        prints: { select: { id: true, imagemUrl: true, ordem: true } },
      },
    });

    // Agrupar por etapa
    const kanban = {};
    for (const etapa of ETAPAS_SDR) {
      kanban[etapa] = [];
    }
    for (const lead of leads) {
      if (kanban[lead.etapa]) {
        kanban[lead.etapa].push(lead);
      }
    }

    res.json({ kanban, total: leads.length });
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { nome, instagram, tipoInteracao, mensagemEnviada } = req.body;

    const lead = await prisma.leadSDR.create({
      data: {
        nome,
        instagram,
        tipoInteracao,
        mensagemEnviada: mensagemEnviada || null,
        etapa: 'f1_abertura',
        ordem: 0,
        operadorId: req.usuario.vendedorId,
      },
    });

    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
}

async function detalhe(req, res, next) {
  try {
    const lead = await prisma.leadSDR.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        closerDestino: { select: { id: true, nomeExibicao: true } },
        prints: { orderBy: { ordem: 'asc' } },
        leadCloser: { select: { id: true, nome: true, etapaFunil: true } },
      },
    });

    if (!lead) return res.status(404).json({ error: 'Lead SDR nao encontrado' });

    res.json(lead);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = await prisma.leadSDR.update({
      where: { id },
      data: req.body,
    });
    res.json(lead);
  } catch (err) {
    next(err);
  }
}

async function mover(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { etapa: etapaDestino, ordem } = req.body;

    const lead = await prisma.leadSDR.findUnique({ where: { id } });
    if (!lead) return res.status(404).json({ error: 'Lead SDR nao encontrado' });

    const validacao = validarMovimentacao(lead, etapaDestino);
    if (!validacao.valido) {
      return res.status(400).json({
        error: validacao.erro || 'Campos obrigatorios nao preenchidos',
        camposFaltando: validacao.camposFaltando,
      });
    }

    const updated = await prisma.leadSDR.update({
      where: { id },
      data: { etapa: etapaDestino, ordem: ordem ?? 0 },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function handoff(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { whatsapp, dataReuniao, closerDestinoId, resumoSituacao, tomEmocional, oqueFuncionou, oqueEvitar, fraseChaveLead } = req.body;

    // Atualizar o lead SDR com os dados do handoff
    const lead = await prisma.leadSDR.update({
      where: { id },
      data: {
        whatsapp,
        dataReuniao: new Date(dataReuniao),
        closerDestinoId,
        resumoSituacao,
        tomEmocional,
        oqueFuncionou,
        oqueEvitar: oqueEvitar || null,
        fraseChaveLead: fraseChaveLead || null,
        etapa: 'reuniao_marcada',
      },
      include: { prints: true },
    });

    // Executar handoff (cria lead no CRM closer)
    const novoLead = await executarHandoff(lead);

    // Notificar closer via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('novo-lead-sdr', {
        leadId: novoLead.id,
        nome: lead.nome,
        instagram: lead.instagram,
        closerDestinoId: lead.closerDestinoId,
      });
    }

    // Registrar no audit log
    await prisma.auditLog.create({
      data: {
        usuarioId: req.usuario.id,
        acao: 'HANDOFF_SDR',
        entidade: 'leads_sdr',
        entidadeId: lead.id,
        dadosNovos: { leadCloserId: novoLead.id, closerDestinoId },
      },
    });

    res.json({ leadSdr: lead, leadCloser: novoLead });
  } catch (err) {
    next(err);
  }
}

async function uploadPrints(req, res, next) {
  try {
    const leadSdrId = parseInt(req.params.id, 10);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const prints = await Promise.all(
      req.files.map((file, index) =>
        prisma.printConversaSDR.create({
          data: {
            leadSdrId,
            imagemUrl: `/uploads/sdr-prints/${file.filename}`,
            ordem: index,
          },
        })
      )
    );

    res.status(201).json(prints);
  } catch (err) {
    next(err);
  }
}

async function gerarResumoIa(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = await prisma.leadSDR.findUnique({
      where: { id },
      include: { prints: { orderBy: { ordem: 'asc' } } },
    });

    if (!lead) return res.status(404).json({ error: 'Lead SDR nao encontrado' });
    if (lead.prints.length === 0) return res.status(400).json({ error: 'Nenhum print enviado' });

    const { analisarPrintsSDR } = require('../services/aiService');
    const resumo = await analisarPrintsSDR(lead.prints);

    // Salvar resumo no lead
    await prisma.leadSDR.update({
      where: { id },
      data: { resumoIa: resumo },
    });

    res.json({ resumo });
  } catch (err) {
    next(err);
  }
}

async function metricasDiarias(req, res, next) {
  try {
    const operadorId = req.usuario.vendedorId;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [abordagensHoje, totalPorEtapa] = await Promise.all([
      prisma.leadSDR.count({
        where: { operadorId, createdAt: { gte: hoje } },
      }),
      prisma.leadSDR.groupBy({
        by: ['etapa'],
        where: { operadorId },
        _count: { id: true },
      }),
    ]);

    const respostasHoje = await prisma.leadSDR.count({
      where: {
        operadorId,
        etapa: { not: 'f1_abertura' },
        updatedAt: { gte: hoje },
      },
    });

    const reunioesHoje = await prisma.leadSDR.count({
      where: {
        operadorId,
        etapa: 'reuniao_marcada',
        handoffRealizadoEm: { gte: hoje },
      },
    });

    // Conversas ativas = tudo que nao e lixeira e nao e reuniao_marcada com handoff feito
    const conversasAtivas = await prisma.leadSDR.count({
      where: {
        operadorId,
        etapa: { notIn: ['lixeira', 'reuniao_marcada'] },
      },
    });

    const pipeline = {};
    for (const item of totalPorEtapa) {
      pipeline[item.etapa] = item._count.id;
    }

    res.json({
      abordagensHoje,
      respostasHoje,
      reunioesHoje,
      conversasAtivas,
      pipeline,
    });
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.leadSDR.update({
      where: { id },
      data: { etapa: 'lixeira' },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarKanban,
  criar,
  detalhe,
  atualizar,
  mover,
  handoff,
  uploadPrints,
  gerarResumoIa,
  metricasDiarias,
  excluir,
};
```

- [ ] **Step 2: Create sdr.routes.js**

Create `src/routes/sdr.routes.js`:

```js
const { Router } = require('express');
const { z } = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sdrController = require('../controllers/sdr.controller');
const autenticar = require('../middleware/auth');
const validar = require('../middleware/validator');

const router = Router();

// Upload config para prints
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'sdr-prints');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Apenas imagens sao permitidas'));
}});

// Schemas
const criarLeadSdrSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio'),
  instagram: z.string().min(1, 'Instagram e obrigatorio'),
  tipoInteracao: z.enum(['curtiu', 'comentou', 'story', 'seguiu']),
  mensagemEnviada: z.string().optional().nullable(),
});

const atualizarLeadSdrSchema = z.object({
  nome: z.string().min(1).optional(),
  instagram: z.string().min(1).optional(),
  tipoInteracao: z.enum(['curtiu', 'comentou', 'story', 'seguiu']).optional(),
  mensagemEnviada: z.string().optional().nullable(),
  respostaLead: z.string().optional().nullable(),
  temperaturaInicial: z.enum(['frio', 'morno', 'quente']).optional().nullable(),
  dorAparente: z.string().optional().nullable(),
  tentouSolucaoAnterior: z.enum(['sim', 'nao', 'parcialmente']).optional().nullable(),
  temperaturaFinal: z.enum(['morno', 'quente']).optional().nullable(),
  decisaoRota: z.enum(['convidar', 'lixeira']).optional().nullable(),
  detalheSituacao: z.string().optional().nullable(),
  aceitouDiagnostico: z.enum(['sim', 'nao', 'pendente']).optional().nullable(),
}).strict(false);

const moverSchema = z.object({
  etapa: z.string().min(1, 'Etapa e obrigatoria'),
  ordem: z.number().int().optional(),
});

const handoffSchema = z.object({
  whatsapp: z.string().min(8, 'WhatsApp e obrigatorio'),
  dataReuniao: z.string().min(1, 'Data da reuniao e obrigatoria'),
  closerDestinoId: z.number().int().positive('Closer e obrigatorio'),
  resumoSituacao: z.string().min(1, 'Resumo e obrigatorio'),
  tomEmocional: z.enum(['desesperado', 'racional', 'resistente', 'aberto', 'fragil']),
  oqueFuncionou: z.string().min(1, 'O que funcionou e obrigatorio'),
  oqueEvitar: z.string().optional().nullable(),
  fraseChaveLead: z.string().optional().nullable(),
});

// Rotas
router.get('/leads', autenticar, sdrController.listarKanban);
router.post('/leads', autenticar, validar(criarLeadSdrSchema), sdrController.criar);
router.get('/leads/:id', autenticar, sdrController.detalhe);
router.patch('/leads/:id', autenticar, validar(atualizarLeadSdrSchema), sdrController.atualizar);
router.patch('/leads/:id/mover', autenticar, validar(moverSchema), sdrController.mover);
router.post('/leads/:id/handoff', autenticar, validar(handoffSchema), sdrController.handoff);
router.post('/leads/:id/prints', autenticar, upload.array('prints', 10), sdrController.uploadPrints);
router.post('/leads/:id/resumo-ia', autenticar, sdrController.gerarResumoIa);
router.get('/metricas/diarias', autenticar, sdrController.metricasDiarias);
router.delete('/leads/:id', autenticar, sdrController.excluir);

module.exports = router;
```

- [ ] **Step 3: Register SDR routes in server.js**

In `src/server.js`, add after line 44 (`const hublaRoutes = ...`):

```js
const sdrRoutes = require('./routes/sdr.routes');
```

Add after line 69 (`app.use('/api/webhook/hubla', hublaRoutes);`):

```js
app.use('/api/sdr', sdrRoutes);
```

- [ ] **Step 4: Test server starts without errors**

Run: `cd /Users/cassielminuto/crm-marcio-conceicao && timeout 5 node src/server.js 2>&1 || true`

Expected: "Server running on port 3001" (or connection error for DB — that's fine, means code loads)

- [ ] **Step 5: Commit**

```bash
cd /Users/cassielminuto/crm-marcio-conceicao
git add src/routes/sdr.routes.js src/controllers/sdr.controller.js src/server.js
git commit -m "feat(sdr): add SDR routes, controller, and register in server"
```

---

## Task 4: AI Service — Print Analysis with GPT-4 Vision

**Files:**
- Modify: `src/services/aiService.js`

- [ ] **Step 1: Add analisarPrintsSDR function to aiService.js**

Add at the end of `src/services/aiService.js`, before the `module.exports`:

```js
const PROMPT_SDR_PRINTS = `Voce e um analista comercial. Analise estas capturas de tela de uma conversa no Instagram entre um SDR e um potencial cliente de um programa de relacionamento para casais.

Gere um briefing para o closer que fara a call de diagnostico:

1. SITUACAO DO CASAL: Resuma em 2-3 frases o que esta acontecendo
2. DOR PRINCIPAL: Qual e a dor central que o lead expressou
3. URGENCIA: Baixa / Media / Alta / Critica
4. PONTOS SENSIVEIS: O que o closer NAO deve mencionar ou como NAO abordar
5. SUGESTAO DE ABERTURA: Como o closer deve iniciar a call para criar conexao imediata com o que o lead ja compartilhou

Seja direto e objetivo. O closer vai ler isso 5 minutos antes da call.`;

async function analisarPrintsSDR(prints) {
  const imageMessages = prints.map((print) => {
    const absolutePath = path.join(__dirname, '..', '..', print.imagemUrl);
    const imageBuffer = fs.readFileSync(absolutePath);
    const base64 = imageBuffer.toString('base64');
    const mimeType = print.imagemUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return {
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${base64}` },
    };
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT_SDR_PRINTS },
          ...imageMessages,
        ],
      },
    ],
    max_tokens: 1000,
  });

  return response.choices[0].message.content;
}
```

Then update the `module.exports` at the bottom to include the new function. Find the existing `module.exports` and add `analisarPrintsSDR`:

```js
module.exports = {
  transcreverAudio,
  analisarCall,
  analisarPrintsSDR,
};
```

(Preserve whatever functions are already exported — just add `analisarPrintsSDR` to the list.)

- [ ] **Step 2: Commit**

```bash
cd /Users/cassielminuto/crm-marcio-conceicao
git add src/services/aiService.js
git commit -m "feat(sdr): add GPT-4 Vision print analysis for SDR handoff"
```

---

## Task 5: Frontend — SDR Kanban Page

**Files:**
- Create: `frontend/src/pages/SdrKanban.jsx`
- Create: `frontend/src/components/SdrLeadCard.jsx`

- [ ] **Step 1: Create SdrLeadCard component**

Create `frontend/src/components/SdrLeadCard.jsx`:

```jsx
import { Draggable } from '@hello-pangea/dnd';
import { Instagram, Trash2, Heart, MessageCircle, Eye, UserPlus } from 'lucide-react';

const TIPO_ICONE = {
  curtiu: Heart,
  comentou: MessageCircle,
  story: Eye,
  seguiu: UserPlus,
};

const TEMP_CORES = {
  quente: { bg: 'bg-[rgba(225,112,85,0.12)]', text: 'text-[#e17055]' },
  morno: { bg: 'bg-[rgba(253,203,110,0.12)]', text: 'text-[#fdcb6e]' },
  frio: { bg: 'bg-[rgba(116,185,255,0.1)]', text: 'text-[#74b9ff]' },
};

function diasNaFase(createdAt, updatedAt) {
  const ref = updatedAt || createdAt;
  if (!ref) return '';
  const diff = Date.now() - new Date(ref).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'hoje';
  if (d === 1) return '1d';
  return `${d}d`;
}

export default function SdrLeadCard({ lead, index, onClick, onDelete }) {
  const TipoIcon = TIPO_ICONE[lead.tipoInteracao] || Heart;
  const temp = lead.temperaturaFinal || lead.temperaturaInicial;
  const tempCor = temp ? TEMP_CORES[temp] : null;

  return (
    <Draggable draggableId={`sdr-${lead.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(lead)}
          className={`group relative bg-bg-card border rounded-[10px] p-3 mb-2 cursor-grab active:cursor-grabbing transition-all duration-200 ${
            snapshot.isDragging
              ? 'shadow-[0_16px_40px_rgba(0,0,0,0.45)] border-accent-violet/40 z-50'
              : 'border-border-subtle hover:border-accent-violet/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]'
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
            className="absolute top-2 right-2 p-1 rounded-md text-text-muted hover:text-accent-danger hover:bg-[rgba(225,112,85,0.08)] opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 size={12} />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-medium text-text-primary truncate">{lead.nome}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-muted mb-1.5">
            <Instagram size={12} />
            <span className="truncate">@{lead.instagram.replace('@', '')}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <TipoIcon size={11} />
              <span>{lead.tipoInteracao}</span>
            </div>

            {tempCor && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tempCor.bg} ${tempCor.text}`}>
                {temp}
              </span>
            )}

            <span className="ml-auto text-[10px] text-text-muted">
              {diasNaFase(lead.createdAt, lead.updatedAt)}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}
```

- [ ] **Step 2: Create SdrKanban page**

Create `frontend/src/pages/SdrKanban.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import api from '../services/api';
import SdrLeadCard from '../components/SdrLeadCard';
import { Plus, Users, MessageCircle, Calendar, Activity } from 'lucide-react';

const COLUNAS = [
  { slug: 'f1_abertura', label: 'F1 - Abertura', cor: '#74b9ff' },
  { slug: 'f2_conexao', label: 'F2 - Conexao', cor: '#ffeaa7' },
  { slug: 'f3_qualificacao', label: 'F3 - Qualificacao', cor: '#fdcb6e' },
  { slug: 'f4_convite', label: 'F4 - Convite', cor: '#55efc4' },
  { slug: 'reuniao_marcada', label: 'Reuniao Marcada', cor: '#00b894' },
  { slug: 'lixeira', label: 'Lixeira', cor: '#b2bec3' },
];

export default function SdrKanban() {
  const [kanban, setKanban] = useState({});
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalNovoLead, setModalNovoLead] = useState(false);
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [showHandoff, setShowHandoff] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [kanbanRes, metricasRes] = await Promise.all([
        api.get('/sdr/leads'),
        api.get('/sdr/metricas/diarias'),
      ]);
      setKanban(kanbanRes.data.kanban);
      setMetricas(metricasRes.data);
    } catch (err) {
      console.error('Erro ao carregar SDR:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const onDragEnd = async (result) => {
    const { draggableId, destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const leadId = parseInt(draggableId.replace('sdr-', ''), 10);
    const etapaDestino = destination.droppableId;

    // Se destino e reuniao_marcada, abrir modal de handoff
    if (etapaDestino === 'reuniao_marcada') {
      const lead = Object.values(kanban).flat().find(l => l.id === leadId);
      if (lead) {
        setLeadSelecionado(lead);
        setShowHandoff(true);
      }
      return;
    }

    // Optimistic update
    const novoKanban = { ...kanban };
    const leadIdx = novoKanban[source.droppableId].findIndex(l => l.id === leadId);
    if (leadIdx === -1) return;
    const [lead] = novoKanban[source.droppableId].splice(leadIdx, 1);
    lead.etapa = etapaDestino;
    novoKanban[etapaDestino].splice(destination.index, 0, lead);
    setKanban(novoKanban);

    try {
      await api.patch(`/sdr/leads/${leadId}/mover`, { etapa: etapaDestino, ordem: destination.index });
    } catch (err) {
      console.error('Erro ao mover:', err);
      // Reverter
      carregar();
      if (err.response?.data?.camposFaltando) {
        setLeadSelecionado(lead);
        alert(`Preencha os campos: ${err.response.data.camposFaltando.join(', ')}`);
      }
    }
  };

  const criarLead = async (dados) => {
    try {
      const { data } = await api.post('/sdr/leads', dados);
      setKanban(prev => ({
        ...prev,
        f1_abertura: [...(prev.f1_abertura || []), data],
      }));
      setModalNovoLead(false);
      carregar();
    } catch (err) {
      console.error('Erro ao criar:', err);
    }
  };

  const deletarLead = async (lead) => {
    if (!confirm(`Mover ${lead.nome} para a lixeira?`)) return;
    try {
      await api.delete(`/sdr/leads/${lead.id}`);
      carregar();
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-text-muted">Carregando...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Metricas bar */}
      {metricas && (
        <div className="flex items-center gap-6 px-6 py-3 border-b border-border-default bg-bg-secondary/50">
          <div className="flex items-center gap-2 text-sm">
            <Users size={14} className="text-accent-violet-light" />
            <span className="text-text-muted">Abordagens:</span>
            <span className="font-semibold text-text-primary">{metricas.abordagensHoje}/10</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MessageCircle size={14} className="text-[#ffeaa7]" />
            <span className="text-text-muted">Respostas:</span>
            <span className="font-semibold text-text-primary">{metricas.respostasHoje}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-[#00b894]" />
            <span className="text-text-muted">Reunioes:</span>
            <span className="font-semibold text-text-primary">{metricas.reunioesHoje}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Activity size={14} className="text-[#74b9ff]" />
            <span className="text-text-muted">Ativas:</span>
            <span className={`font-semibold ${metricas.conversasAtivas < 20 ? 'text-accent-danger' : metricas.conversasAtivas > 50 ? 'text-[#ffeaa7]' : 'text-[#00b894]'}`}>
              {metricas.conversasAtivas}
            </span>
          </div>
          <button
            onClick={() => setModalNovoLead(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-violet/15 text-accent-violet-light text-sm font-medium hover:bg-accent-violet/25 transition-colors"
          >
            <Plus size={14} /> Novo Lead
          </button>
        </div>
      )}

      {/* Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-3 p-4 overflow-x-auto">
          {COLUNAS.map((col) => (
            <Droppable key={col.slug} droppableId={col.slug}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col w-72 min-w-[288px] rounded-xl transition-colors ${
                    snapshot.isDraggingOver ? 'bg-bg-card-hover' : 'bg-bg-secondary/30'
                  }`}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: col.cor }}
                    />
                    <span className="text-sm font-semibold text-text-primary">{col.label}</span>
                    <span className="ml-auto text-xs text-text-muted bg-bg-card px-1.5 py-0.5 rounded-md">
                      {(kanban[col.slug] || []).length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 px-2 pb-2 overflow-y-auto min-h-[200px]">
                    {(kanban[col.slug] || []).map((lead, index) => (
                      <SdrLeadCard
                        key={lead.id}
                        lead={lead}
                        index={index}
                        onClick={(l) => setLeadSelecionado(l)}
                        onDelete={deletarLead}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* Modal Novo Lead */}
      {modalNovoLead && (
        <NovoLeadModal onClose={() => setModalNovoLead(false)} onSave={criarLead} />
      )}

      {/* Modal Detalhe Lead */}
      {leadSelecionado && !showHandoff && (
        <SdrLeadDetailModal
          lead={leadSelecionado}
          onClose={() => setLeadSelecionado(null)}
          onSave={async (dados) => {
            await api.patch(`/sdr/leads/${leadSelecionado.id}`, dados);
            setLeadSelecionado(null);
            carregar();
          }}
        />
      )}

      {/* Modal Handoff */}
      {showHandoff && leadSelecionado && (
        <HandoffModalInline
          lead={leadSelecionado}
          onClose={() => { setShowHandoff(false); setLeadSelecionado(null); }}
          onComplete={() => { setShowHandoff(false); setLeadSelecionado(null); carregar(); }}
        />
      )}
    </div>
  );
}

// ---------- Inline sub-components ----------

function NovoLeadModal({ onClose, onSave }) {
  const [form, setForm] = useState({ nome: '', instagram: '', tipoInteracao: 'curtiu', mensagemEnviada: '' });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-elevated border border-border-default rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Novo Lead SDR</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Nome *</label>
            <input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">@Instagram *</label>
            <input
              value={form.instagram}
              onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
              placeholder="@usuario"
              className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Tipo de Interacao *</label>
            <select
              value={form.tipoInteracao}
              onChange={e => setForm(f => ({ ...f, tipoInteracao: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none"
            >
              <option value="curtiu">Curtiu</option>
              <option value="comentou">Comentou</option>
              <option value="story">Respondeu Story</option>
              <option value="seguiu">Novo Seguidor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Mensagem Enviada</label>
            <textarea
              value={form.mensagemEnviada}
              onChange={e => setForm(f => ({ ...f, mensagemEnviada: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { if (form.nome && form.instagram) onSave(form); }}
            className="px-4 py-2 rounded-lg bg-accent-violet text-white text-sm font-medium hover:bg-accent-violet/80 transition-colors"
          >
            Criar Lead
          </button>
        </div>
      </div>
    </div>
  );
}

function SdrLeadDetailModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState({
    respostaLead: lead.respostaLead || '',
    temperaturaInicial: lead.temperaturaInicial || '',
    dorAparente: lead.dorAparente || '',
    tentouSolucaoAnterior: lead.tentouSolucaoAnterior || '',
    temperaturaFinal: lead.temperaturaFinal || '',
    decisaoRota: lead.decisaoRota || '',
    detalheSituacao: lead.detalheSituacao || '',
    aceitouDiagnostico: lead.aceitouDiagnostico || '',
  });

  const etapa = lead.etapa;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-elevated border border-border-default rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-text-primary">{lead.nome}</h3>
          <span className="text-xs text-text-muted">@{lead.instagram.replace('@', '')}</span>
        </div>

        <div className="space-y-3">
          {/* F2 fields */}
          {['f1_abertura', 'f2_conexao', 'f3_qualificacao', 'f4_convite'].includes(etapa) && (
            <>
              <div>
                <label className="block text-xs text-text-muted mb-1">O que o lead disse</label>
                <textarea value={form.respostaLead} onChange={e => setForm(f => ({ ...f, respostaLead: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Temperatura Inicial</label>
                  <select value={form.temperaturaInicial} onChange={e => setForm(f => ({ ...f, temperaturaInicial: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none">
                    <option value="">--</option>
                    <option value="frio">Frio</option>
                    <option value="morno">Morno</option>
                    <option value="quente">Quente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Dor Aparente</label>
                  <input value={form.dorAparente} onChange={e => setForm(f => ({ ...f, dorAparente: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none" />
                </div>
              </div>
            </>
          )}

          {/* F3 fields */}
          {['f2_conexao', 'f3_qualificacao', 'f4_convite'].includes(etapa) && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Tentou Solucao?</label>
                  <select value={form.tentouSolucaoAnterior} onChange={e => setForm(f => ({ ...f, tentouSolucaoAnterior: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none">
                    <option value="">--</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Nao</option>
                    <option value="parcialmente">Parcialmente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Temp. Final</label>
                  <select value={form.temperaturaFinal} onChange={e => setForm(f => ({ ...f, temperaturaFinal: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none">
                    <option value="">--</option>
                    <option value="morno">Morno</option>
                    <option value="quente">Quente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Decisao</label>
                  <select value={form.decisaoRota} onChange={e => setForm(f => ({ ...f, decisaoRota: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none">
                    <option value="">--</option>
                    <option value="convidar">Convidar</option>
                    <option value="lixeira">Lixeira</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Detalhe da Situacao</label>
                <textarea value={form.detalheSituacao} onChange={e => setForm(f => ({ ...f, detalheSituacao: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none resize-none" />
              </div>
            </>
          )}

          {/* F4 fields */}
          {['f3_qualificacao', 'f4_convite'].includes(etapa) && (
            <div>
              <label className="block text-xs text-text-muted mb-1">Aceitou Diagnostico?</label>
              <select value={form.aceitouDiagnostico} onChange={e => setForm(f => ({ ...f, aceitouDiagnostico: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none">
                <option value="">--</option>
                <option value="sim">Sim</option>
                <option value="nao">Nao</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors">Fechar</button>
          <button
            onClick={() => {
              const dados = {};
              for (const [k, v] of Object.entries(form)) { if (v !== '' && v !== lead[k]) dados[k] = v; }
              if (Object.keys(dados).length > 0) onSave(dados);
              else onClose();
            }}
            className="px-4 py-2 rounded-lg bg-accent-violet text-white text-sm font-medium hover:bg-accent-violet/80 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function HandoffModalInline({ lead, onClose, onComplete }) {
  const [form, setForm] = useState({
    whatsapp: '', dataReuniao: '', closerDestinoId: '', resumoSituacao: '',
    tomEmocional: '', oqueFuncionou: '', oqueEvitar: '', fraseChaveLead: '',
  });
  const [closers, setClosers] = useState([]);
  const [prints, setPrints] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [resumoIa, setResumoIa] = useState('');
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get('/vendedores').then(res => {
      const liders = (res.data.dados || res.data).filter(v => v.papel === 'closer_lider' && v.ativo);
      setClosers(liders);
    });
  }, []);

  const adicionarPrints = (files) => {
    const novos = Array.from(files).filter(f => f.type.startsWith('image/'));
    setPrints(prev => [...prev, ...novos]);
    setPreviews(prev => [...prev, ...novos.map(f => URL.createObjectURL(f))]);
  };

  const uploadPrintsEGerarResumo = async () => {
    if (prints.length === 0) return;
    setGerandoResumo(true);
    try {
      // Upload prints
      const formData = new FormData();
      prints.forEach(f => formData.append('prints', f));
      await api.post(`/sdr/leads/${lead.id}/prints`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      // Gerar resumo IA
      const { data } = await api.post(`/sdr/leads/${lead.id}/resumo-ia`);
      setResumoIa(data.resumo);
    } catch (err) {
      console.error('Erro ao gerar resumo:', err);
    } finally {
      setGerandoResumo(false);
    }
  };

  const enviarHandoff = async () => {
    setEnviando(true);
    try {
      await api.post(`/sdr/leads/${lead.id}/handoff`, {
        ...form,
        closerDestinoId: parseInt(form.closerDestinoId, 10),
      });
      onComplete();
    } catch (err) {
      console.error('Erro no handoff:', err);
      alert(err.response?.data?.error || 'Erro ao realizar handoff');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-elevated border border-border-default rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text-primary mb-1">Passagem de Bastao</h3>
        <p className="text-sm text-text-muted mb-4">{lead.nome} — @{lead.instagram.replace('@', '')}</p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">WhatsApp *</label>
              <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="11999999999"
                className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Data/Horario Reuniao *</label>
              <input type="datetime-local" value={form.dataReuniao} onChange={e => setForm(f => ({ ...f, dataReuniao: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Closer Destino *</label>
              <select value={form.closerDestinoId} onChange={e => setForm(f => ({ ...f, closerDestinoId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none">
                <option value="">Selecionar...</option>
                {closers.map(c => <option key={c.id} value={c.id}>{c.nomeExibicao}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Tom Emocional *</label>
              <select value={form.tomEmocional} onChange={e => setForm(f => ({ ...f, tomEmocional: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none">
                <option value="">Selecionar...</option>
                <option value="desesperado">Desesperado</option>
                <option value="racional">Racional</option>
                <option value="resistente">Resistente</option>
                <option value="aberto">Aberto</option>
                <option value="fragil">Fragil</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Resumo da Situacao *</label>
            <textarea value={form.resumoSituacao} onChange={e => setForm(f => ({ ...f, resumoSituacao: e.target.value }))} rows={3}
              className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none resize-none" />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">O que Funcionou na Abordagem *</label>
            <textarea value={form.oqueFuncionou} onChange={e => setForm(f => ({ ...f, oqueFuncionou: e.target.value }))} rows={2}
              className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none resize-none" />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">O que Evitar na Call</label>
            <textarea value={form.oqueEvitar} onChange={e => setForm(f => ({ ...f, oqueEvitar: e.target.value }))} rows={2}
              className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none resize-none" />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Frase-Chave do Lead</label>
            <input value={form.fraseChaveLead} onChange={e => setForm(f => ({ ...f, fraseChaveLead: e.target.value }))} placeholder="Colar a frase mais reveladora..."
              className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border-default text-text-primary text-sm focus:border-accent-violet outline-none" />
          </div>

          {/* Prints */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Prints da Conversa</label>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); adicionarPrints(e.dataTransfer.files); }}
              className="border-2 border-dashed border-border-default rounded-lg p-4 text-center cursor-pointer hover:border-accent-violet/50 transition-colors"
              onClick={() => document.getElementById('sdr-print-input').click()}
            >
              <input id="sdr-print-input" type="file" multiple accept="image/*" className="hidden" onChange={e => adicionarPrints(e.target.files)} />
              <p className="text-sm text-text-muted">Arraste imagens ou clique para selecionar</p>
            </div>
            {previews.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {previews.map((p, i) => (
                  <img key={i} src={p} alt="" className="w-16 h-16 rounded-lg object-cover border border-border-default" />
                ))}
                <button
                  onClick={uploadPrintsEGerarResumo}
                  disabled={gerandoResumo}
                  className="px-3 py-1 rounded-lg bg-[rgba(116,185,255,0.15)] text-[#74b9ff] text-xs font-medium hover:bg-[rgba(116,185,255,0.25)] transition-colors disabled:opacity-50"
                >
                  {gerandoResumo ? 'Gerando...' : 'Gerar Resumo IA'}
                </button>
              </div>
            )}
          </div>

          {/* Resumo IA */}
          {resumoIa && (
            <div className="bg-bg-card border border-accent-violet/20 rounded-lg p-3">
              <label className="block text-xs text-accent-violet-light font-medium mb-1">Resumo da IA</label>
              <pre className="text-sm text-text-secondary whitespace-pre-wrap">{resumoIa}</pre>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
          <button
            onClick={enviarHandoff}
            disabled={enviando || !form.whatsapp || !form.dataReuniao || !form.closerDestinoId || !form.resumoSituacao || !form.tomEmocional || !form.oqueFuncionou}
            className="px-4 py-2 rounded-lg bg-[#00b894] text-white text-sm font-medium hover:bg-[#00b894]/80 transition-colors disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Confirmar Handoff'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify frontend builds**

Run: `cd /Users/cassielminuto/crm-marcio-conceicao/frontend && npx vite build 2>&1 | tail -5`

Expected: Build succeeds (or warnings only, no errors)

- [ ] **Step 4: Commit**

```bash
cd /Users/cassielminuto/crm-marcio-conceicao
git add frontend/src/pages/SdrKanban.jsx frontend/src/components/SdrLeadCard.jsx
git commit -m "feat(sdr): add SDR Kanban page with lead cards, detail modal, and handoff modal"
```

---

## Task 6: Frontend — Routing + Sidebar Navigation

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Layout/Sidebar.jsx`

- [ ] **Step 1: Add SDR route to App.jsx**

In `frontend/src/App.jsx`, add the import at the top with the other page imports:

```jsx
import SdrKanban from './pages/SdrKanban';
```

Add the route inside the protected routes block, after `<Route path="vendas" element={<Vendas />} />`:

```jsx
<Route path="sdr" element={<SdrKanban />} />
```

- [ ] **Step 2: Add SDR item to Sidebar.jsx**

In `frontend/src/components/Layout/Sidebar.jsx`, add `Instagram` to the lucide import:

```jsx
import {
  LayoutDashboard, Kanban, DollarSign, Users, CalendarCheck,
  Trophy, Target, BarChart3, Settings, LogOut, Instagram,
} from 'lucide-react';
```

Add the SDR item to `navItems` array, after the Funil entry:

```js
{ to: '/sdr', label: 'SDR Instagram', icon: Instagram },
```

- [ ] **Step 3: Verify frontend builds**

Run: `cd /Users/cassielminuto/crm-marcio-conceicao/frontend && npx vite build 2>&1 | tail -5`

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
cd /Users/cassielminuto/crm-marcio-conceicao
git add frontend/src/App.jsx frontend/src/components/Layout/Sidebar.jsx
git commit -m "feat(sdr): add SDR route and sidebar navigation"
```

---

## Task 7: Seed Taiana with SDR Access

**Files:**
- Modify: `prisma/seed.js`

- [ ] **Step 1: Read current seed.js**

Read `prisma/seed.js` to understand the existing seed structure.

- [ ] **Step 2: Add acessoSdr flag update for Taiana**

At the end of the seed function, add:

```js
// Habilitar acesso SDR para Taiana
await prisma.vendedor.updateMany({
  where: { nomeExibicao: { contains: 'Taiana' } },
  data: { acessoSdr: true },
});
console.log('Acesso SDR habilitado para Taiana');
```

- [ ] **Step 3: Run seed**

Run: `cd /Users/cassielminuto/crm-marcio-conceicao && node prisma/seed.js`

Expected: Seed completes with "Acesso SDR habilitado para Taiana" message

- [ ] **Step 4: Commit**

```bash
cd /Users/cassielminuto/crm-marcio-conceicao
git add prisma/seed.js
git commit -m "feat(sdr): enable SDR access for Taiana in seed"
```

---

## Task 8: Integration Test — SDR Flow

**Files:**
- Create: `tests/integration/sdr.routes.test.js`

- [ ] **Step 1: Write integration test for complete SDR flow**

Create `tests/integration/sdr.routes.test.js`:

```js
const request = require('supertest');
const { app } = require('../../src/server');
const prisma = require('../../src/config/database');

// This test requires a running database and a seeded vendor with acessoSdr=true
// Run with: npx jest tests/integration/sdr.routes.test.js --verbose

let token;
let leadSdrId;

beforeAll(async () => {
  // Login como Taiana (ou admin)
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@compativeis.com', senha: 'admin123' });

  if (loginRes.status === 200) {
    token = loginRes.body.accessToken;
  } else {
    // Fallback: skip tests if no DB
    console.warn('DB not available, skipping integration tests');
  }
});

afterAll(async () => {
  // Cleanup
  if (leadSdrId) {
    await prisma.printConversaSDR.deleteMany({ where: { leadSdrId } });
    await prisma.leadSDR.delete({ where: { id: leadSdrId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('SDR Routes', () => {
  test('POST /api/sdr/leads — cria lead SDR em F1', async () => {
    if (!token) return;

    const res = await request(app)
      .post('/api/sdr/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Maria Teste',
        instagram: '@mariateste',
        tipoInteracao: 'curtiu',
        mensagemEnviada: 'Oi Maria! Vi que voce curtiu...',
      });

    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Maria Teste');
    expect(res.body.etapa).toBe('f1_abertura');
    leadSdrId = res.body.id;
  });

  test('GET /api/sdr/leads — retorna kanban agrupado', async () => {
    if (!token) return;

    const res = await request(app)
      .get('/api/sdr/leads')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.kanban).toBeDefined();
    expect(res.body.kanban.f1_abertura).toBeDefined();
  });

  test('PATCH /api/sdr/leads/:id — atualiza campos', async () => {
    if (!token || !leadSdrId) return;

    const res = await request(app)
      .patch(`/api/sdr/leads/${leadSdrId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ respostaLead: 'Oi, sim! Estou passando por um momento dificil', temperaturaInicial: 'quente' });

    expect(res.status).toBe(200);
    expect(res.body.respostaLead).toBeTruthy();
  });

  test('PATCH /api/sdr/leads/:id/mover — move F1 para F2', async () => {
    if (!token || !leadSdrId) return;

    const res = await request(app)
      .patch(`/api/sdr/leads/${leadSdrId}/mover`)
      .set('Authorization', `Bearer ${token}`)
      .send({ etapa: 'f2_conexao' });

    expect(res.status).toBe(200);
    expect(res.body.etapa).toBe('f2_conexao');
  });

  test('PATCH /api/sdr/leads/:id/mover — rejeita pulo de fase', async () => {
    if (!token || !leadSdrId) return;

    const res = await request(app)
      .patch(`/api/sdr/leads/${leadSdrId}/mover`)
      .set('Authorization', `Bearer ${token}`)
      .send({ etapa: 'f4_convite' });

    expect(res.status).toBe(400);
  });

  test('GET /api/sdr/metricas/diarias — retorna metricas', async () => {
    if (!token) return;

    const res = await request(app)
      .get('/api/sdr/metricas/diarias')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.abordagensHoje).toBeDefined();
    expect(res.body.conversasAtivas).toBeDefined();
  });

  test('DELETE /api/sdr/leads/:id — move para lixeira', async () => {
    if (!token || !leadSdrId) return;

    const res = await request(app)
      .delete(`/api/sdr/leads/${leadSdrId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run unit tests**

Run: `cd /Users/cassielminuto/crm-marcio-conceicao && npx jest tests/unit/sdrService.test.js --verbose`

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/cassielminuto/crm-marcio-conceicao
git add tests/integration/sdr.routes.test.js
git commit -m "test(sdr): add integration tests for SDR routes"
```

---

## Summary

| Task | What it does | Files |
|------|-------------|-------|
| 1 | Prisma schema + migration | schema.prisma |
| 2 | SDR service (validation + handoff logic) + unit tests | sdrService.js, sdrService.test.js |
| 3 | SDR routes + controller + server registration | sdr.routes.js, sdr.controller.js, server.js |
| 4 | AI print analysis function | aiService.js |
| 5 | Frontend Kanban page + cards + modals | SdrKanban.jsx, SdrLeadCard.jsx |
| 6 | Frontend routing + sidebar | App.jsx, Sidebar.jsx |
| 7 | Seed Taiana with SDR access | seed.js |
| 8 | Integration tests | sdr.routes.test.js |
