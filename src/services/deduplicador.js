const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Normaliza telefone para comparação (remove tudo que não é dígito).
 */
function normalizarTelefone(telefone) {
  if (!telefone) return null;
  const num = telefone.replace(/\D/g, '');
  // Remover código do país 55 se presente para comparar
  return num.startsWith('55') && num.length > 11 ? num.slice(2) : num;
}

/**
 * Verifica se existe lead duplicado por telefone e/ou email.
 * Retorna: { exato: Lead|null, parciais: Lead[], tipoMatch: string }
 */
async function verificarDuplicidade(telefone, email, excluirId = null) {
  const telNorm = normalizarTelefone(telefone);
  if (!telNorm) return { exato: null, parciais: [] };

  // Buscar por telefone (normalizado — comparar últimos 10-11 dígitos)
  const candidatos = await prisma.lead.findMany({
    where: {
      id: excluirId ? { not: excluirId } : undefined,
      OR: [
        { telefone: { contains: telNorm.slice(-8) } }, // últimos 8 dígitos
        ...(email ? [{ email: { equals: email, mode: 'insensitive' } }] : []),
      ],
    },
    include: {
      vendedor: { select: { id: true, nomeExibicao: true } },
    },
    take: 10,
  });

  // Classificar matches
  let exato = null;
  const parciais = [];

  for (const c of candidatos) {
    const telMatch = normalizarTelefone(c.telefone) === telNorm;
    const emailMatch = email && c.email && c.email.toLowerCase() === email.toLowerCase();

    if (telMatch && emailMatch) {
      exato = c;
      break;
    } else if (telMatch || emailMatch) {
      parciais.push({
        lead: c,
        tipoMatch: telMatch ? 'telefone' : 'email',
      });
    }
  }

  return { exato, parciais };
}

/**
 * Registra possíveis duplicatas no banco.
 */
async function registrarDuplicatas(leadOrigemId, parciais) {
  const registros = [];

  for (const { lead, tipoMatch } of parciais) {
    // Verificar se já existe registro
    const existente = await prisma.possivelDuplicata.findFirst({
      where: {
        OR: [
          { leadOrigemId, leadDuplicataId: lead.id },
          { leadOrigemId: lead.id, leadDuplicataId: leadOrigemId },
        ],
        status: 'pendente',
      },
    });

    if (!existente) {
      const registro = await prisma.possivelDuplicata.create({
        data: {
          leadOrigemId,
          leadDuplicataId: lead.id,
          tipoMatch,
        },
      });
      registros.push(registro);
    }
  }

  return registros;
}

/**
 * Busca duplicatas pendentes para um lead.
 */
async function buscarDuplicatas(leadId) {
  return prisma.possivelDuplicata.findMany({
    where: {
      OR: [
        { leadOrigemId: leadId },
        { leadDuplicataId: leadId },
      ],
      status: 'pendente',
    },
    include: {
      leadOrigem: {
        include: { vendedor: { select: { id: true, nomeExibicao: true } } },
      },
      leadDuplicata: {
        include: { vendedor: { select: { id: true, nomeExibicao: true } } },
      },
    },
  });
}

/**
 * Merge de 2 leads: mantém o lead principal, transfere interações/follow-ups do duplicado.
 * O lead duplicado é marcado como perdido.
 */
