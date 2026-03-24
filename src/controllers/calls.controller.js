const path = require('path');
const prisma = require('../config/database');
const { processarCall, gerarResumoEProximaAcao } = require('../services/aiService');
const logger = require('../utils/logger');

async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de audio e obrigatorio' });
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

    const caminhoAudio = req.file.path;
    const duracao = parseInt(req.body.duracao || '0', 10);

    // Salvar interação com o caminho do áudio (sem transcrever ainda)
    const interacao = await prisma.interacao.create({
      data: {
        leadId,
        vendedorId,
        tipo: 'call',
        conteudo: `Call gravada — ${Math.round(duracao / 60)}min`,
        gravacaoUrl: caminhoAudio,
        duracao,
      },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    logger.info(`Audio salvo: ${caminhoAudio} — Lead #${leadId}`);

    res.status(201).json({
      interacaoId: interacao.id,
      caminhoAudio,
      duracao,
      mensagem: 'Audio salvo. Use POST /api/calls/transcribe para transcrever.',
    });
  } catch (err) {
    next(err);
  }
}

async function transcribe(req, res, next) {
  try {
    const { lead_id, interacao_id } = req.body;

    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id e obrigatorio' });
    }

    const leadId = parseInt(lead_id, 10);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead nao encontrado' });
    }

    const vendedorId = req.usuario.vendedorId || lead.vendedorId;

    // Se tiver interacao_id, buscar o áudio da interação existente
    let caminhoAudio;
    let duracao = 0;

    if (interacao_id) {
      const interacao = await prisma.interacao.findUnique({
        where: { id: parseInt(interacao_id, 10) },
      });
      if (!interacao || !interacao.gravacaoUrl) {
        return res.status(404).json({ error: 'Interacao ou gravacao nao encontrada' });
      }
      caminhoAudio = interacao.gravacaoUrl;
      duracao = interacao.duracao || 0;

      // Processar e atualizar a interação existente
      const resultado = await processarCall({ leadId, vendedorId, caminhoAudio, duracao });

      // Atualizar a interação existente com transcrição e resumo
      await prisma.interacao.update({
        where: { id: interacao.id },
        data: {
          transcricao: resultado.transcricao,
          resumoIa: resultado.analise.resumo || null,
          camposIa: resultado.analise,
        },
      });

      // Buscar lead atualizado
      const leadAtualizado = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
        },
      });

      res.json({
        transcricao: resultado.transcricao,
        analise: resultado.analise,
        camposAtualizados: resultado.camposAtualizados,
        lead: leadAtualizado,
        interacao: resultado.interacao,
      });
    } else {
      // Upload direto via req.file
      if (!req.file) {
        return res.status(400).json({ error: 'Arquivo de audio ou interacao_id e obrigatorio' });
      }

      caminhoAudio = req.file.path;
      duracao = parseInt(req.body.duracao || '0', 10);

      const resultado = await processarCall({ leadId, vendedorId, caminhoAudio, duracao });

      const leadAtualizado = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
        },
      });

      res.json({
        transcricao: resultado.transcricao,
        analise: resultado.analise,
        camposAtualizados: resultado.camposAtualizados,
        lead: leadAtualizado,
        interacao: resultado.interacao,
      });
    }

    // Gerar resumo e proxima acao em background
    const leadIdForSummary = leadId;
    setImmediate(async () => {
      try {
        await gerarResumoEProximaAcao(leadIdForSummary);
      } catch (err) {
        logger.error(`Erro ao gerar resumo para lead #${leadIdForSummary}: ${err.message}`);
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getTranscricao(req, res, next) {
  try {
    const { interacao_id } = req.params;

    const interacao = await prisma.interacao.findUnique({
      where: { id: parseInt(interacao_id, 10) },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    if (!interacao) {
      return res.status(404).json({ error: 'Interacao nao encontrada' });
    }

    res.json({
      transcricao: interacao.transcricao,
      resumoIa: interacao.resumoIa,
      camposIa: interacao.camposIa,
      duracao: interacao.duracao,
      vendedor: interacao.vendedor,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, transcribe, getTranscricao };
