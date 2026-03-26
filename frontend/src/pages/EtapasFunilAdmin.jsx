import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Check, X } from 'lucide-react';

const CORES_PRESET = [
  '#3b82f6', '#eab308', '#a855f7', '#f97316', '#22c55e',
  '#ef4444', '#06b6d4', '#ec4899', '#6366f1', '#84cc16',
];

export default function EtapasFunilAdmin() {
  const [etapas, setEtapas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Form nova etapa
  const [novaLabel, setNovaLabel] = useState('');
  const [novaCor, setNovaCor] = useState('#6c5ce7');
  const [novoTipo, setNovoTipo] = useState('normal');
  const [criando, setCriando] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Edição inline
  const [editando, setEditando] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  // Modal exclusão
  const [excluindo, setExcluindo] = useState(null);
  const [moverParaId, setMoverParaId] = useState('');
  const [processandoExclusao, setProcessandoExclusao] = useState(false);

  const carregar = async () => {
    try {
      const { data } = await api.get('/etapas?todas=true');
      setEtapas(data.filter(e => e.ativo));
    } catch (err) {
      console.error('Erro ao carregar etapas:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const criarEtapa = async () => {
    if (!novaLabel.trim()) return;
    setCriando(true);
    try {
      await api.post('/etapas', { label: novaLabel.trim(), cor: novaCor, tipo: novoTipo });
      setNovaLabel('');
      setNovaCor('#6c5ce7');
      setNovoTipo('normal');
      setShowForm(false);
      await carregar();
    } catch (err) {
      console.error('Erro ao criar etapa:', err);
    } finally {
      setCriando(false);
    }
  };

  const salvarLabel = async (id) => {
    if (!editLabel.trim()) { setEditando(null); return; }
    try {
      await api.patch(`/etapas/${id}`, { label: editLabel.trim() });
      await carregar();
    } catch (err) {
      console.error('Erro ao atualizar etapa:', err);
    }
    setEditando(null);
  };

  const atualizarCor = async (id, cor) => {
    try {
      await api.patch(`/etapas/${id}`, { cor });
      setEtapas(prev => prev.map(e => e.id === id ? { ...e, cor } : e));
    } catch (err) {
      console.error('Erro ao atualizar cor:', err);
    }
  };

  const atualizarTipo = async (id, tipo) => {
    try {
      await api.patch(`/etapas/${id}`, { tipo });
      await carregar();
    } catch (err) {
      console.error('Erro ao atualizar tipo:', err);
    }
  };

  const moverEtapa = async (id, direcao) => {
    const idx = etapas.findIndex(e => e.id === id);
    if (idx < 0) return;
    const novaOrdem = [...etapas];
    const swap = direcao === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= novaOrdem.length) return;
    [novaOrdem[idx], novaOrdem[swap]] = [novaOrdem[swap], novaOrdem[idx]];
    setEtapas(novaOrdem);
    try {
      await api.post('/etapas/reordenar', { ordem: novaOrdem.map(e => e.id) });
    } catch (err) {
      console.error('Erro ao reordenar:', err);
      await carregar();
    }
  };

  const confirmarExclusao = (etapa) => {
    setExcluindo(etapa);
    setMoverParaId('');
  };

  const executarExclusao = async () => {
    if (!excluindo) return;
    setProcessandoExclusao(true);
    try {
      const body = {};
      if (excluindo._count > 0 && moverParaId) body.moverParaId = parseInt(moverParaId, 10);
      await api.delete(`/etapas/${excluindo.id}`, { data: body });
      setExcluindo(null);
      await carregar();
    } catch (err) {
      console.error('Erro ao excluir etapa:', err);
      alert(err.response?.data?.error || 'Erro ao excluir');
    } finally {
      setProcessandoExclusao(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-violet" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-white">Etapas do Funil</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] transition-all"
        >
          <Plus size={14} /> Nova Etapa
        </button>
      </div>

      {/* Form nova etapa */}
      {showForm && (
        <div className="bg-bg-elevated border border-border-default rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={novaLabel}
              onChange={e => setNovaLabel(e.target.value)}
              placeholder="Nome da etapa"
              className="flex-1 bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-[rgba(108,92,231,0.4)]"
              onKeyDown={e => e.key === 'Enter' && criarEtapa()}
              autoFocus
            />
            <select
              value={novoTipo}
              onChange={e => setNovoTipo(e.target.value)}
              className="bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none"
            >
              <option value="normal">Normal</option>
              <option value="ganho">Ganho</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted">Cor:</span>
            {CORES_PRESET.map(c => (
              <button
                key={c}
                onClick={() => setNovaCor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${novaCor === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={novaCor}
              onChange={e => setNovaCor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent ml-1"
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-text-secondary bg-bg-card border border-border-default hover:border-border-hover transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={criarEtapa}
              disabled={criando || !novaLabel.trim()}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-accent-violet hover:bg-[#5b4bd5] disabled:opacity-50 transition-all"
            >
              {criando ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de etapas */}
      <div className="space-y-2">
        {etapas.map((etapa, idx) => (
          <div key={etapa.id} className="flex items-center gap-3 px-4 py-3 bg-bg-elevated rounded-xl border border-border-subtle">
            {/* Setas reordenar */}
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moverEtapa(etapa.id, 'up')}
                disabled={idx === 0}
                className="text-text-muted hover:text-text-primary disabled:opacity-20 transition-colors"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={() => moverEtapa(etapa.id, 'down')}
                disabled={idx === etapas.length - 1}
                className="text-text-muted hover:text-text-primary disabled:opacity-20 transition-colors"
              >
                <ChevronDown size={12} />
              </button>
            </div>

            {/* Cor indicator */}
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: etapa.cor }} />

            {/* Label editável */}
            {editando === etapa.id ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onBlur={() => salvarLabel(etapa.id)}
                  onKeyDown={e => { if (e.key === 'Enter') salvarLabel(etapa.id); if (e.key === 'Escape') setEditando(null); }}
                  className="flex-1 bg-bg-input border border-border-default rounded-lg px-2 py-1 text-[13px] text-white outline-none"
                  autoFocus
                />
                <button onClick={() => salvarLabel(etapa.id)} className="p-1 text-accent-emerald"><Check size={13} /></button>
                <button onClick={() => setEditando(null)} className="p-1 text-text-muted"><X size={13} /></button>
              </div>
            ) : (
              <span className="text-[13px] font-semibold text-white flex-1">{etapa.label}</span>
            )}

            {/* Tipo badge */}
            <select
              value={etapa.tipo}
              onChange={e => atualizarTipo(etapa.id, e.target.value)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border-0 cursor-pointer outline-none ${
                etapa.tipo === 'ganho' ? 'bg-green-500/10 text-green-400' :
                etapa.tipo === 'perdido' ? 'bg-red-500/10 text-red-400' :
                'bg-white/5 text-text-muted'
              }`}
            >
              <option value="normal">Normal</option>
              <option value="ganho">Ganho</option>
              <option value="perdido">Perdido</option>
            </select>

            {/* Lead count */}
            <span className="text-[11px] text-text-muted whitespace-nowrap">{etapa._count || 0} leads</span>

            {/* Actions */}
            <button
              onClick={() => { setEditando(etapa.id); setEditLabel(etapa.label); }}
              className="p-1 rounded text-text-muted hover:text-accent-violet-light transition-colors"
            >
              <Pencil size={13} />
            </button>

            <input
              type="color"
              value={etapa.cor}
              onChange={e => atualizarCor(etapa.id, e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
            />

            <button
              onClick={() => confirmarExclusao(etapa)}
              className="p-1 rounded text-text-muted hover:text-accent-danger transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Modal exclusão */}
      {excluindo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-default rounded-2xl p-6 max-w-[420px] w-full mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[rgba(225,112,85,0.1)] flex items-center justify-center">
                <Trash2 size={20} className="text-accent-danger" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-white">Excluir etapa "{excluindo.label}"?</h3>
                <p className="text-[11px] text-text-muted">A etapa sera desativada</p>
              </div>
            </div>

            {excluindo._count > 0 && (
              <div className="mb-4">
                <p className="text-[12px] text-text-secondary mb-2">
                  Existem <strong className="text-white">{excluindo._count} leads</strong> nesta etapa. Para onde mover?
                </p>
                <select
                  value={moverParaId}
                  onChange={e => setMoverParaId(e.target.value)}
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)]"
                >
                  <option value="">Selecionar etapa destino...</option>
                  {etapas.filter(e => e.id !== excluindo.id).map(e => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setExcluindo(null)}
                disabled={processandoExclusao}
                className="px-4 py-2 rounded-lg text-[12px] font-semibold text-text-secondary bg-bg-elevated border border-border-default hover:border-border-hover transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={executarExclusao}
                disabled={processandoExclusao || (excluindo._count > 0 && !moverParaId)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-accent-danger hover:bg-[#c0392b] transition-all disabled:opacity-50"
              >
                <Trash2 size={13} />
                {processandoExclusao ? 'Excluindo...' : excluindo._count > 0 ? 'Mover e Excluir' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
