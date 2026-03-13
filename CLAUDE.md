# CLAUDE.md — CRM Márcio Conceição

## Visão Geral do Projeto

Sistema CRM completo para o **Projeto Márcio Conceição**, uma empresa de programas de transformação de relacionamentos para casais. O produto principal é o **Programa Compatíveis** (ticket médio R$1.229).

O CRM gerencia o funil comercial completo: lead preenche formulário de diagnóstico gratuito no Respondi → entra no CRM com score automático → é distribuído para o closer correto → closer qualifica via WhatsApp/call → fecha a venda.

**Stack tecnológico:**
- Frontend: React.js + Tailwind CSS + Socket.io-client + React DnD (Kanban)
- Backend: Node.js + Express.js + Socket.io + BullMQ
- Banco: PostgreSQL com Prisma ORM
- Cache/Filas: Redis + BullMQ
- IA: OpenAI API (GPT-4 para preenchimento + Whisper para transcrição)
- WhatsApp: Evolution API (self-hosted, open-source)
- Autenticação: JWT + bcrypt + RBAC

---

## Equipe Comercial (Vendedores/Closers)

| Vendedor | Papel | Tipo de Lead |
|----------|-------|-------------|
| Lucas (Closer Líder) | Closer sênior | Leads A — máxima prioridade |
| Juliana (Closer Líder) | Closer sênior | Leads A — máxima prioridade |
| Taiana (Closer Independente) | Closer independente | Leads B |
| Trainees | Closers em formação | Leads B e C de reengajamento |

---

## Formulários do Respondi

Existem 2 formulários DIFERENTES com campos distintos. O sistema identifica o canal pelo título do formulário.

### Formulário BIO — [BIO] Diagnóstico Gratuito
Canal: Instagram orgânico (seguidores). Título começa com [BIO].

| # | Pergunta | Opções de Resposta |
|---|----------|-------------------|
| 1 | Nome | Texto livre |
| 2 | WhatsApp | Telefone |
| 3 | Email | Email |
| 4 | Status de relacionamento atualmente | Em um relacionamento / Em um relacionamento, mas com dificuldades / Solteiro(a) / Casado(a) / Divorciado(a) / Viúvo(a) |
| 5 | O que mais deseja resolver ou conquistar agora | Melhorar minha vida profissional/financeira / Alinhar meu casamento ou relacionamento / Resolver conflitos entre vida amorosa e profissional / Encontrar um parceiro(a) compatível |
| 6 | Qual é o seu padrão (dor principal) | Texto livre |
| 7 | Desafios que respingam em outras áreas | Minha autoestima e motivação estão baixas / Tenho me sentido inseguro(a) ou ansioso(a) / Sinto que perdi o brilho ou prazer de viver / Tem afetado meu trabalho ou foco / Tenho me afastado das pessoas |
| 8 | Projeção: continuar assim por mais um ano | Pioraria — estou cada vez mais cansado(a) e desiludido(a) / Eu acredito que vou mudar minha abordagem / Continuaria com as mesmas dificuldades / Talvez melhorasse um pouco |
| 9 | Importância de resolver agora (urgência) | Muito importante. Quero agir agora. / Importante, mas ainda preciso de mais informações. / Ainda não sei. / Não é prioridade no momento. |
| 10 | Disponibilidade de investimento | Prefiro entender melhor antes de decidir / Entre R$497 e R$997 / Entre R$997 e R$1.497 / Entre R$1.497 e R$2.497 / Mais de R$3.000 |

### Formulário ANÚNCIO — [ANÚNCIO] Diagnóstico Gratuito
Canal: Meta Ads (público frio). Título começa com [ANÚNCIO].

