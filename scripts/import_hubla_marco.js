/**
 * Script para importar vendas da planilha Hubla de março/2026
 *
 * Uso: DATABASE_URL="postgresql://..." node scripts/import_hubla_marco.js
 * Ou se o .env já aponta para produção: node scripts/import_hubla_marco.js
 */

const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ARQUIVO = '/Users/cassielminuto/Downloads/b5ea56b8-9618-5678-ada6-cc093c7cbd8a.xlsx';

function limparTelefone(tel) {
  if (!tel) return '';
  let t = tel.replace(/[^\d]/g, '');
  if (t && !t.startsWith('55') && t.length >= 10 && t.length <= 11) {
    t = '55' + t;
  }
  return t;
}

function parseDataBR(str) {
  if (!str) return null;
  // formato: DD/MM/YYYY HH:MM:SS
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}.000Z`);
}

async function main() {
  const wb = XLSX.readFile(ARQUIVO);
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  console.log(`\nPlanilha: ${data.length} vendas`);
  console.log('---');

  let atualizados = 0, criados = 0, jaCorretos = 0, erros = 0;
  let fatTotal = 0;

  for (const row of data) {
    const nome = row['Nome do cliente'] || 'Cliente Hubla';
    const email = row['Email do cliente'] || null;
    const telRaw = row['Telefone do cliente'] || '';
    const telefone = limparTelefone(telRaw);
    const valor = Number(row['Valor do produto'] || 0);
    const produto = row['Nome do produto'] || '';
    const faturaId = row['ID da fatura'] || '';
    const dataPagamento = parseDataBR(row['Data de pagamento']);
    const status = row['Status da fatura'] || '';

    if (!telefone || telefone.length < 10) {
      console.log(`SKIP: telefone invalido — ${nome} (${telRaw})`);
      erros++;
      continue;
    }

    if (status !== 'Paga') {
      console.log(`SKIP: status "${status}" — ${nome}`);
      continue;
    }

    fatTotal += valor;

    // Buscar lead por telefone (exato, sem DDI, últimos 8 dígitos)
    let lead = await prisma.lead.findFirst({ where: { telefone } });
    if (!lead) {
      const telSemDDI = telefone.startsWith('55') ? telefone.slice(2) : telefone;
      lead = await prisma.lead.findFirst({ where: { telefone: telSemDDI } });
    }
    if (!lead) {
      const ultimos8 = telefone.slice(-8);
      lead = await prisma.lead.findFirst({
        where: { telefone: { endsWith: ultimos8 } },
      });
    }

    if (lead) {
      // Lead já existe — verificar se precisa atualizar
      const valorAtual = lead.valorVenda ? Number(lead.valorVenda) : 0;
      const needsUpdate = !lead.vendaRealizada || valor > valorAtual || !lead.dataConversao;

      if (needsUpdate) {
        const updateData = {
          vendaRealizada: true,
          etapaFunil: 'fechado_ganho',
          status: 'convertido',
        };
        if (valor > valorAtual) updateData.valorVenda = valor;
        if (!lead.dataConversao && dataPagamento) updateData.dataConversao = dataPagamento;
        if (email && !lead.email) updateData.email = email;

        await prisma.lead.update({ where: { id: lead.id }, data: updateData });
        console.log(`ATUALIZADO #${lead.id}: ${nome} — R$${valor} (era R$${valorAtual})`);
        atualizados++;
      } else {
        jaCorretos++;
      }
    } else {
      // Criar novo lead
      const novoLead = await prisma.lead.create({
        data: {
          nome,
          telefone,
          email,
          canal: 'bio',
          pontuacao: 100,
          classe: 'A',
          etapaFunil: 'fechado_ganho',
          status: 'convertido',
          vendaRealizada: true,
          valorVenda: valor,
          formularioTitulo: produto || 'Hubla Import',
          dataPreenchimento: dataPagamento || new Date(),
          dataAtribuicao: dataPagamento || new Date(),
          dataConversao: dataPagamento || new Date(),
          dadosRespondi: { hubla: { faturaId, valor, produto, importado: true } },
        },
      });
      console.log(`CRIADO #${novoLead.id}: ${nome} — R$${valor} — ${produto}`);
      criados++;
    }
  }

  console.log('\n============================');
  console.log(`Atualizados: ${atualizados}`);
  console.log(`Criados: ${criados}`);
  console.log(`Ja corretos: ${jaCorretos}`);
  console.log(`Erros/skip: ${erros}`);
  console.log(`Faturamento planilha: R$${fatTotal.toFixed(2)}`);
  console.log('============================\n');

  // Verificar total no banco
  const totalBanco = await prisma.lead.aggregate({
    where: { vendaRealizada: true },
    _sum: { valorVenda: true },
    _count: true,
  });
  console.log(`Banco — Total vendas: ${totalBanco._count} | Faturamento: R$${Number(totalBanco._sum.valorVenda || 0).toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