async function mergearLeads(leadPrincipalId, leadDuplicadoId, resolvidoPor) {
  const [principal, duplicado] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadPrincipalId } }),
    prisma.lead.findUnique({ where: { id: leadDuplicadoId } }),
  ]);

  if (!principal || !duplicado) {
    throw Object.assign(new Error('Lead nao encontrado'), { statusCode: 404 });
  }

  // Preencher campos do principal com dados do duplicado (se vazios)
  const dadosMerge = {};
  if (!principal.email && duplicado.email) dadosMerge.email = duplicado.email;
  if (!principal.dorPrincipal && duplicado.dorPrincipal) dadosMerge.dorPrincipal = duplicado.dorPrincipal;
  if (!principal.tracoCarater && duplicado.tracoCarater) dadosMerge.tracoCarater = duplicado.tracoCarater;
  if (!principal.objecaoPrincipal && duplicado.objecaoPrincipal) dadosMerge.objecaoPrincipal = duplicado.objecaoPrincipal;
  if (!principal.resultadoCall && duplicado.resultadoCall) dadosMerge.resultadoCall = duplicado.resultadoCall;
  // Manter o score mais alto
  if (duplicado.pontuacao > principal.pontuacao) dadosMerge.pontuacao = duplicado.pontuacao;

  await prisma.$transaction([
    // Transferir interações
    prisma.interacao.updateMany({
      where: { leadId: leadDuplicadoId },
      data: { leadId: leadPrincipalId },
    }),
    // Transferir follow-ups pendentes
    prisma.followUp.updateMany({
      where: { leadId: leadDuplicadoId, status: 'pendente' },
      data: { leadId: leadPrincipalId },
    }),
    // Transferir histórico do funil
    prisma.funilHistorico.updateMany({
      where: { leadId: leadDuplicadoId },
      data: { leadId: leadPrincipalId },
    }),
    // Atualizar lead principal com dados mergeados
    prisma.lead.update({
      where: { id: leadPrincipalId },
      data: dadosMerge,
    }),
    // Marcar duplicado como perdido
    prisma.lead.update({
      where: { id: leadDuplicadoId },
      data: {
        status: 'perdido',
        etapaFunil: 'fechado_perdido',
        motivoPerda: `Mergeado com lead #${leadPrincipalId}`,
      },
    }),
    // Decrementar leads ativos do vendedor do duplicado
    ...(duplicado.vendedorId ? [
      prisma.vendedor.update({
        where: { id: duplicado.vendedorId },
        data: { leadsAtivos: { decrement: 1 } },
      }),
    ] : []),
    // Atualizar registros de duplicata
    prisma.possivelDuplicata.updateMany({
      where: {
        OR: [
          { leadOrigemId: leadPrincipalId, leadDuplicataId: leadDuplicadoId },
          { leadOrigemId: leadDuplicadoId, leadDuplicataId: leadPrincipalId },
        ],
      },
      data: {
        status: 'mergeado',
        resolvidoPor,
        resolvidoEm: new Date(),
      },
    }),
    // Registrar no histórico
    prisma.funilHistorico.create({
      data: {
        leadId: leadPrincipalId,
        etapaAnterior: principal.etapaFunil,
        etapaNova: principal.etapaFunil,
        motivo: `Merge: lead #${leadDuplicadoId} unificado neste lead`,
      },
    }),
    // Audit log
    prisma.auditLog.create({
      data: {
        usuarioId: resolvidoPor,
        acao: 'MERGE',
        entidade: 'leads',
        entidadeId: leadPrincipalId,
        dadosAnteriores: { leadDuplicadoId },
        dadosNovos: dadosMerge,
      },
    }),
  ]);

  logger.info(`Merge concluido: Lead #${leadDuplicadoId} → Lead #${leadPrincipalId}`);

  return prisma.lead.findUnique({
    where: { id: leadPrincipalId },
    include: {
      vendedor: { select: { id: true, nomeExibicao: true, papel: true } },
      interacoes: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
}

/**
 * Busca leads existentes por telefone normalizado.
 * Ignora leads em etapas fechado_perdido e nurturing (reengajamento legítimo).
 * Retorna o lead mais recente com vendedor atribuído, ou null.
 */
async function buscarLeadPorTelefone(telefone) {
  const telNorm = normalizarTelefone(telefone);
  if (!telNorm) return null;

  // Buscar leads com telefone que contenha os últimos 8 dígitos (candidatos)
  const candidatos = await prisma.lead.findMany({
    where: {
      telefone: { contains: telNorm.slice(-8) },
      etapaFunil: { notIn: ['fechado_perdido', 'nurturing'] },
    },
    include: {
      vendedor: { select: { id: true, nomeExibicao: true, usuarioId: true, telefoneWhatsapp: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filtrar por match exato de telefone normalizado
  const matches = candidatos.filter(c => normalizarTelefone(c.telefone) === telNorm);

  if (matches.length === 0) return null;

  // REGRA 2: pegar o mais recente que tem vendedor atribuído
  const comVendedor = matches.find(m => m.vendedorId != null);
  return comVendedor || matches[0];
}

module.exports = {
  verificarDuplicidade,
  registrarDuplicatas,
  buscarDuplicatas,
  mergearLeads,
  normalizarTelefone,
  buscarLeadPorTelefone,
};
