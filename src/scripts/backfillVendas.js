/**
 * backfillVendas — Cria 1 Venda por Lead existente com vendaRealizada=true.
 *
 * Segue padrao CLAUDE.md§"Limpeza de dados em producao":
 *   1. Investigacao (read-only): contagem, soma de valores, leads sem dataConversao
 *   2. Validacao previa: aborta se contagens nao baterem com o esperado
 *   3. Execucao em transacao atomica: chunks de 100, prisma.$transaction por chunk
 *   4. Validacao final: SUM Venda.valorTotal == SUM Lead.valorVenda (paridade de centavo)
 *
 * USO:
 *   node src/scripts/backfillVendas.js             # dry-run (so investigacao, NAO cria nada)
 *   node src/scripts/backfillVendas.js --apply     # executa
 *
 * IDEMPOTENTE: leads que ja tem Venda (vendas: { some: {} }) sao pulados.
 * Rodar 2x nao duplica.
 *
 * NUNCA rodar em producao sem:
 *   1. Backup completo do banco
 *   2. Dry-run revisado — contagens fazem sentido?
 *   3. Autorizacao explicita do Cassiel
 *
 * Recorrencias historicas (Interacao tipo nota "Pagamento recorrente Hubla...")
 * NAO sao migradas por este script. Ver backfillRecorrenciasHistoricas (opcional).
 */

const prisma = require('../config/database');
const { derivarOrigemVenda, calcularCicloVendaDias } = require('../services/vendaService');

const CHUNK_SIZE = 100;
const APPLY = process.argv.includes('--apply');

function extrairProduto(lead) {
  const dr = lead.dadosRespondi;
  if (dr?.hubla?.produto) return dr.hubla.produto;
  if (Array.isArray(dr?.hubla?.produtos) && dr.hubla.produtos.length) return dr.hubla.produtos[0];
  return null;
}

async function investigacao() {
  console.log('\n=== FASE 1: INVESTIGACAO (read-only) ===\n');

  const total = await prisma.lead.count({ where: { vendaRealizada: true } });

  const somaValor = await prisma.lead.aggregate({
    where: { vendaRealizada: true },
    _sum: { valorVenda: true },
  });

  const semDataConversao = await prisma.lead.count({
    where: { vendaRealizada: true, dataConversao: null },
  });

  const semValor = await prisma.lead.count({
    where: { vendaRealizada: true, valorVenda: null },
  });

  const comVendaJa = await prisma.lead.count({
    where: { vendaRealizada: true, vendas: { some: {} } },
  });

  const aProcessar = await prisma.lead.count({
    where: {
      vendaRealizada: true,
      valorVenda: { not: null },
      vendas: { none: {} },
    },
  });

  console.log(`Leads com vendaRealizada=true:                    ${total}`);
  console.log(`Soma Lead.valorVenda (WHERE vendaRealizada=true): R$ ${Number(somaValor._sum.valorVenda || 0).toFixed(2)}`);
  console.log(`Sem dataConversao (fallback = updatedAt):          ${semDataConversao}`);
  console.log(`Sem valorVenda (serao pulados):                    ${semValor}`);
  console.log(`Ja tem Venda (idempotencia — pulados):             ${comVendaJa}`);
  console.log(`A processar nesta execucao:                        ${aProcessar}`);

  return {
    total,
    somaValor: Number(somaValor._sum.valorVenda || 0),
    semDataConversao,
    semValor,
    comVendaJa,
    aProcessar,
  };
}

async function processarChunk(leads) {
  const operacoes = leads.map((lead) => {
    const dataPagamento = lead.dataConversao || lead.updatedAt;
    return prisma.venda.create({
      data: {
        leadId: lead.id,
        hublaInvoiceId: null, // backfill nao tem invoice.id original
        produto: extrairProduto(lead),
        valorTotal: Number(lead.valorVenda),
        taxas: 0,
        valorLiquido: null,
        metodoPagamento: null,
        parcelas: null,
        orderBumpsAceitos: null,
        utmsCheckout: null,
        fbclidCheckout: null,
        closerResponsavelId: lead.vendedorId,
        campanhaId: lead.campanhaId,
        criativoId: lead.criativoId,
        origemVenda: derivarOrigemVenda(lead),
        recorrencia: false,
        dataPagamento,
        cicloVendaDias: calcularCicloVendaDias(dataPagamento, lead.createdAt),
      },
    });
  });

  return prisma.$transaction(operacoes);
}

