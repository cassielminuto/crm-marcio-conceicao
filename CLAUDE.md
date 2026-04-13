# CLAUDE.md — Regras de trabalho no HLPIPE

Este arquivo define como o Claude Code deve trabalhar neste repositório.
LEIA COMPLETO antes de qualquer tarefa.

---

## CONTEXTO DO PROJETO

HLPIPE é um CRM em produção usado por uma equipe de vendas real (Lucas, 
Gabriel, Taiana, Emília, Thomaz, Cassiel) que atende o Programa 
Compatíveis do Márcio Conceição. Bugs em produção afetam pessoas trabalhando agora.

Stack: Node.js/Express, Prisma ORM, PostgreSQL, Redis, React + Tailwind v4 
+ Vite, OpenAI, Evolution API. Hosted no Easypanel.

Hubla é a fonte da verdade para pagamentos. CRM deve sempre reconciliar 
com Hubla.

---

## REGRA DE OURO

NUNCA declare uma feature como "pronta" sem ter rodado o checklist 
de QA abaixo. NUNCA. Mesmo que pareça óbvio que vai funcionar.
Mesmo que seja "só uma mudança pequena". Mesmo que dê preguiça.

Se você não rodou o checklist, a feature NÃO está pronta.
Se você não pode rodar o checklist (ex: ambiente não disponível), 
DIGA isso explicitamente em vez de declarar pronta.

---

## CHECKLIST OBRIGATÓRIO POR FEATURE

Para QUALQUER mudança que toque uma entidade do banco ou um fluxo 
de usuário, execute os 5 cenários abaixo e reporte PASS/FAIL de cada:

### 1. CRIAR
Criar entidade nova com dados válidos.
- A entidade aparece no banco?
- A entidade aparece na UI sem precisar refresh?
- Os campos default estão corretos?

### 2. EDITAR  
Editar uma entidade existente.
- A edição persiste no banco?
- A UI atualiza imediatamente?
- Campos não tocados permanecem inalterados?

### 3. TRANSICIONAR (se aplicável)
Mover entre estados/fases (ex: kanban, status, etapas).
- A transição é permitida quando deveria?
- A transição é BLOQUEADA quando não deveria (com mensagem clara)?
- Campos obrigatórios da próxima fase estão validados?

### 4. EXCLUIR
Deletar uma entidade.
- A exclusão funciona sem duplicar?
- Há confirmação antes de excluir definitivamente?
- Soft delete e hard delete estão diferenciados corretamente?

### 5. ERRO
Tentar operações inválidas DE PROPÓSITO.
- Campo obrigatório vazio mostra erro claro com NOME do campo?
- Valor de enum errado mostra os valores aceitos?
- Erro de rede/backend mostra toast (não falha silenciosa)?
- Botão de submit fica desabilitado durante o request?

---

## CHECKLIST ESPECÍFICO DO MÓDULO SDR INSTAGRAM

Sempre que mexer em qualquer arquivo dentro de:
- src/services/sdrService.js
- src/services/sdrAnaliseService.js
- src/controllers/sdr.controller.js
- src/routes/sdr.routes.js
- frontend/src/pages/SdrKanban.jsx
- frontend/src/components/SdrLeadCard.jsx
- prisma/schema.prisma (modelos LeadSDR, PrintConversaSDR)

Execute o fluxo end-to-end completo:

1. Criar lead novo em F1 — Abertura
2. Preencher os campos de F1, mover para F2 — Conexão
3. Preencher os campos de F2 (incluindo enums), mover para F3 — Qualificação
4. Preencher os campos de F3, mover para F4 — Convite
5. Preencher os campos de F4, mover para Reunião Marcada
6. Preencher TODOS os campos do modal de Handoff (incluindo tomEmocional)
7. Clicar "Confirmar Handoff"
8. Verificar no CRM dos closers (página /leads) que o lead apareceu como Classe A
9. Verificar que a nota de briefing chegou no card do closer
10. Voltar ao Kanban SDR e excluir um lead da Lixeira para confirmar exclusão definitiva

Quando a feature envolve criar + editar, testar o fluxo
CRIAR → EDITAR IMEDIATAMENTE (sem refresh) como um cenário único.
Não é suficiente testar criar e editar em sessões separadas.

Se QUALQUER etapa falhar, a feature NÃO está pronta.
Reporte exatamente qual etapa falhou e por quê.

---

## CHECKLIST ESPECÍFICO DO MÓDULO SDR INBOUND

Sempre que mexer em qualquer arquivo dentro de:
- src/services/sdrInboundService.js
- src/controllers/sdrInbound.controller.js
- src/routes/sdrInbound.routes.js
- frontend/src/pages/SdrInboundKanban.jsx
- frontend/src/pages/SdrPage.jsx (tabs que unificam Instagram + Inbound)
- prisma/schema.prisma (modelo LeadSDRInbound)
- src/controllers/webhook.controller.js (rota SDR Inbound do Respondi)

Execute o fluxo end-to-end completo:

1. Simular webhook Respondi com form SDR Inbound → lead aparece no kanban Inbound
2. Verificar que dadosRespondi contém as respostas do formulário
3. Verificar que UTMs aparecem no modal (respondent.respondent_utms)
4. Mover lead entre etapas do kanban Inbound
5. Preencher observações e próximo passo
6. Fazer handoff para closer — verificar que lead aparece no funil dos closers
7. Verificar que leads manuais (sem webhook) funcionam com dadosRespondi=null
8. Verificar que admin/gestor vê TODOS os leads (sem filtro de operador)
9. Verificar que operador normal vê SÓ seus leads
10. Testar tab switching entre Instagram e Inbound no SdrPage

Atenção especial:
- Webhook Respondi tem 2 caminhos: SDR Inbound vs Lead normal.
  Comparação de form_name é CASE-SENSITIVE. Testar com nome exato.
- dadosRespondi é null em leads criados manualmente — isso é ESPERADO.
- Telefones de deduplicação: verificar que duplicata por telefone é detectada.

Se QUALQUER etapa falhar, a feature NÃO está pronta.
Reporte exatamente qual etapa falhou e por quê.

---

## TESTE VISUAL OBRIGATÓRIO PARA MUDANÇAS DE UI

Bugs de CSS (especialmente flexbox, overflow, z-index, modais) NÃO 
podem ser pegos por testes unitários. Para qualquer mudança em 
componentes visuais, abra o frontend localmente (`npm run dev`) e 
teste em 3 tamanhos de viewport:

