const prisma = require('../config/database');
const { identificarCanal, calcularScore } = require('../services/scoreEngine');
const { distribuir, incrementarLeadsAtivos } = require('../services/distribuidor');
const { verificarDuplicidade, registrarDuplicatas } = require('../services/deduplicador');
const logger = require('../utils/logger');

async function receberLeadRespondi(req, res, next) {
  try {
    const dados = req.body;
    const tituloFormulario = dados.formulario_titulo || dados.titulo || '';
    const respondiId = dados.respondi_id || dados.id || null;

    // 1. Identificar canal pelo título
    const canal = identificarCanal(tituloFormulario);
    if (!canal) {
      return res.status(400).json({
        error: 'Canal não identificado. O título deve começar com [BIO] ou [ANÚNCIO].',
      });
    }

    // 2. Calcular pontuação e classificar
    const { pontuacao, classe, respostas } = calcularScore(canal, dados);

    // Extrair campos de contato
    const nome = respostas.nome || dados.nome || 'Sem nome';
    const telefone = respostas.telefone || dados.telefone || dados.whatsapp || '';
    const email = respostas.email || dados.email || null;

    if (!telefone) {
      return res.status(400).json({ error: 'Telefone/WhatsApp é obrigatório.' });
    }

    // 3. Verificar duplicata por respondi_id
    if (respondiId) {
      const existente = await prisma.lead.findUnique({ where: { respondiId } });
      if (existente) {
        return res.status(409).json({
          error: 'Lead já registrado',
          leadId: existente.id,
        });
      }
    }

    // 4. Verificar duplicidade por telefone/email
    const { exato, parciais } = await verificarDuplicidade(telefone, email);

    if (exato) {
      return res.status(409).json({
        error: 'Lead duplicado encontrado (telefone + email)',
        leadId: exato.id,
        leadExistente: {
          id: exato.id,
          nome: exato.nome,
          telefone: exato.telefone,
          email: exato.email,
          classe: exato.classe,
          etapaFunil: exato.etapaFunil,
        },
      });
    }

    // 5. Distribuir para closer
    const vendedor = await distribuir(classe);
    const agora = new Date();

    // 6. Salvar lead no banco
    const lead = await prisma.lead.create({
      data: {
        respondiId,
        nome,
        telefone,
        email,
        canal,
        formularioTitulo: tituloFormulario,
        pontuacao,
        classe,
        etapaFunil: classe === 'C' ? 'nurturing' : 'novo',
        status: classe === 'C' ? 'nurturing' : 'aguardando',
        vendedorId: vendedor?.id || null,
        dadosRespondi: dados,
        dorPrincipal: respostas.dor_principal || null,
        dataPreenchimento: agora,
        dataAtribuicao: vendedor ? agora : null,
      },
    });

    // 7. Registrar no histórico do funil
    await prisma.funilHistorico.create({
      data: {
        leadId: lead.id,
        etapaAnterior: null,
        etapaNova: lead.etapaFunil,
        vendedorId: vendedor?.id || null,
        motivo: `Lead recebido via webhook — canal ${canal}, score ${pontuacao}, classe ${classe}`,
      },
    });

    // 8. Incrementar leads ativos do vendedor
    if (vendedor) {
      await incrementarLeadsAtivos(vendedor.id);
    }

    // 9. Registrar possíveis duplicatas (match parcial) e alertar via WebSocket
    let duplicatasRegistradas = [];
    if (parciais.length > 0) {
      duplicatasRegistradas = await registrarDuplicatas(lead.id, parciais);

      const io = req.app.get('io');
      if (io && duplicatasRegistradas.length > 0) {
        io.emit('duplicata_detectada', {
          leadId: lead.id,
          leadNome: nome,
          duplicatas: parciais.map((p) => ({
            leadId: p.lead.id,
            nome: p.lead.nome,
            tipoMatch: p.tipoMatch,
          })),
        });
      }

      logger.warn(
        `Possivel duplicata: ${nome} (${telefone}) — ${parciais.length} matches parciais`
      );
    }

    // 10. Notificar via WebSocket (leads A são urgentes)
    const io = req.app.get('io');
    if (io && vendedor) {
      io.emit('novo_lead', {
        leadId: lead.id,
        nome: lead.nome,
        classe,
        pontuacao,
        canal,
        vendedorId: vendedor.id,
        vendedorNome: vendedor.nomeExibicao,
        urgente: classe === 'A',
      });
    }

    logger.info(
      `Lead recebido: ${nome} | Canal: ${canal} | Score: ${pontuacao} | Classe: ${classe} | Closer: ${vendedor?.nomeExibicao || 'nurturing'}`
    );

    res.status(201).json({
      leadId: lead.id,
      nome: lead.nome,
      canal,
      pontuacao,
      classe,
      etapa: lead.etapaFunil,
      vendedor: vendedor
        ? { id: vendedor.id, nome: vendedor.nomeExibicao, papel: vendedor.papel }
        : null,
      duplicatas: duplicatasRegistradas.length > 0 ? parciais.map((p) => ({
        leadId: p.lead.id,
        nome: p.lead.nome,
        tipoMatch: p.tipoMatch,
      })) : undefined,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { receberLeadRespondi };
