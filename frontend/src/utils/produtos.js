/**
 * Extrai o nome REAL do produto Hubla de um lead.
 * NÃO usa formularioTitulo (que é o nome do formulário Respondi).
 * Retorna null se o lead não tem produto Hubla.
 */
export function extrairProduto(lead) {
  const dr = lead.dadosRespondi;
  if (!dr) return null;
  if (dr.hubla?.produto) return normalizarProduto(dr.hubla.produto);
  if (dr.hubla?.produtos?.length > 0) return normalizarProduto(dr.hubla.produtos[0]);
  if (dr.produtos?.length > 0) return normalizarProduto(dr.produtos[0]);
  return null;
}

/**
 * Normaliza encoding Unicode (NFC) e trim para evitar duplicatas
 * como "Conceiçao" vs "Conceição".
 */
export function normalizarProduto(nome) {
  if (!nome) return null;
  return nome.normalize('NFC').trim();
}

/**
 * Extrai lista de produtos únicos de um array de leads/vendas.
 * Só inclui leads com vendaRealizada = true e produto Hubla real.
 */
export function extrairProdutosUnicos(leads) {
  const set = new Set();
  for (const l of leads) {
    if (!l.vendaRealizada) continue;
    const p = extrairProduto(l);
    if (p) set.add(p);
  }
  return [...set].sort();
}

/**
 * Verifica se um lead deve ser excluído pelo filtro de produtos.
 * Retorna true se o lead TEM produto Hubla e esse produto está na lista de excluídos.
 * Leads sem produto Hubla NÃO são afetados pelo filtro.
 */
export function isProdutoExcluido(lead, produtosExcluidos) {
  if (!produtosExcluidos || produtosExcluidos.size === 0) return false;
  const p = extrairProduto(lead);
  if (!p) return false;
  return produtosExcluidos.has(p);
}
