# Modulo SDR Instagram -- Design Spec

**Data:** 2026-04-07
**Operadora:** Taiana (ja existe no sistema como Closer Independente)
**Objetivo:** Kanban de social selling no Instagram que alimenta o CRM dos closers via handoff estruturado com resumo por IA.

---

## 1. Kanban SDR -- Colunas

6 colunas fixas, nesta ordem:

| # | Slug | Label | Cor | Descricao |
|---|------|-------|-----|-----------|
| 1 | `f1_abertura` | F1 - Abertura | Azul claro (#74b9ff) | DM enviada, aguardando resposta |
| 2 | `f2_conexao` | F2 - Conexao | Amarelo (#ffeaa7) | Lead respondeu, construindo rapport |
| 3 | `f3_qualificacao` | F3 - Qualificacao | Laranja (#fdcb6e) | Identificando temperatura quente/morno |
| 4 | `f4_convite` | F4 - Convite | Verde claro (#55efc4) | Convidando pro diagnostico |
| 5 | `reuniao_marcada` | Reuniao Marcada | Verde (#00b894) | Aceito, pronto pro handoff ao closer |
| 6 | `lixeira` | Lixeira | Cinza (#b2bec3) | Descartado / sem resposta / bloqueou |

---

## 2. Modelo de Dados -- LeadSDR

Tabela separada do `Lead` dos closers. Referencia cruzada via `leadCloserId` apos handoff.

### Campos

| Campo | Tipo | Obrigatorio | Fase |
|-------|------|-------------|------|
| `id` | Int autoincrement PK | -- | -- |
| `nome` | String | Sim | F1 |
| `instagram` | String | Sim | F1 |
| `tipoInteracao` | Enum: CURTIU, COMENTOU, STORY, SEGUIU | Sim | F1 |
| `dataPrimeiroContato` | DateTime (auto) | Sim | F1 |
| `mensagemEnviada` | String? | Nao | F1 |
| `respostaLead` | String? | Sim | F2 |
| `temperaturaInicial` | Enum: FRIO, MORNO, QUENTE | Sim | F2 |
| `dorAparente` | String? | Nao | F2 |
| `tentouSolucaoAnterior` | Enum: SIM, NAO, PARCIALMENTE | Sim | F3 |
| `temperaturaFinal` | Enum: MORNO, QUENTE | Sim | F3 |
| `decisaoRota` | Enum: CONVIDAR, LIXEIRA | Sim | F3 |
| `detalheSituacao` | String? | Nao | F3 |
| `aceitouDiagnostico` | Enum: SIM, NAO, PENDENTE | Sim | F4 |
| `etapa` | String (slug da coluna) | Sim | -- |
| `ordem` | Int (posicao no kanban) | Sim | -- |
| `whatsapp` | String? | Sim | Handoff |
| `dataReuniao` | DateTime? | Sim | Handoff |
| `closerDestinoId` | Int? (ref Vendedor) | Sim | Handoff |
| `resumoSituacao` | String? | Sim | Handoff |
| `tomEmocional` | Enum: DESESPERADO, RACIONAL, RESISTENTE, ABERTO, FRAGIL | Sim | Handoff |
| `oqueFuncionou` | String? | Sim | Handoff |
| `oqueEvitar` | String? | Nao | Handoff |
| `fraseChaveLead` | String? | Nao | Handoff |
| `resumoIa` | String? | Nao | Handoff (gerado) |
| `leadCloserId` | Int? (ref Lead) | Nao | Pos-handoff |
| `handoffRealizadoEm` | DateTime? | Nao | Pos-handoff |
| `operadorId` | Int (ref Vendedor -- Taiana) | Sim | -- |
| `createdAt` | DateTime (auto) | -- | -- |
| `updatedAt` | DateTime (auto) | -- | -- |

### Tabela auxiliar: PrintConversa

Armazena as imagens dos prints das DMs enviados pela Taiana.

| Campo | Tipo | Obrigatorio |
|-------|------|-------------|
| `id` | Int autoincrement PK | -- |
| `leadSdrId` | Int (ref LeadSDR) | Sim |
| `imagemUrl` | String | Sim |
| `ordem` | Int | Sim |
| `createdAt` | DateTime (auto) | -- |

---

## 3. Regras de Movimentacao no Kanban

O sistema valida campos obrigatorios ao mover entre colunas:

| De | Para | Campos exigidos |
|----|------|----------------|
| (novo) | F1 | nome, instagram, tipoInteracao |
| F1 | F2 | respostaLead, temperaturaInicial |
| F2 | F3 | tentouSolucaoAnterior, temperaturaFinal, decisaoRota |
| F3 | F4 | aceitouDiagnostico |
| F4 | Reuniao Marcada | Formulario de handoff completo (ver secao 4) |
| Qualquer | Lixeira | Sem restricao |

- Nao e permitido pular fases (ex: F1 direto pra F3).
- Mover pra Lixeira e permitido de qualquer coluna.
- Da Lixeira, o lead pode ser reativado movendo de volta pra F1.

---

## 4. Passagem de Bastao (Handoff)

### Trigger

Ao mover um card de F4 para "Reuniao Marcada", o sistema abre um modal de handoff obrigatorio.

### Formulario de Handoff

| Campo | Tipo | Obrigatorio |
|-------|------|-------------|
| WhatsApp do lead | Input telefone | Sim |
| Data/horario da reuniao | DateTimePicker | Sim |
| Closer destino | Select (vendedores com papel closer_lider) | Sim |
| Resumo da situacao | Textarea | Sim |
| Tom emocional | Select: Desesperado / Racional / Resistente / Aberto / Fragil | Sim |
| O que funcionou na abordagem | Textarea | Sim |
| O que evitar na call | Textarea | Nao |
| Frase-chave do lead | Input texto | Nao |
| Prints da conversa | Upload multiplo de imagens | Nao |

### Fluxo da IA (quando ha prints)

1. Taiana faz upload dos prints das DMs do Instagram
2. Backend envia as imagens para GPT-4 Vision com prompt estruturado
3. A IA retorna um resumo executivo em formato fixo:
   - **Situacao do casal** (2-3 frases)
   - **Dor principal** identificada
   - **Nivel de urgencia** percebido (baixo/medio/alto/critico)
   - **Pontos sensiveis** (o que nao falar)
   - **Sugestao de abertura** para a call
4. O resumo aparece no modal -- Taiana pode editar antes de confirmar
5. Ao confirmar, o resumo e salvo no campo `resumoIa`

### Prompt da IA (GPT-4 Vision)

```
Voce e um analista comercial. Analise estas capturas de tela de uma conversa
no Instagram entre um SDR e um potencial cliente de um programa de
relacionamento para casais.

Gere um briefing para o closer que fara a call de diagnostico:

1. SITUACAO DO CASAL: Resuma em 2-3 frases o que esta acontecendo
2. DOR PRINCIPAL: Qual e a dor central que o lead expressou
3. URGENCIA: Baixa / Media / Alta / Critica
4. PONTOS SENSIVEIS: O que o closer NAO deve mencionar ou como NAO abordar
5. SUGESTAO DE ABERTURA: Como o closer deve iniciar a call para criar conexao
   imediata com o que o lead ja compartilhou

Seja direto e objetivo. O closer vai ler isso 5 minutos antes da call.
```

### O que acontece ao confirmar o handoff

1. Cria um novo `Lead` no CRM dos closers com:
   - `nome`: do LeadSDR
   - `telefone`: WhatsApp coletado no handoff
   - `canal`: `bio` (Instagram organico)
   - `classe`: `A` (lead qualificado manualmente, bio organica converte 5x mais)
   - `etapaFunil`: `qualificado` (pula "novo" e "em_abordagem" -- ja foi qualificado pelo SDR)
   - `vendedorId`: closer selecionado no handoff
   - `status`: `em_abordagem`
   - `dorPrincipal`: do campo dorAparente + detalheSituacao do LeadSDR
   - `resumoConversa`: concatena resumoSituacao + resumoIa
   - `proximaAcao`: "Call de diagnostico"
   - `proximaAcaoData`: dataReuniao do handoff
   - `dataAtribuicao`: now()
2. Salva o `leadCloserId` no LeadSDR (referencia cruzada)
3. Salva `handoffRealizadoEm` com timestamp
4. Cria uma `Interacao` no lead do closer com tipo `nota` contendo o briefing completo:
   - Resumo da situacao
   - Tom emocional
   - O que funcionou / O que evitar
   - Frase-chave
   - Resumo da IA (se houver)
5. Envia notificacao via WebSocket para o closer destino
6. Registra no `AuditLog` a acao de handoff

---

## 5. API -- Novos Endpoints

### SDR Leads

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/sdr/leads` | Listar leads SDR (kanban agrupado por etapa) |
| POST | `/api/sdr/leads` | Criar novo lead SDR (F1) |
| GET | `/api/sdr/leads/:id` | Detalhe do lead SDR |
| PATCH | `/api/sdr/leads/:id` | Atualizar campos do lead |
| PATCH | `/api/sdr/leads/:id/mover` | Mover lead de etapa (valida campos obrigatorios) |
| DELETE | `/api/sdr/leads/:id` | Mover pra lixeira |

### Handoff

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/sdr/leads/:id/handoff` | Executar handoff (cria lead no CRM closer) |
| POST | `/api/sdr/leads/:id/prints` | Upload de prints da conversa |
| POST | `/api/sdr/leads/:id/resumo-ia` | Gerar resumo via GPT-4 Vision |

### Metricas SDR

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/sdr/metricas/diarias` | Contadores do dia (abordagens, respostas, agendamentos) |
| GET | `/api/sdr/metricas/pipeline` | Total por coluna + conversas ativas |
| GET | `/api/sdr/metricas/semanal` | Taxas de conversao entre fases |

---

## 6. Frontend -- Novas Paginas/Componentes

### Pagina `/sdr`

- Kanban board com 6 colunas (reutiliza React DnD do projeto)
- Botao "+ Novo Lead" abre modal com campos F1
- Drag & drop entre colunas (com validacao de campos obrigatorios)
- Ao mover para "Reuniao Marcada" abre modal de handoff
- Cards mostram: nome, @instagram, temperatura (badge colorido), dias na fase

### Componentes novos

| Componente | Descricao |
|------------|-----------|
| `SdrKanbanBoard` | Board principal com 6 colunas |
| `SdrLeadCard` | Card do lead no kanban (compacto) |
| `SdrLeadModal` | Modal de detalhe/edicao do lead |
| `HandoffModal` | Modal de passagem de bastao (formulario + upload + resumo IA) |
| `SdrMetricas` | Barra superior com contadores do dia |
| `PrintUploader` | Upload de multiplas imagens com preview |
| `ResumoIaPreview` | Exibe resumo da IA com opcao de editar |

### Navegacao

- Adicionar item "SDR Instagram" no menu lateral do CRM
- Acessivel para perfis: admin, gestor, e a Taiana (vendedor com flag SDR)

---

## 7. Metricas do Dashboard SDR

### Barra superior (contadores do dia)

- Novas abordagens hoje: X / 10 (meta)
- Respostas recebidas: X
- Reunioes marcadas: X
- Conversas ativas: X / 30-50 (faixa saudavel)

### Dashboard semanal (acessivel por tab ou pagina separada)

- Taxa F1 → F2 (resposta): X%
- Taxa F2 → F3 (qualificacao): X%
- Taxa F3 → Reuniao Marcada (agendamento): X%
- Total de handoffs realizados
- Leads na lixeira (para acompanhar qualidade da prospeccao)

---

## 8. Permissoes

| Acao | Admin | Gestor | Taiana (SDR) | Outros vendedores |
|------|-------|--------|-------------|-------------------|
| Ver kanban SDR | Sim | Sim | Sim | Nao |
| Criar/editar leads SDR | Sim | Sim | Sim | Nao |
| Mover leads no kanban | Sim | Sim | Sim | Nao |
| Executar handoff | Sim | Sim | Sim | Nao |
| Ver metricas SDR | Sim | Sim | Sim | Nao |

Para controlar o acesso da Taiana sem criar um novo perfil RBAC, adicionar um campo booleano `acessoSdr` na tabela `vendedores`. Assim qualquer vendedor pode receber acesso ao modulo SDR no futuro.

---

## 9. Fora de Escopo (por enquanto)

- Coluna de Nutricao (leads mornos recebendo conteudo)
- Coluna de Sem Resposta (protocolo de follow-up automatico)
- Integracao direta com Instagram API (leads sao cadastrados manualmente)
- Automacao de mensagens DM
- Multiplos SDRs / distribuicao de leads entre SDRs
