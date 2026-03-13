const { Queue, Worker } = require('bullmq');
const prisma = require('../config/database');
const redis = require('../config/redis');
const whatsapp = require('../services/whatsappService');
const logger = require('../utils/logger');

const WA_QUEUE = 'whatsapp-dispatcher';

const waQueue = new Queue(WA_QUEUE, { connection: redis });

function criarWhatsappWorker() {
  const worker = new Worker(
    WA_QUEUE,
    async () => {
      const agora = new Date();

      // Buscar follow-ups pendentes com data_programada <= agora
      const followUps = await prisma.followUp.findMany({
        where: {
          status: 'pendente',
          tipo: 'whatsapp',
          dataProgramada: { lte: agora },
        },
        include: {
          lead: {
            include: {
              vendedor: { select: { id: true, nomeExibicao: true } },
            },
          },
          template: true,
        },
        take: 20, // processar em lotes
      });

      if (followUps.length === 0) return;

      logger.info(`WhatsApp Dispatcher: ${followUps.length} follow-ups para enviar`);

      for (const fu of followUps) {
        try {
          const lead = fu.lead;
          if (!lead || !lead.telefone) {
            logger.warn(`Follow-up #${fu.id}: lead sem telefone, pulando`);
            continue;
          }

          // Determinar texto da mensagem
          let texto;
          if (fu.template) {
            texto = whatsapp.substituirVariaveis(fu.template.conteudo, lead);
          } else if (fu.mensagemEnviada) {
            texto = fu.mensagemEnviada;
          } else {
            texto = `Ola ${lead.nome}! Aqui e da equipe do Programa Compativeis. Gostariamos de retomar nossa conversa. Podemos falar?`;
          }

          // Enviar via Evolution API
          await whatsapp.enviarMensagem(lead.telefone, texto);

          // Atualizar follow-up como executado
          await prisma.followUp.update({
            where: { id: fu.id },
            data: {
              status: 'executado',
              dataExecutada: agora,
              mensagemEnviada: texto,
            },
          });

          // Registrar interação
          const vendedorId = fu.vendedorId || lead.vendedorId;
          if (vendedorId) {
            await prisma.interacao.create({
              data: {
                leadId: lead.id,
                vendedorId,
                tipo: 'whatsapp_enviado',
                conteudo: texto,
              },
            });
          }

          logger.info(`WhatsApp enviado: Follow-up #${fu.id} → ${lead.nome} (${lead.telefone})`);
        } catch (err) {
          logger.error(`Erro ao enviar follow-up #${fu.id}: ${err.message}`);
          // Não marcar como executado — será tentado novamente no próximo ciclo
        }
      }
    },
    { connection: redis }
  );

  worker.on('failed', (job, err) => {
    logger.error(`WhatsApp Dispatcher job falhou: ${err.message}`);
  });

  return worker;
}

async function iniciarWhatsappDispatcher() {
  await waQueue.obliterate({ force: true });

  await waQueue.add(
    'dispatch-whatsapp',
    {},
    {
      repeat: { every: 60000 }, // 1 minuto
    }
  );

  const worker = criarWhatsappWorker();
  logger.info('WhatsApp Dispatcher iniciado — verificando a cada 1 minuto');
  return worker;
}

module.exports = { iniciarWhatsappDispatcher, waQueue };