| # | Pergunta | Opções de Resposta |
|---|----------|-------------------|
| 1 | Nome | Texto livre |
| 2 | Email | Email |
| 3 | WhatsApp | Telefone |
| 4 | Situação atual no relacionamento | Estamos passando por uma crise e sinto que meu relacionamento está em risco. / Em um Relacionamento, mas com dificuldades. / Temos alguns problemas, mas nada muito sério. / Em um Relacionamento / Estou solteiro(a), mas percebo que repito os mesmos erros / Está tudo ótimo, só quero aprender mais. |
| 5 | O que já tentou para resolver | Nada, é a primeira vez que busco ajuda. / Conversei com amigos e familiares. / Já fiz terapia de casal ou individual, li livros sobre o assunto. |
| 6 | Desafios que respingam em outras áreas | Minha autoestima e motivação estão baixas / Sinto que perdi o brilho ou o prazer de viver / Tenho me sentido inseguro(a) ou ansioso(a) / Tenho me afastado das pessoas / Tem afetado meu trabalho ou foco |
| 7 | Urgência numérica (0 a 10) | 8 - 10 / 5 - 7 / 0 - 4 |
| 8 | Disponibilidade de investimento | Prefiro entender melhor antes de decidir / Muito importante, estou pronto(a) para agir imediatamente / Importante, mas preciso de mais informações / Entre R$497 e R$997 / Entre R$997 e R$1.497 / Entre R$1.497 e R$2.497 / Mais de R$3.000 / Não é uma prioridade agora / Não sei, talvez no futuro |
| 9 | Tema de interesse | Entender como meus padrões inconscientes (formados na infância) afetam meu relacionamento hoje / Dicas gerais de relacionamento. / Entender a mente masculina/feminina. |

**ATENÇÃO — inconsistência de campos:** Os dois formulários têm perguntas diferentes. O formulário Bio usa urgência qualitativa ("Muito importante. Quero agir agora."), enquanto o formulário Anúncio usa escala numérica (0-4 / 5-7 / 8-10). O sistema deve tratar os dois como campos distintos e mapear cada um com sua própria lógica de pontuação.

---

## Lead Score — Lógica Completa

Cada lead recebe pontuação de 0 a 100 pontos. A soma dos critérios não pode ultrapassar 100.

### Critérios e Pesos — Formulário BIO
O lead Bio começa com +30 pontos por canal de origem.

| Critério | Condição | Pontos |
|----------|---------|--------|
| Canal de origem | Bio / Orgânico (título começa com [BIO]) | +30 |
| Urgência declarada | "Muito importante. Quero agir agora." | +25 |
| Urgência declarada | "Importante, mas ainda preciso de mais informações." | +12 |
| Urgência declarada | "Ainda não sei." ou "Não é prioridade" | +0 |
| Status de relacionamento | "Em um relacionamento, mas com dificuldades" ou "em crise" | +20 |
| Status de relacionamento | "Em um relacionamento" ou "Casado(a)" | +15 |
| Status de relacionamento | "Solteiro(a)" ou "Divorciado(a)" | +5 |
| Objetivo declarado | "Alinhar meu casamento ou relacionamento" | +20 |
| Objetivo declarado | "Resolver conflitos entre vida amorosa e profissional" | +10 |
| Objetivo declarado | "Encontrar um parceiro(a) compatível" | +8 |
| Objetivo declarado | "Melhorar minha vida profissional/financeira" | +3 |
| Projeção (continuar por 1 ano) | "Pioraria — estou cada vez mais cansado(a) e desiludido(a)" | +10 |
| Investimento declarado | Qualquer faixa específica de valor informada | +5 |
| Investimento declarado | "Prefiro entender melhor antes de decidir" ou em branco | +0 |

### Critérios e Pesos — Formulário ANÚNCIO
O lead de anúncio começa com +10 pontos por canal de origem.

| Critério | Condição | Pontos |
|----------|---------|--------|
| Canal de origem | Anúncio pago (título começa com [ANÚNCIO]) | +10 |
| Urgência numérica | "8 - 10" | +25 |
| Urgência numérica | "5 - 7" | +12 |
| Urgência numérica | "0 - 4" | +0 |
| Situação no relacionamento | "Estamos passando por uma crise e sinto que meu relacionamento está em risco." | +20 |
| Situação no relacionamento | "Em um Relacionamento, mas com dificuldades." | +15 |
| Situação no relacionamento | "Temos alguns problemas, mas nada muito sério." | +10 |
| Situação no relacionamento | "Solteiro(a)" / "Em um Relacionamento" sem qualificação | +5 |
| Situação no relacionamento | "Está tudo ótimo, só quero aprender mais." | +2 |
| O que já tentou | "Já fiz terapia de casal ou individual, li livros" | +15 |
| O que já tentou | "Conversei com amigos e familiares." | +8 |
| O que já tentou | "Nada, é a primeira vez que busco ajuda." | +5 |
| Investimento | "Muito importante, estou pronto(a) para agir imediatamente" | +10 |
| Investimento | Qualquer faixa específica de valor | +5 |
| Tema de interesse | "Padrões inconscientes" (contém essa expressão) | +5 |
| Tema de interesse | "Muito importante. Quero agir agora." (campo misturado) | +8 |

