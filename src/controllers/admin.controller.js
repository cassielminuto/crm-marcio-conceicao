const prisma = require('../config/database');

async function listarSla(req, res, next) {
  try {
    const configs = await prisma.slaConfig.findMany({ orderBy: { classeLead: 'asc' } });
    res.json(configs);
  } catch (err) {
    next(err);
  }
}

async function atualizarSla(req, res, next) {
  try {
    const { classe } = req.params;
    const { tempo_maximo_minutos, alerta_amarelo_pct, alerta_vermelho_pct, redistribuir_ao_estourar } = req.body;

    const dados = {};
    if (tempo_maximo_minutos !== undefined) dados.tempoMaximoMinutos = tempo_maximo_minutos;
    if (alerta_amarelo_pct !== undefined) dados.alertaAmareloPct = alerta_amarelo_pct;
    if (alerta_vermelho_pct !== undefined) dados.alertaVermelhoPct = alerta_vermelho_pct;
    if (redistribuir_ao_estourar !== undefined) dados.redistribuirAoEstourar = redistribuir_ao_estourar;

    const config = await prisma.slaConfig.update({
      where: { classeLead: classe },
      data: dados,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        usuarioId: req.usuario.id,
        acao: 'UPDATE',
        entidade: 'sla_config',
        entidadeId: config.id,
        dadosNovos: dados,
        ip: req.ip,
      },
    });

    res.json(config);
  } catch (err) {
    next(err);
  }
}

module.exports = { listarSla, atualizarSla };
