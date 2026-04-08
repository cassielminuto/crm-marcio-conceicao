// Mock create function — shared reference so tests can control it
const mockCreate = jest.fn();

// Mock OpenAI — constructor returns object with chat.completions.create
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

// Mock Prisma
jest.mock('../../src/config/database', () => ({
  leadSDR: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  printConversaSDR: {
    update: jest.fn(),
  },
}));

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => Buffer.from('fake-image-data')),
}));

const prisma = require('../../src/config/database');

// Import AFTER mocks are set up
const { analisarPrintIncremental, aplicarSugestoesIA } = require('../../src/services/sdrAnaliseService');

describe('sdrAnaliseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analisarPrintIncremental', () => {
    const validAnalise = {
      respostaLead: 'Estou passando por um momento dificil no casamento',
      temperaturaInicial: 'morno',
      dorAparente: 'Falta de comunicacao no casal',
      tentouSolucaoAnterior: null,
      temperaturaFinal: null,
      decisaoRota: null,
      detalheSituacao: null,
      aceitouDiagnostico: null,
      confiancaAnalise: 72,
      observacoesIA: 'Lead demonstra interesse mas ainda nao expressou urgencia',
    };

    test('retorna analise quando GPT-4o responde JSON valido', async () => {
      prisma.leadSDR.findUnique.mockResolvedValue({
        id: 1,
        analiseIaCache: null,
        instagram: '@maria',
        nome: 'Maria',
      });
      prisma.leadSDR.update.mockResolvedValue({});

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(validAnalise) } }],
      });

      const resultado = await analisarPrintIncremental(1, '/uploads/sdr-prints/test.jpg');

      expect(resultado.analiseAtual).toBeDefined();
      expect(resultado.analiseAnterior).toBeNull();
      expect(prisma.leadSDR.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { analiseIaCache: expect.any(Object) },
      });
    });

    test('retorna analise anterior quando lead tem cache', async () => {
      const cacheAnterior = { respostaLead: 'Oi', confiancaAnalise: 50 };
      prisma.leadSDR.findUnique.mockResolvedValue({
        id: 1,
        analiseIaCache: cacheAnterior,
        instagram: '@maria',
        nome: 'Maria',
      });
      prisma.leadSDR.update.mockResolvedValue({});

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(validAnalise) } }],
      });

      const resultado = await analisarPrintIncremental(1, '/uploads/sdr-prints/test.jpg');

      expect(resultado.analiseAnterior).toEqual(cacheAnterior);
      expect(resultado.analiseAtual).toBeDefined();
    });

    test('throw quando lead nao existe', async () => {
      prisma.leadSDR.findUnique.mockResolvedValue(null);

      await expect(
        analisarPrintIncremental(999, '/uploads/sdr-prints/test.jpg')
      ).rejects.toThrow('Lead SDR nao encontrado');
    });

    test('throw quando GPT-4o retorna JSON invalido', async () => {
      prisma.leadSDR.findUnique.mockResolvedValue({
        id: 1,
        analiseIaCache: null,
        instagram: '@maria',
        nome: 'Maria',
      });

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'This is not JSON at all' } }],
      });

      await expect(
        analisarPrintIncremental(1, '/uploads/sdr-prints/test.jpg')
      ).rejects.toThrow('IA retornou JSON invalido');
    });

    test('parseia JSON mesmo com markdown code fences', async () => {
      prisma.leadSDR.findUnique.mockResolvedValue({
        id: 1,
        analiseIaCache: null,
        instagram: '@maria',
        nome: 'Maria',
      });
      prisma.leadSDR.update.mockResolvedValue({});

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '```json\n' + JSON.stringify(validAnalise) + '\n```' } }],
      });

      const resultado = await analisarPrintIncremental(1, '/uploads/sdr-prints/test.jpg');
      expect(resultado.analiseAtual.confiancaAnalise).toBe(72);
    });
  });

  describe('aplicarSugestoesIA', () => {
    test('aplica campos validos ao lead', async () => {
      prisma.leadSDR.update.mockResolvedValue({ id: 1, dorAparente: 'Falta de comunicacao' });

      const lead = await aplicarSugestoesIA(1, {
        dorAparente: 'Falta de comunicacao',
        temperaturaInicial: 'morno',
      });

      expect(prisma.leadSDR.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          dorAparente: 'Falta de comunicacao',
          temperaturaInicial: 'morno',
        },
      });
    });

    test('ignora campos invalidos (nao do LeadSDR)', async () => {
      prisma.leadSDR.update.mockResolvedValue({ id: 1 });

      await aplicarSugestoesIA(1, {
        dorAparente: 'Teste',
        campoInvalido: 'hack',
        confiancaAnalise: 99,
      });

      expect(prisma.leadSDR.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { dorAparente: 'Teste' },
      });
    });

    test('throw quando nenhum campo valido', async () => {
      await expect(
        aplicarSugestoesIA(1, { campoInvalido: 'hack' })
      ).rejects.toThrow('Nenhum campo valido para aplicar');
    });

    test('ignora campos com valor null', async () => {
      prisma.leadSDR.update.mockResolvedValue({ id: 1 });

      await aplicarSugestoesIA(1, {
        dorAparente: 'Teste',
        temperaturaInicial: null,
      });

      expect(prisma.leadSDR.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { dorAparente: 'Teste' },
      });
    });
  });
});
