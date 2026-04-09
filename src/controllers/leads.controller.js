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
    const lim = Math.min(5000, Math.max(1, parseInt(limit, 10)));
    const skip = (pag - 1) * lim;

    const where = {};

    if (classe) where.classe = classe;
    if (etapa) where.etapaFunil = etapa;
    if (vendedor_id) where.vendedorId = parseInt(vendedor_id, 10);
    if (canal) where.canal = canal;
    if (status) where.status = status;
    if (req.query.venda_realizada === 'true') where.vendaRealizada = true;

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
    const { nome, telefone, email, canal, formulario_titulo, dados_respondi, classe: classeManual, vendedor_id, observacao, etapa_funil, venda_realizada, valor_venda } = req.body;

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
        etapaFunil: etapa_funil || (classe === 'C' ? 'nurturing' : 'novo'),
        status: etapa_funil === 'fechado_ganho' ? 'convertido' : etapa_funil === 'fechado_perdido' ? 'perdido' : etapa_funil === 'nurturing' ? 'nurturing' : (classe === 'C' ? 'nurturing' : 'aguardando'),
        vendaRealizada: venda_realizada || false,
        valorVenda: valor_venda ? parseFloat(valor_venda) : null,
        dataConversao: venda_realizada ? new Date() : null,
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
      'nome', 'telefone', 'email', 'canal', 'dorPrincipal', 'tracoCarater',
      'objecaoPrincipal', 'resultadoCall', 'vendaRealizada', 'valorVenda',
      'dataAbordagem', 'dataConversao', 'dataPreenchimento', 'motivoPerda', 'status',
      'resumoConversa', 'proximaAcao', 'proximaAcaoData',
      'previsaoFechamento', 'etapaFunil', 'dadosRespondi', 'createdAt',
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
    if (dados.dataPreenchimento) dados.dataPreenchimento = new Date(dados.dataPreenchimento);
    if (dados.previsaoFechamento) dados.previsaoFechamento = new Date(dados.previsaoFechamento);
    if (dados.createdAt) dados.createdAt = new Date(dados.createdAt);
    if (dados.valorVenda !== undefined) dados.valorVenda = dados.valorVenda !== null ? parseFloat(dados.valorVenda) : null;

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

    // Registrar mudança de etapa no histórico
    if (dados.etapaFunil && dados.etapaFunil !== existente.etapaFunil) {
      await prisma.funilHistorico.create({
        data: {
          leadId,
          etapaAnterior: existente.etapaFunil,
          etapaNova: dados.etapaFunil,
          vendedorId: req.usuario.vendedorId || null,
          motivo: 'Mudanca manual pelo card do lead',
        },
      });
    }

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
    const { dias = '30', vendedor_id, data_inicio, data_fim } = req.query;

    let dateStart, dateEnd;
    if (data_inicio && data_fim) {
      dateStart = new Date(data_inicio);
      dateEnd = new Date(data_fim);
    } else {
      const numDias = parseInt(dias, 10);
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - numDias);
      dateStart.setHours(0, 0, 0, 0);
      dateEnd = new Date();
    }

    const where = { createdAt: { gte: dateStart, lte: dateEnd } };
    if (vendedor_id) where.vendedorId = parseInt(vendedor_id, 10);

    if (req.usuario.perfil === 'vendedor' && req.usuario.vendedorId) {
      where.vendedorId = req.usuario.vendedorId;
    }

    const leads = await prisma.lead.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const porDia = {};
    const diffTime = dateEnd - dateStart;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < diffDays; i++) {
      const d = new Date(dateStart);
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

async function listarFunil(req, res, next) {
  try {
    const { vendedor_id, classe, canal, data_inicio, data_fim, incluir_leads_fechados } = req.query;
    const carregarLeadsFechados = incluir_leads_fechados === 'true';

    const where = {};

    if (vendedor_id && vendedor_id !== '' && vendedor_id !== 'todos') {
      where.vendedorId = parseInt(vendedor_id, 10);
    }
    if (classe && classe !== '' && classe !== 'todas') where.classe = classe;
    if (canal && canal !== '' && canal !== 'todos') where.canal = canal;

    if (data_inicio || data_fim) {
      where.createdAt = {};
      if (data_inicio) where.createdAt.gte = new Date(data_inicio);
      if (data_fim) where.createdAt.lte = new Date(data_fim);
    }

    if (req.usuario.perfil === 'vendedor' && req.usuario.vendedorId) {
      where.vendedorId = req.usuario.vendedorId;
    }

    // Buscar etapas configuradas para saber quais são ganho/perdido
    const etapasConfig = await prisma.etapaFunil.findMany({ where: { ativo: true } });
    const closedSlugs = new Set(
      etapasConfig.filter(e => e.tipo === 'ganho' || e.tipo === 'perdido').map(e => e.slug)
    );

    const TICKET_MEDIO = 1229;
    const etapas = {};

    // Inicializar todas as etapas
    for (const ec of etapasConfig) {
      etapas[ec.slug] = { leads: [], count: 0, valorTotal: 0 };
    }

    // Colunas fechadas: contagem + valor agregado
    // Se incluir_leads_fechados=true (pagina Funil): tambem retorna 30 leads mais recentes
    // Se false/ausente (Dashboard): retorna leads: [] para nao poluir rawLeads
    const closedAggregations = await Promise.all(
      [...closedSlugs].map(async (slug) => {
        const closedWhere = { ...where, etapaFunil: slug };
        const [countResult, valorResult] = await Promise.all([
          prisma.lead.count({ where: closedWhere }),
          prisma.lead.aggregate({ where: closedWhere, _sum: { valorVenda: true } }),
        ]);
        return { slug, count: countResult, valorTotal: Number(valorResult._sum.valorVenda) || 0 };
      })
    );

    for (const agg of closedAggregations) {
      let recentLeads = [];
      if (carregarLeadsFechados && agg.count > 0) {
        recentLeads = await prisma.lead.findMany({
          where: { ...where, etapaFunil: agg.slug },
          orderBy: [{ dataConversao: 'desc' }, { updatedAt: 'desc' }],
          take: 30,
          include: {
            vendedor: { select: { id: true, nomeExibicao: true } },
          },
        });
      }
      etapas[agg.slug] = { leads: recentLeads, count: agg.count, valorTotal: agg.valorTotal, totalReal: agg.count };
    }

    // Colunas ativas: carregar todos os leads (sem limite)
    const activeWhere = { ...where, etapaFunil: { notIn: [...closedSlugs] } };
    const leads = await prisma.lead.findMany({
      where: activeWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
    });

    for (const lead of leads) {
      const e = lead.etapaFunil;
      if (!etapas[e]) etapas[e] = { leads: [], count: 0, valorTotal: 0 };
      etapas[e].leads.push(lead);
      etapas[e].count++;
      const valor = Number(lead.valorVenda) || (lead.pontuacao >= 45 ? TICKET_MEDIO : 0);
      etapas[e].valorTotal += valor;
    }

    // Estimar valor para colunas fechadas que não têm valorVenda registrado
    for (const agg of closedAggregations) {
      if (agg.valorTotal === 0 && agg.count > 0) {
        // Contar leads com pontuacao >= 45 para estimar
        const qualificados = await prisma.lead.count({
          where: { ...where, etapaFunil: agg.slug, pontuacao: { gte: 45 } },
        });
        etapas[agg.slug].valorTotal = qualificados * TICKET_MEDIO;
      }
    }

    let pipelineTotal = 0;
    let totalLeads = leads.length;
    for (const [slug, data] of Object.entries(etapas)) {
      if (closedSlugs.has(slug)) continue;
      pipelineTotal += data.valorTotal;
    }

    // Somar contagem dos fechados no total
    for (const agg of closedAggregations) {
      totalLeads += agg.count;
    }

    const receitaTotal = etapasConfig
      .filter(e => e.tipo === 'ganho')
      .reduce((sum, e) => sum + (etapas[e.slug]?.valorTotal || 0), 0);

    res.json({ etapas, total: totalLeads, pipelineTotal, receitaTotal });
  } catch (err) {
    next(err);
  }
}

async function buscar(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const termo = q.trim();
    const termoTelefone = termo.replace(/\D/g, '');

    const orConditions = [
      { nome: { contains: termo, mode: 'insensitive' } },
      { email: { contains: termo, mode: 'insensitive' } },
    ];
    // Só busca por telefone se o termo tem 3+ dígitos
    if (termoTelefone.length >= 3) {
      orConditions.push({ telefone: { contains: termoTelefone } });
    }

    const where = { OR: orConditions };

    if (req.usuario.perfil === 'vendedor' && req.usuario.vendedorId) {
      where.vendedorId = req.usuario.vendedorId;
    }

    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        nome: true,
        telefone: true,
        email: true,
        classe: true,
        pontuacao: true,
        etapaFunil: true,
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
      take: 15,
      orderBy: { nome: 'asc' },
    });

    // Priorizar: nome começa com termo > nome contém > email/telefone
    const termoLower = termo.toLowerCase();
    leads.sort((a, b) => {
      const aName = a.nome?.toLowerCase().startsWith(termoLower) ? 0 : a.nome?.toLowerCase().includes(termoLower) ? 1 : 2;
      const bName = b.nome?.toLowerCase().startsWith(termoLower) ? 0 : b.nome?.toLowerCase().includes(termoLower) ? 1 : 2;
      return aName - bName;
    });

    res.json(leads.slice(0, 10));
  } catch (err) {
    next(err);
  }
}