### REGRA CRÍTICA
**Investimento NÃO é critério eliminatório.** 41% dos 129 compradores confirmados declararam disponibilidade de menos de R$497 no formulário — e compraram um produto de R$1.229. O campo de investimento NÃO deve ser usado para remover leads da fila ou reduzir pontuação. Use apenas como sinal positivo adicional quando o lead declara uma faixa específica.

### Pontuação Máxima por Canal
- **Bio:** 100 pts (30+25+20+20+10+5) — Lead A garantido
- **Anúncio:** 98 pts (10+25+20+15+10+8+5+5) — Lead A possível

---

## Classificação A, B e C

| Classe | Faixa | Perfil Típico | Closer | SLA Abordagem |
|--------|-------|--------------|--------|--------------|
| A | 75-100 pts | Bio + urgência alta + em crise + quer resolver casamento | Lucas ou Juliana (round-robin) | Até 5 minutos |
| B | 45-74 pts | Anúncio + urgência alta OU Bio com objetivo fora do relacionamento | Taiana ou Trainee (round-robin) | Até 2 horas |
| C | 0-44 pts | Anúncio + urgência baixa + objetivo sem relação com casamento | Fluxo de nurturing automático | Sem fila ativa — reengajamento em 7 dias |

### Dados Reais de Distribuição
- Bio (orgânico): 1.984 leads → 37% A, 39% B, 24% C. Pontuação média: 64,5 pts
- Anúncio (pago): 6.558 leads → 1,7% A, 30% B, 68% C. Pontuação média: 31,8 pts

**INSIGHT OPERACIONAL CRÍTICO:** 69% dos leads de anúncio são Classe C e NÃO devem entrar na fila ativa dos closers. O CRM deve separar as filas por classe antes de qualquer distribuição.

---

## Regras de Distribuição

### Fluxo ao receber novo lead:
1. Identificar canal de origem pelo título do formulário ([BIO] ou [ANÚNCIO])
2. Calcular pontuação com base nos critérios da seção Lead Score
3. Classificar em A, B ou C
4. Distribuir automaticamente para o closer correto
5. Registrar horário de entrada, pontuação, classe e closer atribuído

### Regras por Classe

**Leads Classe A:**
- Distribuir alternadamente entre Lucas e Juliana (round-robin)
- Notificar o closer imediatamente por WebSocket + push notification
- Prazo máximo de abordagem: 5 minutos após o preenchimento
- Se o closer não iniciar abordagem em 5 minutos, escalar para o outro líder

**Leads Classe B:**
- Distribuir para Taiana ou trainees disponíveis (round-robin)
- Prazo máximo de abordagem: 2 horas após o preenchimento
- Se não houver closer disponível em 2h, subir para closer líder com menor fila

**Leads Classe C:**
- Não entrar na fila ativa dos closers
- Entrar em fluxo de nurturing automático
- Envio de mensagem de reengajamento após 7 dias
- Se o lead responder ao nurturing, reavaliar pontuação e reclassificar

### Prioridade dentro da fila
1. Leads com maior pontuação dentro da mesma classe
2. Leads mais recentes (menor tempo de espera)
3. Bio tem prioridade sobre Anúncio quando pontuação for igual

---

## Roteiro de Call — Script de Vendas (SPIN Selling)

Duração: 25 a 40 min. Método: SPIN Selling. Objetivo: Fechar o Programa Compatíveis.

### 7 Etapas do Roteiro

**Etapa 1 — Abertura & Rapport (2-3 min)**
- Apresentação: "[Nome], oi! Aqui é [seu nome], do Compatíveis — programa do Márcio Conceição."
- Criar ambiente de confiança: "Tenho uns 25 minutinhos. Você está em um lugar tranquilo para falar?"
- Campo do card: rapport_realizado (boolean)

**Etapa 2 — SPIN: Perguntas de Situação (3-5 min)**
- "Você está em um relacionamento? Como está a situação hoje em casa?"
- "Há quanto tempo vocês estão juntos? Esse momento de crise é recente ou já está assim há mais tempo?"
- "Seu parceiro(a) sabe que você procurou esse diagnóstico?"
- Campos do card: status_relacionamento, tempo_juntos, parceiro_sabe (boolean)

