const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const env = require('../config/env');

async function login(email, senha) {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    include: { vendedor: true },
  });

  if (!usuario || !usuario.ativo) {
    throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 });
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaCorreta) {
    throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 });
  }

  const payload = {
    id: usuario.id,
    email: usuario.email,
    perfil: usuario.perfil,
    vendedorId: usuario.vendedor?.id || null,
  };

  const accessToken = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  const refreshToken = jwt.sign({ id: usuario.id }, env.jwtSecret, { expiresIn: '30d' });

  return {
    accessToken,
    refreshToken,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      fotoUrl: usuario.fotoUrl || null,
      vendedorId: usuario.vendedor?.id || null,
    },
  };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtSecret);
  } catch {
    throw Object.assign(new Error('Refresh token inválido'), { statusCode: 401 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.id },
    include: { vendedor: true },
  });

  if (!usuario || !usuario.ativo) {
    throw Object.assign(new Error('Usuário não encontrado ou inativo'), { statusCode: 401 });
  }

  const novoPayload = {
    id: usuario.id,
    email: usuario.email,
    perfil: usuario.perfil,
    vendedorId: usuario.vendedor?.id || null,
  };

  const accessToken = jwt.sign(novoPayload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

  return { accessToken };
}

async function me(usuarioId) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { vendedor: true },
  });

  if (!usuario || !usuario.ativo) {
    throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 });
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    fotoUrl: usuario.fotoUrl || null,
    ativo: usuario.ativo,
    createdAt: usuario.createdAt,
    vendedor: usuario.vendedor
      ? {
          id: usuario.vendedor.id,
          nomeExibicao: usuario.vendedor.nomeExibicao,
          papel: usuario.vendedor.papel,
          classesAtendidas: usuario.vendedor.classesAtendidas,
          leadsAtivos: usuario.vendedor.leadsAtivos,
          leadsMax: usuario.vendedor.leadsMax,
          totalConversoes: usuario.vendedor.totalConversoes,
          scorePerformance: usuario.vendedor.scorePerformance,
        }
      : null,
  };
}

module.exports = { login, refresh, me };
