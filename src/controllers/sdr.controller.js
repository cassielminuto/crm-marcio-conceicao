const prisma = require('../config/database');
const { validarMovimentacao, executarHandoff, ETAPAS_SDR } = require('../services/sdrService');
const { analisarPrintWhatsApp } = require('../services/aiService');
const logger = require('../utils/logger');

async function listarKanban(req, res, next) {
  try {
    const isAdminGestor = req.usuario.perfil === 'admin' || req.usuario.perfil === 'gestor';
    const where = { deletedAt: null };
    if (!isAdminGestor) {
      where.operadorId = req.usuario.vendedorId;
    }

    const leads = await prisma.leadSDR.findMany({
      where,
      orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }],
      include: {
        closerDestino: { select: { id: true, nomeExibicao: true } },
        prints: { orderBy: { ordem: 'asc' }, select: { id: true, imagemUrl: true, ordem: true } },
      },
    });

    // Agrupar por etapa
    const kanban = {};
    for (const etapa of ETAPAS_SDR) {
      kanban[etapa] = [];
    }
    for (const lead of leads) {
      if (kanban[lead.etapa] !== undefined) {
        kanban[lead.etapa].push(lead);
      } else {
        // Etapa desconhecida — colocar em f1_abertura por segurança
        kanban['f1_abertura'].push(lead);
      }
    }

    res.json({ kanban });
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const operadorId = req.usuario.vendedorId;
    const { nome, instagram, tipoInteracao, mensagemEnviada } = req.body;

    const lead = await prisma.leadSDR.create({
      data: {
        nome,
        instagram,
        tipoInteracao,
        mensagemEnviada: mensagemEnviada || null,
        etapa: 'f1_abertura',
        operadorId,
      },
    });

    logger.info(`LeadSDR criado: #${lead.id} (@${lead.instagram}) por operador #${operadorId}`);
    res.status(201).json({ lead });
  } catch (err) {
    next(err);
  }
}

