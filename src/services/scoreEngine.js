/**
 * Score Engine — Calcula pontuação de 0 a 100 para leads.
 *
 * Dois formulários com critérios distintos:
 * - BIO: canal orgânico, começa com +30 pts. Max 100 pts.
 * - ANÚNCIO: canal pago, começa com +10 pts. Max 98 pts.
 *
 * REGRA CRÍTICA: Investimento NUNCA penaliza. Só pontua positivamente.
 */

function identificarCanal(tituloFormulario) {
  if (!tituloFormulario) return 'bio';
  const titulo = tituloFormulario.trim().toUpperCase();

  if (titulo.includes('ANUNCIO') || titulo.includes('ANÚNCIO') || titulo.includes('ANUNCIOS') || titulo.includes('ANÚNCIOS') || titulo.includes('ADS') || titulo.includes('TRÁFEGO') || titulo.includes('TRAFEGO')) {
    return 'anuncio';
  }

  if (titulo.includes('BIO') || titulo.includes('ORGÂNICO') || titulo.includes('ORGANICO')) {
    return 'bio';
  }

  return 'bio';
}

function calcularScoreBio(respostas) {
  let pontos = 30; // canal de origem Bio

  // Urgência declarada (pergunta 9)
  const urgencia = respostas.urgencia || '';
  if (urgencia.includes('Muito importante') && urgencia.includes('agir agora')) {
    pontos += 25;
  } else if (urgencia.includes('Importante') && urgencia.includes('mais informações')) {
    pontos += 12;
  }
  // "Ainda não sei" ou "Não é prioridade" = +0

  // Status de relacionamento (pergunta 4)
  const status = respostas.status_relacionamento || '';
  if (status.includes('com dificuldades') || status.toLowerCase().includes('crise')) {
    pontos += 20;
  } else if (status.includes('Em um relacionamento') || status.includes('Casado')) {
    pontos += 15;
  } else if (status.includes('Solteiro') || status.includes('Divorciado')) {
    pontos += 5;
  }
  // "Viúvo(a)" e outros = +0

  // Objetivo declarado (pergunta 5)
  const objetivo = respostas.objetivo || '';
  if (objetivo.includes('Alinhar meu casamento ou relacionamento')) {
    pontos += 20;
  } else if (objetivo.includes('Resolver conflitos entre vida amorosa e profissional')) {
    pontos += 10;
  } else if (objetivo.includes('Encontrar um parceiro')) {
    pontos += 8;
  } else if (objetivo.includes('Melhorar minha vida profissional')) {
    pontos += 3;
  }

  // Projeção — continuar por 1 ano (pergunta 8)
  const projecao = respostas.projecao || '';
  if (projecao.includes('Pioraria')) {
    pontos += 10;
  }

  // Investimento declarado (pergunta 10) — NUNCA penaliza
  const investimento = respostas.investimento || '';
  if (investimento.includes('R$')) {
    pontos += 5;
  }
  // "Prefiro entender melhor" ou em branco = +0

  return Math.min(pontos, 100);
}

function calcularScoreAnuncio(respostas) {
  let pontos = 10; // canal de origem Anúncio

  // Urgência numérica (pergunta 7)
  const urgencia = respostas.urgencia_numerica || '';
  if (urgencia.includes('8') && urgencia.includes('10')) {
    pontos += 25;
  } else if (urgencia.includes('5') && urgencia.includes('7')) {
    pontos += 12;
  }
  // "0 - 4" = +0

  // Situação no relacionamento (pergunta 4)
  const situacao = respostas.situacao_relacionamento || '';
  if (situacao.includes('crise') && situacao.includes('risco')) {
    pontos += 20;
  } else if (situacao.includes('com dificuldades')) {
    pontos += 15;
  } else if (situacao.includes('alguns problemas') && situacao.includes('nada muito')) {
    pontos += 10;
  } else if (situacao.includes('solteiro') || situacao === 'Em um Relacionamento') {
    pontos += 5;
  } else if (situacao.includes('tudo ótimo') || situacao.includes('tudo otimo')) {
    pontos += 2;
  }

  // O que já tentou (pergunta 5)
  const tentou = respostas.o_que_tentou || '';
  if (tentou.includes('terapia de casal') || tentou.includes('li livros')) {
    pontos += 15;
  } else if (tentou.includes('amigos e familiares')) {
    pontos += 8;
  } else if (tentou.includes('primeira vez')) {
    pontos += 5;
  }

  // Investimento (pergunta 8) — NUNCA penaliza
  const investimento = respostas.investimento || '';
  if (investimento.includes('Muito importante') && investimento.includes('agir imediatamente')) {
    pontos += 10;
  } else if (investimento.includes('R$')) {
    pontos += 5;
  }
  // Outros valores = +0

  // Tema de interesse (pergunta 9)
  const tema = respostas.tema_interesse || '';
  if (tema.includes('Muito importante') && tema.includes('agir agora')) {
    // Campo misturado — urgência no campo de tema
    pontos += 8;
  } else if (tema.includes('padrões inconscientes') || tema.includes('padroes inconscientes')) {
    pontos += 5;
  }

  return Math.min(pontos, 100);
}

