function validar(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body);

    if (!resultado.success) {
      const erros = resultado.error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensagem: issue.message,
      }));
      return res.status(400).json({ error: 'Dados inválidos', detalhes: erros });
    }

    req.body = resultado.data;
    next();
  };
}

module.exports = validar;