**Etapa 3 — SPIN: Perguntas de Problema (5-7 min)**
- "O que está te incomodando mais nesse relacionamento?"
- "Você consegue identificar se isso é um padrão — brigam pelo mesmo motivo repetido?"
- "Quando acontece uma briga, como você reage? E como fica depois?"
- Campos do card: dor_principal (texto), padrao_identificado (texto), traco_carater_detectado (enum: Esquizoide/Oral/Masoquista/Rígido/Não identificado)

**Etapa 4 — SPIN: Perguntas de Implicação (5-7 min)**
- "Quanto tempo você já está nessa situação?"
- "Esse desgaste vai além do relacionamento? Afeta sono, produtividade, humor?"
- "Se daqui a 1 ano estiver exatamente igual ou pior, o que acontece?"
- "O que essa situação está custando financeiramente, se chegassem a uma separação?"
- Campos do card: tempo_na_situacao, impacto_outras_areas (texto), consciencia_custo (boolean)

**Etapa 5 — Necessidade + Demonstração + Oferta (7-10 min)**
- "O que precisaria mudar para você sentir que vale a pena continuar?"
- Apresentação dos 3 Rs + stack de valor (5 trilhas + aulas ao vivo + comunidade = R$3.500+ de valor)
- Âncora: custo de terapia convencional (R$3.600 a R$6.000+ por pessoa)
- Revelação do preço: R$1.229 parcelado em até 12x
- Condição especial: valor à vista no Pix (gatilho de fechamento)
- Campos do card: interesse_demonstrado (boolean), objecao_principal (texto)

**Etapa 6 — Fechamento**
- Opção A (preferencial): "Prefere o parcelado em 12x no cartão ou aproveita a condição no Pix hoje?"
- Opção B (assunção): "Assim que confirmar, você recebe acesso ao Circle ainda hoje."
- Opção C (urgência): "A condição é de final de mês — não consigo garantir amanhã."
- Campo do card: resultado_call (enum: fechou/nao_fechou/reagendar)

**Etapa 7 — Quebra de Objeções (conforme necessário)**
5 objeções mapeadas:
1. "Meu parceiro não quer" → 80% dos alunos começaram sozinhos, a mudança de um catalisa o outro
2. "Já tentei terapia" → Terapia trata sintoma (parede com mofo), Compatíveis trata causa raiz (infiltração)
3. "Será que tem jeito?" → Casais com papéis de divórcio na mesa se transformaram
4. "Não tenho tempo" → Programa estruturado pra rotina. O tempo que investe agora poupa anos
5. "É caro" → Quanto custaria uma separação? Advogado, dois aluguéis...

### Checklist Pós-Call (campos que a IA deve preencher automaticamente via transcrição)
- [ ] Status do relacionamento do lead
- [ ] Dor principal identificada
- [ ] Traço de caráter detectado (Esquizoide/Oral/Masoquista/Rígido)
- [ ] Tempo na situação atual
- [ ] Parceiro sabe que buscou ajuda
- [ ] Impacto em outras áreas
- [ ] Objeção principal apresentada
- [ ] Resultado: fechou / não fechou / reagendar
- [ ] Próximo passo definido com data
- [ ] Padrões de dor descritos pelo lead

---

## Modelo de Dados (PostgreSQL + Prisma)

### Tabela: usuarios
```
id              SERIAL PRIMARY KEY
nome            VARCHAR(255) NOT NULL
email           VARCHAR(255) UNIQUE NOT NULL
senha_hash      VARCHAR(255) NOT NULL
perfil          ENUM('admin', 'gestor', 'vendedor') NOT NULL
ativo           BOOLEAN DEFAULT true
created_at      TIMESTAMP DEFAULT NOW()
```

### Tabela: vendedores
```
id                  SERIAL PRIMARY KEY
usuario_id          INT REFERENCES usuarios(id) UNIQUE
nome_exibicao       VARCHAR(100)
papel               ENUM('closer_lider', 'closer_independente', 'trainee') NOT NULL
classes_atendidas   TEXT[] -- ['A'], ['B'], ['B','C'], etc.
score_performance   FLOAT DEFAULT 0
leads_ativos        INT DEFAULT 0
leads_max           INT DEFAULT 30
total_conversoes    INT DEFAULT 0
ticket_medio        DECIMAL(10,2) DEFAULT 0
ranking_posicao     INT DEFAULT 0
ativo               BOOLEAN DEFAULT true
```

