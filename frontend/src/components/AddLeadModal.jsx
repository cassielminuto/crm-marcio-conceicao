import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, X, Phone, Mail, User, Tag, MessageSquare } from 'lucide-react';

function formatarTelefone(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 7) return `${digitos.slice(0, 2)} ${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)} ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export default function AddLeadModal({ isOpen, onClose, onLeadCriado, vendedores }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const modalRef = useRef(null);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [canal, setCanal] = useState('bio');
  const [classe, setClasse] = useState('B');
  const [vendedorSelecionado, setVendedorSelecionado] = useState('auto');
  const [observacao, setObservacao] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState('');

  // Set default vendedor
  useEffect(() => {
    if (usuario?.vendedorId) {
      setVendedorSelecionado(String(usuario.vendedorId));
    } else {
      setVendedorSelecionado('auto');
    }
  }, [usuario]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const limparForm = () => {
    setNome(''); setTelefone(''); setEmail(''); setCanal('bio'); setClasse('B');
    setVendedorSelecionado(usuario?.vendedorId ? String(usuario.vendedorId) : 'auto');
    setObservacao(''); setErro('');
  };

  const handleClose = () => {
    limparForm();
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleSubmit = async () => {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (nome.trim().length < 2) { setErro('Nome deve ter pelo menos 2 caracteres'); return; }
    if (telefoneLimpo.length < 10) { setErro('Telefone deve ter pelo menos 10 digitos'); return; }

    setCriando(true);
    setErro('');

    try {
      const payload = {
        nome: nome.trim(),
        telefone: telefoneLimpo,
        email: email.trim() || null,
        canal,
        classe,
      };

      if (vendedorSelecionado && vendedorSelecionado !== 'auto') {
        payload.vendedor_id = parseInt(vendedorSelecionado, 10);
      }

      if (observacao.trim()) {
        payload.observacao = observacao.trim();
      }

      const { data } = await api.post('/leads', payload);

      if (onLeadCriado) onLeadCriado(data);
      limparForm();
      onClose();
    } catch (err) {
      if (err.response?.status === 409) {
        const existente = err.response.data.leadExistente;
        setErro(`duplicado:${existente.id}:${existente.nome}`);
      } else {
        setErro(err.response?.data?.error || 'Erro ao criar lead');
      }
    } finally {
      setCriando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div ref={modalRef} className="bg-bg-card border border-border-default rounded-2xl w-full max-w-[520px] mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] flex items-center justify-center">
              <UserPlus size={16} className="text-white" />
            </div>
            <h2 className="text-[15px] font-bold text-white">Novo Lead</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.05] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Erro */}
          {erro && erro.startsWith('duplicado:') ? (
            <div className="bg-[rgba(253,203,110,0.06)] border border-[rgba(253,203,110,0.15)] rounded-lg p-3 text-[12px]">
              <p className="text-accent-amber font-semibold mb-1">Lead ja existe!</p>
              <p className="text-text-secondary">
                Ja existe um lead com esse telefone:{' '}
                <button
                  onClick={() => { handleClose(); navigate(`/leads/${erro.split(':')[1]}`); }}
                  className="text-accent-violet-light hover:underline font-semibold"
                >
                  {erro.split(':')[2]} — Ver lead
                </button>
              </p>
            </div>
          ) : erro ? (
            <div className="bg-[rgba(225,112,85,0.06)] border border-[rgba(225,112,85,0.15)] rounded-lg p-3 text-[12px] text-accent-danger">
              {erro}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
                Nome completo *
              </label>
              <div className="relative">
                <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do lead"
                  className="w-full bg-bg-input border border-border-default rounded-lg pl-8 pr-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
                  autoFocus
                />
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
                Telefone (WhatsApp) *
              </label>
              <div className="relative">
                <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                  placeholder="51 99900-1122"
                  className="w-full bg-bg-input border border-border-default rounded-lg pl-8 pr-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full bg-bg-input border border-border-default rounded-lg pl-8 pr-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
                />
              </div>
            </div>

            {/* Canal */}
            <div>
              <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
                Canal de origem
              </label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
              >
                <option value="bio">Bio (organico)</option>
                <option value="anuncio">Anuncio (pago)</option>
                <option value="evento">Evento</option>
              </select>
            </div>

            {/* Classe */}
            <div>
              <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
                Classe
              </label>
              <select
                value={classe}
                onChange={(e) => setClasse(e.target.value)}
                className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
              >
                <option value="A">A — Quente</option>
                <option value="B">B — Morno</option>
                <option value="C">C — Frio</option>
              </select>
            </div>

            {/* Vendedor */}
            <div>
              <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
                Atribuir para
              </label>
              <select
                value={vendedorSelecionado}
                onChange={(e) => setVendedorSelecionado(e.target.value)}
                className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
              >
                <option value="auto">
                  {usuario?.vendedorId ? 'Eu mesmo' : 'Distribuicao automatica'}
                </option>
                {vendedores?.filter(v => v.ativo !== false).map(v => (
                  <option key={v.id} value={v.id}>{v.nomeExibicao || v.usuario?.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Observacao */}
          <div>
            <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Observacao inicial
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Anotacoes sobre o lead..."
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-subtle">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-[10px] text-[12px] font-semibold text-text-secondary bg-bg-elevated border border-border-default hover:border-border-hover transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={criando}
            className="flex items-center gap-2 px-5 py-2 rounded-[10px] text-[12px] font-semibold text-white bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] disabled:opacity-50 transition-all"
          >
            <UserPlus size={14} />
            {criando ? 'Criando...' : 'Adicionar Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
