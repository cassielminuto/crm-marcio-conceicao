const { Queue, Worker } = require('bullmq');
const prisma = require('../config/database');
const redis = require('../config/redis');
const { distribuir, incrementarLeadsAtivos } = require('../services/distribuidor');
const { criarNotificacao } = require('../services/notificacaoService');
const logger = require('../utils/logger');

const SLA_QUEUE = 'sla-checker';

const slaQueue = new Queue(SLA_QUEUE, { connection: redis });

function criarSlaWorker(io) {
  const worker = new Worker(
    SLA_QUEUE,
    async () => {
      logger.debug('SLA Checker: verificando leads com SLA estourado...');

      // Buscar configs de SLA
      const slaConfigs = await prisma.slaConfig.findMany({
        where: { redistribuirAoEstourar: true },
      });

      for (const sla of slaConfigs) {
        const limiteMinutos = sla.tempoMaximoMinutos;
        const limite = new Date(Date.now() - limiteMinutos * 60 * 1000);

        // Leads que foram atribuídos mas não abordados dentro do SLA
        const leadsEstourados = await prisma.lead.findMany({
          where: {
            classe: sla.classeLead,
            dataAtribuicao: { not: null, lte: limite },
            dataAbordagem: null,
            vendedorId: { not: null },
            etapaFunil: 'novo',
            status: 'aguardando',
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          include: {
            vendedor: { select: { id: true, nomeExibicao: true } },
          },
        });

        for (const lead of leadsEstourados) {
          logger.warn(
            `SLA ESTOURADO: Lead #${lead.id} (${lead.nome}) — Classe ${lead.classe} — Atribuído a ${lead.vendedor?.nomeExibicao} há mais de ${limiteMinutos}min`
          );

          // Redistribuir para o próximo closer disponível
          const novoVendedor = await distribuir(lead.classe);

          if (novoVendedor && novoVendedor.id !== lead.vendedorId) {
            // Decrementar do vendedor anterior
            await prisma.vendedor.update({
              where: { id: lead.vendedorId },
              data: { leadsAtivos: { decrement: 1 } },
            });

            // Atribuir ao novo vendedor
            await prisma.lead.update({
              where: { id: lead.id },
              data: {
                vendedorId: novoVendedor.id,
                dataAtribuicao: new Date(),
              },
            });

            await incrementarLeadsAtivos(novoVendedor.id);

            // Registrar no audit log
            await prisma.auditLog.create({
              data: {
                acao: 'SLA_EXCEEDED',
                entidade: 'leads',
                entidadeId: lead.id,
                dadosAnteriores: { vendedorId: lead.vendedorId },
                dadosNovos: { vendedorId: novoVendedor.id },
              },
            });

            // Registrar no funil histórico
            await prisma.funilHistorico.create({
              data: {
                leadId: lead.id,
                etapaAnterior: 'novo',
                etapaNova: 'novo',
                vendedorId: novoVendedor.id,
                motivo: `SLA Classe ${lead.classe} estourado (${limiteMinutos}min) — redistribuído de ${lead.vendedor?.nomeExibicao} para ${novoVendedor.nomeExibicao}`,
              },
            });

            logger.info(
              `SLA Redistribuição: Lead #${lead.id} — ${lead.vendedor?.nomeExibicao} → ${novoVendedor.nomeExibicao}`
            );

            // Emitir alerta via WebSocket
            if (io) {
              io.emit('sla_alerta', {
                tipo: 'redistribuicao',
                leadId: lead.id,
                leadNome: lead.nome,
                classe: lead.classe,
                vendedorAnterior: lead.vendedor?.nomeExibicao,
                vendedorNovo: novoVendedor.nomeExibicao,
                tempoMinutos: limiteMinutos,
              });
            }

            // Notificar novo vendedor
            const novoVendedorData = await prisma.vendedor.findUnique({
              where: { id: novoVendedor.id },
              select: { usuarioId: true },
            });
            if (novoVendedorData) {
              await criarNotificacao({
                usuarioId: novoVendedorData.usuarioId,
                tipo: 'sla_alerta',
                titulo: `Lead redistribuido: ${lead.nome}`,
                mensagem: `SLA Classe ${lead.classe} estourado (${limiteMinutos}min). Lead transferido de ${lead.vendedor?.nomeExibicao}.`,
                dados: { leadId: lead.id, classe: lead.classe },
              });
            }
          } else {
            // Emitir alerta de SLA estourado sem redistribuição
            if (io) {
              io.emit('sla_alerta', {
                tipo: 'estouro',
                leadId: lead.id,
                leadNome: lead.nome,
                classe: lead.classe,
                vendedorAtual: lead.vendedor?.nomeExibicao,
                tempoMinutos: limiteMinutos,
              });
            }
          }
        }
      }
    },
    { connection: redis }
  );

  worker.on('failed', (job, err) => {
    logger.error(`SLA Checker job falhou: ${err.message}`);
  });

  return worker;
}

async function iniciarSlaChecker(io) {
  // Limpar jobs antigos e agendar job repetitivo a cada 1 minuto
  await slaQueue.obliterate({ force: true });

  await slaQueue.add(
    'check-sla',
    {},
    {
      repeat: { every: 60000 }, // 1 minuto
    }
  );

  const worker = criarSlaWorker(io);
  logger.info('SLA Checker iniciado — verificando a cada 1 minuto');
  return worker;
}

module.exports = { iniciarSlaChecker, slaQueue };
