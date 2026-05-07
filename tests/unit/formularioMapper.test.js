const {
  mapearFormulario,
  isSdrInboundLegado,
  FORM_SDR_INBOUND_LEGADO,
  MAPA_FORMULARIOS,
} = require('../../src/services/formularioMapper');

describe('formularioMapper', () => {
  describe('isSdrInboundLegado', () => {
    test('match exato com a constante', () => {
      expect(isSdrInboundLegado(FORM_SDR_INBOUND_LEGADO)).toBe(true);
    });
    test('case-sensitive (CLAUDE.md)', () => {
      expect(isSdrInboundLegado(FORM_SDR_INBOUND_LEGADO.toLowerCase())).toBe(false);
    });
    test('null/undefined retorna false sem crashar', () => {
      expect(isSdrInboundLegado(null)).toBe(false);
      expect(isSdrInboundLegado(undefined)).toBe(false);
    });
  });

  describe('mapearFormulario', () => {
    test('null -> desconhecido', () => {
      const r = mapearFormulario(null);
      expect(r.tipo).toBe('desconhecido');
      expect(typeof r.normalizar).toBe('function');
      expect(r.normalizar({})).toEqual({});
    });

    test('SDR Inbound legado -> sdr_inbound_legado', () => {
      const r = mapearFormulario(FORM_SDR_INBOUND_LEGADO);
      expect(r.tipo).toBe('sdr_inbound_legado');
    });

    test('form nao mapeado -> pendente_mapeamento (D7)', () => {
      const r = mapearFormulario('Algum form novo do Respondi');
      expect(r.tipo).toBe('pendente_mapeamento');
      expect(r.normalizar({})).toEqual({});
    });

    test('form com nome igual mas case diferente -> pendente_mapeamento (case-sensitive)', () => {
      const r = mapearFormulario(FORM_SDR_INBOUND_LEGADO.toUpperCase());
      expect(r.tipo).toBe('pendente_mapeamento');
    });
  });

  describe('MAPA_FORMULARIOS', () => {
    test('exposto para extensao via require em testes/migracoes', () => {
      expect(typeof MAPA_FORMULARIOS).toBe('object');
    });
  });
});
