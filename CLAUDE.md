# CLAUDE.md — Regras de trabalho no HLPIPE

Este arquivo define como o Claude Code deve trabalhar neste repositório.
LEIA COMPLETO antes de qualquer tarefa.

---

## CONTEXTO DO PROJETO

HLPIPE é um CRM em produção usado por uma equipe de vendas real (Lucas, 
Letícia, Gabriel, Taiana, Cassiel) que atende o Programa Compatíveis 
do Márcio Conceição. Bugs em produção afetam pessoas trabalhando agora.

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