### Tabela: leads
```
id                      SERIAL PRIMARY KEY
respondi_id             VARCHAR(255) UNIQUE -- ID único do Respondi
nome                    VARCHAR(255) NOT NULL
telefone                VARCHAR(20) NOT NULL
email                   VARCHAR(255)
canal                   ENUM('bio', 'anuncio', 'evento') NOT NULL
formulario_titulo       VARCHAR(255) -- título original do formulário
pontuacao               INT NOT NULL DEFAULT 0 -- 0 a 100
classe                  ENUM('A', 'B', 'C') NOT NULL
etapa_funil             ENUM('novo', 'em_abordagem', 'qualificado', 'proposta', 'fechado_ganho', 'fechado_perdido', 'nurturing') DEFAULT 'novo'
vendedor_id             INT REFERENCES vendedores(id)
status                  ENUM('aguardando', 'em_abordagem', 'convertido', 'perdido', 'nurturing') DEFAULT 'aguardando'
dados_respondi          JSONB -- respostas completas do formulário
dor_principal           TEXT
traco_carater           ENUM('esquizoide', 'oral', 'masoquista', 'rigido', 'nao_identificado')
objecao_principal       TEXT
resultado_call          ENUM('fechou', 'nao_fechou', 'reagendar', 'sem_call')
venda_realizada         BOOLEAN DEFAULT false
valor_venda             DECIMAL(10,2)
data_preenchimento      TIMESTAMP -- quando preencheu o Respondi
data_atribuicao         TIMESTAMP -- quando foi distribuído ao closer
data_abordagem          TIMESTAMP -- quando o closer fez primeiro contato
data_conversao          TIMESTAMP
motivo_perda            TEXT
created_at              TIMESTAMP DEFAULT NOW()
updated_at              TIMESTAMP DEFAULT NOW()
```

### Tabela: interacoes
```
id              SERIAL PRIMARY KEY
lead_id         INT REFERENCES leads(id) NOT NULL
vendedor_id     INT REFERENCES vendedores(id) NOT NULL
tipo            ENUM('call', 'whatsapp_enviado', 'whatsapp_recebido', 'nota', 'email') NOT NULL
conteudo        TEXT
gravacao_url    VARCHAR(500) -- URL do áudio (S3/Minio)
transcricao     TEXT -- transcrição via Whisper
resumo_ia       TEXT -- resumo gerado por GPT-4
campos_ia       JSONB -- campos preenchidos automaticamente pela IA
duracao         INT -- duração em segundos (para calls)
created_at      TIMESTAMP DEFAULT NOW()
```

### Tabela: follow_ups
```
id                  SERIAL PRIMARY KEY
lead_id             INT REFERENCES leads(id) NOT NULL
vendedor_id         INT REFERENCES vendedores(id) NOT NULL
data_programada     TIMESTAMP NOT NULL
data_executada      TIMESTAMP
tipo                ENUM('whatsapp', 'call', 'email') NOT NULL
status              ENUM('pendente', 'executado', 'atrasado', 'cancelado') DEFAULT 'pendente'
template_id         INT REFERENCES templates_mensagem(id)
mensagem_enviada    TEXT
created_at          TIMESTAMP DEFAULT NOW()
```

### Tabela: templates_mensagem
```
id              SERIAL PRIMARY KEY
nome            VARCHAR(100) NOT NULL
conteudo        TEXT NOT NULL -- suporta variáveis {{nome}}, {{dor_principal}}, etc.
etapa_funil     ENUM('novo', 'em_abordagem', 'qualificado', 'proposta', 'nurturing')
classe_lead     ENUM('A', 'B', 'C', 'todos') DEFAULT 'todos'
tipo            ENUM('whatsapp', 'email') DEFAULT 'whatsapp'
ativo           BOOLEAN DEFAULT true
created_at      TIMESTAMP DEFAULT NOW()
```

