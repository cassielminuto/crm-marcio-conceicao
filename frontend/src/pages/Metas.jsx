import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Target, Plus, X } from 'lucide-react';

const STATUS_COR = {
  em_andamento: { bg: 'bg-[rgba(116,185,255,0.12)]', text: 'text-accent-info', label: 'Em andamento' },
  atingida: { bg: 'bg-[rgba(0,184,148,0.12)]', text: 'text-accent-emerald', label: 'Atingida' },
  nao_atingida: { bg: 'bg-[rgba(225,112,85,0.12)]', text: 'text-accent-danger', label: 'Nao atingida' },
};

export default function Metas() {
  const { usuario } = useAuth();
  const [metas, setMetas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ vendedor_id: '', periodo: '', valor_meta: '' });
  const [salvando, setSalvando] = useState(false);

  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';
  const periodoAtual = new Date().toISOString().slice(0, 7);

  const carregar = useCallback(async () => {
    try {
      const [metasRes, vendRes] = await Promise.all([
        api.get(`/metas?periodo=${periodoAtual}`),
        api.get('/vendedores'),
      ]);
      setMetas(metasRes.data);
      setVendedores(vendRes.data);
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
    } finally {
      setCarregando(false);
    }
  }, [periodoAtual]);

  useEffect(() => { carregar(); }, [carregar]);

  const criarMeta = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post('/metas', {
        vendedor_id: parseInt(form.vendedor_id, 10),
        periodo: form.periodo || periodoAtual,
        valor_meta: parseFloat(form.valor_meta),
      });
      setMostrarForm(false);
      setForm({ vendedor_id: '', periodo: '', valor_meta: '' });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar meta');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">Metas</h1>
          <p className="text-[13px] text-text-secondary mt-1">Periodo: {periodoAtual}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white px-4 py-2 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] transition-all duration-250"
          >
            {mostrarForm ? <X size={16} /> : <Plus size={16} />}
            {mostrarForm ? 'Cancelar' : 'Nova Meta'}
          </button>
        )}
      </div>

      {mostrarForm && isAdmin && (
        <form onSubmit={criarMeta} className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] space-y-4">
          <h3 className="text-[12px] font-semibold text-text-secondary">Criar nova meta</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={form.vendedor_id}
              onChange={(e) => setForm({ ...form, vendedor_id: e.target.value })}
              className="bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
              required
            >
              <option value="">Selecionar vendedor</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.nomeExibicao}</option>
              ))}
            </select>
            <input
              type="month"
              value={form.periodo || periodoAtual}
              onChange={(e) => setForm({ ...form, periodo: e.target.value })}
              className="bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor da meta (R$)"
              value={form.valor_meta}
              onChange={(e) => setForm({ ...form, valor_meta: e.target.value })}
              className="bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="bg-accent-emerald text-white px-6 py-2 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(0,184,148,0.25)] disabled:opacity-50 transition-all"
          >
            {salvando ? 'Salvando...' : 'Criar Meta'}
          </button>
        </form>
      )}

      {metas.length === 0 ? (
        <div className="bg-bg-card border border-border-subtle rounded-[14px] p-12 text-center">
          <Target size={40} className="text-text-faint mx-auto mb-3" />
          <p className="text-text-muted">Nenhuma meta definida para este periodo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {metas.map((meta) => {
            const pct = Number(meta.percentual) || 0;
            const status = STATUS_COR[meta.status] || STATUS_COR.em_andamento;

            return (
              <div key={meta.id} className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] hover:border-border-hover transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#00cec9] flex items-center justify-center text-[14px] font-bold text-white">
                      {meta.vendedor?.nomeExibicao?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-[13px]">{meta.vendedor?.nomeExibicao}</p>
                      <p className="text-[10px] text-text-muted">{meta.vendedor?.papel?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-text-secondary">
                      R$ {Number(meta.valorAtual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-medium text-text-primary">
                      R$ {Number(meta.valorMeta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="w-full bg-bg-elevated rounded h-[6px]">
                    <div
                      className="h-[6px] rounded bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>{pct.toFixed(1)}% atingido</span>
                    {meta.leadsMeta && (
                      <span>{meta.leadsAtual}/{meta.leadsMeta} leads</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
