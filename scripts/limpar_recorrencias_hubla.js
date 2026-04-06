/**
 * Script para identificar e limpar vendas falsas causadas por cobranças recorrentes da Hubla.
 *
 * Modo 1 (padrão): --dry-run — lista leads suspeitos sem alterar nada.
 * Modo 2: --apply — limpa as recorrências (zera vendaRealizada/valorVenda e registra nota).
 *
 * Uso no Easypanel:
 *   node scripts/limpar_recorrencias_hubla.js --dry-run
 *   node scripts/limpar_recorrencias_hubla.js --apply
 */

const prisma = require('../src/config/database');

const VALOR_LIMITE_RECORRENCIA = 200; // abaixo disso é suspeito de recorrência

async function main() {
  const modo = process.argv.includes('--apply') ? 'apply' : 'dry-run';
  console.log(`\n=== Limpeza de recorrências Hubla (modo: ${modo}) ===\n`);

  // Buscar todos os leads com venda realizada
  const leadsComVenda = await prisma.lead.findMany({
    where: { vendaRealizada: true },
    select: {
      id: true,
      nome: true,
      telefone: true,
      valorVenda: true,
      dataConversao: true,
      createdAt: true,
      formularioTitulo: true,
      vendedorId: true,
      dadosRespondi: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total de leads com vendaRealizada=true: ${leadsComVenda.length}\n`);

  // Agrupar por telefone (normalizado: últimos 10-11 dígitos)
  const porTelefone = {};
  for (const lead of leadsComVenda) {
    const tel = lead.telefone.replace(/\D/g, '').slice(-11);
    if (!porTelefone[tel]) porTelefone[tel] = [];
    porTelefone[tel].push(lead);
  }

  // Identificar telefones com múltiplas "vendas"
  const duplicados = Object.entries(porTelefone).filter(([, leads]) => leads.length > 1);
  console.log(`Telefones com múltiplas vendas: ${duplicados.length}\n`);

  const suspeitos = [];

  for (const [tel, leads] of duplicados) {
    // Ordenar por valor desc — a maior é a venda real
    const ordenados = [...leads].sort((a, b) => Number(b.valorVenda || 0) - Number(a.valorVenda || 0));
    const vendaReal = ordenados[0];

    for (let i = 1; i < ordenados.length; i++) {
      const lead = ordenados[i];
      const valor = Number(lead.valorVenda || 0);

      // Leads com valor menor que R$200 e que vieram depois da venda real são recorrências
      if (valor < VALOR_LIMITE_RECORRENCIA) {
        suspeitos.push({
          id: lead.id,
          nome: lead.nome,
          telefone: lead.telefone,
          valor,
          data: lead.dataConversao || lead.createdAt,
          formulario: lead.formularioTitulo,
          produto: lead.dadosRespondi?.hubla?.produto || '—',
          vendaRealId: vendaReal.id,
          vendaRealValor: Number(vendaReal.valorVenda || 0),
          vendedorId: lead.vendedorId,
        });
      }
    }
  }

  console.log(`Leads suspeitos de recorrência (valor < R$${VALOR_LIMITE_RECORRENCIA}): ${suspeitos.length}\n`);

  if (suspeitos.length === 0) {
    console.log('Nenhuma recorrência encontrada. Tudo limpo!');
    await prisma.$disconnect();
    return;
  }

  // Exibir tabela de suspeitos
  console.log('ID     | Nome                           | Valor    | Produto                        | Venda Real (ID/Valor)');
  console.log('-------|--------------------------------|----------|--------------------------------|---------------------');
  for (const s of suspeitos) {
    const nome = s.nome.padEnd(30).slice(0, 30);
    const valor = `R$ ${s.valor.toFixed(0)}`.padEnd(8);
    const produto = (s.produto || '—').padEnd(30).slice(0, 30);
    console.log(`${String(s.id).padEnd(6)} | ${nome} | ${valor} | ${produto} | #${s.vendaRealId} R$${s.vendaRealValor}`);
  }

  if (modo === 'dry-run') {
    console.log(`\n--- DRY RUN: nenhuma alteração feita ---`);
    console.log(`Para aplicar a limpeza, rode: node scripts/limpar_recorrencias_hubla.js --apply\n`);
    await prisma.$disconnect();
    return;
  }

  // Modo --apply: limpar recorrências
  console.log(`\n--- Aplicando limpeza de ${suspeitos.length} recorrências ---\n`);

  let limpos = 0;
  for (const s of suspeitos) {
    try {
      // Registrar nota antes de zerar
      await prisma.interacao.create({
        data: {
          leadId: s.id,
          vendedorId: s.vendedorId || 1,
          tipo: 'nota',
          conteudo: `[Limpeza automática] Recorrência removida: R$ ${s.valor.toFixed(2)} - ${s.produto}. Venda real no lead #${s.vendaRealId} (R$ ${s.vendaRealValor}).`,
        },
      });

      // Zerar campos de venda
      await prisma.lead.update({
        where: { id: s.id },
        data: {
          vendaRealizada: false,
          valorVenda: null,
          dataConversao: null,
          etapaFunil: 'em_abordagem',
          status: 'em_abordagem',
        },
      });

      limpos++;
      console.log(`  Limpo: Lead #${s.id} (${s.nome}) — R$ ${s.valor}`);
    } catch (err) {
      console.error(`  ERRO no Lead #${s.id}: ${err.message}`);
    }
  }

  console.log(`\nLimpeza concluída: ${limpos}/${suspeitos.length} recorrências removidas.\n`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
