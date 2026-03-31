const prisma = require('../config/database');
const logger = require('../utils/logger');
const { obterProximoVendedor } = require('../services/distribuicaoLeads');

async function receberWebhookHubla(req, res, next) {
  try {
    const dados = req.body;
    const tipo = dados.type || dados.event || '';

    logger.info(`Hubla webhook recebido: ${tipo} — ${JSON.stringify(dados).slice(0, 300)}`);

    // Responder 200 imediatamente (Hubla recomenda resposta rápida)
    res.json({ ok: true });

    // Processar em background
    setImmediate(async () => {
      try {
        await processarEventoHubla(dados, tipo, req);
      } catch (err) {
        logger.error(`Erro ao processar webhook Hubla: ${err.message}`);
      }
    });
  } catch (err) {
    // Sempre retornar 200 para não re-enviar
    res.json({ ok: true });
    logger.error(`Erro webhook Hubla: ${err.message}`);
  }
}

async function processarEventoHubla(dados, tipo, req) {
  const event = dados.event || {};
  const invoice = event.invoice || {};
  const payer = invoice.payer || event.user || {};
  const product = event.product || {};

  // Extrair nome
  const nome = [payer.firstName, payer.lastName].filter(Boolean).join(' ').trim() || 'Cliente Hubla';

  // Extrair email
  const email = payer.email || event.user?.email || null;

  // Extrair telefone
  let telefone = payer.phone || event.user?.phone || '';
  telefone = telefone.replace(/[^\d]/g, '');
  if (telefone && !telefone.startsWith('55') && telefone.length >= 10) {
    telefone = '55' + telefone;
  }

  if (!telefone || telefone.length < 10) {
    logger.warn('Hubla webhook: telefone invalido - ' + nome);
    return;
  }

  // Extrair valor (vem em centavos!)
  const subtotalCents = invoice.amount?.subtotalCents || 0;
  const valor = subtotalCents / 100;

  // Extrair produto
  const produto = product.name || '';

  // Extrair ID da fatura
  const faturaId = invoice.id || '';

  // Data de pagamento
  const dataPagamento = invoice.saleDate || invoice.createdAt || null;

  // Verificar se é pagamento
  const isPagamento = tipo.includes('payment_succeeded') || tipo.includes('paid') || invoice.status === 'paid';

  logger.info('Hubla processando: ' + nome + ' | Tel: ' + telefone + ' | R$ ' + valor + ' | Tipo: ' + tipo);

  // Buscar lead existente por telefone (tentar match exato, depois últimos 8-11 dígitos)
  let leadExistente = await prisma.lead.findFirst({ where: { telefone } });
  if (!leadExistente && telefone.length >= 11) {
    // Tentar sem DDI (últimos 10-11 dígitos)
    const telSemDDI = telefone.startsWith('55') ? telefone.slice(2) : telefone;
    leadExistente = await prisma.lead.findFirst({ where: { telefone: telSemDDI } });
    if (!leadExistente) {
      // Busca parcial pelos últimos 8 dígitos
      const ultimos8 = telefone.slice(-8);
      leadExistente = await prisma.lead.findFirst({
        where: { telefone: { endsWith: ultimos8 } },
      });
    }
    // Também tentar com DDI caso banco tenha sem
    if (!leadExistente && !telefone.startsWith('55')) {
      leadExistente = await prisma.lead.findFirst({ where: { telefone: '55' + telefone } });
    }
  }

  if (leadExistente) {
    const dadosUpdate = {};

    if (isPagamento && valor > 0) {
      dadosUpdate.vendaRealizada = true;
      dadosUpdate.etapaFunil = 'fechado_ganho';
      dadosUpdate.status = 'convertido';
      dadosUpdate.dataConversao = dataPagamento ? new Date(dataPagamento) : new Date();

      const valorExistente = leadExistente.valorVenda ? Number(leadExistente.valorVenda) : 0;
      if (valor > valorExistente) {
        dadosUpdate.valorVenda = valor;
      }
    }

    if (email && !leadExistente.email) {
      dadosUpdate.email = email;
    }

    if (Object.keys(dadosUpdate).length > 0) {
      await prisma.lead.update({ where: { id: leadExistente.id }, data: dadosUpdate });
      logger.info('Hubla: Lead #' + leadExistente.id + ' (' + nome + ') atualizado - R$ ' + valor);
    }

    // Notificar vendedor
    if (isPagamento && valor > 0 && leadExistente.vendedorId) {
      try {
        const vendedor = await prisma.vendedor.findUnique({
          where: { id: leadExistente.vendedorId },
          select: { telefoneWhatsapp: true, nomeExibicao: true, usuarioId: true },
        });
        if (vendedor) {
          try {
            const { criarNotificacao } = require('../services/notificacaoService');
            await criarNotificacao({
              usuarioId: vendedor.usuarioId,
              tipo: 'venda_confirmada',
              titulo: 'Venda confirmada: ' + nome,
              mensagem: 'R$ ' + valor.toLocaleString('pt-BR') + ' - ' + (produto || 'Hubla'),
              dados: { leadId: leadExistente.id, valor, produto },
            });
          } catch (e) {}
          if (vendedor.telefoneWhatsapp) {
            try {
              const { enviarMensagem } = require('../services/whatsappService');
              await enviarMensagem(vendedor.telefoneWhatsapp,
                '*VENDA CONFIRMADA!*\n\n*' + nome + '*\nValor: R$ ' + valor.toLocaleString('pt-BR') + '\nProduto: ' + (produto || 'Hubla') + '\n\nParabens!'
              );
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

  } else {
    // Criar novo lead (distribuicao round-robin)
    const vendedorIdHubla = await obterProximoVendedor();
    await prisma.lead.create({
      data: {
        nome,
        telefone,
        email,
        canal: 'bio',
        pontuacao: isPagamento ? 100 : 50,
        classe: isPagamento ? 'A' : 'B',
        etapaFunil: isPagamento ? 'fechado_ganho' : 'novo',
        status: isPagamento ? 'convertido' : 'aguardando',
        vendaRealizada: isPagamento && valor > 0,
        valorVenda: valor > 0 ? valor : null,
        vendedorId: vendedorIdHubla,
        formularioTitulo: 'Hubla Webhook',
        dataPreenchimento: new Date(),
        dataAtribuicao: new Date(),
        dataConversao: isPagamento ? new Date() : null,
        dadosRespondi: { hubla: { tipo, faturaId, valor, produto } },
      },
    });
    logger.info('Hubla: Novo lead criado - ' + nome + ' - R$ ' + valor);
  }
}

module.exports = { receberWebhookHubla };