async function execucao() {
  console.log('\n=== FASE 2: EXECUCAO ===\n');

  let processados = 0;
  let totalCriados = 0;
  let somaCriados = 0;
  let chunkNum = 0;

  while (true) {
    // Re-query a cada iteracao porque o filtro `vendas: { none: {} }`
    // vai mudar a medida que Vendas sao criadas
    const leads = await prisma.lead.findMany({
      where: {
        vendaRealizada: true,
        valorVenda: { not: null },
        vendas: { none: {} },
      },
      take: CHUNK_SIZE,
      orderBy: { id: 'asc' },
    });

    if (leads.length === 0) break;

    chunkNum++;
    const vendas = await processarChunk(leads);
    processados += leads.length;
    totalCriados += vendas.length;
    somaCriados += vendas.reduce((s, v) => s + Number(v.valorTotal), 0);

    console.log(`  chunk #${chunkNum}: ${leads.length} leads -> ${vendas.length} vendas. Acumulado: ${totalCriados} vendas, R$ ${somaCriados.toFixed(2)}`);
  }

  console.log(`\nTotal Vendas criadas: ${totalCriados}`);
  console.log(`Soma Venda.valorTotal: R$ ${somaCriados.toFixed(2)}`);
  return { totalCriados, somaCriados };
}

async function validacaoPos() {
  console.log('\n=== FASE 3: VALIDACAO POS ===\n');

  const somaLead = await prisma.lead.aggregate({
    where: { vendaRealizada: true },
    _sum: { valorVenda: true },
  });
  const somaVenda = await prisma.venda.aggregate({
    where: { recorrencia: false },
    _sum: { valorTotal: true },
  });

  const sL = Number(somaLead._sum.valorVenda || 0);
  const sV = Number(somaVenda._sum.valorTotal || 0);
  const diff = Math.abs(sL - sV);

  console.log(`SUM Lead.valorVenda (vendaRealizada=true):  R$ ${sL.toFixed(2)}`);
  console.log(`SUM Venda.valorTotal (recorrencia=false):   R$ ${sV.toFixed(2)}`);
  console.log(`Diferenca absoluta:                         R$ ${diff.toFixed(2)}`);

  if (diff < 0.01) {
    console.log('\n✅ PARIDADE OK — valores batem ate o centavo.');
    return true;
  } else {
    console.log('\n❌ DIVERGENCIA — investigar antes de confiar no backfill.');
    console.log('Possiveis causas esperadas:');
    console.log(' - Leads com valorVenda=null foram pulados (esperado — nao e divergencia real)');
    console.log(' - Vendas manuais/webhook criadas antes do backfill ja estao em Venda');
    console.log(' - Diff negativa (SUM Venda > SUM Lead) indica dual-write ja rodou');
    return false;
  }
}

async function main() {
  try {
    console.log(`\n[backfillVendas] Modo: ${APPLY ? 'APPLY — vai criar Vendas' : 'DRY-RUN — so investigacao, use --apply pra aplicar'}\n`);

    const invest = await investigacao();

    if (!APPLY) {
      console.log('\n⚠️  DRY-RUN — nenhuma Venda foi criada. Revise as contagens acima.');
      console.log('Pra aplicar: node src/scripts/backfillVendas.js --apply');
      return;
    }

    if (invest.aProcessar === 0) {
      console.log('\nNada a processar. Encerrando.');
      return;
    }

    await execucao();
    await validacaoPos();

    console.log('\n=== BACKFILL CONCLUIDO ===\n');
  } catch (err) {
    console.error(`\n❌ Erro fatal: ${err.message}`);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
