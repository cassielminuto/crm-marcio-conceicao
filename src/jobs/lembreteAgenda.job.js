const { Queue, Worker } = require('bullmq');
const prisma = require('../config/database');
const redis = require('../config/redis');
const { enviarMensagem } = require('../services/whatsappService');
const logger = require('../utils/logger');

const QUEUE_NAME = 'lembrete-agenda';
const TIPOS_REUNIAO = ['reuniao_sdr_instagram', 'reuniao_sdr_inbound', 'reuniao_manual', 'evento_personalizado'];

const lembreteQueue = new Queue(QUEUE_NAME, { connection: redis });

function criarLembreteWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const agora = new Date();

      // Janela 60min: agora até agora+65min (5min tolerância do cron)
      const limite60 = new Date(agora.getTime() + 65 * 60 * 1000);
      // Janela 30min: agora até agora+35min
      const limite30 = new Date(agora.getTime() + 35 * 60 * 1000);

      // Buscar reuniões que precisam de lembrete de 60min
      const reunioes60 = await prisma.eventoAgenda.findMany({
        where: {
          tipo: { in: TIPOS_REUNIAO },
          deletedAt: null,
          statusReuniao: null,
          lembrete60Enviado: false,
          inicio: { gt: agora, lte: limite60 },
        },
        include: {
          vendedor: { select: { id: true, nomeExibicao: true, telefoneWhatsapp: true } },
        },
        take: 50,
      });

      // Buscar reuniões que precisam de lembrete de 30min
      const reunioes30 = await prisma.eventoAgenda.findMany({
        where: {
          tipo: { in: TIPOS_REUNIAO },
          deletedAt: null,
          statusReuniao: null,
          lembrete30Enviado: false,
          inicio: { gt: agora, lte: limite30 },
        },
        include: {
          vendedor: { select: { id: true, nomeExibicao: true, telefoneWhatsapp: true } },
        },
        take: 50,
      });

      const total = reunioes60.length + reunioes30.length;
      if (total === 0) return;

      logger.info(`Lembrete Agenda: ${reunioes60.length} lembretes 60min, ${reunioes30.length} lembretes 30min`);

      // Enviar lembretes 60min
      for (const evento of reunioes60) {
        try {
          if (evento.vendedor?.telefoneWhatsapp) {
            await enviarMensagem(
              evento.vendedor.telefoneWhatsapp,
              `⏰ Lembrete: ${evento.titulo} em ~1h\n${evento.marcadoEmHorarioOff ? '⚠️ Marcada em horário OFF\n' : ''}Horário: ${evento.inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
            );
          }

          await prisma.eventoAgenda.update({
            where: { id: evento.id },
            data: { lembrete60Enviado: true },
          });

          logger.info(`Lembrete 60min enviado: EventoAgenda #${evento.id} → ${evento.vendedor?.nomeExibicao}`);
        } catch (err) {
          logger.error(`Erro ao enviar lembrete 60min do EventoAgenda #${evento.id}: ${err.message}`);
        }
      }

      // Enviar lembretes 30min
      for (const evento of reunioes30) {
        try {
          if (evento.vendedor?.telefoneWhatsapp) {
            await enviarMensagem(
              evento.vendedor.telefoneWhatsapp,
              `⏰ Lembrete: ${evento.titulo} em ~30min\n${evento.marcadoEmHorarioOff ? '⚠️ Marcada em horário OFF\n' : ''}Horário: ${evento.inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
            );
          }

          await prisma.eventoAgenda.update({
            where: { id: evento.id },
            data: { lembrete30Enviado: true },
          });

          logger.info(`Lembrete 30min enviado: EventoAgenda #${evento.id} → ${evento.vendedor?.nomeExibicao}`);
        } catch (err) {
          logger.error(`Erro ao enviar lembrete 30min do EventoAgenda #${evento.id}: ${err.message}`);
        }
      }
    },
    { connection: redis }
  );

  worker.on('failed', (job, err) => {
    logger.error(`Lembrete Agenda job falhou: ${err.message}`);
  });

  return worker;
}

async function iniciarLembreteAgenda() {
  await lembreteQueue.obliterate({ force: true });

  await lembreteQueue.add(
    'check-lembretes',
    {},
    {
      repeat: { every: 300000 }, // 5 minutos
    }
  );

  const worker = criarLembreteWorker();
  logger.info('Lembrete Agenda iniciado — verificando a cada 5 minutos');
  return worker;
}

module.exports = { iniciarLembreteAgenda, lembreteQueue };
