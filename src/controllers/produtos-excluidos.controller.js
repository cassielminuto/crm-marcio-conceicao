const prisma = require('../config/database');

async function listar(req, res, next) {
  try {
    const produtos = await prisma.produtoExcluido.findMany({ orderBy: { nome: 'asc' } });
    res.json(produtos);
  } catch (err) {
    next(err);
  }
}

async function listarProdutos(req, res, next) {
  try {
    const leads = await prisma.lead.findMany({
      where: { vendaRealizada: true },
      select: { formularioTitulo: true, dadosRespondi: true, produtoHubla: true, valorVenda: true },
    });

    const produtos = new Map();
    for (const l of leads) {
      const nome = l.produtoHubla || l.dadosRespondi?.hubla?.produto || l.formularioTitulo || 'Desconhecido';
      if (!produtos.has(nome)) {
        produtos.set(nome, { nome, count: 0, valor: 0 });
      }
      const p = produtos.get(nome);
      p.count++;
      p.valor += l.valorVenda ? Number(l.valorVenda) : 0;
    }

    res.json(Array.from(produtos.values()).sort((a, b) => b.count - a.count));
  } catch (err) {
    next(err);
  }
}

async function adicionar(req, res, next) {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome do produto e obrigatorio' });
    const produto = await prisma.produtoExcluido.create({ data: { nome, criadoPor: req.usuario?.id } });
    res.json(produto);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Produto ja esta na lista de excluidos' });
    next(err);
  }
}

async function remover(req, res, next) {
  try {
    await prisma.produtoExcluido.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, listarProdutos, adicionar, remover };
