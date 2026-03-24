const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const logger = require('../utils/logger');

async function getPerfil(req, res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        fotoUrl: true,
        ativo: true,
        createdAt: true,
        vendedor: {
          select: {
            id: true,
            nomeExibicao: true,
            papel: true,
            telefoneWhatsapp: true,
            scorePerformance: true,
            leadsAtivos: true,
            leadsMax: true,
            totalConversoes: true,
            rankingPosicao: true,
          },
        },
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    res.json(usuario);
  } catch (err) {
    next(err);
  }
}

async function atualizarPerfil(req, res, next) {
  try {
    const { nome, nomeExibicao, telefoneWhatsapp, senhaAtual, senhaNova } = req.body;

    const dados = {};
    if (nome) dados.nome = nome;

    if (senhaNova) {
      if (!senhaAtual) {
        return res.status(400).json({ error: 'Senha atual e obrigatoria para trocar a senha' });
      }
      const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
      const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash);
      if (!senhaValida) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
      dados.senhaHash = await bcrypt.hash(senhaNova, 10);
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: dados,
      select: { id: true, nome: true, email: true, perfil: true, fotoUrl: true },
    });

    if (req.usuario.vendedorId) {
      const dadosVendedor = {};
      if (nomeExibicao !== undefined) dadosVendedor.nomeExibicao = nomeExibicao;
      if (telefoneWhatsapp !== undefined) dadosVendedor.telefoneWhatsapp = telefoneWhatsapp ? telefoneWhatsapp.replace(/\D/g, '') : null;

      if (Object.keys(dadosVendedor).length > 0) {
        await prisma.vendedor.update({
          where: { id: req.usuario.vendedorId },
          data: dadosVendedor,
        });
      }
    }

    res.json(usuarioAtualizado);
  } catch (err) {
    next(err);
  }
}

async function uploadFoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de imagem e obrigatorio' });
    }

    const fotoUrl = `/uploads/avatars/${req.file.filename}`;

    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { fotoUrl },
    });

    logger.info(`Foto de perfil atualizada: usuario #${req.usuario.id}`);
    res.json({ fotoUrl });
  } catch (err) {
    next(err);
  }
}

async function removerFoto(req, res, next) {
  try {
    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { fotoUrl: null },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPerfil, atualizarPerfil, uploadFoto, removerFoto };
