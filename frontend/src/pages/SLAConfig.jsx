import { useState, useEffect } from 'react';
import api from '../services/api';
import { Clock, Save, Shield } from 'lucide-react';

const CLASSE_INFO = {
  A: { cor: 'border-red-300 bg-red-50', text: 'text-red-700', desc: 'Leads quentes — closers lideres' },
  B: { cor: 'border-yellow-300 bg-yellow-50', text: 'text-yellow-700', desc: 'Leads mornos — closers independentes/trainees' },
  C: { cor: 'border-blue-300 bg-blue-50', text: 'text-blue-700', desc: 'Leads frios — nurturing automatico' },
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
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {salvoMsg && (
        <div className={`text-sm px-3 py-2 rounded-lg ${salvoMsg === 'Salvo!' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {salvoMsg}
        </div>
      )}

      {configs.map((config) => {
        const info = CLASSE_INFO[config.classeLead] || CLASSE_INFO.C;
        const isEditing = editando === config.classeLead;

        return (
          <div key={config.classeLead} className={`rounded-xl border-2 ${info.cor} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${info.text} bg-white`}>
                  {config.classeLead}
                </div>
                <div>
                  <h3 className={`font-semibold ${info.text}`}>Classe {config.classeLead}</h3>
                  <p className="text-xs text-gray-500">{info.desc}</p>
                </div>
              </div>

              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => salvar(config.classeLead)}
                    disabled={salvando}
                    className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    <Save size={12} /> {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-white"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => iniciarEdicao(config)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                >
                  Editar
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tempo maximo (min)</label>
                  <input
                    type="number"
                    value={form.tempo_maximo_minutos}
                    onChange={(e) => setForm({ ...form, tempo_maximo_minutos: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Alerta amarelo (%)</label>
                  <input
                    type="number"
                    value={form.alerta_amarelo_pct}
                    onChange={(e) => setForm({ ...form, alerta_amarelo_pct: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Alerta vermelho (%)</label>
                  <input
                    type="number"
                    value={form.alerta_vermelho_pct}
                    onChange={(e) => setForm({ ...form, alerta_vermelho_pct: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Redistribuir ao estourar</label>
                  <select
                    value={form.redistribuir_ao_estourar ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, redistribuir_ao_estourar: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">Sim</option>
                    <option value="false">Nao</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Clock size={10} /> Tempo maximo
                  </div>
                  <p className="text-sm font-bold text-gray-800">{formatarTempo(config.tempoMaximoMinutos)}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Alerta amarelo</div>
                  <p className="text-sm font-bold text-yellow-600">{config.alertaAmareloPct}%</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Alerta vermelho</div>
                  <p className="text-sm font-bold text-red-600">{config.alertaVermelhoPct}%</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Shield size={10} /> Redistribuir
                  </div>
                  <p className={`text-sm font-bold ${config.redistribuirAoEstourar ? 'text-green-600' : 'text-gray-400'}`}>
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
