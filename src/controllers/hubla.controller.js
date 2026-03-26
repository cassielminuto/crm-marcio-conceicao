const prisma = require('../config/database');
const logger = require('../utils/logger');

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
  // Extrair dados do cliente dependendo do formato
  // Formato v2: { type: "invoice.paid", event: { invoice: {...}, customer: {...} } }
  // Formato v1 ou variações: os dados podem estar em níveis diferentes

  let cliente = null;
  let valor = 0;
  let produto = '';
  let faturaId = '';
  let dataPagamento = null;

  if (dados.event?.customer) {
    // Formato v2
    cliente = dados.event.customer;
    valor = parseFloat(dados.event.invoice?.amount || dados.event.invoice?.totalAmount || 0);
    produto = dados.event.invoice?.product?.name || dados.event.invoice?.items?.[0]?.product?.name || '';
    faturaId = dados.event.invoice?.id || '';
    dataPagamento = dados.event.invoice?.paidAt || dados.event.invoice?.createdAt || null;
  } else if (dados.customer) {
    // Formato direto
    cliente = dados.customer;
    valor = parseFloat(dados.invoice?.amount || dados.amount || 0);
    produto = dados.invoice?.product?.name || dados.product?.name || '';
    faturaId = dados.invoice?.id || dados.id || '';
    dataPagamento = dados.invoice?.paidAt || dados.paidAt || null;
  } else if (dados.event?.invoice) {
    // Outro formato possível
    const inv = dados.event.invoice;
    cliente = {
      name: inv.customerName || inv.customer?.name || '',
      email: inv.customerEmail || inv.customer?.email || '',
      phone: inv.customerPhone || inv.customer?.phone || '',
    };
    valor = parseFloat(inv.amount || inv.totalAmount || 0);
    produto = inv.productName || inv.product?.name || '';
    faturaId = inv.id || '';
    dataPagamento = inv.paidAt || null;
  }

  if (!cliente) {
    logger.warn('Hubla webhook: cliente nao encontrado no payload');
    // Salvar payload raw para debug
    await prisma.lead.create({
      data: {
        nome: 'Hubla Debug - ' + tipo,
        telefone: '0000000000',
        canal: 'bio',
        pontuacao: 0,
        classe: 'C',
        etapaFunil: 'novo',
        status: 'aguardando',
        formularioTitulo: 'Hubla Debug',
        dadosRespondi: dados,
      },
    }).catch(() => {});
    return;
  }

  const nome = cliente.name || cliente.fullName || cliente.nome || 'Cliente Hubla';
  const email = cliente.email || null;
  let telefone = cliente.phone || cliente.telefone || cliente.phoneNumber || '';

  // Limpar telefone
  telefone = telefone.replace(/[^\d]/g, '');
  if (telefone && !telefone.startsWith('55') && telefone.length >= 10) {
    telefone = '55' + telefone;
  }

  if (!telefone || telefone.length < 10) {
    logger.warn(`Hubla webhook: telefone invalido para ${nome}`);
    return;
  }

  // Verificar se é evento de pagamento
  const isPagamento = tipo.includes('paid') || tipo.includes('payment') || tipo.includes('approved') || tipo.includes('confirmed');

  // Buscar lead existente por telefone
  const leadExistente = await prisma.lead.findFirst({ where: { telefone } });

  if (leadExistente) {
    // Atualizar lead existente
    const dadosUpdate = {
      dadosRespondi: {
        ...(leadExistente.dadosRespondi || {}),
        hubla: { tipo, faturaId, valor, produto, dataPagamento, raw: dados },
      },
    };

    if (isPagamento && valor > 0) {
      dadosUpdate.vendaRealizada = true;
      dadosUpdate.etapaFunil = 'fechado_ganho';
      dadosUpdate.status = 'convertido';
      dadosUpdate.dataConversao = dataPagamento ? new Date(dataPagamento) : new Date();

      // Atualizar valor se maior que o existente
      const valorExistente = leadExistente.valorVenda ? Number(leadExistente.valorVenda) : 0;
      if (valor > valorExistente) {
        dadosUpdate.valorVenda = valor;
      }
    }

    if (email && !leadExistente.email) {
      dadosUpdate.email = email;
    }

    await prisma.lead.update({ where: { id: leadExistente.id }, data: dadosUpdate });
    logger.info(`Hubla: Lead #${leadExistente.id} (${nome}) atualizado — ${tipo} — R$ ${valor}`);

    // Notificar vendedor se é pagamento
    if (isPagamento && valor > 0 && leadExistente.vendedorId) {
      try {
        const vendedor = await prisma.vendedor.findUnique({
          where: { id: leadExistente.vendedorId },
          select: { telefoneWhatsapp: true, nomeExibicao: true, usuarioId: true },
        });

        if (vendedor) {
          // Criar notificação no banco
          try {
            const { criarNotificacao } = require('../services/notificacaoService');
            await criarNotificacao({
              usuarioId: vendedor.usuarioId,
              tipo: 'venda_confirmada',
              titulo: `Venda confirmada: ${nome}`,
              mensagem: `R$ ${valor.toLocaleString('pt-BR')} — ${produto || 'Produto Hubla'}`,
              dados: { leadId: leadExistente.id, valor, produto },
            });
          } catch (e) {}

          // Enviar WhatsApp
          if (vendedor.telefoneWhatsapp) {
            try {
              const { enviarMensagem } = require('../services/whatsappService');
              await enviarMensagem(vendedor.telefoneWhatsapp,
                `*VENDA CONFIRMADA!*\n\n*${nome}*\nValor: R$ ${valor.toLocaleString('pt-BR')}\nProduto: ${produto || 'Hubla'}\n\nParabens!`
              );
            } catch (e) {}
          }
        }
      } catch (e) {
        logger.error(`Erro ao notificar vendedor: ${e.message}`);
      }
    }

  } else {
    // Criar novo lead
    const novoLead = await prisma.lead.create({
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
        formularioTitulo: 'Hubla Webhook',
        dataPreenchimento: new Date(),
        dataAtribuicao: new Date(),
        dataConversao: isPagamento ? new Date() : null,
        dadosRespondi: { hubla: { tipo, faturaId, valor, produto, dataPagamento, raw: dados } },
      },
    });

    logger.info(`Hubla: Novo lead #${novoLead.id} (${nome}) criado — ${tipo} — R$ ${valor}`);
  }
}

module.exports = { receberWebhookHubla };
