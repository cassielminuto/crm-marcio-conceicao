import { useState, useEffect } from 'react';
import api from '../services/api';
import { Clock, Save, Shield } from 'lucide-react';

const CLASSE_INFO = {
  A: { border: 'border-[rgba(225,112,85,0.3)]', text: 'text-[#e17055]', desc: 'Leads quentes — closers lideres' },
  B: { border: 'border-[rgba(253,203,110,0.3)]', text: 'text-[#fdcb6e]', desc: 'Leads mornos — closers independentes/trainees' },
  C: { border: 'border-[rgba(116,185,255,0.3)]', text: 'text-[#74b9ff]', desc: 'Leads frios — nurturing automatico' },
};

function formatarTempo(minutos) {
  if (minutos < 60) return `${minutos} min`;
  if (minutos < 1440) return `${Math.round(minutos / 60)} horas`;
  return `${Math.round(minutos / 1440)} dias`;
}

export default function SLAConfig() {
  const [configs, setConfigs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvoMsg, setSalvoMsg] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        const { data } = await api.get('/admin/sla');
        setConfigs(data);
      } catch (err) {
        console.error('Erro ao carregar SLA:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const iniciarEdicao = (config) => {
    setEditando(config.classeLead);
    setForm({
      tempo_maximo_minutos: config.tempoMaximoMinutos,
      alerta_amarelo_pct: config.alertaAmareloPct,
      alerta_vermelho_pct: config.alertaVermelhoPct,
      redistribuir_ao_estourar: config.redistribuirAoEstourar,
    });
    setSalvoMsg('');
  };

  const salvar = async (classe) => {
    setSalvando(true);
    try {
      const { data } = await api.patch(`/admin/sla/${classe}`, form);
      setConfigs((prev) => prev.map((c) => (c.classeLead === classe ? data : c)));
      setEditando(null);
      setSalvoMsg('Salvo!');
      setTimeout(() => setSalvoMsg(''), 2000);
    } catch (err) {
      console.error('Erro ao salvar SLA:', err);
      setSalvoMsg('Erro ao salvar');
    } finally {
      setSalvando(false);
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
      {salvoMsg && (
        <div className={`text-[12px] px-3 py-2 rounded-[10px] ${salvoMsg === 'Salvo!' ? 'bg-[rgba(0,184,148,0.1)] text-accent-emerald' : 'bg-[rgba(225,112,85,0.1)] text-accent-danger'}`}>
          {salvoMsg}
        </div>
      )}

      {configs.map((config) => {
        const info = CLASSE_INFO[config.classeLead] || CLASSE_INFO.C;
        const isEditing = editando === config.classeLead;

        return (
          <div key={config.classeLead} className={`bg-bg-card rounded-[14px] border-2 ${info.border} p-[22px]`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center text-[16px] font-bold ${info.text}`}>
                  {config.classeLead}
                </div>
                <div>
                  <h3 className={`font-semibold text-[13px] ${info.text}`}>Classe {config.classeLead}</h3>
                  <p className="text-[10px] text-text-muted">{info.desc}</p>
                </div>
              </div>

              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => salvar(config.classeLead)}
                    disabled={salvando}
                    className="flex items-center gap-1 bg-accent-emerald text-white px-3 py-1.5 rounded-[10px] text-[11px] font-semibold hover:shadow-[0_4px_16px_rgba(0,184,148,0.25)] disabled:opacity-50 transition-all"
                  >
                    <Save size={12} /> {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    className="px-3 py-1.5 rounded-[10px] text-[11px] text-text-muted hover:bg-white/[0.03]"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => iniciarEdicao(config)}
                  className="px-3 py-1.5 rounded-[10px] text-[11px] font-medium bg-bg-elevated text-text-secondary hover:border-border-active border border-border-default transition-all"
                >
                  Editar
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Tempo maximo (min)</label>
                  <input
                    type="number"
                    value={form.tempo_maximo_minutos}
                    onChange={(e) => setForm({ ...form, tempo_maximo_minutos: parseInt(e.target.value, 10) })}
                    className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Alerta amarelo (%)</label>
                  <input
                    type="number"
                    value={form.alerta_amarelo_pct}
                    onChange={(e) => setForm({ ...form, alerta_amarelo_pct: parseInt(e.target.value, 10) })}
                    className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Alerta vermelho (%)</label>
                  <input
                    type="number"
                    value={form.alerta_vermelho_pct}
                    onChange={(e) => setForm({ ...form, alerta_vermelho_pct: parseInt(e.target.value, 10) })}
                    className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Redistribuir ao estourar</label>
                  <select
                    value={form.redistribuir_ao_estourar ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, redistribuir_ao_estourar: e.target.value === 'true' })}
                    className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
                  >
                    <option value="true">Sim</option>
                    <option value="false">Nao</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-bg-elevated rounded-[10px] p-3">
                  <div className="flex items-center gap-1 text-[10px] text-text-muted mb-1">
                    <Clock size={10} /> Tempo maximo
                  </div>
                  <p className="text-[13px] font-bold text-white">{formatarTempo(config.tempoMaximoMinutos)}</p>
                </div>
                <div className="bg-bg-elevated rounded-[10px] p-3">
                  <div className="text-[10px] text-text-muted mb-1">Alerta amarelo</div>
                  <p className="text-[13px] font-bold text-accent-amber">{config.alertaAmareloPct}%</p>
                </div>
                <div className="bg-bg-elevated rounded-[10px] p-3">
                  <div className="text-[10px] text-text-muted mb-1">Alerta vermelho</div>
                  <p className="text-[13px] font-bold text-accent-danger">{config.alertaVermelhoPct}%</p>
                </div>
                <div className="bg-bg-elevated rounded-[10px] p-3">
                  <div className="flex items-center gap-1 text-[10px] text-text-muted mb-1">
                    <Shield size={10} /> Redistribuir
                  </div>
                  <p className={`text-[13px] font-bold ${config.redistribuirAoEstourar ? 'text-accent-emerald' : 'text-text-muted'}`}>
                    {config.redistribuirAoEstourar ? 'Sim' : 'Nao'}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
