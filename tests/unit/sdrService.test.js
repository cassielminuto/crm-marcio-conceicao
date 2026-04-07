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
