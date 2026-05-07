// Persistência de filtros via sessionStorage.
// Sobrevive a refresh, reseta ao fechar a aba (nova sessão).

function replacer(_key, value) {
  if (value instanceof Set) return { __t: 'Set', v: Array.from(value) };
  if (value instanceof Date) return { __t: 'Date', v: value.toISOString() };
  return value;
}

function reviver(_key, value) {
  if (value && typeof value === 'object' && value.__t === 'Set') return new Set(value.v);
  if (value && typeof value === 'object' && value.__t === 'Date') return new Date(value.v);
  return value;
}

export function salvarFiltros(chave, objeto) {
  try {
    sessionStorage.setItem(chave, JSON.stringify(objeto, replacer));
  } catch {
    // sessionStorage indisponível (modo privado, quota, etc) — silencioso
  }
}

export function carregarFiltros(chave, defaults) {
  try {
    const raw = sessionStorage.getItem(chave);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw, reviver);
    // Merge raso com defaults pra cobrir chaves novas adicionadas depois
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function limparFiltros(chave) {
  try {
    sessionStorage.removeItem(chave);
  } catch {
    // silencioso
  }
}
