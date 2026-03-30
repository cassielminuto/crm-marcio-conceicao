import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Package, ShieldOff, ShieldCheck } from 'lucide-react';

function fmtMoeda(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ProdutosExcluidos() {
  const [produtos, setProdutos] = useState([]);
  const [excluidos, setExcluidos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [prodRes, exclRes] = await Promise.all([
        api.get('/produtos-excluidos/todos'),
        api.get('/produtos-excluidos'),
      ]);
      setProdutos(prodRes.data);
      setExcluidos(exclRes.data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const nomesExcluidos = new Set(excluidos.map(e => e.nome));

  const toggle = async (nome) => {
    try {
      if (nomesExcluidos.has(nome)) {
        const item = excluidos.find(e => e.nome === nome);
        if (item) {
          await api.delete(`/produtos-excluidos/${item.id}`);
        }
      } else {
        await api.post('/produtos-excluidos', { nome });
      }
      carregar();
    } catch (err) {
      console.error('Erro ao alterar exclusao:', err);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  const totalExcluido = produtos
    .filter(p => nomesExcluidos.has(p.nome))
    .reduce((s, p) => s + p.valor, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-white">Produtos</h2>
          <p className="text-[12px] text-text-secondary mt-1">
            Produtos excluidos nao contam no faturamento comercial
          </p>
        </div>
        {totalExcluido > 0 && (
          <div className="bg-[rgba(225,112,85,0.08)] border border-[rgba(225,112,85,0.15)] rounded-[10px] px-3 py-2">
            <p className="text-[10px] text-text-muted">Total excluido</p>
            <p className="text-[14px] font-bold text-accent-danger">{fmtMoeda(totalExcluido)}</p>
          </div>
        )}
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-[14px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-4 py-3">Produto</th>
              <th className="text-center text-[10px] font-semibold text-text-muted uppercase px-4 py-3">Vendas</th>
              <th className="text-right text-[10px] font-semibold text-text-muted uppercase px-4 py-3">Valor</th>
              <th className="text-center text-[10px] font-semibold text-text-muted uppercase px-4 py-3">Status</th>
              <th className="text-center text-[10px] font-semibold text-text-muted uppercase px-4 py-3">Acao</th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-text-muted">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  Nenhum produto com vendas encontrado
                </td>
              </tr>
            ) : (
              produtos.map((p) => {
                const isExcluido = nomesExcluidos.has(p.nome);
                return (
                  <tr
                    key={p.nome}
                    className={`border-b border-border-subtle last:border-b-0 transition-colors ${
                      isExcluido ? 'opacity-60' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={`text-[12px] font-medium ${isExcluido ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                        {p.nome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[12px] text-text-secondary">{p.count}</td>
                    <td className="px-4 py-3 text-right text-[12px] font-medium text-text-primary">{fmtMoeda(p.valor)}</td>
                    <td className="px-4 py-3 text-center">
                      {isExcluido ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(225,112,85,0.12)] text-accent-danger">
                          <ShieldOff size={10} /> Excluido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(0,184,148,0.12)] text-accent-emerald">
                          <ShieldCheck size={10} /> Contabilizado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggle(p.nome)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          isExcluido
                            ? 'bg-[rgba(0,184,148,0.12)] text-accent-emerald hover:bg-[rgba(0,184,148,0.2)]'
                            : 'bg-[rgba(225,112,85,0.12)] text-accent-danger hover:bg-[rgba(225,112,85,0.2)]'
                        }`}
                      >
                        {isExcluido ? 'Incluir' : 'Excluir'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