### Tabela: metas
```
id              SERIAL PRIMARY KEY
vendedor_id     INT REFERENCES vendedores(id) NOT NULL
periodo         VARCHAR(20) NOT NULL -- '2026-03' (mensal)
valor_meta      DECIMAL(10,2) NOT NULL
valor_atual     DECIMAL(10,2) DEFAULT 0
percentual      FLOAT DEFAULT 0
leads_meta      INT -- quantidade de leads como meta
leads_atual     INT DEFAULT 0
status          ENUM('em_andamento', 'atingida', 'nao_atingida') DEFAULT 'em_andamento'
created_at      TIMESTAMP DEFAULT NOW()
```

### Tabela: funil_historico
```
id              SERIAL PRIMARY KEY
lead_id         INT REFERENCES leads(id) NOT NULL
etapa_anterior  VARCHAR(50)
etapa_nova      VARCHAR(50) NOT NULL
vendedor_id     INT REFERENCES vendedores(id)
motivo          TEXT
created_at      TIMESTAMP DEFAULT NOW()
```

### Tabela: sla_config
```
id                      SERIAL PRIMARY KEY
classe_lead             ENUM('A', 'B', 'C') UNIQUE NOT NULL
tempo_maximo_minutos    INT NOT NULL -- 5 para A, 120 para B
alerta_amarelo_pct      INT DEFAULT 50
alerta_vermelho_pct     INT DEFAULT 80
redistribuir_ao_estourar BOOLEAN DEFAULT true
```

### Tabela: gamificacao
```
id              SERIAL PRIMARY KEY
vendedor_id     INT REFERENCES vendedores(id) NOT NULL
pontos          INT DEFAULT 0
badges          JSONB DEFAULT '[]'
periodo         VARCHAR(20) NOT NULL -- '2026-03'
ranking         INT DEFAULT 0
created_at      TIMESTAMP DEFAULT NOW()
```

### Tabela: audit_log
```
id              SERIAL PRIMARY KEY
usuario_id      INT REFERENCES usuarios(id)
acao            VARCHAR(50) NOT NULL -- CREATE, UPDATE, DELETE, REDISTRIBUTE, SLA_EXCEEDED
entidade        VARCHAR(50) NOT NULL -- nome da tabela
entidade_id     INT
dados_anteriores JSONB
dados_novos     JSONB
ip              VARCHAR(45)
created_at      TIMESTAMP DEFAULT NOW()
```

### Tabela: propostas
```
id              SERIAL PRIMARY KEY
lead_id         INT REFERENCES leads(id) NOT NULL
vendedor_id     INT REFERENCES vendedores(id) NOT NULL
valor           DECIMAL(10,2) NOT NULL
status          ENUM('rascunho', 'enviada', 'visualizada', 'aceita', 'recusada') DEFAULT 'rascunho'
url_documento   VARCHAR(500)
aberturas       INT DEFAULT 0
data_envio      TIMESTAMP
data_assinatura TIMESTAMP
created_at      TIMESTAMP DEFAULT NOW()
```

---

## API REST — Endpoints

### Auth
- `POST /api/auth/login` — Login com email + senha → retorna JWT
- `POST /api/auth/refresh` — Refresh do token JWT
- `GET /api/auth/me` — Dados do usuário autenticado

### Webhook
- `POST /api/webhook/respondi` — Recebe lead do Respondi (autenticado por API key no header)

### Leads
- `GET /api/leads` — Listar leads (paginado, filtros: classe, etapa, vendedor, canal, data)
- `GET /api/leads/:id` — Detalhe completo do lead (card)
- `POST /api/leads` — Criar lead manualmente
- `PATCH /api/leads/:id` — Atualizar campos do lead
- `PATCH /api/leads/:id/etapa` — Mover lead no funil
- `PATCH /api/leads/:id/vendedor` — Redistribuir lead (requer perfil gestor/admin)
- `GET /api/leads/:id/interacoes` — Timeline de interações do lead
- `POST /api/leads/:id/interacoes` — Registrar nova interação

### Vendedores
- `GET /api/vendedores` — Listar vendedores + ranking
- `GET /api/vendedores/:id/dashboard` — Dashboard individual do vendedor
- `GET /api/vendedores/:id/followups` — Follow-ups pendentes do vendedor
- `GET /api/vendedores/:id/leads` — Leads ativos do vendedor

### Funil
- `GET /api/funil` — Funil completo estilo Kanban (agrupado por etapa)
- `GET /api/funil/metricas` — KPIs: conversão, ticket médio, tempo de ciclo, volume

