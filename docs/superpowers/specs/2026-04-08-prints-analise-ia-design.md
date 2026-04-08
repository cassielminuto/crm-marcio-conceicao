# Prints com Analise Incremental por IA — Design Spec

**Data:** 2026-04-08
**Objetivo:** Upload de prints de DMs do Instagram com analise incremental por GPT-4o Vision que sugere preenchimento dos campos do lead. IA sugere, Taiana edita.

---

## 1. Modelo de Dados

### Mudancas no PrintConversaSDR (reusar modelo existente)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `contextoFase` | Enum ContextoFasePrint (detalhe, handoff) | De onde veio o print |
| `analiseIA` | Json? | Resultado estruturado da analise dessa rodada |

### Mudancas no LeadSDR

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `analiseIaCache` | Json? | Cache consolidado da ultima analise (evita reprocessar tudo) |

### Novo Enum

```prisma
enum ContextoFasePrint {
  detalhe
  handoff
}
```

---

## 2. Backend — sdrAnaliseService.js

### analisarPrintIncremental(leadSdrId, novoPrintUrl)

1. Busca lead + analiseIaCache + prints anteriores
2. Monta prompt GPT-4o Vision: analise anterior (JSON cache) + novo print (imagem)
3. Retorna JSON estruturado: { respostaLead, temperaturaInicial, dorAparente, tentouSolucaoAnterior, temperaturaFinal, decisaoRota, detalheSituacao, aceitouDiagnostico, confiancaAnalise, observacoesIA }
4. Salva analiseIA no print, atualiza analiseIaCache no lead
5. Retorna { analiseAtual, analiseAnterior } pro frontend montar diff
6. Se GPT-4o falhar: print salvo sem analise, erro logado, retorna { erro, printSalvo: true }

### aplicarSugestoesIA(leadSdrId, camposAceitos)

Recebe { campo: valor } dos campos aceitos pela Taiana, faz PATCH no lead.

---

## 3. Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/sdr/leads/:id/prints/analisar` | Upload + analise incremental |
| POST | `/api/sdr/leads/:id/aplicar-sugestoes` | Aplica campos aceitos |
| GET | `/api/sdr/leads/:id/prints` | Lista prints do lead |
| DELETE | `/api/sdr/leads/:id/prints/:printId` | Remove print |
| POST | `/api/sdr/leads/:id/prints/:printId/reanalisar` | Reanalisar print que falhou |

Validacoes: max 10 prints/lead, max 8MB, formatos jpg/jpeg/png/webp.

---

## 4. Frontend — SdrLeadDetailModal

### Secao de Prints (topo do modal, colapsavel)

- Thumbnails horizontais com X de remover e lightbox
- Botao "+ Subir print" com upload
- Spinner "Analisando conversa com IA..." durante analise

### Componente DiffSugestoesIA

Para cada campo com sugestao diferente do atual:
- Nome do campo, valor anterior (cinza), valor sugerido (destaque)
- Botoes [Aceitar] [Rejeitar] por campo
- [Aceitar todas] [Rejeitar todas]
- "Confianca da IA: X%"

### Campos editados manualmente

- Flag `editadoManualmente` por campo (set on onChange)
- Icone ao lado do campo: "Editado manualmente"
- IA nao sugere mudancas pra esses campos
- Botao "Permitir IA novamente"

### Tratamento de erro

- Print salvo mesmo se IA falha
- Icone aviso no thumbnail + tooltip
- Botao "Reanalisar" no print individual
- Mensagem clara no modal

---

## 5. Prompt GPT-4o Vision

Contexto do programa Compativeis, glossario de enums, instrucao de retornar null quando sem evidencia, conservador na temperatura, JSON valido sem markdown.

---

## 6. Armazenamento

Local em `uploads/sdr-prints/` (mesmo do handoff). Limite 8MB.

## 7. Modelo OpenAI

`gpt-4o` (mesmo ja usado no projeto).
