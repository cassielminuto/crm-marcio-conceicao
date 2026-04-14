const CORES_VENDEDOR = {
  1: '#3b82f6',   // Lucas — azul
  8: '#ec4899',   // Emília — rosa
  5: '#f59e0b',   // Cassiel — âmbar
  6: '#10b981',   // Gabriel — verde
  11: '#06b6d4',  // Thomaz — ciano
};

const COR_FALLBACK = '#6b7280'; // cinza

function corDoVendedor(vendedorId) {
  return CORES_VENDEDOR[vendedorId] || COR_FALLBACK;
}

export { CORES_VENDEDOR, COR_FALLBACK, corDoVendedor };
