import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Target, Plus, X } from 'lucide-react';

const STATUS_COR = {
  em_andamento: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Em andamento' },
  atingida: { bg: 'bg-green-100', text: 'text-green-700', label: 'Atingida' },
  nao_atingida: { bg: 'bg-red-100', text: 'text-red-700', label: 'Nao atingida' },
};

function barraProgresso(percentual) {
  const pct = Math.min(percentual, 100);
  let cor = 'bg-blue-500';
  if (pct >= 100) cor = 'bg-green-500';
  else if (pct >= 70) cor = 'bg-yellow-500';
  else if (pct < 30) cor = 'bg-red-500';
  return { pct, cor };
}

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Metas</h1>
          <p className="text-sm text-gray-500 mt-1">Periodo: {periodoAtual}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {mostrarForm ? <X size={16} /> : <Plus size={16} />}
            {mostrarForm ? 'Cancelar' : 'Nova Meta'}
          </button>
        )}
      </div>

      {/* Formulário de criação */}
      {mostrarForm && isAdmin && (
        <form onSubmit={criarMeta} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Criar nova meta</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={form.vendedor_id}
              onChange={(e) => setForm({ ...form, vendedor_id: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor da meta (R$)"
              value={form.valor_meta}
              onChange={(e) => setForm({ ...form, valor_meta: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Salvando...' : 'Criar Meta'}
          </button>
        </form>
      )}

      {/* Lista de metas */}
      {metas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Nenhuma meta definida para este periodo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {metas.map((meta) => {
            const pct = Number(meta.percentual) || 0;
            const barra = barraProgresso(pct);
            const status = STATUS_COR[meta.status] || STATUS_COR.em_andamento;

            return (
              <div key={meta.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600">
                      {meta.vendedor?.nomeExibicao?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{meta.vendedor?.nomeExibicao}</p>
                      <p className="text-xs text-gray-400">{meta.vendedor?.papel?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      R$ {Number(meta.valorAtual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-medium text-gray-700">
                      R$ {Number(meta.valorMeta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${barra.cor}`}
                      style={{ width: `${barra.pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-400">
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
