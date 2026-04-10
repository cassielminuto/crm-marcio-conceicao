const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Calcula início e fim de um período "YYYY-MM" em UTC-3 (Brasília).
 */
function limitesPeriodo(periodo) {
  const [year, month] = periodo.split('-').map(Number);
  const inicio = new Date(Date.UTC(year, month - 1, 1, 3, 0, 0)); // 00:00 BRT = 03:00 UTC
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const fim = new Date(Date.UTC(nextYear, nextMonth - 1, 1, 3, 0, 0));
  return { inicio, fim };
}

/**
 * Calcula valorAtual e leadsAtual para todas as metas de um período
 * usando groupBy (evita N+1).
 */
async function calcularRealizadoPeriodo(periodo) {
  const { inicio, fim } = limitesPeriodo(periodo);

  // Soma de valorVenda por vendedor no período
  const vendas = await prisma.lead.groupBy({
    by: ['vendedorId'],
    where: {
      vendaRealizada: true,
      dataConversao: { gte: inicio, lt: fim },
      vendedorId: { not: null },
    },
    _sum: { valorVenda: true },
    _count: { id: true },
  });

  const map = {};
  for (const v of vendas) {
    map[v.vendedorId] = {
      valorAtual: Number(v._sum.valorVenda || 0),
      leadsAtual: v._count.id,
    };
  }
  return map;
}

async function listar(req, res, next) {
  try {
    const { periodo } = req.query;
    const where = {};
    if (periodo) where.periodo = periodo;

    const metas = await prisma.meta.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendedor: {
          select: { id: true, nomeExibicao: true, papel: true, usuario: { select: { fotoUrl: true } } },
        },
      },
    });

    // Calcular realizado automaticamente se temos período
    if (periodo && metas.length > 0) {
      const realizadoMap = await calcularRealizadoPeriodo(periodo);
      const agora = new Date();
      const { fim } = limitesPeriodo(periodo);
      const periodoPassou = agora >= fim;

      const updates = [];
      for (const meta of metas) {
        const real = realizadoMap[meta.vendedorId] || { valorAtual: 0, leadsAtual: 0 };
        meta.valorAtual = real.valorAtual;
        meta.leadsAtual = real.leadsAtual;
        meta.percentual = Number(meta.valorMeta) > 0
          ? Math.round((real.valorAtual / Number(meta.valorMeta)) * 10000) / 100
          : 0;

        // Status automático
        if (meta.percentual >= 100) {
          meta.status = 'atingida';
        } else if (periodoPassou) {
          meta.status = 'nao_atingida';
        } else {
          meta.status = 'em_andamento';
        }

        updates.push(
          prisma.meta.update({
            where: { id: meta.id },
            data: {
              valorAtual: real.valorAtual,
              leadsAtual: real.leadsAtual,
              percentual: meta.percentual,
              status: meta.status,
            },
          })
        );
      }

      // Persist em background (não bloqueia resposta)
      Promise.all(updates).catch(err => {
        logger.warn(`Falha ao persistir cálculo de metas: ${err.message}`);
      });
    }

    res.json(metas);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { vendedor_id, periodo, valor_meta, leads_meta } = req.body;

    const meta = await prisma.meta.create({
      data: {
        vendedorId: vendedor_id,
        periodo,
        valorMeta: valor_meta,
        leadsMeta: leads_meta || null,
      },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      },
    });

    res.status(201).json(meta);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { valor_meta, valor_atual, leads_meta, leads_atual, status } = req.body;

    const dados = {};
    if (valor_meta !== undefined) dados.valorMeta = valor_meta;
    if (valor_atual !== undefined) dados.valorAtual = valor_atual;
    if (leads_meta !== undefined) dados.leadsMeta = leads_meta;
    if (leads_atual !== undefined) dados.leadsAtual = leads_atual;
    if (status !== undefined) dados.status = status;

    // Recalcular percentual
    if (dados.valorAtual !== undefined || dados.valorMeta !== undefined) {
      const meta = await prisma.meta.findUnique({ where: { id: parseInt(id, 10) } });
      const novoAtual = dados.valorAtual ?? Number(meta.valorAtual);
      const novaMeta = dados.valorMeta ?? Number(meta.valorMeta);
      dados.percentual = novaMeta > 0 ? Math.round((novoAtual / novaMeta) * 10000) / 100 : 0;
    }

    const meta = await prisma.meta.update({
      where: { id: parseInt(id, 10) },
      data: dados,
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      },
    });

    res.json(meta);
  } catch (err) {
    next(err);
  }
}

// ── Meta Empresa ──

