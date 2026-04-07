const request = require('supertest');
const { app } = require('../../src/server');
const prisma = require('../../src/config/database');

let token;
let leadSdrId;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@compativeis.com', senha: 'admin123' });

  if (loginRes.status === 200) {
    token = loginRes.body.accessToken;
  } else {
    console.warn('DB not available, skipping integration tests');
  }
});

afterAll(async () => {
  if (leadSdrId) {
    await prisma.printConversaSDR.deleteMany({ where: { leadSdrId } });
    await prisma.leadSDR.delete({ where: { id: leadSdrId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('SDR Routes', () => {
  test('POST /api/sdr/leads — cria lead SDR em F1', async () => {
    if (!token) return;

    const res = await request(app)
      .post('/api/sdr/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Maria Teste',
        instagram: '@mariateste',
        tipoInteracao: 'curtiu',
        mensagemEnviada: 'Oi Maria! Vi que voce curtiu...',
      });

    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Maria Teste');
    expect(res.body.etapa).toBe('f1_abertura');
    leadSdrId = res.body.id;
  });

  test('GET /api/sdr/leads — retorna kanban agrupado', async () => {
    if (!token) return;

    const res = await request(app)
      .get('/api/sdr/leads')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.kanban).toBeDefined();
    expect(res.body.kanban.f1_abertura).toBeDefined();
  });

  test('PATCH /api/sdr/leads/:id — atualiza campos', async () => {
    if (!token || !leadSdrId) return;

    const res = await request(app)
      .patch(`/api/sdr/leads/${leadSdrId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ respostaLead: 'Oi, sim! Estou passando por um momento dificil', temperaturaInicial: 'quente' });

    expect(res.status).toBe(200);
    expect(res.body.respostaLead).toBeTruthy();
  });

  test('PATCH /api/sdr/leads/:id/mover — move F1 para F2', async () => {
    if (!token || !leadSdrId) return;

    const res = await request(app)
      .patch(`/api/sdr/leads/${leadSdrId}/mover`)
      .set('Authorization', `Bearer ${token}`)
      .send({ etapa: 'f2_conexao' });

    expect(res.status).toBe(200);
    expect(res.body.etapa).toBe('f2_conexao');
  });

  test('PATCH /api/sdr/leads/:id/mover — rejeita pulo de fase', async () => {
    if (!token || !leadSdrId) return;

    const res = await request(app)
      .patch(`/api/sdr/leads/${leadSdrId}/mover`)
      .set('Authorization', `Bearer ${token}`)
      .send({ etapa: 'f4_convite' });

    expect(res.status).toBe(400);
  });

  test('GET /api/sdr/metricas/diarias — retorna metricas', async () => {
    if (!token) return;

    const res = await request(app)
      .get('/api/sdr/metricas/diarias')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.abordagensHoje).toBeDefined();
    expect(res.body.conversasAtivas).toBeDefined();
  });

  test('DELETE /api/sdr/leads/:id — move para lixeira', async () => {
    if (!token || !leadSdrId) return;

    const res = await request(app)
      .delete(`/api/sdr/leads/${leadSdrId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
