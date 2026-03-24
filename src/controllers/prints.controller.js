const prisma = require('../config/database');
const { analisarPrintWhatsApp } = require('../services/aiService');
const logger = require('../utils/logger');

async function uploadPrints(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Pelo menos uma imagem e obrigatoria' });
    }

    const { lead_id } = req.body;
    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id e obrigatorio' });
    }

    const leadId = parseInt(lead_id, 10);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead nao encontrado' });
    }

    const vendedorId = req.usuario.vendedorId || lead.vendedorId;
    if (!vendedorId) {
      return res.status(400).json({ error: 'Nenhum vendedor associado' });
    }

    const imagePaths = req.files.map(f => f.path);

    // Buscar historico anterior de prints deste lead para contexto acumulado
    const printsAnteriores = await prisma.interacao.findMany({
      where: { leadId, tipo: 'print_whatsapp' },
      orderBy: { createdAt: 'asc' },
      select: { transcricao: true, resumoIa: true },
    });

    let historicoAnterior = '';
    if (printsAnteriores.length > 0) {
      historicoAnterior = printsAnteriores
        .map(p => p.transcricao || '')
        .filter(Boolean)
        .join('\n\n---\n\n');
    }

    // Analisar com GPT-4 Vision
    const analise = await analisarPrintWhatsApp(imagePaths, historicoAnterior);

    const imageUrls = req.files.map(f => `/uploads/prints/${f.filename}`).join(',');

    const interacao = await prisma.interacao.create({
      data: {
        leadId,
        vendedorId,
        tipo: 'print_whatsapp',
        conteudo: `Print de conversa WhatsApp (${req.files.length} imagem${req.files.length > 1 ? 'ns' : ''})`,
        gravacaoUrl: imageUrls,
        transcricao: analise.conversa_extraida || null,
        resumoIa: analise.resumo || null,
        camposIa: analise,
      },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    logger.info(`Print WhatsApp salvo: Lead #${leadId} — ${req.files.length} imagem(ns)`);

    // Atualizar campos do lead se a IA identificou dados relevantes
    const dadosLead = {};
    if (analise.campos) {
      if (analise.campos.dor_principal && !lead.dorPrincipal) {
        dadosLead.dorPrincipal = analise.campos.dor_principal;
      }
      if (analise.campos.objecao_principal && !lead.objecaoPrincipal) {
        dadosLead.objecaoPrincipal = analise.campos.objecao_principal;
      }
    }

    if (Object.keys(dadosLead).length > 0) {
      await prisma.lead.update({
        where: { id: leadId },
        data: dadosLead,
      });
      logger.info(`Lead #${leadId} atualizado com campos do print: ${Object.keys(dadosLead).join(', ')}`);
    }

    const leadAtualizado = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      },
    });

    res.status(201).json({
      interacao,
      analise,
      lead: leadAtualizado,
      camposAtualizados: Object.keys(dadosLead),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadPrints };
