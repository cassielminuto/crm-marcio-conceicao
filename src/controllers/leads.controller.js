const prisma = require('../config/database');
const { identificarCanal, calcularScore } = require('../services/scoreEngine');
const { distribuir, incrementarLeadsAtivos } = require('../services/distribuidor');
const { verificarDuplicidade, registrarDuplicatas, buscarDuplicatas, mergearLeads } = require('../services/deduplicador');
const logger = require('../utils/logger');

async function listar(req, res, next) {
  try {
    const {
      page = '1',
      limit = '20',
      classe,
      etapa,
      vendedor_id,
      canal,
      status,
      data_inicio,
      data_fim,
      busca,
    } = req.query;

    const pag = Math.max(1, parseInt(page, 10));
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pag - 1) * lim;

    const where = {};

    if (classe) where.classe = classe;
    if (etapa) where.etapaFunil = etapa;
    if (vendedor_id) where.vendedorId = parseInt(vendedor_id, 10);
    if (canal) where.canal = canal;
    if (status) where.status = status;

    if (data_inicio || data_fim) {
      where.createdAt = {};
      if (data_inicio) where.createdAt.gte = new Date(data_inicio);
      if (data_fim) where.createdAt.lte = new Date(data_fim);
    }

    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { telefone: { contains: busca } },
        { email: { contains: busca, mode: 'insensitive' } },
      ];
    }

    // Vendedor só vê seus próprios leads
    if (req.usuario.perfil === 'vendedor' && req.usuario.vendedorId) {
      where.vendedorId = req.usuario.vendedorId;
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: lim,
        orderBy: [{ pontuacao: 'desc' }, { createdAt: 'desc' }],
        include: {
          vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      dados: leads,
      paginacao: {
        pagina: pag,
        limite: lim,
        total,
        totalPaginas: Math.ceil(total / lim),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function detalhe(req, res, next) {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
        interacoes: {
          orderBy: { createdAt: 'desc' },
          include: {
            vendedor: { select: { id: true, nomeExibicao: true } },
          },
        },
        followUps: {
          orderBy: { dataProgramada: 'asc' },
          include: {
            vendedor: { select: { id: true, nomeExibicao: true } },
          },
        },
        funilHistorico: { orderBy: { createdAt: 'desc' } },
        propostas: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json(lead);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { nome, telefone, email, canal, formulario_titulo, dados_respondi, classe: classeManual, vendedor_id, observacao } = req.body;

    // Verificar duplicidade exata
    const { exato } = await verificarDuplicidade(telefone, email);
    if (exato) {
      return res.status(409).json({
        error: 'Lead duplicado (telefone ou email ja existe)',
        leadId: exato.id,
        leadExistente: { id: exato.id, nome: exato.nome, telefone: exato.telefone },
      });
    }

    let pontuacao = 0;
    let classe = classeManual || 'B';

    // Se tem dados do Respondi, calcular score normalmente
    if (dados_respondi && formulario_titulo) {
      const canalDetectado = identificarCanal(formulario_titulo);
      if (canalDetectado) {
        const resultado = calcularScore(canalDetectado, dados_respondi);
        pontuacao = resultado.pontuacao;
        classe = resultado.classe;
      }
    } else if (classeManual) {
      if (classeManual === 'A') pontuacao = 80;
      else if (classeManual === 'B') pontuacao = 55;
      else pontuacao = 30;
    } else {
      pontuacao = 50;
    }

    // Determinar vendedor
    let vendedorId = null;
    if (vendedor_id) {
      vendedorId = vendedor_id;
    } else if (req.usuario.vendedorId) {
      vendedorId = req.usuario.vendedorId;
    } else {
      const vendedor = await distribuir(classe);
      vendedorId = vendedor?.id || null;
    }

    const agora = new Date();

    const lead = await prisma.lead.create({
      data: {
        nome,
        telefone,
        email: email || null,
        canal: canal || 'bio',
        formularioTitulo: formulario_titulo || 'Manual',
        pontuacao,
        classe,
        etapaFunil: classe === 'C' ? 'nurturing' : 'novo',
        status: classe === 'C' ? 'nurturing' : 'aguardando',
        vendedorId,
        dadosRespondi: dados_respondi || null,
        dataPreenchimento: agora,
        dataAtribuicao: vendedorId ? agora : null,
      },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      },
    });

    await prisma.funilHistorico.create({
      data: {
        leadId: lead.id,
        etapaNova: lead.etapaFunil,
        vendedorId: vendedorId || null,
        motivo: `Lead criado manualmente por ${req.usuario.email}`,
      },
    });

    if (vendedorId) {
      await incrementarLeadsAtivos(vendedorId);
    }

    // Criar nota inicial se tem observacao
    if (observacao && observacao.trim()) {
      await prisma.interacao.create({
        data: {
          leadId: lead.id,
          vendedorId: vendedorId || req.usuario.vendedorId || 1,
          tipo: 'nota',
          conteudo: observacao.trim(),
        },
      });
    }

    // Notificar via WebSocket
    const io = req.app.get('io');
    if (io && vendedorId) {
      io.emit('novo_lead', {
        leadId: lead.id,
        nome: lead.nome,
        classe,
        pontuacao,
        canal: canal || 'bio',
        vendedorId,
        vendedorNome: lead.vendedor?.nomeExibicao,
        urgente: classe === 'A',
      });
    }

    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const leadId = parseInt(id, 10);

    const existente = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existente) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    // Campos permitidos para atualização
    const camposPermitidos = [
      'nome', 'telefone', 'email', 'dorPrincipal', 'tracoCarater',
      'objecaoPrincipal', 'resultadoCall', 'vendaRealizada', 'valorVenda',
      'dataAbordagem', 'dataConversao', 'motivoPerda', 'status',
      'resumoConversa', 'proximaAcao', 'proximaAcaoData',
    ];

    const dados = {};
    for (const campo of camposPermitidos) {
      // Aceitar snake_case e camelCase do body
      const snakeKey = campo.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
      if (req.body[campo] !== undefined) {
        dados[campo] = req.body[campo];
      } else if (req.body[snakeKey] !== undefined) {
        dados[campo] = req.body[snakeKey];
      }
    }

    // Converter datas se vierem como string
    if (dados.dataAbordagem) dados.dataAbordagem = new Date(dados.dataAbordagem);
    if (dados.dataConversao) dados.dataConversao = new Date(dados.dataConversao);

    // Se marcou venda realizada, atualizar conversões do vendedor
    if (dados.vendaRealizada === true && !existente.vendaRealizada && existente.vendedorId) {
      await prisma.vendedor.update({
        where: { id: existente.vendedorId },
        data: { totalConversoes: { increment: 1 } },
      });
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: dados,
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      },
    });

    res.json(lead);
  } catch (err) {
    next(err);
  }
}

async function moverEtapa(req, res, next) {
  try {
    const { id } = req.params;
    const { etapa, motivo } = req.body;
    const leadId = parseInt(id, 10);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    if (lead.etapaFunil === etapa) {
      return res.status(400).json({ error: 'Lead já está nesta etapa' });
    }

    // Determinar status baseado na etapa
    let status = lead.status;
    if (etapa === 'em_abordagem') status = 'em_abordagem';
    else if (etapa === 'fechado_ganho') status = 'convertido';
    else if (etapa === 'fechado_perdido') status = 'perdido';
    else if (etapa === 'nurturing') status = 'nurturing';

    const dadosUpdate = {
      etapaFunil: etapa,
      status,
    };

    // Registrar data da primeira abordagem
    if (etapa === 'em_abordagem' && !lead.dataAbordagem) {
      dadosUpdate.dataAbordagem = new Date();
    }

    // Registrar data de conversão
    if (etapa === 'fechado_ganho' && !lead.dataConversao) {
      dadosUpdate.dataConversao = new Date();
      dadosUpdate.vendaRealizada = true;
    }

    const [leadAtualizado] = await Promise.all([
      prisma.lead.update({
        where: { id: leadId },
        data: dadosUpdate,
        include: {
          vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
        },
      }),
      prisma.funilHistorico.create({
        data: {
          leadId,
          etapaAnterior: lead.etapaFunil,
          etapaNova: etapa,
          vendedorId: req.usuario.vendedorId || lead.vendedorId,
          motivo: motivo || null,
        },
      }),
    ]);

    // Se fechou venda, incrementar conversões do vendedor
    if (etapa === 'fechado_ganho' && lead.vendedorId) {
      await prisma.vendedor.update({
        where: { id: lead.vendedorId },
        data: { totalConversoes: { increment: 1 } },
      });
    }

    // Se saiu da fila ativa, decrementar leads ativos
    if (['fechado_ganho', 'fechado_perdido', 'nurturing'].includes(etapa) && lead.vendedorId) {
      await prisma.vendedor.update({
        where: { id: lead.vendedorId },
        data: { leadsAtivos: { decrement: 1 } },
      });
    }

    res.json(leadAtualizado);
  } catch (err) {
    next(err);
  }
}

async function redistribuir(req, res, next) {
  try {
    const { id } = req.params;
    const { vendedor_id, motivo } = req.body;
    const leadId = parseInt(id, 10);
    const novoVendedorId = parseInt(vendedor_id, 10);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const novoVendedor = await prisma.vendedor.findUnique({ where: { id: novoVendedorId } });
    if (!novoVendedor) {
      return res.status(404).json({ error: 'Vendedor não encontrado' });
    }

    // Decrementar do vendedor anterior
    if (lead.vendedorId) {
      await prisma.vendedor.update({
        where: { id: lead.vendedorId },
        data: { leadsAtivos: { decrement: 1 } },
      });
    }

    // Atualizar lead e incrementar novo vendedor
    const [leadAtualizado] = await Promise.all([
      prisma.lead.update({
        where: { id: leadId },
        data: { vendedorId: novoVendedorId, dataAtribuicao: new Date() },
        include: {
          vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
        },
      }),
      prisma.vendedor.update({
        where: { id: novoVendedorId },
        data: { leadsAtivos: { increment: 1 } },
      }),
    ]);

    // Audit log
    await prisma.auditLog.create({
      data: {
        usuarioId: req.usuario.id,
        acao: 'REDISTRIBUTE',
        entidade: 'leads',
        entidadeId: leadId,
        dadosAnteriores: { vendedorId: lead.vendedorId },
        dadosNovos: { vendedorId: novoVendedorId },
        ip: req.ip,
      },
    });

    res.json(leadAtualizado);
  } catch (err) {
    next(err);
  }
}

