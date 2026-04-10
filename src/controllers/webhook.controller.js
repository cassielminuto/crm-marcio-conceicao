const prisma = require('../config/database');
const { identificarCanal, calcularScore } = require('../services/scoreEngine');
const { distribuir, incrementarLeadsAtivos } = require('../services/distribuidor');
const { verificarDuplicidade, registrarDuplicatas, buscarLeadPorTelefone } = require('../services/deduplicador');
const logger = require('../utils/logger');
const { obterProximoVendedor } = require('../services/distribuicaoLeads');

const FORM_SDR_INBOUND = '[Anúncios] [SDR] Diagonóstico Gratuito - Compatíveis';
const OPERADOR_INBOUND_ID = 11; // Thomaz (Vendedor #11)

async function receberLeadRespondi(req, res, next) {
  try {
    const dados = req.body;
    const formName = dados?.form?.form_name;

    // Suportar formato real do Respondi E formato antigo (campos diretos)
    let tituloFormulario, respondiId, nome, telefone, email, respostasRaw;

    if (dados.form && dados.respondent) {
      // FORMATO REAL DO RESPONDI
      tituloFormulario = dados.form.form_name || '';
      respondiId = dados.respondent.respondent_id || null;

      const answers = dados.respondent.answers || {};
      const rawAnswers = dados.respondent.raw_answers || [];

      // Extrair nome
      const nameAnswer = rawAnswers.find(a => a.question?.question_type === 'name');
      nome = nameAnswer?.answer || answers['Qual é o seu nome?'] || answers['Nome'] || 'Sem nome';

      // Extrair telefone
      const phoneAnswer = rawAnswers.find(a => a.question?.question_type === 'phone');
      if (phoneAnswer?.answer) {
        if (typeof phoneAnswer.answer === 'object') {
          telefone = (phoneAnswer.answer.country || '55') + phoneAnswer.answer.phone;
        } else {
          telefone = String(phoneAnswer.answer);
        }
      } else {
        telefone = answers['Qual é o seu WhatsApp?'] || answers['WhatsApp'] || answers['Telefone'] || '';
      }
      telefone = telefone.replace(/[^\d]/g, '');
      if (telefone && !telefone.startsWith('55')) telefone = '55' + telefone;

      // Extrair email
      const emailAnswer = rawAnswers.find(a => a.question?.question_type === 'email');
      email = emailAnswer?.answer || answers['Qual o seu email?'] || answers['Email'] || null;

      // Montar respostasRaw para o score engine
      respostasRaw = {
        ...answers,
        respostas: rawAnswers.map(a => ({
          pergunta: a.question?.question_title,
          resposta: Array.isArray(a.answer) ? a.answer.join(', ') :
                    typeof a.answer === 'object' ? JSON.stringify(a.answer) : String(a.answer || ''),
        })),
      };

    } else {
      // FORMATO ANTIGO (campos diretos - para testes manuais)
      tituloFormulario = dados.formulario_titulo || dados.titulo || '';
      respondiId = dados.respondi_id || dados.id || null;
      nome = dados.nome || 'Sem nome';
      telefone = dados.telefone || dados.whatsapp || '';
      email = dados.email || null;
      respostasRaw = dados;
    }

    if (!telefone || telefone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Telefone/WhatsApp é obrigatório.' });
    }

    telefone = telefone.replace(/[^\d]/g, '');

    // === SDR INBOUND: form do Thomaz cria LeadSDRInbound em vez de Lead normal ===
    if (formName === FORM_SDR_INBOUND) {
      // Extrair dor principal
      let dorPrincipal = null;
      if (dados.respondent?.answers) {
        for (const [pergunta, resposta] of Object.entries(dados.respondent.answers)) {
          const p = pergunta.toLowerCase();
          if (p.includes('situação') || p.includes('situacao') || p.includes('relacionamento hoje') || p.includes('descreveria')) {
            dorPrincipal = String(resposta);
            break;
          }
        }
      }

      // Normalizar telefone pra busca de duplicata
      const telNorm = telefone.replace(/\D/g, '');
      const telBusca = telNorm.startsWith('55') && telNorm.length > 11 ? telNorm.slice(2) : telNorm;

      // Verificar duplicata por telefone em LeadSDRInbound
      const candidatos = await prisma.leadSDRInbound.findMany({
        where: {
          telefone: { contains: telBusca.slice(-8) },
          etapa: { not: 'nao_qualificado' },
          deletedAt: null,
        },
        include: {
          operador: { select: { id: true, nomeExibicao: true, telefoneWhatsapp: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const duplicata = candidatos.find(c => {
        const cTel = c.telefone.replace(/\D/g, '');
        const cNorm = cTel.startsWith('55') && cTel.length > 11 ? cTel.slice(2) : cTel;
        return cNorm === telBusca;
      });

      if (duplicata) {
        // Atualizar dadosRespondi do existente
        await prisma.leadSDRInbound.update({
          where: { id: duplicata.id },
          data: { dadosRespondi: dados },
        });

        // Notificar operador (Thomaz) via WhatsApp
        if (duplicata.operador?.telefoneWhatsapp) {
          const { enviarMensagem } = require('../services/whatsappService');
          const texto = `*Lead Retornou* 🔄\n\n*${nome}* preencheu o formulário de novo.\nTel: ${telefone}\nLead Inbound #${duplicata.id} — já no seu kanban.\n\nBom momento pra retomar o contato!`;
          setImmediate(async () => {
            try { await enviarMensagem(duplicata.operador.telefoneWhatsapp, texto); } catch (e) {
              logger.error(`WhatsApp duplicata SDR Inbound falhou: ${e.message}`);
            }
          });
        }

        logger.info(`Duplicata SDR Inbound: lead #${duplicata.id} telefone ${telefone} operador ${duplicata.operador?.nomeExibicao}`);
        return res.status(200).json({
          message: 'Lead SDR Inbound já existe, operador notificado',
          leadId: duplicata.id,
        });
      }

      // Criar LeadSDRInbound
      const leadInbound = await prisma.leadSDRInbound.create({
        data: {
          nome,
          telefone,
          email: email || null,
          dorPrincipal,
          formularioOrigem: formName,
          dadosRespondi: dados,
          operadorId: OPERADOR_INBOUND_ID,
          etapa: 'novo_lead',
        },
      });

      // Buscar telefone do operador do banco
      const operador = await prisma.vendedor.findUnique({
        where: { id: OPERADOR_INBOUND_ID },
        select: { telefoneWhatsapp: true, nomeExibicao: true },
      });

      if (operador?.telefoneWhatsapp) {
        const { enviarMensagem } = require('../services/whatsappService');
        const texto = `🎯 Novo lead do anúncio SDR\nNome: ${nome}\nTel: ${telefone}\nDor: ${dorPrincipal || 'Não informada'}\nEntre no CRM pra trabalhar!`;
        setImmediate(async () => {
          try { await enviarMensagem(operador.telefoneWhatsapp, texto); } catch (e) {
            logger.error(`WhatsApp novo lead SDR Inbound falhou: ${e.message}`);
          }
        });
      }

      logger.info(`Lead SDR Inbound criado: #${leadInbound.id} ${nome} | Tel: ${telefone} | Operador: ${operador?.nomeExibicao || 'ID ' + OPERADOR_INBOUND_ID}`);

      return res.status(200).json({
        message: 'Lead SDR Inbound criado',
        leadId: leadInbound.id,
        nome: leadInbound.nome,
        operadorId: OPERADOR_INBOUND_ID,
      });
    }

    // 1. Identificar canal
    const canal = identificarCanal(tituloFormulario);

    // 2. Calcular score
    let pontuacao = 0;
    let classe = 'B';
    let respostas = { nome, telefone, email };

    try {
      const resultado = calcularScore(canal, respostasRaw);
      pontuacao = resultado.pontuacao;
      classe = resultado.classe;
      respostas = { ...resultado.respostas, nome, telefone, email };
    } catch (err) {
      pontuacao = canal === 'bio' ? 60 : 35;
      classe = pontuacao >= 75 ? 'A' : pontuacao >= 45 ? 'B' : 'C';
    }

    // 3. Verificar duplicata por respondi_id
    if (respondiId) {
      const existente = await prisma.lead.findUnique({ where: { respondiId } });
      if (existente) {
        return res.status(409).json({ error: 'Lead já registrado', leadId: existente.id });
      }
    }

    // 4. Verificar duplicata por telefone (antes de criar lead)
    const leadExistente = await buscarLeadPorTelefone(telefone);
    if (leadExistente && leadExistente.vendedorId) {
      // Lead já existe com vendedor atribuído — notificar vendedor, NÃO criar novo
      await prisma.lead.update({
        where: { id: leadExistente.id },
        data: { dadosRespondi: dados },
      });

      if (leadExistente.vendedor?.telefoneWhatsapp) {
        const { enviarMensagem } = require('../services/whatsappService');
        const texto = `*Lead Retornou* 🔄\n\n*${nome}* preencheu o formulário novamente.\nTel: ${telefone}\nLead #${leadExistente.id} — já atribuído a você.\n\nEsse lead já está no seu funil. Pode ser um bom momento pra retomar o contato!`;
        setImmediate(async () => {
          try { await enviarMensagem(leadExistente.vendedor.telefoneWhatsapp, texto); } catch (e) {
            logger.error(`WhatsApp falhou para vendedor ${leadExistente.vendedor.nomeExibicao}: ${e.message}`);
          }
        });
      }

      logger.info(`Duplicata detectada: lead #${leadExistente.id} telefone ${telefone} vendedor ${leadExistente.vendedor?.nomeExibicao || 'ID ' + leadExistente.vendedorId}`);

      return res.status(200).json({
        message: 'Lead já existe, vendedor notificado',
        leadId: leadExistente.id,
        vendedorId: leadExistente.vendedorId,
        vendedorNome: leadExistente.vendedor?.nomeExibicao,
      });
    }

    if (leadExistente && !leadExistente.vendedorId) {
      // Lead existe sem vendedor — distribuir o existente em vez de criar novo
      await prisma.lead.update({
        where: { id: leadExistente.id },
        data: { dadosRespondi: dados, pontuacao, classe, canal },
      });

      const vendedorIdDistribuido = await obterProximoVendedor();
      const vendedorFinal = await prisma.vendedor.findUnique({ where: { id: vendedorIdDistribuido }, select: { id: true, nomeExibicao: true, papel: true, usuarioId: true, telefoneWhatsapp: true } });
      const agora = new Date();

      await prisma.lead.update({
        where: { id: leadExistente.id },
        data: {
          vendedorId: vendedorFinal?.id || null,
          dataAtribuicao: vendedorFinal ? agora : null,
        },
      });

      if (vendedorFinal) {
        await incrementarLeadsAtivos(vendedorFinal.id);
      }

      // Notificação + WhatsApp (mesmo fluxo do lead novo)
      if (vendedorFinal) {
        try {
          const { criarNotificacao } = require('../services/notificacaoService');
          const vendedorCompleto = await prisma.vendedor.findUnique({
            where: { id: vendedorFinal.id },
            select: { usuarioId: true, telefoneWhatsapp: true, nomeExibicao: true },
          });
          if (vendedorCompleto) {
            await criarNotificacao({
              usuarioId: vendedorCompleto.usuarioId,
              tipo: 'novo_lead',
              titulo: `Novo lead: ${nome}`,
              mensagem: `Classe ${classe} | Score: ${pontuacao} | Canal: ${canal === 'bio' ? 'Bio' : 'Anuncio'}`,
              dados: { leadId: leadExistente.id, classe, pontuacao, canal, nome, telefone },
            });
            if (vendedorCompleto.telefoneWhatsapp) {
              const { enviarMensagem } = require('../services/whatsappService');
              const texto = classe === 'A'
                ? `*LEAD URGENTE — CLASSE A*\n\n*${nome}*\nScore: ${pontuacao} | Canal: ${canal === 'bio' ? 'Bio' : 'Anuncio'}\nTel: ${telefone}\n\nSLA: 5 minutos!\nAcesse o CRM agora.`
                : `*Novo Lead — Classe ${classe}*\n\n*${nome}*\nScore: ${pontuacao} | Canal: ${canal === 'bio' ? 'Bio' : 'Anuncio'}\nTel: ${telefone}\n\nAcesse o CRM.`;
              setImmediate(async () => {
                try { await enviarMensagem(vendedorCompleto.telefoneWhatsapp, texto); } catch (e) {}
              });
            }
          }
        } catch (e) {}
      }

      logger.info(`Lead existente sem vendedor redistribuído: lead #${leadExistente.id} telefone ${telefone} → ${vendedorFinal?.nomeExibicao || 'sem vendedor'}`);

      return res.status(200).json({
        leadId: leadExistente.id, nome: leadExistente.nome, canal, pontuacao, classe,
        vendedor: vendedorFinal ? { id: vendedorFinal.id, nome: vendedorFinal.nomeExibicao } : null,
        redistribuido: true,
      });
    }

    // 4b. Verificar duplicidade parcial (email) para registro posterior
    const { exato, parciais } = await verificarDuplicidade(telefone, email);
    if (exato) {
      return res.status(409).json({
        error: 'Lead duplicado encontrado',
        leadId: exato.id,
        leadExistente: { id: exato.id, nome: exato.nome, telefone: exato.telefone },
      });
    }

    // 5. Distribuicao round-robin ponderada (2:1 Lucas:Gabriel)
    const vendedorIdDistribuido = await obterProximoVendedor();
    const vendedorFinal = await prisma.vendedor.findUnique({ where: { id: vendedorIdDistribuido }, select: { id: true, nomeExibicao: true, papel: true, usuarioId: true, telefoneWhatsapp: true } });
    const agora = new Date();

    // 6. Extrair dor principal das respostas do Respondi
    let dorPrincipal = null;
    if (dados.respondent?.answers) {
      const answers = dados.respondent.answers;
      for (const [pergunta, resposta] of Object.entries(answers)) {
        const p = pergunta.toLowerCase();
        if (p.includes('situação') || p.includes('situacao') || p.includes('relacionamento hoje') || p.includes('descreveria')) {
          dorPrincipal = String(resposta);
          break;
        }
      }
    }
    if (!dorPrincipal) dorPrincipal = respostas.dor_principal || null;

    // 7. Criar lead — SEMPRE como 'novo' e 'aguardando'
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
        etapaFunil: 'novo',
        status: 'aguardando',
        vendedorId: vendedorFinal?.id || null,
        dadosRespondi: dados,
        dorPrincipal,
        dataPreenchimento: agora,
        dataAtribuicao: vendedorFinal ? agora : null,
      },
    });

    // 7. Historico funil
    await prisma.funilHistorico.create({
      data: {
        leadId: lead.id,
        etapaNova: lead.etapaFunil,
        vendedorId: vendedorFinal?.id || null,
        motivo: `Lead via Respondi — ${tituloFormulario} — canal ${canal}, score ${pontuacao}, classe ${classe}`,
      },
    });

    // 8. Incrementar leads ativos
    if (vendedorFinal) {
      await incrementarLeadsAtivos(vendedorFinal.id);
    }

    // 9. Duplicatas parciais
    let duplicatasRegistradas = [];
    if (parciais.length > 0) {
      duplicatasRegistradas = await registrarDuplicatas(lead.id, parciais);
      const io = req.app.get('io');
      if (io && duplicatasRegistradas.length > 0) {
        io.emit('duplicata_detectada', {
          leadId: lead.id, leadNome: nome,
          duplicatas: parciais.map(p => ({ leadId: p.lead.id, nome: p.lead.nome, tipoMatch: p.tipoMatch })),
        });
      }
    }

    // 10. WebSocket
    const io = req.app.get('io');
    if (io && vendedorFinal) {
      io.emit('novo_lead', {
        leadId: lead.id, nome: lead.nome, classe, pontuacao, canal,
        vendedorId: vendedorFinal.id, vendedorNome: vendedorFinal.nomeExibicao,
        urgente: classe === 'A',
      });
    }

    // 11. Notificacao + WhatsApp para vendedor
    if (vendedorFinal) {
      try {
        const { criarNotificacao } = require('../services/notificacaoService');
        const vendedorCompleto = await prisma.vendedor.findUnique({
          where: { id: vendedorFinal.id },
          select: { usuarioId: true, telefoneWhatsapp: true, nomeExibicao: true },
        });
        if (vendedorCompleto) {
          await criarNotificacao({
            usuarioId: vendedorCompleto.usuarioId,
            tipo: 'novo_lead',
            titulo: `Novo lead: ${nome}`,
            mensagem: `Classe ${classe} | Score: ${pontuacao} | Canal: ${canal === 'bio' ? 'Bio' : 'Anuncio'}`,
            dados: { leadId: lead.id, classe, pontuacao, canal, nome, telefone },
          });
          if (vendedorCompleto.telefoneWhatsapp) {
            const { enviarMensagem } = require('../services/whatsappService');
            const texto = classe === 'A'
              ? `*LEAD URGENTE — CLASSE A*\n\n*${nome}*\nScore: ${pontuacao} | Canal: ${canal === 'bio' ? 'Bio' : 'Anuncio'}\nTel: ${telefone}\n\nSLA: 5 minutos!\nAcesse o CRM agora.`
              : `*Novo Lead — Classe ${classe}*\n\n*${nome}*\nScore: ${pontuacao} | Canal: ${canal === 'bio' ? 'Bio' : 'Anuncio'}\nTel: ${telefone}\n\nAcesse o CRM.`;
            setImmediate(async () => {
              try { await enviarMensagem(vendedorCompleto.telefoneWhatsapp, texto); } catch (e) {}
            });
          }
        }
      } catch (e) {
        // Silenciar se servico nao existe
      }
    }

    logger.info(`Lead Respondi: ${nome} | Canal: ${canal} | Score: ${pontuacao} | Classe: ${classe} | Closer: ${vendedorFinal?.nomeExibicao || 'sem vendedor'}`);

    res.status(201).json({
      leadId: lead.id, nome: lead.nome, canal, pontuacao, classe, etapa: lead.etapaFunil,
      vendedor: vendedorFinal ? { id: vendedorFinal.id, nome: vendedorFinal.nomeExibicao } : null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { receberLeadRespondi };
