const {
  derivarOrigemVenda,
  calcularCicloVendaDias,
  extrairMetodoPagamento,
  extrairParcelas,
  extrairOrderBumps,
  extrairUtmsCheckout,
  extrairFbclidCheckout,
} = require('../../src/services/vendaService');

describe('vendaService — funcoes puras', () => {
  describe('derivarOrigemVenda', () => {
    test('null lead -> manual', () => {
      expect(derivarOrigemVenda(null)).toBe('manual');
    });
    test('undefined -> manual', () => {
      expect(derivarOrigemVenda(undefined)).toBe('manual');
    });
    test('canal anuncio -> anuncio_legacy', () => {
      expect(derivarOrigemVenda({ canal: 'anuncio' })).toBe('anuncio_legacy');
    });
    test('canal bio -> bio', () => {
      expect(derivarOrigemVenda({ canal: 'bio' })).toBe('bio');
    });
    test('canal evento -> evento', () => {
      expect(derivarOrigemVenda({ canal: 'evento' })).toBe('evento');
    });
    test('canal desconhecido -> outro', () => {
      expect(derivarOrigemVenda({ canal: 'estranho' })).toBe('outro');
    });
    test('lead sem canal -> outro', () => {
      expect(derivarOrigemVenda({ id: 1 })).toBe('outro');
    });
  });

  describe('calcularCicloVendaDias', () => {
    test('ambos null -> null', () => {
      expect(calcularCicloVendaDias(null, null)).toBeNull();
    });
    test('dataPagamento null -> null', () => {
      expect(calcularCicloVendaDias(null, new Date())).toBeNull();
    });
    test('createdAt null -> null', () => {
      expect(calcularCicloVendaDias(new Date(), null)).toBeNull();
    });
    test('diferenca de 5 dias', () => {
      const created = new Date('2026-04-15T00:00:00Z');
      const paid = new Date('2026-04-20T00:00:00Z');
      expect(calcularCicloVendaDias(paid, created)).toBe(5);
    });
    test('mesmo instante -> 0', () => {
      const d = new Date('2026-04-20T00:00:00Z');
      expect(calcularCicloVendaDias(d, d)).toBe(0);
    });
    test('paid antes de created -> null (evita negativo)', () => {
      const created = new Date('2026-04-20T00:00:00Z');
      const paid = new Date('2026-04-15T00:00:00Z');
      expect(calcularCicloVendaDias(paid, created)).toBeNull();
    });
    test('aceita strings ISO', () => {
      expect(calcularCicloVendaDias('2026-04-20T00:00:00Z', '2026-04-15T00:00:00Z')).toBe(5);
    });
    test('floor em periodo parcial (23h59 -> 0 dias)', () => {
      const created = new Date('2026-04-20T00:00:00Z');
      const paid = new Date('2026-04-20T23:59:00Z');
      expect(calcularCicloVendaDias(paid, created)).toBe(0);
    });
  });

  describe('extrairMetodoPagamento', () => {
    test('invoice com paymentMethod', () => {
      expect(extrairMetodoPagamento({ paymentMethod: 'pix' })).toBe('pix');
    });
    test('fallback para method', () => {
      expect(extrairMetodoPagamento({ method: 'cartao' })).toBe('cartao');
    });
    test('sem nenhum -> null', () => {
      expect(extrairMetodoPagamento({})).toBeNull();
    });
    test('null invoice -> null', () => {
      expect(extrairMetodoPagamento(null)).toBeNull();
    });
  });

  describe('extrairParcelas', () => {
    test('installments numerico', () => {
      expect(extrairParcelas({ installments: 3 })).toBe(3);
    });
    test('parcels fallback', () => {
      expect(extrairParcelas({ parcels: 6 })).toBe(6);
    });
    test('0 retorna null (parcela invalida)', () => {
      expect(extrairParcelas({ installments: 0 })).toBeNull();
    });
    test('string retorna null', () => {
      expect(extrairParcelas({ installments: '3' })).toBeNull();
    });
  });

  describe('extrairOrderBumps', () => {
    test('orderBumps array', () => {
      expect(extrairOrderBumps({ orderBumps: ['a', 'b'] })).toEqual(['a', 'b']);
    });
    test('bumps fallback', () => {
      expect(extrairOrderBumps({ bumps: ['x'] })).toEqual(['x']);
    });
    test('sem array -> null', () => {
      expect(extrairOrderBumps({ orderBumps: 'nao-array' })).toBeNull();
    });
    test('sem campos -> null', () => {
      expect(extrairOrderBumps({})).toBeNull();
    });
  });

  describe('extrairUtmsCheckout', () => {
    test('event.invoice.utms', () => {
      expect(extrairUtmsCheckout({ event: { invoice: { utms: { utm_source: 'meta' } } } }))
        .toEqual({ utm_source: 'meta' });
    });
    test('fallback payload.utms', () => {
      expect(extrairUtmsCheckout({ utms: { utm_source: 'google' } }))
        .toEqual({ utm_source: 'google' });
    });
    test('sem utms -> null', () => {
      expect(extrairUtmsCheckout({})).toBeNull();
    });
  });

  describe('extrairFbclidCheckout', () => {
    test('fbclid dentro de utms', () => {
      expect(extrairFbclidCheckout({ event: { invoice: { utms: { fbclid: 'abc' } } } })).toBe('abc');
    });
    test('sem utms -> null', () => {
      expect(extrairFbclidCheckout({})).toBeNull();
    });
    test('utms sem fbclid -> null', () => {
      expect(extrairFbclidCheckout({ utms: { utm_source: 'x' } })).toBeNull();
    });
  });
});