// Listar vendas por dataConversao (fallback createdAt para importadas)
async function listarVendas(req, res, next) {
  try {
    const { data_inicio, data_fim } = req.query;
    const where = { vendaRealizada: true };

    if (data_inicio || data_fim) {
      const inicio = data_inicio ? new Date(data_inicio) : undefined;
      const fim = data_fim ? new Date(data_fim) : undefined;
      const dateRange = {
        ...(inicio ? { gte: inicio } : {}),
        ...(fim ? { lte: fim } : {}),
      };

      // Vendas com dataConversao no periodo, ou createdAt no periodo se nao tem dataConversao
      where.OR = [
        { dataConversao: dateRange },
        { dataConversao: null, createdAt: dateRange },
      ];
    }

    if (req.usuario.perfil === 'vendedor' && req.usuario.vendedorId) {
      where.vendedorId = req.usuario.vendedorId;
    }

    const vendas = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        nome: true,
        telefone: true,
        email: true,
        valorVenda: true,
        vendaRealizada: true,
        dataConversao: true,
        createdAt: true,
        vendedorId: true,
        formularioTitulo: true,
        dadosRespondi: true,
        vendedor: { select: { id: true, nomeExibicao: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular totais
    const totalVendas = vendas.length;
    const faturamento = vendas.reduce((s, l) => s + (l.valorVenda ? Number(l.valorVenda) : 0), 0);

    res.json({ vendas, totalVendas, faturamento });
  } catch (err) {
    next(err);
  }
}

async function metricasAnuncio(req, res, next) {
  try {
    const { data_inicio, data_fim } = req.query;
    if (!data_inicio || !data_fim) {
      return res.status(400).json({ error: 'data_inicio e data_fim são obrigatórios' });
    }

    const dateStart = new Date(data_inicio);
    const dateEnd = new Date(data_fim);

    const etapasReuniao = ['qualificado', 'proposta', 'negociacao', 'fechado_ganho', 'fechado_perdido'];

    const [reunioes, vendasRows] = await Promise.all([
      prisma.lead.count({
        where: {
          canal: 'anuncio',
          etapaFunil: { in: etapasReuniao },
          createdAt: { gte: dateStart, lt: dateEnd },
        },
      }),
      prisma.lead.findMany({
        where: {
          canal: 'anuncio',
          vendaRealizada: true,
          etapaFunil: 'fechado_ganho',
          createdAt: { gte: dateStart, lt: dateEnd },
        },
        select: { valorVenda: true },
      }),
    ]);

    const vendas_fechadas = vendasRows.length;
    const receita = vendasRows.reduce((sum, v) => sum + (v.valorVenda ? Number(v.valorVenda) : 0), 0);
    const taxa_conversao = reunioes > 0 ? Math.round((vendas_fechadas / reunioes) * 1000) / 10 : 0;

    res.json({
      reunioes_agendadas: reunioes,
      vendas_fechadas,
      receita,
      taxa_conversao,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  listarVendas,
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
  listarFunil,
  buscar,
  metricasAnuncio,
};
