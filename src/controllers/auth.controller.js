const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;
    const resultado = await authService.login(email, senha);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const resultado = await authService.refresh(refreshToken);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const usuario = await authService.me(req.usuario.id);
    res.json(usuario);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refresh, me };