function classificar(pontuacao) {
  if (pontuacao >= 75) return 'A';
  if (pontuacao >= 45) return 'B';
  return 'C';
}

/**
 * Extrai campos normalizados do payload do Respondi.
 * O Respondi envia respostas como array de objetos ou campos nomeados.
 */
function extrairRespostasBio(dadosRespondi) {
  const r = dadosRespondi;

  // Suporte a payload direto (campos nomeados) ou array de respostas
  if (Array.isArray(r.respostas)) {
    const resp = r.respostas;
    return {
      nome: resp[0]?.resposta || '',
      telefone: resp[1]?.resposta || '',
      email: resp[2]?.resposta || '',
      status_relacionamento: resp[3]?.resposta || '',
      objetivo: resp[4]?.resposta || '',
      dor_principal: resp[5]?.resposta || '',
      desafios: resp[6]?.resposta || '',
      projecao: resp[7]?.resposta || '',
      urgencia: resp[8]?.resposta || '',
      investimento: resp[9]?.resposta || '',
    };
  }

  return {
    nome: r.nome || '',
    telefone: r.telefone || r.whatsapp || '',
    email: r.email || '',
    status_relacionamento: r.status_relacionamento || '',
    objetivo: r.objetivo || '',
    dor_principal: r.dor_principal || '',
    desafios: r.desafios || '',
    projecao: r.projecao || '',
    urgencia: r.urgencia || '',
    investimento: r.investimento || '',
  };
}

function extrairRespostasAnuncio(dadosRespondi) {
  const r = dadosRespondi;

  if (Array.isArray(r.respostas)) {
    const resp = r.respostas;
    return {
      nome: resp[0]?.resposta || '',
      email: resp[1]?.resposta || '',
      telefone: resp[2]?.resposta || '',
      situacao_relacionamento: resp[3]?.resposta || '',
      o_que_tentou: resp[4]?.resposta || '',
      desafios: resp[5]?.resposta || '',
      urgencia_numerica: resp[6]?.resposta || '',
      investimento: resp[7]?.resposta || '',
      tema_interesse: resp[8]?.resposta || '',
    };
  }

  return {
    nome: r.nome || '',
    email: r.email || '',
    telefone: r.telefone || r.whatsapp || '',
    situacao_relacionamento: r.situacao_relacionamento || '',
    o_que_tentou: r.o_que_tentou || '',
    desafios: r.desafios || '',
    urgencia_numerica: r.urgencia_numerica || '',
    investimento: r.investimento || '',
    tema_interesse: r.tema_interesse || '',
  };
}

function calcularScore(canal, dadosRespondi) {
  if (canal === 'bio') {
    const respostas = extrairRespostasBio(dadosRespondi);
    const pontuacao = calcularScoreBio(respostas);
    return { pontuacao, classe: classificar(pontuacao), respostas };
  }

  if (canal === 'anuncio') {
    const respostas = extrairRespostasAnuncio(dadosRespondi);
    const pontuacao = calcularScoreAnuncio(respostas);
    return { pontuacao, classe: classificar(pontuacao), respostas };
  }

  return { pontuacao: 0, classe: 'C', respostas: {} };
}

module.exports = {
  identificarCanal,
  calcularScore,
  calcularScoreBio,
  calcularScoreAnuncio,
  classificar,
  extrairRespostasBio,
  extrairRespostasAnuncio,
};