### Metas
- `GET /api/metas` — Listar metas do período
- `POST /api/metas` — Criar meta (requer perfil gestor/admin)
- `PATCH /api/metas/:id` — Atualizar meta

### Ranking / Gamificação
- `GET /api/ranking` — Ranking gamificado completo
- `GET /api/ranking/vendedor/:id` — Detalhes de performance de um vendedor

### Calls e IA
- `POST /api/calls/upload` — Upload de gravação de call (áudio)
- `POST /api/calls/transcribe` — Enviar áudio ao Whisper → transcrever → GPT-4 preenche campos
- `GET /api/calls/:interacao_id/transcricao` — Buscar transcrição e resumo de uma call

### Follow-ups
- `GET /api/followups` — Follow-ups do dia (todos ou filtrado por vendedor)
- `POST /api/followups` — Agendar follow-up manual
- `PATCH /api/followups/:id` — Marcar como executado/cancelado

### Templates
- `GET /api/templates` — Listar templates de mensagem
- `POST /api/templates` — Criar template
- `PATCH /api/templates/:id` — Editar template

### Relatórios
- `GET /api/relatorios/geral` — Relatório gerencial (requer gestor/admin)
- `GET /api/relatorios/por-canal` — Conversão por canal (Bio vs Anúncio)
- `GET /api/relatorios/por-classe` — Conversão por classe (A, B, C)
- `GET /api/relatorios/por-closer` — Performance por closer
- `GET /api/relatorios/export/:format` — Exportar PDF/Excel/CSV

### Admin
- `GET /api/admin/usuarios` — Listar usuários
- `POST /api/admin/usuarios` — Criar usuário
- `PATCH /api/admin/usuarios/:id` — Editar usuário
- `DELETE /api/admin/usuarios/:id` — Desativar usuário
- `GET /api/admin/sla` — Listar configs de SLA
- `PATCH /api/admin/sla/:classe` — Alterar SLA por classe
- `GET /api/admin/audit` — Consultar audit log

---

## Métricas do Dashboard

O dashboard deve exibir:
- Taxa de conversão por canal (Bio vs Anúncio vs Evento)
- Taxa de conversão por classe (A, B, C)
- Taxa de conversão por closer
- Tempo médio de abordagem por classe e por closer
- Volume de leads por classe por dia
- Faturamento gerado por canal de origem
- % da meta individual e do time
- Follow-ups pendentes do dia
- Posição no ranking gamificado

---

## Regras de Negócio Inegociáveis

1. Leads C NUNCA entram na fila ativa dos closers
2. Campo de investimento declarado NUNCA penaliza — só pontua positivamente
3. Bio SEMPRE começa com +30 pts; Anúncio com +10 pts
4. Urgência alta (8-10 ou "Quero agir agora") vale +25 pts em ambos os formulários
5. Em caso de empate de pontuação, Bio tem prioridade sobre Anúncio na fila
6. SLA Classe A: 5 minutos. SLA Classe B: 2 horas
7. Se SLA estourar, lead é redistribuído automaticamente para o próximo closer disponível
8. Toda ação crítica (exclusão, redistribuição, alteração de permissões) vai pro audit_log
9. Leads que não convertem em 30 dias entram automaticamente no fluxo de nurturing
10. Funil tem 6 etapas obrigatórias: novo → em_abordagem → qualificado → proposta → fechado_ganho / fechado_perdido

---

## Fases de Desenvolvimento

### Fase 1 — Core (Semanas 1-4)
- Setup do projeto (Node.js + Express + Prisma + PostgreSQL + Redis)
- Autenticação JWT com 3 perfis (admin, gestor, vendedor)
- CRUD de usuários e vendedores
- Webhook do Respondi (receber leads)
- Engine de Lead Score (ambos formulários)
- Classificação A/B/C automática
- Distribuição por classe com round-robin
- API REST dos endpoints de leads, vendedores e auth

### Fase 2 — Follow-up & Funil (Semanas 5-8)
- Dashboard individual do vendedor
- Funil Kanban com drag & drop
- Sistema de follow-ups com cadência configurável
- Alertas de SLA com timer (BullMQ cron jobs)
- Redistribuição automática por SLA
- Templates de mensagem
- Gestão de metas
- WebSocket para notificações real-time

