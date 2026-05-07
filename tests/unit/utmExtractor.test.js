const { extrairUtms } = require('../../src/services/utmExtractor');

describe('utmExtractor', () => {
  test('payload null -> tudo null', () => {
    const r = extrairUtms(null);
    expect(r).toEqual({
      utm_source: null, utm_medium: null, utm_campaign: null,
      utm_term: null, utm_content: null, fbclid: null, gclid: null,
    });
  });

  test('payload sem respondent -> tudo null', () => {
    expect(extrairUtms({})).toEqual({
      utm_source: null, utm_medium: null, utm_campaign: null,
      utm_term: null, utm_content: null, fbclid: null, gclid: null,
    });
  });

  test('UTMs no caminho respondent.respondent_utms (CLAUDE.md)', () => {
    const r = extrairUtms({
      respondent: {
        respondent_utms: {
          utm_source: 'meta',
          utm_medium: 'cpc',
          utm_campaign: 'intensivao_pago',
          utm_content: 'criativo_v3',
          fbclid: 'IwAR0xyz',
          gclid: 'CjwKCxyz',
        },
      },
    });
    expect(r.utm_source).toBe('meta');
    expect(r.utm_medium).toBe('cpc');
    expect(r.utm_campaign).toBe('intensivao_pago');
    expect(r.utm_content).toBe('criativo_v3');
    expect(r.fbclid).toBe('IwAR0xyz');
    expect(r.gclid).toBe('CjwKCxyz');
    expect(r.utm_term).toBeNull();
  });

  test('UTMs no nivel raiz (formato errado) NAO sao capturados', () => {
    // Documenta o comportamento conforme CLAUDE.md — UTMs no raiz sao ignoradas
    const r = extrairUtms({ utm_source: 'google', fbclid: 'abc' });
    expect(r.utm_source).toBeNull();
    expect(r.fbclid).toBeNull();
  });

  test('strings vazias viram null', () => {
    const r = extrairUtms({ respondent: { respondent_utms: { utm_source: '', fbclid: '' } } });
    expect(r.utm_source).toBeNull();
    expect(r.fbclid).toBeNull();
  });
});
