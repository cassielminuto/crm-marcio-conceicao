/**
 * Mapeia form_name do Respondi para tipo canonico interno e expoe
 * funcao de normalizacao de respostas pra o formato que scoreEngineV2
 * entende (chaves P4..P12).
 *
 * D7 do plano (docs/plans/2026-04-22-evolucao-crm-aquisicao.md):
 * nomes EXATOS dos forms novos serao fornecidos pelo Cassiel.
 * Por enquanto, MAPA_FORMULARIOS so mapeia o form SDR Inbound legado
 * (preserva comportamento atual). Forms novos caem em
 * 'pendente_mapeamento' ate o Cassiel fornecer os nomes reais.
 *
 * COMO ADICIONAR UM FORM NOVO:
 *
 *   MAPA_FORMULARIOS['Nome Exato Do Form Como Vem Do Respondi'] = {
 *     tipo: 'diag_gratuito_n1',
 *     normalizar: (payloadRespondi) => ({
 *       P4_impactoEmocional: extrair(payloadRespondi, 'pergunta de impacto'),
 *       // ...demais perguntas P5..P12
 *     }),
 *   };
 *
 * IMPORTANTE: comparacao de form_name e CASE-SENSITIVE
 * (CLAUDE.md§"Comparacao de form_name e case-sensitive").
 * Acentuacao e caixa importam.
 */

// Form SDR Inbound legado — comportamento preservado (cria LeadSDRInbound,
// nao Lead normal). Mantido com o typo "Diagonostico" do form real.
const FORM_SDR_INBOUND_LEGADO = '[Anúncios] [SDR] Diagonóstico Gratuito - Compatíveis';

const MAPA_FORMULARIOS = {
  // PLACEHOLDER (D7): preencher com nomes reais dos forms reformados.
  // Exemplos esperados conforme briefing:
  //   '[Diagnostico Gratuito v2 - N1]': { tipo: 'diag_gratuito_n1', normalizar: ... }
  //   '[Diagnostico Gratuito v2 - N2]': { tipo: 'diag_gratuito_n2', normalizar: ... }
  //   '[Intensivao 3Rs - Aplicacao]':   { tipo: 'intensivao_aplicacao', normalizar: ... }
};

function isSdrInboundLegado(formName) {
  return formName === FORM_SDR_INBOUND_LEGADO;
}

/**
 * @param {string|null|undefined} formName
 * @returns {{ tipo: string, normalizar: (payload: object) => object }}
 */
function mapearFormulario(formName) {
  if (!formName) {
    return { tipo: 'desconhecido', normalizar: () => ({}) };
  }
  if (isSdrInboundLegado(formName)) {
    return { tipo: 'sdr_inbound_legado', normalizar: () => ({}) };
  }
  const config = MAPA_FORMULARIOS[formName];
  if (config) {
    return { tipo: config.tipo, normalizar: config.normalizar };
  }
  return { tipo: 'pendente_mapeamento', normalizar: () => ({}) };
}

module.exports = {
  isSdrInboundLegado,
  mapearFormulario,
  FORM_SDR_INBOUND_LEGADO,
  MAPA_FORMULARIOS,
};
