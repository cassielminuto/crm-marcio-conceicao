const prisma = require('../config/database');
const whatsapp = require('../services/whatsappService');
const logger = require('../utils/logger');

async function status(req, res, next) {
  try {
    const data = await whatsapp.statusConexao();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function qrcode(req, res, next) {
  try {
    const data = await whatsapp.gerarQrCode();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function enviar(req, res, next) {
  try {
    const { lead_id, mensagem, template_id } = req.body;

    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id e obrigatorio' });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: parseInt(lead_id, 10) },
      include: { vendedor: { select: { id: true, nomeExibicao: true } } },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead nao encontrado' });
    }

    let texto;

    if (template_id) {
      const template = await prisma.templateMensagem.findUnique({
        where: { id: parseInt(template_id, 10) },
      });
      if (!template) {
        return res.status(404).json({ error: 'Template nao encontrado' });
      }
      texto = whatsapp.substituirVariaveis(template.conteudo, lead);
    } else if (mensagem) {
      texto = mensagem;
    } else {
      return res.status(400).json({ error: 'mensagem ou template_id e obrigatorio' });
    }

    const resultado = await whatsapp.enviarMensagem(lead.telefone, texto);

    // Registrar interação
    const vendedorId = req.usuario.vendedorId || lead.vendedorId;
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

    logger.info(`WhatsApp enviado para ${lead.nome} (${lead.telefone})`);

    res.json({ enviado: true, telefone: lead.telefone, resultado });
  } catch (err) {
    next(err);
  }
}

module.exports = { status, qrcode, enviar };
