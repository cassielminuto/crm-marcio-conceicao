/**
 * Score Engine V2 — substitui src/services/scoreEngine.js (D2 do plano).
 *
 * Calcula pontuacao e classificacao do lead a partir das respostas do
 * formulario reformado (Diagnostico Gratuito / Intensivao / etc).
 *
 * ESCALA: 0 a 86 pontos divididos em 4 blocos.
 *
 *  - Bloco 1 (P1-P3): 0 pts  - engajamento, so coleta dados
 *  - Bloco 2 (P4-P8): 40 pts - gap emocional + consciencia
 *  - Bloco 3 (P9-P12): 40 pts - BANT (situacao, autoridade, budget, urgencia)
 *  - Bloco 4 (P13-P15): 0 pts - dados pessoais
 *
 * Soma maxima real dos pesos individuais documentados no briefing = 80.
 * O briefing fala em "86 pts" mas a soma das opcoes maximas de cada
 * pergunta da 80. Mantemos a soma real e as 4 faixas conforme briefing:
 *
 *  - 70-86 -> sql_hot
 *  - 50-69 -> mql_quente
 *  - 30-49 -> mql_morno
 *  - 0-29  -> nao_qualificado
 *
 * NOTA: caso seja necessario chegar a 86 reais, ajustar pesos no objeto
 * PESOS abaixo. As faixas sao independentes da soma maxima e nao
 * precisam mudar.
 *
 * USO:
 *   const { calcularScoreV2 } = require('./scoreEngineV2');
 *   const { pontuacao, classificacao, detalhe } = calcularScoreV2(respostas);
 *
 * O parametro `respostas` e um objeto plano cujas chaves sao identificadores
 * canonicos das perguntas (P4..P12). O webhook normaliza o payload do
 * Respondi para esse formato antes de chamar a engine.
 *
 * Cada pergunta retorna 0 se a resposta estiver ausente ou nao casar com
 * nenhuma opcao conhecida. Resposta desconhecida nunca penaliza.
 */

// TODO(calibragem): pesos atuais somam 80; briefing fala em 86.
// Recalibrar apos 30-60 dias de dados reais do Respondi reformado.
// Decidir: subir pesos ate 86 OU baixar faixas pro teto real de 80.

// ============================================================================
// PESOS (pontuacao por opcao escolhida)
// ============================================================================

const PESOS = {
  // ---- BLOCO 2: GAP E CONSCIENCIA (40 pts) ----

  // P4 - Impacto emocional (escala 0-10) -> 0/5/8/10
  P4_impactoEmocional: {
    '0-3': 0,
    '4-6': 5,
    '7-8': 8,
    '9-10': 10,
  },
  // P5 - Tempo de desconforto -> 2/5/7/8
  P5_tempoDesconforto: {
    'menos_3_meses': 2,
    'entre_3_meses_1_ano': 5,
    'entre_1_3_anos': 7,
    'mais_3_anos': 8,
  },
  // P6 - Areas afetadas (multipla) -> 2 pts por area, max 10
  P6_areasAfetadasMaxPorArea: 2,
  P6_areasAfetadasMaxTotal: 10,
  // P7 - Tentou resolver -> 6/4/2
  P7_tentouResolver: {
    'terapia': 6,
    'sozinha': 4,
    'nao': 2,
  },
  // P8 - Projecao 12 meses -> 6/4/2/0
  P8_projecao12meses: {
    'pior': 6,
    'igual': 4,
    'nao_sei': 2,
    'melhor': 0,
  },

  // ---- BLOCO 3: BANT (40 pts) ----

  // P9 - Situacao do relacionamento -> 5/4/3/3
  // 'separacao' = 3 (era 5): produto Compativeis foca reconstrucao de
  // casais; separado e publico borderline, mais proximo de 'solteira'.
  P9_situacaoRelacionamento: {
    'casada': 5,
    'namorando': 4,
    'separacao': 3,
    'solteira': 3,
  },
  // P10 - Autoridade financeira -> 10/7/3
  P10_autoridadeFinanceira: {
    'sozinha': 10,
    'com_parceiro': 7,
    'depende': 3,
  },
  // P11 - Budget -> 2/8/13/15/5
  // 'depende' = 5 (era 10): coerencia com P10 'depende' = 3. Lead que nao
  // sabe orcamento sinaliza menos prontidao financeira que quem chuta valor.
  P11_budget: {
    'ate_500': 2,
    'entre_500_1500': 8,
    'entre_1500_5000': 13,
    'mais_5000': 15,
    'depende': 5,
  },
  // P12 - Urgencia -> 10/8/5/1
  P12_urgencia: {
    'agora': 10,
    'duas_semanas': 8,
    'proximo_mes': 5,
    'sem_pressa': 1,
  },
};

