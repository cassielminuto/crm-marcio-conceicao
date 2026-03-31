import { useState, useEffect } from 'react';
import api from '../services/api';
import AvatarVendedor from '../components/AvatarVendedor';
import { Save, Phone } from 'lucide-react';

export default function VendedoresAdmin() {
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState({});
  const [salvando, setSalvando] = useState(null);
  const [salvoMsg, setSalvoMsg] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        const { data } = await api.get('/vendedores');
        setVendedores(data);
        const edits = {};
        data.forEach(v => { edits[v.id] = v.telefoneWhatsapp || ''; });
        setEditando(edits);
      } catch (err) {
        console.error('Erro ao carregar vendedores:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const salvar = async (vendedorId) => {
    setSalvando(vendedorId);
    setSalvoMsg('');
    try {
      await api.patch(`/vendedores/${vendedorId}`, {
        telefoneWhatsapp: editando[vendedorId] || null,
      });
      setSalvoMsg(`Vendedor #${vendedorId} salvo!`);
      setTimeout(() => setSalvoMsg(''), 2000);
    } catch (err) {
      setSalvoMsg('Erro ao salvar');
      console.error(err);
    } finally {
      setSalvando(null);
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
        <div className={`text-[12px] px-3 py-2 rounded-[10px] ${salvoMsg.includes('salvo') ? 'bg-[rgba(0,184,148,0.1)] text-accent-emerald' : 'bg-[rgba(225,112,85,0.1)] text-accent-danger'}`}>
          {salvoMsg}
        </div>
      )}

      <p className="text-[11px] text-text-muted">
        Configure o numero de WhatsApp de cada vendedor para receber alertas de novos leads.
      </p>

      {vendedores.map((v) => (
        <div key={v.id} className="bg-bg-elevated border border-border-subtle rounded-[14px] p-[18px] flex items-center gap-4">
          <AvatarVendedor nome={v.nomeExibicao} fotoUrl={v.usuario?.fotoUrl} id={v.id} tamanho={40} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white">{v.nomeExibicao}</p>
            <p className="text-[10px] text-text-muted">{v.papel?.replace('_', ' ')} — {v.usuario?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={editando[v.id] || ''}
                onChange={(e) => setEditando(prev => ({ ...prev, [v.id]: e.target.value }))}
                placeholder="48999887766"
                className="w-[160px] bg-bg-input border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
              />
            </div>
            <button
              onClick={() => salvar(v.id)}
              disabled={salvando === v.id}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold bg-accent-emerald text-white hover:shadow-[0_4px_12px_rgba(0,184,148,0.25)] disabled:opacity-50 transition-all"
            >
              <Save size={12} />
              {salvando === v.id ? '...' : 'Salvar'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