async function detalhe(req, res, next) {
  try {
    const { id } = req.params;

    const lead = await prisma.leadSDR.findUnique({
      where: { id: Number(id) },
      include: {
        closerDestino: { select: { id: true, nomeExibicao: true } },
        prints: { orderBy: { ordem: 'asc' } },
        leadCloser: {
          select: {
            id: true,
            nome: true,
            etapaFunil: true,
            status: true,
            vendedorId: true,
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead SDR não encontrado' });
    }

    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const dados = req.body;

    const lead = await prisma.leadSDR.update({
      where: { id: Number(id) },
      data: dados,
    });

    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function mover(req, res, next) {
  try {
    const { id } = req.params;
    const { etapa, ordem } = req.body;

    const lead = await prisma.leadSDR.findUnique({ where: { id: Number(id) } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead SDR não encontrado' });
    }

    const validacao = validarMovimentacao(lead, etapa);
    if (!validacao.valido) {
      return res.status(400).json({
        error: validacao.erro || 'Campos obrigatórios não preenchidos para essa transição',
        camposFaltando: validacao.camposFaltando,
      });
    }

    const leadAtualizado = await prisma.leadSDR.update({
      where: { id: Number(id) },
      data: {
        etapa,
        ...(ordem !== undefined ? { ordem } : {}),
      },
    });

    logger.info(`LeadSDR #${id} movido: ${lead.etapa} -> ${etapa}`);

    const io = req.app.get('io');
    if (io) {
      io.emit('lead-sdr-movido', { leadId: Number(id), etapaAnterior: lead.etapa, etapaNova: etapa });
    }

    res.json({ lead: leadAtualizado });
  } catch (err) {
    next(err);
  }
}

async function handoff(req, res, next) {
  try {
    const { id } = req.params;
    const {
      whatsapp,
      dataReuniao,
      closerDestinoId,
      resumoSituacao,
      tomEmocional,
      oqueFuncionou,
      oqueEvitar,
      fraseChaveLead,
    } = req.body;

    const lead = await prisma.leadSDR.findUnique({ where: { id: Number(id) } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead SDR não encontrado' });
    }

    // Atualizar lead com dados do handoff e mover para reuniao_marcada
    const leadAtualizado = await prisma.leadSDR.update({
      where: { id: Number(id) },
      data: {
        whatsapp,
        dataReuniao: new Date(dataReuniao),
        closerDestinoId,
        resumoSituacao,
        tomEmocional,
        oqueFuncionou,
        oqueEvitar: oqueEvitar || null,
        fraseChaveLead: fraseChaveLead || null,
        etapa: 'reuniao_marcada',
      },
      include: {
        closerDestino: { select: { id: true, nomeExibicao: true } },
        prints: true,
      },
    });

    // Executar handoff — cria lead no CRM do closer
    const novoLead = await executarHandoff(leadAtualizado);

    // Emitir evento WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('novo-lead-sdr', {
        leadSdrId: Number(id),
        leadCloserId: novoLead.id,
        closerDestinoId,
        instagram: lead.instagram,
        nome: lead.nome,
      });
    }

    // Registrar no audit log
    try {
      await prisma.auditLog.create({
        data: {
          usuarioId: req.usuario.id,
          acao: 'HANDOFF_SDR',
          entidade: 'LeadSDR',
          entidadeId: Number(id),
          dadosNovos: {
            etapa: 'reuniao_marcada',
            closerDestinoId,
            leadCloserId: novoLead.id,
            whatsapp,
            dataReuniao,
          },
        },
      });
    } catch (auditErr) {
      logger.warn(`Falha ao registrar audit log do handoff SDR #${id}: ${auditErr.message}`);
    }

    logger.info(`Handoff SDR concluído: LeadSDR #${id} -> Lead Closer #${novoLead.id}`);
    res.json({ lead: leadAtualizado, novoLead });
  } catch (err) {
    next(err);
  }
}

async function uploadPrints(req, res, next) {
  try {
    const { id } = req.params;

    const lead = await prisma.leadSDR.findUnique({ where: { id: Number(id) } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead SDR não encontrado' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Buscar maior ordem atual
    const ultimoPrint = await prisma.printConversaSDR.findFirst({
      where: { leadSdrId: Number(id) },
      orderBy: { ordem: 'desc' },
      select: { ordem: true },
    });
    let ordemBase = ultimoPrint ? ultimoPrint.ordem + 1 : 0;

    const prints = await Promise.all(
      req.files.map((file, index) =>
        prisma.printConversaSDR.create({
          data: {
            leadSdrId: Number(id),
            imagemUrl: `/uploads/sdr-prints/${file.filename}`,
            ordem: ordemBase + index,
          },
        })
      )
    );

    logger.info(`LeadSDR #${id}: ${prints.length} print(s) salvos`);
    res.status(201).json({ prints });
  } catch (err) {
    next(err);
  }
}

async function gerarResumoIa(req, res, next) {
  try {
    const { id } = req.params;

    const lead = await prisma.leadSDR.findUnique({
      where: { id: Number(id) },
      include: {
        prints: { orderBy: { ordem: 'asc' } },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead SDR não encontrado' });
    }

    if (!lead.prints || lead.prints.length === 0) {
      return res.status(400).json({ error: 'Este lead não possui prints para análise' });
    }

    // Montar caminhos absolutos dos arquivos
    const path = require('path');
    const imagePaths = lead.prints.map((p) => {
      // imagemUrl é como /uploads/sdr-prints/arquivo.jpg
      return path.join(__dirname, '..', '..', p.imagemUrl);
    });

    // Chamar serviço de IA para analisar os prints
    const analise = await analisarPrintWhatsApp(imagePaths, lead.resumoIa || '');

    // Salvar resumo no lead
    const resumo = analise.resumo || '';
    const leadAtualizado = await prisma.leadSDR.update({
      where: { id: Number(id) },
      data: { resumoIa: resumo },
    });

    res.json({ resumoIa: resumo, analise, lead: leadAtualizado });
  } catch (err) {
    next(err);
  }
}

async function metricasDiarias(req, res, next) {
  try {
    const isAdminGestor = req.usuario.perfil === 'admin' || req.usuario.perfil === 'gestor';
    const filtroOperador = isAdminGestor ? {} : { operadorId: req.usuario.vendedorId };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const [
      abordagensHoje,
      respostasHoje,
      reunioesHoje,
      conversasAtivas,
      leadsPorEtapa,
    ] = await Promise.all([
      // Leads criados hoje (abordagens)
      prisma.leadSDR.count({
        where: {
          ...filtroOperador,
          deletedAt: null,
          createdAt: { gte: hoje, lt: amanha },
        },
      }),
      // Leads com resposta (respostaLead preenchida), atualizados hoje
      prisma.leadSDR.count({
        where: {
          ...filtroOperador,
          deletedAt: null,
          respostaLead: { not: null },
          updatedAt: { gte: hoje, lt: amanha },
        },
      }),
      // Leads que chegaram a reuniao_marcada hoje
      prisma.leadSDR.count({
        where: {
          ...filtroOperador,
          deletedAt: null,
          etapa: 'reuniao_marcada',
          updatedAt: { gte: hoje, lt: amanha },
        },
      }),
      // Leads ativos (não em lixeira ou reuniao_marcada)
      prisma.leadSDR.count({
        where: {
          ...filtroOperador,
          deletedAt: null,
          etapa: { notIn: ['lixeira', 'reuniao_marcada'] },
        },
      }),
      // Contagem por etapa (pipeline)
      prisma.leadSDR.groupBy({
        by: ['etapa'],
        where: { ...filtroOperador, deletedAt: null },
        _count: { id: true },
      }),
    ]);

    // Formatar pipeline por etapa
    const pipeline = {};
    for (const etapa of ETAPAS_SDR) {
      pipeline[etapa] = 0;
    }
    for (const item of leadsPorEtapa) {
      pipeline[item.etapa] = item._count.id;
    }

    const taxaResposta = abordagensHoje > 0
      ? Math.round((respostasHoje / abordagensHoje) * 100)
      : null;

    res.json({
      abordagensHoje,
      respostasHoje,
      reunioesHoje,
      conversasAtivas,
      pipeline,
      taxaResposta,
    });
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;

    const lead = await prisma.leadSDR.findUnique({ where: { id: Number(id) } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead SDR não encontrado' });
    }

    if (lead.etapa === 'lixeira') {
      // Exclusao definitiva — soft delete com deletedAt
      await prisma.leadSDR.update({
        where: { id: Number(id) },
        data: { deletedAt: new Date() },
      });
      logger.info(`LeadSDR #${id} excluido definitivamente por usuário #${req.usuario.id}`);
      return res.json({ removido: true, mensagem: 'Lead excluido definitivamente' });
    }

    // Mover para lixeira
    const leadAtualizado = await prisma.leadSDR.update({
      where: { id: Number(id) },
      data: { etapa: 'lixeira' },
    });

    logger.info(`LeadSDR #${id} movido para lixeira por usuário #${req.usuario.id}`);
    res.json({ lead: leadAtualizado, mensagem: 'Lead movido para a lixeira' });
  } catch (err) {
    next(err);
  }
}

// --- Print Analysis handlers ---

async function listarPrints(req, res, next) {
  try {
    const { id } = req.params;
    const prints = await prisma.printConversaSDR.findMany({
      where: { leadSdrId: Number(id) },
      orderBy: { ordem: 'asc' },
    });
    res.json({ prints });
  } catch (err) {
    next(err);
  }
}

async function analisarPrint(req, res, next) {
  try {
    const { id } = req.params;
    const leadSdrId = Number(id);

    // Check print limit
    const countPrints = await prisma.printConversaSDR.count({ where: { leadSdrId } });
    if (countPrints >= 10) {
      return res.status(400).json({ error: 'Limite de 10 prints por lead atingido' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const imagemUrl = `/uploads/sdr-prints/${req.file.filename}`;

    // Save print to DB first (even if IA fails)
    const print = await prisma.printConversaSDR.create({
      data: {
        leadSdrId,
        imagemUrl,
        ordem: countPrints,
        contextoFase: 'detalhe',
      },
    });

    // Try IA analysis
    let resultado = null;
    let erroIA = null;
    try {
      const { analisarPrintIncremental } = require('../services/sdrAnaliseService');
      resultado = await analisarPrintIncremental(leadSdrId, imagemUrl);

      // Save analysis on the print
      await prisma.printConversaSDR.update({
        where: { id: print.id },
        data: { analiseIA: resultado.analiseAtual },
      });
    } catch (iaErr) {
      erroIA = iaErr.message;
      logger.error(`Falha na analise IA do print #${print.id} para LeadSDR #${leadSdrId}: ${iaErr.message}`, {
        printId: print.id,
        leadSdrId,
        imagemUrl,
        stack: iaErr.stack,
      });
    }

    if (erroIA) {
      return res.status(201).json({
        print,
        analise: null,
        erro: erroIA,
        mensagem: 'Print salvo, mas a analise falhou. Voce pode reanalisar depois.',
      });
    }

    res.status(201).json({
      print: { ...print, analiseIA: resultado.analiseAtual },
      analise: resultado,
    });
  } catch (err) {
    next(err);
  }
}

async function reanalisarPrint(req, res, next) {
  try {
    const { id, printId } = req.params;
    const leadSdrId = Number(id);

    const print = await prisma.printConversaSDR.findUnique({
      where: { id: Number(printId) },
    });
    if (!print || print.leadSdrId !== leadSdrId) {
      return res.status(404).json({ error: 'Print nao encontrado' });
    }

    const { analisarPrintIncremental } = require('../services/sdrAnaliseService');
    const resultado = await analisarPrintIncremental(leadSdrId, print.imagemUrl);

    await prisma.printConversaSDR.update({
      where: { id: print.id },
      data: { analiseIA: resultado.analiseAtual },
    });

    res.json({ print: { ...print, analiseIA: resultado.analiseAtual }, analise: resultado });
  } catch (err) {
    logger.error(`Falha ao reanalisar print #${req.params.printId}: ${err.message}`);
    next(err);
  }
}

async function removerPrint(req, res, next) {
  try {
    const { id, printId } = req.params;
    const print = await prisma.printConversaSDR.findUnique({
      where: { id: Number(printId) },
    });
    if (!print || print.leadSdrId !== Number(id)) {
      return res.status(404).json({ error: 'Print nao encontrado' });
    }

    await prisma.printConversaSDR.delete({ where: { id: Number(printId) } });

    // Try to delete file
    try {
      const filePath = require('path').join(__dirname, '..', '..', print.imagemUrl);
      require('fs').unlinkSync(filePath);
    } catch {}

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function aplicarSugestoes(req, res, next) {
  try {
    const { id } = req.params;
    const { campos } = req.body;

    if (!campos || typeof campos !== 'object') {
      return res.status(400).json({ error: 'Campo "campos" e obrigatorio' });
    }

    const { aplicarSugestoesIA } = require('../services/sdrAnaliseService');
    const lead = await aplicarSugestoesIA(Number(id), campos);
    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarKanban,
  criar,
  detalhe,
  atualizar,
  mover,
  handoff,
  uploadPrints,
  gerarResumoIa,
  metricasDiarias,
  excluir,
  listarPrints,
  analisarPrint,
  reanalisarPrint,
  removerPrint,
  aplicarSugestoes,
};