- 1366x768 (laptop comum — provavelmente o que a Taiana usa)
- 1440x900 (MacBook 13")
- 1920x1080 (monitor desktop)

Para modais especificamente, garanta que:
- Header com título sempre aparece, em todos os viewports
- Body scrolla internamente se for maior que a viewport
- Footer com botões sempre aparece, sem ser cortado
- Modal nunca estoura pra cima ou pra baixo da tela

---

## REGRAS DE CÓDIGO

### Schema Prisma
- NUNCA altere schema.prisma sem pedir autorização explícita ao Cassiel
- Quando alterar, SEMPRE rodar `npx prisma migrate dev` LOCAL primeiro
- Só aplicar em produção via `npx prisma migrate deploy` no Easypanel após teste local
- Lição aprendida: incidente do ProdutoExcluido quebrou todas as queries

### Nomes de campos e enums (Prisma)
- Usuario: `nome`, `email`, `senhaHash`, `perfil`, `ativo`, `fotoUrl` (NÃO usar `nomeExibicao`, `senha`, `papel`)
- Vendedor: `nomeExibicao`, `papel` (PapelVendedor enum), `acessoSdr`
- TipoInteracao enum usa lowercase: `call` (NÃO `CALL`)

### Tratamento de erro (frontend)
- TODA chamada de API deve ter try/catch + toast de erro
- TODO botão de submit deve ter loading state
- TODO erro do backend deve aparecer pro usuário com mensagem específica
- NUNCA "Dados inválidos" genérico — sempre dizer QUAL campo e QUAL valor é esperado

### Filtros de produto
- Filtros de produto são 100% FRONTEND
- NÃO criar tabelas tipo ProdutoExcluido
- NÃO adicionar campo produtoHubla no schema
- Lição aprendida: tentativa anterior quebrou todas as queries

### Timezone (Brasília UTC-3)
- `data_inicio: "YYYY-MM-DDT03:00:00.000Z"`
- `data_fim: dia_seguinte + "T02:59:59.999Z"`

### Dockerfile
- Só copia `src/`, `prisma/`, `uploads/`
- Scripts utilitários DEVEM ficar em `src/`
- Rodar como `cd /app && node src/script.js` no Easypanel Console
- `prisma migrate deploy` roda automaticamente no start do container
- NÃO remover essa linha — sem ela, deploy com migration nova quebra o app
- Lição aprendida: container subia com schema antigo e queries falhavam

---

## FLUXO DE TRABALHO ESPERADO

1. Cassiel descreve o problema ou a feature
2. Você LÊ o código relevante antes de propor solução
3. Você apresenta o PLANO (não o código) e espera aprovação
4. Após aprovação, você implementa
5. Você RODA o checklist de QA
6. Você reporta PASS/FAIL de cada etapa do checklist
7. Só então você diz "pronto pra deploy"

NUNCA pular etapas. NUNCA implementar antes de apresentar o plano. 
NUNCA declarar pronto sem o checklist.

---

## QUANDO ESTIVER EM DÚVIDA

- Sobre arquitetura: pergunte ao Cassiel
- Sobre nomes de campos: leia o schema.prisma, NÃO chute
- Sobre lógica de negócio: leia o código existente da feature mais 
  parecida e replique o padrão (não invente abstração nova)
- Sobre se uma feature está pronta: rode o checklist. Se não rodou, 
  não está pronta.

---

## PRINCÍPIOS GERAIS

1. **Simplicidade vence elegância.** Quando uma página está quebrada, 
   alinhe ela à página que funciona — não crie lógica nova.

2. **Reuso vence duplicação.** Antes de criar modelo/componente novo, 
   veja se dá pra reusar o existente.

3. **Erro visível vence erro silencioso.** Sempre prefira mostrar erro 
   ao usuário do que falhar quieto.

4. **Hubla é a fonte da verdade.** CRM se ajusta à Hubla, nunca o contrário.

5. **Operadora real é o melhor QA.** Mas só depois que VOCÊ rodou o checklist.

---

## LIÇÕES E REGRAS ADICIONAIS — 08/abr/2026

### Regra: Modais
- TODO modal DEVE usar createPortal(jsx, document.body)
- NUNCA renderizar modal dentro da árvore de componentes
- Padrão: items-start + overflow-y-auto no container externo, NÃO items-center
- Z-index mínimo: z-[9999]
- Lição aprendida: position:fixed quebra dentro de container com transform CSS
- Ao mover modal pra portal, REMOVER max-h fixo, REMOVER flex flex-col, REMOVER flex-1 min-h-0 overflow-y-auto do body interno
- Quando criar createPortal em JSX condicional `{cond && createPortal(...)}`, contar createPortal vs document.body — têm que bater 1:1

### Regra: Distribuição de leads (cuidado especial)
- Existem DOIS sistemas de distribuição no projeto (dívida técnica conhecida):
  - `src/services/distribuicaoLeads.js` — IDs hardcoded [Lucas=1, Emilia=8], usado pelo webhook.controller.js
  - `src/services/distribuidor.js` — Sistema dinâmico por classe + round-robin Redis
- A operação atual roda 50/50 entre Lucas e Emília via Sistema A — isso é INTENCIONAL pelo CEO
- NÃO consolidar os dois sistemas sem autorização explícita
- A consolidação só faz sentido quando a operação tiver classes A/B/C reais (futuro)
- Antes de tocar qualquer um dos dois arquivos, ler os comentários do CLAUDE.md e perguntar ao Cassiel

### Regra: Limpeza de dados em produção
- TODA limpeza de banco em produção DEVE seguir o padrão usado em 08/abr:
  1. Script de investigação primeiro (read-only) — listar dependências
  2. Script de validação prévia — abortar se algo não bater com o esperado
  3. Execução em transação atômica (`prisma.$transaction`)
  4. Validação final mostrando estado pós-mudança
- ANTES de deletar qualquer registro com FK, verificar TODAS as tabelas que apontam pra ele:
  - Para Vendedor: leads, interacoes, followUps, metas
  - Para Usuario: notificacoes, auditLogs, vendedor (1:1)
- Cobrir todas as FKs no script ou o banco vai abortar a transação
- Lição aprendida: esquecemos `notificacao` na primeira tentativa, transação foi revertida, tivemos que fazer V2

### Regra: Operadora real testa por último
- Antes de liberar feature pra um operador real (Lucas, Emília, Taiana, etc):
  1. Cassiel roda o checklist do CLAUDE.md em produção
  2. Cassiel testa em janela anônima como se fosse o operador
  3. Cassiel valida visualmente em pelo menos 1 viewport
  4. SÓ ENTÃO manda a mensagem no WhatsApp pro operador
- Operador descobrindo bug vira fricção e desgasta confiança na ferramenta

---

## TODO — PENDÊNCIAS CONHECIDAS

> ~~#1 ENUM PapelVendedor sem `sdr`~~ — FEITO (migration aplicada, Taiana atualizada)
> ~~#2 4 bugs do dashboard~~ — FEITO (ranking, filtros, gráfico corrigidos)
> ~~#3 9 modais pra createPortal~~ — FEITO (todos os 7 migrados: MeusLeads, LeadCard, PhotoCropper, AddLeadModal, Funil x2, DuplicateAlert)

### 1. INFRAESTRUTURA DE STAGING
- Continuar deployando direto em produção é insustentável
- Plano: criar app duplicada no Easypanel apontando pra branch `staging`
- Banco e Redis separados
- Toda feature passa por staging antes de main

### 2. TELA /admin/usuarios
- Hoje criar usuário é via script no console
- Não escala, não tem auditoria
- Tela simples: lista + botão "Adicionar usuário" + edit
- Aproveitar pra adicionar `onDelete: Cascade` nas FKs de Notificacao→Usuario e AuditLog→Usuario

---

## ARMADILHAS CONHECIDAS

> Seção viva. Toda vez que algo quebrar de um jeito não-óbvio, registrar aqui pra IA não cair de novo.

- **Comparação de form_name é case-sensitive.** Acentuação e caixa importam. O webhook Respondi compara form_name pra decidir o caminho (SDR Inbound vs Lead normal). Uma diferença de acento ou maiúscula manda o lead pro lugar errado silenciosamente.
- **Banco local dessincroniza do schema.** Se o Prisma reclamar de colunas que não existem ou modelos desconhecidos, rode `npx prisma migrate reset` local. Acontece depois de trocar de branch ou puxar migrations novas.
- **Telefones: 99.7% já vêm com prefixo 55.** Os 0.3% sem são ruído. Não criar lógica complexa de normalização — deduplicação por telefone direto funciona bem.
- **Não confiar em comportamento "óbvio" sem testar.** Exemplo real: assumimos que form_id seria o slug do formulário, mas era um UUID interno do Respondi. Sempre investigar o payload real.
- **Nunca assumir nome de campo no payload sem investigar o JSON.** Antes de acessar qualquer campo de webhook/API externa, logar o payload e conferir a estrutura. Campos mudam entre versões e entre forms.
- **Antes de planejar feature de produto, investigar código primeiro.** Ler os arquivos relevantes ANTES de propor arquitetura. Suposições sobre como o código funciona já causaram retrabalho.

---

## MAPA DO PROJETO

### Estrutura de pastas

```
├── prisma/
│   └── schema.prisma              # Fonte da verdade do banco (19 models)
├── src/
│   ├── controllers/               # Handlers de rota (request → response)
│   ├── routes/                    # Definição de rotas Express
│   ├── services/                  # Lógica de negócio
│   ├── middlewares/               # Auth, validação, etc.
│   └── utils/                     # Helpers compartilhados
├── frontend/
│   └── src/
│       ├── pages/                 # Páginas da aplicação (1 arquivo = 1 rota)
│       ├── components/            # Componentes reutilizáveis
│       └── services/              # Chamadas API (axios)
├── Dockerfile                     # Build produção (inclui prisma migrate deploy no start)
└── docker-compose.yml
```

### Módulos principais

| Módulo | Backend | Frontend | O que faz |
|--------|---------|----------|-----------|
| Auth | auth.controller/routes | Login.jsx | Login, sessão, perfis |
| Leads/Funil | leads.controller, etapas.controller | Funil.jsx, LeadCard.jsx | Kanban de leads dos closers |
| SDR Instagram | sdr.controller, sdrService | SdrKanban.jsx | Prospecção ativa via Instagram |
| SDR Inbound | sdrInbound.controller, sdrInboundService | SdrInboundKanban.jsx | Leads via formulário Respondi (Thomaz) |
| SDR (unificado) | — | SdrPage.jsx | Tabs que agrupam Instagram + Inbound |
| Dashboard | leads.controller (métricas) | Dashboard.jsx | KPIs, gráficos, ranking |
| Metas | metas.controller | Metas.jsx | Metas individuais + MetaEmpresa |
| Webhook | webhook.controller | — | Recebe leads do Respondi (2 caminhos) |
| Hubla | hubla.controller | — | Pagamentos e reconciliação |
| WhatsApp | whatsapp.controller | WhatsAppAdmin.jsx | Templates, envios |
| Follow-ups | followups.controller | FollowUps.jsx | Cadência de follow-up |
| Admin | admin.controller, vendedores.controller | Admin.jsx, VendedoresAdmin.jsx | Gestão de usuários e vendedores |

### Tabelas principais (Prisma)

| Model | Tabela | Relações-chave |
|-------|--------|----------------|
| Usuario | usuarios | 1:1 → Vendedor |
| Vendedor | vendedores | 1:N → Lead, Meta, LeadSDR, LeadSDRInbound |
| Lead | leads | N:1 → Vendedor, 1:N → Interacao, FollowUp, FunilHistorico |
| LeadSDR | leads_sdr | N:1 → Vendedor (operador), N:1 → Vendedor (closer) |
| LeadSDRInbound | leads_sdr_inbound | N:1 → Vendedor (operador), N:1 → Vendedor (closer). TABELA SEPARADA de LeadSDR — não misturar. |
| Meta | metas | N:1 → Vendedor |
| MetaEmpresa | metas_empresa | Independente — NÃO é soma das metas individuais |
| EtapaFunil | etapas_funil | Slug no banco, label no frontend |
| Interacao | interacoes | N:1 → Lead, N:1 → Vendedor |
| FunilHistorico | funil_historico | N:1 → Lead |

---

## DECISÕES DE ARQUITETURA

> Decisões não-óbvias que foram tomadas por boas razões.
> Antes de mudar qualquer uma, entenda POR QUE está assim.

### SDR: duas tabelas separadas (LeadSDR ≠ LeadSDRInbound)
LeadSDR = prospecção ativa via Instagram (operador aborda).
LeadSDRInbound = lead que veio via formulário Respondi.
Campos, etapas e fluxos são diferentes. NÃO misturar em uma tabela só.

### Webhook Respondi: dois caminhos
O webhook do Respondi (`webhook.controller.js`) faz branch:
- Se `form_name` contém indicador de SDR Inbound → cria LeadSDRInbound (operador: Thomaz, ID 11)
- Senão → cria Lead normal no funil dos closers (distribuição Lucas/Emília)
A comparação de form_name é **case-sensitive** — cuidado com acentos.

### Etapas do funil: slug vs label
Banco armazena `slug` (ex: "qualificado"). Frontend mostra `label` (ex: "Agendado").
A tabela `EtapaFunil` mapeia slug↔label. Nunca hardcodar labels no backend.

### Meta empresa ≠ soma das individuais
`MetaEmpresa` é entidade independente com valor definido pelo gestor.
Não é calculada a partir das metas individuais dos vendedores.

### Admin/gestor/sdr: bypass de filtros
Padrão de permissão usado em vários módulos (funil, sdr, sdr-inbound, dashboard):
- Admin e gestor veem TUDO (sem filtro de vendedor)
- Vendedor com papel='sdr' vê funil completo
- Vendedor normal vê só seus próprios leads
Replicar esse padrão em módulos futuros.

### dadosRespondi é null em leads manuais
Leads criados pelo AddLeadModal não passam pelo Respondi,
então `dadosRespondi` é null. Isso é esperado — não tratar como erro.

### UTMs ficam em respondent.respondent_utms
No payload do Respondi, UTMs NÃO estão no nível raiz.
Caminho correto: `respondent.respondent_utms.utm_source`, etc.

### Docker: prisma migrate deploy no start
O Dockerfile roda `prisma migrate deploy` ao iniciar o container.
Isso garante que o banco está sempre em sync com o schema do código.
NÃO remover essa linha — sem ela, deploy com migration nova quebra.

### Telefones: deduplicação direta
99.7% dos telefones já vêm com prefixo 55. Os 0.3% sem são ruído.
Deduplicação por telefone funciona bem sem normalização complexa.
O webhook detecta duplicatas por telefone e notifica o vendedor atribuído.

---

## DÍVIDA TÉCNICA — TESTES (documentado 09/abr/2026)

### 1. BUG PRÉ-EXISTENTE NO SETUP DOS TESTES DE INTEGRAÇÃO SDR
- `tests/integration/sdr.routes.test.js` usa `admin@compativeis.com` como usuário de teste
- Esse usuário não tem `vendedorId` no banco
- Resultado: 3 testes falham com `operadorId must not be null` (POST criar, GET kanban, GET metricas)
- Fix: corrigir o fixture pra criar/usar um usuário com `vendedorId` antes de rodar os testes

### 2. TESTE DE REGRESSÃO FALTANDO — CRIAR → EDITAR IMEDIATAMENTE
- Adicionar teste que:
  1. `POST /sdr/leads` → captura `res.body.lead.id` (note o unwrap — response é `{ lead: {...} }`)
  2. `PATCH /sdr/leads/:id` com o id retornado
  3. Expect status 200
- Esse teste previne a regressão do bug que a Taiana encontrou em 09/abr/2026
- Depende de resolver a Pendência 1 primeiro