### Fase 3 — IA & Calls (Semanas 9-12)
- Gravação de call no browser (MediaRecorder API)
- Upload e armazenamento do áudio
- Transcrição via Whisper API
- Preenchimento automático de campos via GPT-4
- Card do lead completo com checklist do script de vendas
- Resumo automático da call
- Ranking gamificado

### Fase 4 — Avançado (Semanas 13-16)
- Integração WhatsApp via Evolution API
- Disparo automático de mensagens por cadência
- Deduplicação de leads (match por telefone/email)
- Relatórios gerenciais exportáveis

### Fase 5 — Premium (Semanas 17-20)
- Calendário e agendamento (Google Calendar API)
- Propostas e contratos
- Fluxo de nurturing automático para leads C
- IA preditiva (score de propensão de conversão)

### Fase 6 — Validação (Semanas 21-24)
- Testes unitários (Jest) — cobertura mínima 70%
- Testes de integração (Supertest)
- Análise estática (ESLint)
- Testes de usabilidade
- Deploy em produção

---

## Estrutura de Pastas

```
crm-marcio-conceicao/
├── CLAUDE.md
├── package.json
├── .env
├── .env.example
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── server.js
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── env.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rbac.js
│   │   ├── validator.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── webhook.routes.js
│   │   ├── leads.routes.js
│   │   ├── vendedores.routes.js
│   │   ├── funil.routes.js
│   │   ├── metas.routes.js
│   │   ├── ranking.routes.js
│   │   ├── calls.routes.js
│   │   ├── followups.routes.js
│   │   ├── templates.routes.js
│   │   ├── relatorios.routes.js
│   │   └── admin.routes.js
│   ├── controllers/
│   │   └── (mesmos nomes das routes)
│   ├── services/
│   │   ├── scoreEngine.js        -- cálculo de lead score
│   │   ├── distribuidor.js       -- distribuição por classe
│   │   ├── slaMonitor.js         -- checker de SLA com BullMQ
│   │   ├── aiService.js          -- integração GPT-4 + Whisper
│   │   ├── whatsappService.js    -- integração Evolution API
│   │   └── nurtureService.js     -- fluxo de nurturing
│   ├── jobs/
│   │   ├── slaChecker.job.js
│   │   ├── whatsappDispatcher.job.js
│   │   ├── transcriptionWorker.job.js
│   │   └── nurtureScheduler.job.js
│   ├── utils/
│   │   ├── logger.js
│   │   └── helpers.js
│   └── websocket/
│       └── socketHandler.js
├── frontend/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Funil.jsx
│   │   │   ├── LeadCard.jsx
│   │   │   ├── MeusLeads.jsx
│   │   │   ├── Ranking.jsx
│   │   │   ├── Metas.jsx
│   │   │   ├── FollowUps.jsx
│   │   │   ├── Relatorios.jsx
│   │   │   └── Admin/
│   │   │       ├── Usuarios.jsx
│   │   │       ├── SLAConfig.jsx
│   │   │       └── AuditLog.jsx
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   ├── KanbanBoard/
│   │   │   ├── LeadCard/
│   │   │   ├── ScriptChecklist/
│   │   │   ├── CallRecorder/
│   │   │   ├── RankingBoard/
│   │   │   └── Charts/
│   │   ├── hooks/
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── utils/
│   └── public/
└── tests/
    ├── unit/
    └── integration/
```

---

## Variáveis de Ambiente (.env)

```
# Server
PORT=3001
NODE_ENV=development
JWT_SECRET=gerar-chave-segura-aqui
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crm_marcio

# Redis
REDIS_URL=redis://localhost:6379

# Respondi Webhook
RESPONDI_API_KEY=chave-do-respondi-aqui

# OpenAI (Fase 3)
OPENAI_API_KEY=sk-xxxx

# Evolution API / WhatsApp (Fase 4)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=chave-evolution

# Google Calendar (Fase 5)
GOOGLE_CLIENT_ID=xxxx
GOOGLE_CLIENT_SECRET=xxxx

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar migrations do Prisma
npx prisma migrate dev

# Seed do banco (vendedores iniciais + SLA configs)
npx prisma db seed

# Rodar backend
npm run dev

# Rodar frontend (em outro terminal)
cd frontend && npm run dev

# Rodar testes
npm test

# Lint
npm run lint
```