// ============================================================================
// FAIXAS DE CLASSIFICACAO
// ============================================================================

const FAIXAS = [
  { min: 70, max: Infinity, classificacao: 'sql_hot' },
  { min: 50, max: 69, classificacao: 'mql_quente' },
  { min: 30, max: 49, classificacao: 'mql_morno' },
  { min: 0, max: 29, classificacao: 'nao_qualificado' },
];

function classificar(pontuacao) {
  for (const faixa of FAIXAS) {
    if (pontuacao >= faixa.min && pontuacao <= faixa.max) {
      return faixa.classificacao;
    }
  }
  return 'nao_qualificado';
}

// ============================================================================
// HELPERS DE PONTUACAO POR PERGUNTA
// ============================================================================

function pontuarOpcaoUnica(respostas, chave, mapaPesos) {
  const valor = respostas?.[chave];
  if (valor == null) return 0;
  // Aceita string direta ou objeto com .opcao
  const opcao = typeof valor === 'object' ? valor.opcao : valor;
  if (typeof opcao !== 'string') return 0;
  return mapaPesos[opcao] ?? 0;
}

function pontuarMultiplaEscolha(respostas, chave, pesoPorItem, maxTotal) {
  const valor = respostas?.[chave];
  if (!Array.isArray(valor)) return 0;
  const pontos = valor.length * pesoPorItem;
  return Math.min(pontos, maxTotal);
}

// Cobertura minima do Bloco 3 (BANT): se menos de 3 das 4 perguntas
// estiverem respondidas, classificacao e capada em mql_morno mesmo que
// a pontuacao caia em faixa superior. Sem sinal BANT suficiente, "lead
// quente" engana o closer — melhor classificar conservador.
function contarBloco3Respondidas(respostas) {
  const chaves = ['P9_situacaoRelacionamento', 'P10_autoridadeFinanceira', 'P11_budget', 'P12_urgencia'];
  return chaves.filter((k) => respostas?.[k] != null).length;
}

// ============================================================================
// API PRINCIPAL
// ============================================================================

/**
 * Calcula pontuacao (0-86) e classificacao (sql_hot|mql_quente|mql_morno|nao_qualificado).
 *
 * @param {object} respostas - objeto plano com chaves canonicas das perguntas
 * @returns {{ pontuacao: number, classificacao: string, detalhe: object }}
 */
function calcularScoreV2(respostas) {
  const respostasObj = respostas && typeof respostas === 'object' ? respostas : {};

  // Bloco 2 - Gap e consciencia
  const p4 = pontuarOpcaoUnica(respostasObj, 'P4_impactoEmocional', PESOS.P4_impactoEmocional);
  const p5 = pontuarOpcaoUnica(respostasObj, 'P5_tempoDesconforto', PESOS.P5_tempoDesconforto);
  const p6 = pontuarMultiplaEscolha(respostasObj, 'P6_areasAfetadas', PESOS.P6_areasAfetadasMaxPorArea, PESOS.P6_areasAfetadasMaxTotal);
  const p7 = pontuarOpcaoUnica(respostasObj, 'P7_tentouResolver', PESOS.P7_tentouResolver);
  const p8 = pontuarOpcaoUnica(respostasObj, 'P8_projecao12meses', PESOS.P8_projecao12meses);

  // Bloco 3 - BANT
  const p9 = pontuarOpcaoUnica(respostasObj, 'P9_situacaoRelacionamento', PESOS.P9_situacaoRelacionamento);
  const p10 = pontuarOpcaoUnica(respostasObj, 'P10_autoridadeFinanceira', PESOS.P10_autoridadeFinanceira);
  const p11 = pontuarOpcaoUnica(respostasObj, 'P11_budget', PESOS.P11_budget);
  const p12 = pontuarOpcaoUnica(respostasObj, 'P12_urgencia', PESOS.P12_urgencia);

  const pontuacao = p4 + p5 + p6 + p7 + p8 + p9 + p10 + p11 + p12;
  const bloco3Respondidas = contarBloco3Respondidas(respostasObj);

  let classificacao = classificar(pontuacao);
  if (bloco3Respondidas < 3 && (classificacao === 'sql_hot' || classificacao === 'mql_quente')) {
    classificacao = 'mql_morno';
  }

  return {
    pontuacao,
    classificacao,
    detalhe: {
      bloco2: { p4, p5, p6, p7, p8, subtotal: p4 + p5 + p6 + p7 + p8 },
      bloco3: { p9, p10, p11, p12, subtotal: p9 + p10 + p11 + p12, coberturaRespostas: bloco3Respondidas },
    },
  };
}

module.exports = {
  calcularScoreV2,
  classificar,
  PESOS,
  FAIXAS,
};
