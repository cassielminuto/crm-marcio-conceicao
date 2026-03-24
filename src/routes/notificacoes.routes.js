const { Router } = require('express');
const autenticar = require('../middleware/auth');
const { listarNotificacoes, contarNaoLidas, marcarComoLida, marcarTodasComoLidas } = require('../services/notificacaoService');

const router = Router();

router.get('/', autenticar, async (req, res, next) => {
  try {
    const naoLidas = req.query.nao_lidas === 'true';
    const limit = parseInt(req.query.limit || '30', 10);
    const notificacoes = await listarNotificacoes(req.usuario.id, { limit, apenasNaoLidas: naoLidas });
    const totalNaoLidas = await contarNaoLidas(req.usuario.id);
    res.json({ notificacoes, totalNaoLidas });
  } catch (err) {
    next(err);
  }
});

router.get('/count', autenticar, async (req, res, next) => {
  try {
    const total = await contarNaoLidas(req.usuario.id);
    res.json({ totalNaoLidas: total });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/lida', autenticar, async (req, res, next) => {
  try {
    await marcarComoLida(parseInt(req.params.id, 10), req.usuario.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/ler-todas', autenticar, async (req, res, next) => {
  try {
    await marcarTodasComoLidas(req.usuario.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
