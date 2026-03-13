function autorizar(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({ error: 'Acesso negado. Perfil insuficiente.' });
    }

    next();
  };
}

module.exports = autorizar;
