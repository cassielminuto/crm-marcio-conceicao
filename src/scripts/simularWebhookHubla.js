/**
 * simularWebhookHubla — dispara um POST contra /api/webhook/hubla
 * pra validar o dual-write Lead+Venda antes do push pra producao.
 *
 * REQUER: backend rodando localmente (`npm run dev`) na porta padrao.
 *
 * USO:
 *   node src/scripts/simularWebhookHubla.js --tel 5511999999999 --valor 127
 *   node src/scripts/simularWebhookHubla.js --tel 5511999999999 --valor 47 --produto "Completo" --nome "Joao Silva"
 *   node src/scripts/simularWebhookHubla.js --tel 5511999999999 --valor 197 --invoice inv-retry-teste  # dedup test
 *
 * Argumentos:
 *   --tel      (OBRIGATORIO) telefone completo com DDI (ex: 5511999999999)
 *   --valor    (OBRIGATORIO) valor em R$ (ex: 127 ou 127.50)
 *   --produto  nome do produto (default "Produto Simulado")
 *   --nome     nome do pagador (default "Teste Simulado")
 *   --email    email do pagador
 *   --invoice  invoice.id pra testar dedup (default: gerado com timestamp)
 *   --url      URL do webhook (default: http://localhost:3000/api/webhook/hubla)
 *
 * APOS EXECUTAR: rodar no banco pra validar dual-write:
 *   SELECT l.id, l.nome, l.venda_realizada, l.valor_venda,
 *          v.id AS venda_id, v.valor_total, v.recorrencia, v.hubla_invoice_id
 *   FROM leads l LEFT JOIN vendas v ON v.lead_id = l.id
 *   WHERE l.telefone LIKE '%<ultimos 8 digitos>%'
 *   ORDER BY v.created_at DESC;
 *
 * Esperado:
 *   - Lead com venda_realizada=true, valor_venda preenchido
 *   - Venda com valor_total igual, hubla_invoice_id igual ao --invoice
 *   - 2a execucao com mesmo --invoice: nenhuma Venda nova (dedup P2002)
 *   - 2a execucao com --invoice diferente: Venda nova com recorrencia=true
 */

const { parseArgs } = require('node:util');

const { values } = parseArgs({
  options: {
    tel: { type: 'string' },
    valor: { type: 'string' },
    produto: { type: 'string' },
    nome: { type: 'string' },
    email: { type: 'string' },
    invoice: { type: 'string' },
    url: { type: 'string' },
  },
  strict: true,
  allowPositionals: false,
});

const tel = values.tel;
const valorStr = values.valor;
const produto = values.produto || 'Produto Simulado';
const nome = values.nome || 'Teste Simulado';
const email = values.email || null;
const invoiceId = values.invoice || `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const url = values.url || 'http://localhost:3000/api/webhook/hubla';

if (!tel || !valorStr) {
  console.error('ERRO: --tel e --valor sao obrigatorios.');
  console.error('Uso: node src/scripts/simularWebhookHubla.js --tel 5511999999999 --valor 127 [--produto X] [--invoice Y]');
  process.exit(1);
}

const valorNumber = parseFloat(valorStr);
if (Number.isNaN(valorNumber) || valorNumber <= 0) {
  console.error('ERRO: --valor deve ser numero positivo.');
  process.exit(1);
}

const partesNome = nome.trim().split(/\s+/);
const firstName = partesNome[0] || 'Teste';
const lastName = partesNome.slice(1).join(' ') || 'Simulado';

const payload = {
  type: 'invoice.payment_succeeded',
  event: {
    invoice: {
      id: invoiceId,
      status: 'paid',
      saleDate: new Date().toISOString(),
      amount: { subtotalCents: Math.round(valorNumber * 100) },
      payer: {
        firstName,
        lastName,
        email,
        phone: tel,
      },
    },
    product: {
      name: produto,
    },
  },
};

console.log(`\n[simularWebhookHubla] POST ${url}`);
console.log('Payload:');
console.log(JSON.stringify(payload, null, 2));
console.log('\nEnviando...');

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    console.log(`\nStatus: ${res.status}`);
    console.log(`Response body: ${body}`);
    if (res.status !== 200) {
      console.error('\n❌ Webhook NAO retornou 200. Investigar logs do backend.');
      process.exit(1);
    }

    console.log('\n✅ Webhook aceito (200 OK).');
    console.log('\n⚠️  processamento e assincrono (setImmediate) — aguarde 1-2s antes de consultar o banco.');
    console.log('\nValide no banco:\n');
    const ultimos8 = tel.replace(/\D/g, '').slice(-8);
    console.log(`  SELECT l.id, l.nome, l.venda_realizada, l.valor_venda, l.data_conversao,`);
    console.log(`         v.id AS venda_id, v.valor_total, v.recorrencia, v.hubla_invoice_id,`);
    console.log(`         v.origem_venda, v.closer_responsavel_id`);
    console.log(`  FROM leads l LEFT JOIN vendas v ON v.lead_id = l.id`);
    console.log(`  WHERE l.telefone LIKE '%${ultimos8}%'`);
    console.log(`  ORDER BY v.created_at DESC;`);
    console.log(`\ninvoice.id enviado: ${invoiceId}`);
  } catch (err) {
    console.error(`\n❌ Falha ao conectar: ${err.message}`);
    console.error(`Backend rodando em ${url}?`);
    console.error('Sugestao: npm run dev em outro terminal.');
    process.exit(1);
  }
})();