async function interacoes(req, res, next) {
  try {
    const { id } = req.params;

    const lista = await prisma.interacao.findMany({
      where: { leadId: parseInt(id, 10) },
      orderBy: { createdAt: 'desc' },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    res.json(lista);
  } catch (err) {
    next(err);
  }
}

async function criarInteracao(req, res, next) {
  try {
    const { id } = req.params;
    const leadId = parseInt(id, 10);
    const { tipo, conteudo, duracao } = req.body;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const vendedorId = req.usuario.vendedorId || lead.vendedorId;
    if (!vendedorId) {
      return res.status(400).json({ error: 'Nenhum vendedor associado' });
    }

    const interacao = await prisma.interacao.create({
      data: {
        leadId,
        vendedorId,
        tipo,
        conteudo: conteudo || null,
        duracao: duracao || null,
      },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    res.status(201).json(interacao);

    // Gerar resumo e proxima acao em background
    const leadIdForSummary = leadId;
    setImmediate(async () => {
      try {
        const { gerarResumoEProximaAcao } = require('../services/aiService');
        await gerarResumoEProximaAcao(leadIdForSummary);
      } catch (err) {
        // Silenciar erro — resumo e complementar
      }
    });
  } catch (err) {
    next(err);
  }
}

async function leadsPorDia(req, res, next) {
  try {
    const { dias = '30', vendedor_id } = req.query;
    const numDias = parseInt(dias, 10);
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - numDias);
    dataInicio.setHours(0, 0, 0, 0);

    const where = { createdAt: { gte: dataInicio } };
    if (vendedor_id) where.vendedorId = parseInt(vendedor_id, 10);

    const leads = await prisma.lead.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por dia
    const porDia = {};
    for (let i = 0; i < numDias; i++) {
      const d = new Date(dataInicio);
      d.setDate(d.getDate() + i);
      porDia[d.toISOString().slice(0, 10)] = 0;
    }
    for (const lead of leads) {
      const dia = lead.createdAt.toISOString().slice(0, 10);
      if (porDia[dia] !== undefined) porDia[dia]++;
    }

    res.json(Object.entries(porDia).map(([data, total]) => ({ data, total })));
  } catch (err) {
    next(err);
  }
}

async function duplicatas(req, res, next) {
  try {
    const { id } = req.params;
    const lista = await buscarDuplicatas(parseInt(id, 10));
    res.json(lista);
  } catch (err) {
    next(err);
  }
}

async function merge(req, res, next) {
  try {
    const { id, duplicateId } = req.params;
    const leadPrincipalId = parseInt(id, 10);
    const leadDuplicadoId = parseInt(duplicateId, 10);

    const resultado = await mergearLeads(leadPrincipalId, leadDuplicadoId, req.usuario.id);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function descartarDuplicata(req, res, next) {
  try {
    const { id, duplicateId } = req.params;

    await prisma.possivelDuplicata.updateMany({
      where: {
        OR: [
          { leadOrigemId: parseInt(id, 10), leadDuplicataId: parseInt(duplicateId, 10) },
          { leadOrigemId: parseInt(duplicateId, 10), leadDuplicataId: parseInt(id, 10) },
        ],
        status: 'pendente',
      },
      data: {
        status: 'descartado',
        resolvidoPor: req.usuario.id,
        resolvidoEm: new Date(),
      },
    });

    res.json({ descartado: true });
  } catch (err) {
    next(err);
  }
}

async function gerarIcs(req, res, next) {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({
      where: { id: parseInt(id, 10) },
      select: {
        nome: true,
        telefone: true,
        proximaAcao: true,
        proximaAcaoData: true,
        vendedor: { select: { nomeExibicao: true } },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead nao encontrado' });
    }

    if (!lead.proximaAcaoData) {
      return res.status(400).json({ error: 'Nenhuma data de proxima acao definida' });
    }

    const inicio = new Date(lead.proximaAcaoData);
    const fim = new Date(inicio.getTime() + 30 * 60 * 1000);

    const formatIcalDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const uid = `lead-${id}-${Date.now()}@crm-compativeis`;
    const agora = formatIcalDate(new Date());
    const dtStart = formatIcalDate(inicio);
    const dtEnd = formatIcalDate(fim);

    const descricao = [
      lead.proximaAcao || 'Acao pendente',
      '',
      `Lead: ${lead.nome}`,
      `Telefone: ${lead.telefone}`,
      lead.vendedor?.nomeExibicao ? `Vendedor: ${lead.vendedor.nomeExibicao}` : '',
    ].filter(Boolean).join('\\n');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CRM Compativeis//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${agora}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:CRM — ${lead.nome}`,
      `DESCRIPTION:${descricao}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Lembrete: ${lead.proximaAcao || 'Acao com ' + lead.nome}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="crm-${lead.nome.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`);
    res.send(ics);
  } catch (err) {
    next(err);
  }
}

async function atualizarResumo(req, res, next) {
  try {
    const { id } = req.params;
    const leadId = parseInt(id, 10);

    const { gerarResumoEProximaAcao } = require('../services/aiService');
    const resultado = await gerarResumoEProximaAcao(leadId);

    if (!resultado) {
      return res.status(400).json({ error: 'Sem interacoes para gerar resumo' });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      },
    });

    res.json({ lead, resumo: resultado });
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    const leadId = parseInt(id, 10);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead nao encontrado' });
    }

    // Deletar registros relacionados (ordem importa por foreign keys)
    await prisma.possivelDuplicata.deleteMany({
      where: { OR: [{ leadOrigemId: leadId }, { leadDuplicataId: leadId }] },
    });
    await prisma.proposta.deleteMany({ where: { leadId } });
    await prisma.followUp.deleteMany({ where: { leadId } });
    await prisma.interacao.deleteMany({ where: { leadId } });
    await prisma.funilHistorico.deleteMany({ where: { leadId } });

    // Decrementar leads ativos do vendedor
    if (lead.vendedorId && !['convertido', 'perdido'].includes(lead.status)) {
      await prisma.vendedor.update({
        where: { id: lead.vendedorId },
        data: { leadsAtivos: { decrement: 1 } },
      }).catch(() => {});
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        usuarioId: req.usuario.id,
        acao: 'DELETE',
        entidade: 'leads',
        entidadeId: leadId,
        dadosAnteriores: { nome: lead.nome, telefone: lead.telefone, classe: lead.classe, etapaFunil: lead.etapaFunil },
        ip: req.ip,
      },
    });

    await prisma.lead.delete({ where: { id: leadId } });

    logger.info(`Lead #${leadId} (${lead.nome}) excluido por usuario #${req.usuario.id}`);
    res.json({ ok: true, mensagem: `Lead "${lead.nome}" excluido permanentemente` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  detalhe,
  criar,
  atualizar,
  moverEtapa,
  redistribuir,
  interacoes,
  criarInteracao,
  leadsPorDia,
  duplicatas,
  merge,
  descartarDuplicata,
  gerarIcs,
  atualizarResumo,
  excluir,
};
