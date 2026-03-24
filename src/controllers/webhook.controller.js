const prisma = require('../config/database');
const { identificarCanal, calcularScore } = require('../services/scoreEngine');
const { distribuir, incrementarLeadsAtivos } = require('../services/distribuidor');
const { verificarDuplicidade, registrarDuplicatas } = require('../services/deduplicador');
const logger = require('../utils/logger');

async function receberLeadRespondi(req, res, next) {
  try {
    const dados = req.body;

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

    // 4. Verificar duplicidade por telefone/email
    const { exato, parciais } = await verificarDuplicidade(telefone, email);
    if (exato) {
      return res.status(409).json({
        error: 'Lead duplicado encontrado',
        leadId: exato.id,
        leadExistente: { id: exato.id, nome: exato.nome, telefone: exato.telefone },
      });
    }

    // 5. Distribuir
    const vendedor = await distribuir(classe);
    const agora = new Date();

    // 6. Criar lead
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

    // 7. Historico funil
    await prisma.funilHistorico.create({
      data: {
        leadId: lead.id,
        etapaNova: lead.etapaFunil,
        vendedorId: vendedor?.id || null,
        motivo: `Lead via Respondi — ${tituloFormulario} — canal ${canal}, score ${pontuacao}, classe ${classe}`,
      },
    });

    // 8. Incrementar leads ativos
    if (vendedor) {
      await incrementarLeadsAtivos(vendedor.id);
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
    if (io && vendedor) {
      io.emit('novo_lead', {
        leadId: lead.id, nome: lead.nome, classe, pontuacao, canal,
        vendedorId: vendedor.id, vendedorNome: vendedor.nomeExibicao,
        urgente: classe === 'A',
      });
    }

    // 11. Notificacao + WhatsApp para vendedor
    if (vendedor) {
      try {
        const { criarNotificacao } = require('../services/notificacaoService');
        const vendedorCompleto = await prisma.vendedor.findUnique({
          where: { id: vendedor.id },
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

    logger.info(`Lead Respondi: ${nome} | Canal: ${canal} | Score: ${pontuacao} | Classe: ${classe} | Closer: ${vendedor?.nomeExibicao || 'nurturing'}`);

    res.status(201).json({
      leadId: lead.id, nome: lead.nome, canal, pontuacao, classe, etapa: lead.etapaFunil,
      vendedor: vendedor ? { id: vendedor.id, nome: vendedor.nomeExibicao } : null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { receberLeadRespondi };