async function listarEmpresa(req, res, next) {
  try {
    const { periodo } = req.query;
    if (!periodo) return res.status(400).json({ error: 'Parâmetro periodo é obrigatório' });

    const metaEmpresa = await prisma.metaEmpresa.findUnique({
      where: { periodo },
    });

    if (!metaEmpresa) {
      return res.json({ metaEmpresa: null, realizadoEmpresa: 0, percentualEmpresa: 0, gapDistribuicao: 0, somaDistribuida: 0 });
    }

    // Buscar metas individuais do período
    const metasIndividuais = await prisma.meta.findMany({
      where: { periodo },
      select: { valorMeta: true, valorAtual: true },
    });

    // Calcular realizado via query (mesmo groupBy)
    const realizadoMap = await calcularRealizadoPeriodo(periodo);
    const realizadoEmpresa = Object.values(realizadoMap).reduce((sum, v) => sum + v.valorAtual, 0);

    const somaDistribuida = metasIndividuais.reduce((sum, m) => sum + Number(m.valorMeta), 0);
    const valorMetaEmpresa = Number(metaEmpresa.valorMeta);
    const gapDistribuicao = Math.max(0, valorMetaEmpresa - somaDistribuida);
    const percentualEmpresa = valorMetaEmpresa > 0
      ? Math.round((realizadoEmpresa / valorMetaEmpresa) * 10000) / 100
      : 0;

    res.json({
      metaEmpresa,
      realizadoEmpresa,
      percentualEmpresa,
      gapDistribuicao,
      somaDistribuida,
    });
  } catch (err) {
    next(err);
  }
}

async function criarEmpresa(req, res, next) {
  try {
    const { periodo, valor_meta, leads_meta, observacao } = req.body;

    const metaEmpresa = await prisma.metaEmpresa.upsert({
      where: { periodo },
      create: {
        periodo,
        valorMeta: valor_meta,
        leadsMeta: leads_meta || null,
        observacao: observacao || null,
        criadoPor: req.usuario.id,
      },
      update: {
        valorMeta: valor_meta,
        leadsMeta: leads_meta !== undefined ? leads_meta : undefined,
        observacao: observacao !== undefined ? observacao : undefined,
      },
    });

    logger.info(`Meta empresa ${periodo}: R$ ${valor_meta} por usuário #${req.usuario.id}`);
    res.status(201).json(metaEmpresa);
  } catch (err) {
    next(err);
  }
}

async function distribuir(req, res, next) {
  try {
    const { periodo, distribuicao } = req.body;

    // Validar meta empresa existe
    const metaEmpresa = await prisma.metaEmpresa.findUnique({ where: { periodo } });
    if (!metaEmpresa) {
      return res.status(400).json({ error: 'Meta empresa não definida para este período. Defina primeiro.' });
    }

    // Validar soma <= meta empresa
    const somaDistribuicao = distribuicao.reduce((sum, d) => sum + d.valorMeta, 0);
    if (somaDistribuicao > Number(metaEmpresa.valorMeta)) {
      return res.status(400).json({
        error: `Soma distribuída (R$ ${somaDistribuicao.toFixed(2)}) excede meta empresa (R$ ${Number(metaEmpresa.valorMeta).toFixed(2)})`,
      });
    }

    // Upsert metas individuais em transaction
    const ops = distribuicao.map(d =>
      prisma.meta.upsert({
        where: {
          // Precisa de unique constraint vendedorId+periodo — usar findFirst + create/update
          id: 0, // placeholder, vamos usar raw approach
        },
        create: {
          vendedorId: d.vendedorId,
          periodo,
          valorMeta: d.valorMeta,
          leadsMeta: d.leadsMeta || null,
        },
        update: {
          valorMeta: d.valorMeta,
          leadsMeta: d.leadsMeta !== undefined ? d.leadsMeta : undefined,
        },
      })
    );

    // Como não tem unique constraint em vendedorId+periodo, usar findFirst + create/update
    const resultados = [];
    await prisma.$transaction(async (tx) => {
      for (const d of distribuicao) {
        if (!d.vendedorId || !d.valorMeta) continue;

        const existente = await tx.meta.findFirst({
          where: { vendedorId: d.vendedorId, periodo },
        });

        if (existente) {
          const updated = await tx.meta.update({
            where: { id: existente.id },
            data: { valorMeta: d.valorMeta, leadsMeta: d.leadsMeta || null },
            include: { vendedor: { select: { id: true, nomeExibicao: true, papel: true } } },
          });
          resultados.push(updated);
        } else {
          const created = await tx.meta.create({
            data: {
              vendedorId: d.vendedorId,
              periodo,
              valorMeta: d.valorMeta,
              leadsMeta: d.leadsMeta || null,
            },
            include: { vendedor: { select: { id: true, nomeExibicao: true, papel: true } } },
          });
          resultados.push(created);
        }
      }
    });

    logger.info(`Metas distribuídas período ${periodo}: ${distribuicao.length} vendedores, soma R$ ${somaDistribuicao.toFixed(2)}`);
    res.status(201).json({ metas: resultados });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, criar, atualizar, listarEmpresa, criarEmpresa, distribuir };
