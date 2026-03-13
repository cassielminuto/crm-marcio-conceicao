const env = require('../config/env');
const logger = require('../utils/logger');

const INSTANCE_NAME = 'crm-compativeis';

async function fetchEvolution(path, options = {}) {
  const url = `${env.evolutionApiUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: env.evolutionApiKey,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error(`Evolution API error: ${res.status} ${path} — ${body}`);
    throw Object.assign(new Error(`Evolution API: ${res.status}`), { statusCode: res.status });
  }

  return res.json();
}

async function criarInstancia() {
  return fetchEvolution('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: INSTANCE_NAME,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }),
  });
}

async function statusConexao() {
  try {
    const data = await fetchEvolution(`/instance/connectionState/${INSTANCE_NAME}`);
    return data;
  } catch (err) {
    if (err.statusCode === 404) {
      return { instance: INSTANCE_NAME, state: 'not_found' };
    }
    throw err;
  }
}

async function gerarQrCode() {
  try {
    const data = await fetchEvolution(`/instance/connect/${INSTANCE_NAME}`);
    return data;
  } catch (err) {
    // Se instância não existe, criar primeiro
    if (err.statusCode === 404) {
      const criada = await criarInstancia();
      return criada;
    }
    throw err;
  }
}

function formatarTelefone(telefone) {
  // Remover tudo que não é dígito
  let num = telefone.replace(/\D/g, '');
  // Adicionar código do país se não tiver
  if (!num.startsWith('55')) num = '55' + num;
  return num;
}

async function enviarMensagem(telefone, texto) {
  const numero = formatarTelefone(telefone);

  logger.info(`WhatsApp: enviando para ${numero}`);

  return fetchEvolution(`/message/sendText/${INSTANCE_NAME}`, {
    method: 'POST',
    body: JSON.stringify({
      number: numero,
      text: texto,
    }),
  });
}

function substituirVariaveis(template, dados) {
  let texto = template;
  const variaveis = {
    '{{nome}}': dados.nome || '',
    '{{telefone}}': dados.telefone || '',
    '{{email}}': dados.email || '',
    '{{dor_principal}}': dados.dorPrincipal || dados.dor_principal || '',
    '{{objecao_principal}}': dados.objecaoPrincipal || dados.objecao_principal || '',
    '{{classe}}': dados.classe || '',
    '{{pontuacao}}': String(dados.pontuacao || ''),
    '{{vendedor}}': dados.vendedor?.nomeExibicao || dados.vendedorNome || '',
    '{{canal}}': dados.canal || '',
    '{{etapa}}': dados.etapaFunil || dados.etapa_funil || '',
  };

  for (const [chave, valor] of Object.entries(variaveis)) {
    texto = texto.replaceAll(chave, valor);
  }

  return texto;
}

async function enviarComTemplate(telefone, templateConteudo, dadosLead) {
  const texto = substituirVariaveis(templateConteudo, dadosLead);
  return enviarMensagem(telefone, texto);
}

module.exports = {
  criarInstancia,
  statusConexao,
  gerarQrCode,
  enviarMensagem,
  enviarComTemplate,
  substituirVariaveis,
  formatarTelefone,
};
