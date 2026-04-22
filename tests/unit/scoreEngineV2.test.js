const { calcularScoreV2, classificar, PESOS, FAIXAS } = require('../../src/services/scoreEngineV2');

describe('scoreEngineV2', () => {
  // ----------------------------------------------------------------------
  // classificar
  // ----------------------------------------------------------------------
  describe('classificar', () => {
    test('0 -> nao_qualificado', () => {
      expect(classificar(0)).toBe('nao_qualificado');
    });
    test('29 -> nao_qualificado (limite superior)', () => {
      expect(classificar(29)).toBe('nao_qualificado');
    });
    test('30 -> mql_morno (limite inferior)', () => {
      expect(classificar(30)).toBe('mql_morno');
    });
    test('49 -> mql_morno (limite superior)', () => {
      expect(classificar(49)).toBe('mql_morno');
    });
    test('50 -> mql_quente (limite inferior)', () => {
      expect(classificar(50)).toBe('mql_quente');
    });
    test('69 -> mql_quente (limite superior)', () => {
      expect(classificar(69)).toBe('mql_quente');
    });
    test('70 -> sql_hot (limite inferior)', () => {
      expect(classificar(70)).toBe('sql_hot');
    });
    test('86 -> sql_hot (max real do briefing)', () => {
      expect(classificar(86)).toBe('sql_hot');
    });
    test('80 -> sql_hot (soma real maxima dos pesos atuais)', () => {
      expect(classificar(80)).toBe('sql_hot');
    });
  });

  // ----------------------------------------------------------------------
  // calcularScoreV2 — bordas defensivas
  // ----------------------------------------------------------------------
  describe('calcularScoreV2 — entradas degeneradas', () => {
    test('respostas null -> pontuacao 0, nao_qualificado', () => {
      const r = calcularScoreV2(null);
      expect(r.pontuacao).toBe(0);
      expect(r.classificacao).toBe('nao_qualificado');
    });
    test('respostas vazias -> pontuacao 0, nao_qualificado', () => {
      const r = calcularScoreV2({});
      expect(r.pontuacao).toBe(0);
      expect(r.classificacao).toBe('nao_qualificado');
    });
    test('opcao desconhecida nao penaliza (retorna 0 pra aquela pergunta)', () => {
      const r = calcularScoreV2({
        P4_impactoEmocional: 'opcao_que_nao_existe',
        P11_budget: 'mais_5000',
      });
      expect(r.pontuacao).toBe(15); // somente P11
      expect(r.detalhe.bloco2.p4).toBe(0);
    });
    test('valor objeto com .opcao e aceito', () => {
      const r = calcularScoreV2({
        P4_impactoEmocional: { opcao: '9-10', textoOriginal: 'algo' },
      });
      expect(r.detalhe.bloco2.p4).toBe(10);
    });
  });

  // ----------------------------------------------------------------------
  // calcularScoreV2 — Bloco 2 (gap)
  // ----------------------------------------------------------------------
  describe('Bloco 2 — gap e consciencia (max 40)', () => {
    test('todas opcoes maximas somam 40', () => {
      const r = calcularScoreV2({
        P4_impactoEmocional: '9-10',           // 10
        P5_tempoDesconforto: 'mais_3_anos',    // 8
        P6_areasAfetadas: ['a', 'b', 'c', 'd', 'e'], // 5*2 = 10 (cap 10)
        P7_tentouResolver: 'terapia',          // 6
        P8_projecao12meses: 'pior',            // 6
      });
      expect(r.detalhe.bloco2.subtotal).toBe(40);
    });

    test('P6 cap em 10 mesmo com 7 areas', () => {
      const r = calcularScoreV2({
        P6_areasAfetadas: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      });
      expect(r.detalhe.bloco2.p6).toBe(10);
    });

    test('P6 com 3 areas = 6 pts', () => {
      const r = calcularScoreV2({
        P6_areasAfetadas: ['a', 'b', 'c'],
      });
      expect(r.detalhe.bloco2.p6).toBe(6);
    });

    test('P6 sem array -> 0', () => {
      const r = calcularScoreV2({ P6_areasAfetadas: 'string_em_vez_de_array' });
      expect(r.detalhe.bloco2.p6).toBe(0);
    });
  });

  // ----------------------------------------------------------------------
  // calcularScoreV2 — Bloco 3 (BANT)
  // ----------------------------------------------------------------------
  describe('Bloco 3 — BANT (max 40)', () => {
    test('todas opcoes maximas somam 40', () => {
      const r = calcularScoreV2({
        P9_situacaoRelacionamento: 'casada',   // 5
        P10_autoridadeFinanceira: 'sozinha',   // 10
        P11_budget: 'mais_5000',               // 15
        P12_urgencia: 'agora',                 // 10
      });
      expect(r.detalhe.bloco3.subtotal).toBe(40);
    });

    test('budget depende = 5 (alinhado com P10 depende = 3)', () => {
      const r = calcularScoreV2({ P11_budget: 'depende' });
      expect(r.detalhe.bloco3.p11).toBe(5);
    });
  });

  // ----------------------------------------------------------------------
  // calcularScoreV2 — Cenarios end-to-end por faixa
  // ----------------------------------------------------------------------
  describe('cenarios completos por faixa', () => {
    test('lead_perfeito -> sql_hot, pontuacao 80', () => {
      const r = calcularScoreV2({
        P4_impactoEmocional: '9-10',
        P5_tempoDesconforto: 'mais_3_anos',
        P6_areasAfetadas: ['a', 'b', 'c', 'd', 'e'],
        P7_tentouResolver: 'terapia',
        P8_projecao12meses: 'pior',
        P9_situacaoRelacionamento: 'casada',
        P10_autoridadeFinanceira: 'sozinha',
        P11_budget: 'mais_5000',
        P12_urgencia: 'agora',
      });
      expect(r.pontuacao).toBe(80);
      expect(r.classificacao).toBe('sql_hot');
    });

    test('lead_quente -> mql_quente (faixa 50-69)', () => {
      // Alvo ~55
      const r = calcularScoreV2({
        P4_impactoEmocional: '7-8',           // 8
        P5_tempoDesconforto: 'entre_1_3_anos', // 7
        P6_areasAfetadas: ['a', 'b'],          // 4
        P7_tentouResolver: 'sozinha',          // 4
        P8_projecao12meses: 'igual',           // 4
        P9_situacaoRelacionamento: 'casada',   // 5
        P10_autoridadeFinanceira: 'com_parceiro', // 7
        P11_budget: 'entre_1500_5000',         // 13
        P12_urgencia: 'duas_semanas',          // 8
      });
      // soma = 60
      expect(r.pontuacao).toBe(60);
      expect(r.classificacao).toBe('mql_quente');
    });

    test('lead_morno -> mql_morno (faixa 30-49)', () => {
      const r = calcularScoreV2({
        P4_impactoEmocional: '4-6',            // 5
        P5_tempoDesconforto: 'entre_3_meses_1_ano', // 5
        P7_tentouResolver: 'sozinha',          // 4
        P11_budget: 'entre_500_1500',          // 8
        P12_urgencia: 'duas_semanas',          // 8
        P10_autoridadeFinanceira: 'com_parceiro', // 7
      });
      expect(r.pontuacao).toBe(37);
      expect(r.classificacao).toBe('mql_morno');
    });

    test('lead_frio -> nao_qualificado (faixa 0-29)', () => {
      const r = calcularScoreV2({
        P4_impactoEmocional: '0-3',            // 0
        P11_budget: 'ate_500',                 // 2
        P12_urgencia: 'sem_pressa',            // 1
        P10_autoridadeFinanceira: 'depende',   // 3
      });
      expect(r.pontuacao).toBe(6);
      expect(r.classificacao).toBe('nao_qualificado');
    });

    test('alta pontuacao mas cobertura < 3 no Bloco 3 -> cap em mql_morno', () => {
      const r = calcularScoreV2({
        P4_impactoEmocional: '9-10',
        P5_tempoDesconforto: 'mais_3_anos',
        P6_areasAfetadas: ['a', 'b', 'c', 'd', 'e'],
        P7_tentouResolver: 'terapia',
        P8_projecao12meses: 'pior',
        P11_budget: 'mais_5000',
      });
      expect(r.pontuacao).toBe(55);
      expect(r.classificacao).toBe('mql_morno');
      expect(r.detalhe.bloco3.coberturaRespostas).toBe(1);
    });

    test('alta pontuacao e cobertura = 3 no Bloco 3 -> classificacao normal', () => {
      const r = calcularScoreV2({
        P4_impactoEmocional: '9-10',
        P5_tempoDesconforto: 'mais_3_anos',
        P6_areasAfetadas: ['a', 'b', 'c', 'd', 'e'],
        P7_tentouResolver: 'terapia',
        P8_projecao12meses: 'pior',
        P9_situacaoRelacionamento: 'casada',
        P10_autoridadeFinanceira: 'sozinha',
        P11_budget: 'mais_5000',
      });
      expect(r.detalhe.bloco3.coberturaRespostas).toBe(3);
      expect(r.classificacao).toBe('sql_hot');
    });

    test('baixa pontuacao e cobertura baixa segue nao_qualificado (nao afeta)', () => {
      const r = calcularScoreV2({ P11_budget: 'ate_500' });
      expect(r.classificacao).toBe('nao_qualificado');
    });
  });

  // ----------------------------------------------------------------------
  // Sanity: estrutura exposta
  // ----------------------------------------------------------------------
  describe('estrutura do retorno', () => {
    test('retorna pontuacao, classificacao, detalhe.bloco2, detalhe.bloco3', () => {
      const r = calcularScoreV2({});
      expect(r).toHaveProperty('pontuacao');
      expect(r).toHaveProperty('classificacao');
      expect(r.detalhe).toHaveProperty('bloco2');
      expect(r.detalhe).toHaveProperty('bloco3');
      expect(r.detalhe.bloco2).toHaveProperty('subtotal');
      expect(r.detalhe.bloco3).toHaveProperty('subtotal');
    });
  });

  describe('FAIXAS exportadas', () => {
    test('quatro faixas na ordem decrescente', () => {
      expect(FAIXAS).toHaveLength(4);
      expect(FAIXAS[0].classificacao).toBe('sql_hot');
      expect(FAIXAS[3].classificacao).toBe('nao_qualificado');
    });
  });
});
