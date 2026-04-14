import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Calendar, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ConfirmDialog from './ConfirmDialog';

const TIPOS = [
  { value: 'reuniao_manual', label: 'Reunião manual' },
  { value: 'bloco_on', label: 'Bloco ON (disponível)' },
  { value: 'bloco_off', label: 'Bloco OFF (indisponível)' },
  { value: 'evento_personalizado', label: 'Evento personalizado' },
];

const CORES_PRESET = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

const TITULOS_DEFAULT = {
  bloco_on: 'Disponível',
  bloco_off: 'Indisponível',
  reuniao_manual: '',
  evento_personalizado: '',
};

export default function AgendaFormModal({ isOpen, onClose, onSaved, evento, vendedores = [], defaultStart, defaultEnd }) {
  const { usuario } = useAuth();
  const modalRef = useRef(null);
  const isEdit = !!evento;

  const isAdminGestorSdr = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor' || usuario?.perfil === 'sdr';

  const [tipo, setTipo] = useState('reuniao_manual');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [cor, setCor] = useState('#8b5cf6');
  const [contatoNome, setContatoNome] = useState('');
  const [contatoTelefone, setContatoTelefone] = useState('');
  const [leadId, setLeadId] = useState(null);
  const [leadNome, setLeadNome] = useState('');

  // Busca de leads
  const [buscaLead, setBuscaLead] = useState('');
  const [resultadosLead, setResultadosLead] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const buscaRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Inicializar campos
  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && evento) {
      setTipo(evento.tipo);
      setTitulo(evento.titulo);
      setDescricao(evento.descricao || '');
      setInicio(formatDatetimeLocal(evento.inicio));
      setFim(formatDatetimeLocal(evento.fim));
      setVendedorId(String(evento.vendedorId));
      setCor(evento.cor || '#8b5cf6');
      setContatoNome(evento.contatoNome || '');
      setContatoTelefone(evento.contatoTelefone || '');
      setLeadId(evento.leadId || null);
      setLeadNome('');
    } else {
      setTipo('reuniao_manual');
      setTitulo('');
      setDescricao('');
      setInicio(defaultStart || '');
      setFim(defaultEnd || '');
      setVendedorId(usuario?.vendedorId ? String(usuario.vendedorId) : '');
      setCor('#8b5cf6');
      setContatoNome('');
      setContatoTelefone('');
      setLeadId(null);
      setLeadNome('');
    }
    setErro('');
    setBuscaLead('');
    setResultadosLead([]);
  }, [isOpen, evento, isEdit, defaultStart, defaultEnd, usuario]);

  // Auto-título pra blocos ON/OFF
  useEffect(() => {
    if (!isEdit && (tipo === 'bloco_on' || tipo === 'bloco_off')) {
      setTitulo(TITULOS_DEFAULT[tipo]);
    }
  }, [tipo, isEdit]);

  // Auto-fim = inicio + 30min (se não editando)
  useEffect(() => {
    if (inicio && !isEdit && !fim) {
      const d = new Date(inicio);
      d.setMinutes(d.getMinutes() + 30);
      setFim(formatDatetimeLocal(d));
    }
  }, [inicio, isEdit, fim]);

  // Busca de leads com debounce
  useEffect(() => {
    if (buscaLead.length < 2) { setResultadosLead([]); return; }
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await api.get(`/leads/busca?q=${encodeURIComponent(buscaLead)}`);
        setResultadosLead(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch { setResultadosLead([]); }
      finally { setBuscando(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaLead]);

  function formatDatetimeLocal(d) {
    const dt = new Date(d);
    const pad = n => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }

  function selecionarLead(lead) {
    setLeadId(lead.id);
    setLeadNome(lead.nome);
    setBuscaLead('');
    setResultadosLead([]);
    if (!titulo) setTitulo(`Reunião com ${lead.nome}`);
    if (!contatoNome) setContatoNome(lead.nome);
    if (!contatoTelefone && lead.telefone) setContatoTelefone(lead.telefone);
  }

  function limparLead() {
    setLeadId(null);
    setLeadNome('');
  }

  async function handleSubmit(overrideOff = false) {
    setErro('');

    if (!titulo.trim()) { setErro('Título é obrigatório'); return; }
    if (!inicio) { setErro('Data de início é obrigatória'); return; }
    if (!fim) { setErro('Data de fim é obrigatória'); return; }
    if (new Date(fim) <= new Date(inicio)) { setErro('Fim deve ser depois do início'); return; }

    const targetVendedorId = isAdminGestorSdr && vendedorId ? Number(vendedorId) : undefined;

    const payload = {
      tipo,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      inicio,
      fim,
      cor: tipo === 'evento_personalizado' ? cor : null,
      confirmar_override: overrideOff || undefined,
    };

    if (targetVendedorId) payload.vendedorId = targetVendedorId;

    if (tipo === 'reuniao_manual') {
      if (leadId) payload.leadId = leadId;
      if (contatoNome.trim()) payload.contatoNome = contatoNome.trim();
      if (contatoTelefone.trim()) payload.contatoTelefone = contatoTelefone.trim();
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/agenda/${evento.id}`, payload);
      } else {
        await api.post('/agenda', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.error === 'horario_off' && !overrideOff) {
        setSaving(false);
        setConfirmDialog({
          titulo: 'Horário OFF',
          mensagem: 'Vendedor está em horário OFF nesse período. Deseja agendar mesmo assim?',
          tipo: 'warning',
          textoBotaoConfirmar: 'Sim, agendar',
          onConfirm: () => {
            setConfirmDialog(null);
            handleSubmit(true);
          },
        });
        return;
      } else {
        setErro(resp?.error || resp?.message || 'Erro ao salvar evento');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleOverlayClick(e) {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  }

  if (!isOpen) return null;

  const isReuniao = tipo === 'reuniao_manual';
  const isBloco = tipo === 'bloco_on' || tipo === 'bloco_off';
  const isPersonalizado = tipo === 'evento_personalizado';

  return <>{createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm animate-backdrop-fade"
      onClick={handleOverlayClick}
    >
      <div ref={modalRef} className="bg-bg-card border border-border-default rounded-2xl w-full max-w-[520px] mx-4 overflow-hidden animate-modal-scale-in shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-accent-violet to-accent-info flex items-center justify-center">
              <Calendar size={16} className="text-white" />
            </div>
            <h2 className="text-[15px] font-bold text-text-primary">{isEdit ? 'Editar Evento' : 'Novo Evento'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-[var(--t-hover-bg)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Erro */}
          {erro && (
            <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg p-3 text-[12px] text-accent-danger">
              {erro}
            </div>
          )}

          {/* Tipo (radio) */}
          {!isEdit && (
            <div>
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value)}
                    className={`px-3 py-2 rounded-lg text-[12px] font-medium border transition-all ${
                      tipo === t.value
                        ? 'border-accent-violet bg-[rgba(124,58,237,0.12)] text-accent-violet-light'
                        : 'border-border-default bg-bg-input text-text-secondary hover:border-border-hover'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vendedor (admin/gestor/sdr) */}
          {isAdminGestorSdr && vendedores.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1 block">Closer</label>
              <select
                value={vendedorId}
                onChange={e => setVendedorId(e.target.value)}
                className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-violet transition-colors"
              >
                <option value="">Selecione...</option>
                {vendedores.map(v => (
                  <option key={v.id} value={v.id}>{v.nomeExibicao || `Vendedor #${v.id}`}</option>
                ))}
              </select>
            </div>
          )}

          {/* Busca de lead (só reunião manual) */}
          {isReuniao && (
            <div>
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1 block">Vincular lead (opcional)</label>
              {leadId ? (
                <div className="flex items-center gap-2 bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.2)] rounded-lg px-3 py-2">
                  <span className="text-sm text-text-primary flex-1">{leadNome || `Lead #${leadId}`}</span>
                  <button onClick={limparLead} className="text-text-muted hover:text-accent-danger text-xs">remover</button>
                </div>
              ) : (
                <div className="relative" ref={buscaRef}>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={buscaLead}
                      onChange={e => setBuscaLead(e.target.value)}
                      placeholder="Buscar lead por nome ou telefone..."
                      className="w-full bg-bg-input border border-border-default rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent-violet transition-colors"
                    />
                    {buscando && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted animate-spin" />}
                  </div>
                  {resultadosLead.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-bg-elevated border border-border-default rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                      {resultadosLead.map(lead => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => selecionarLead(lead)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--t-hover-bg)] transition-colors"
                        >
                          <span className="text-text-primary font-medium">{lead.nome}</span>
                          {lead.telefone && <span className="text-text-muted ml-2">{lead.telefone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Contato avulso (reunião manual sem lead) */}
          {isReuniao && !leadId && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1 block">Nome contato</label>
                <input
                  type="text"
                  value={contatoNome}
                  onChange={e => setContatoNome(e.target.value)}
                  placeholder="Nome..."
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent-violet transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1 block">Telefone</label>
                <input
                  type="text"
                  value={contatoTelefone}
                  onChange={e => setContatoTelefone(e.target.value)}
                  placeholder="Telefone..."
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent-violet transition-colors"
                />
              </div>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1 block">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder={isBloco ? 'Ex: Almoço' : 'Ex: Reunião com João'}
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent-violet transition-colors"
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1 block">Início</label>
              <input
                type="datetime-local"
                value={inicio}
                onChange={e => setInicio(e.target.value)}
                className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-violet transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1 block">Fim</label>
              <input
                type="datetime-local"
                value={fim}
                onChange={e => setFim(e.target.value)}
                className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-violet transition-colors"
              />
            </div>
          </div>

          {/* Cor (evento personalizado) */}
          {isPersonalizado && (
            <div>
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1 block">Cor</label>
              <div className="flex gap-2">
                {CORES_PRESET.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${cor === c ? 'ring-2 ring-offset-2 ring-accent-violet ring-offset-bg-card scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Descrição */}
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1 block">Descrição (opcional)</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={2}
              placeholder="Observações..."
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent-violet transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-[var(--t-hover-bg)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-accent-violet hover:bg-accent-violet-light text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}
  <ConfirmDialog
    isOpen={!!confirmDialog}
    titulo={confirmDialog?.titulo}
    mensagem={confirmDialog?.mensagem}
    tipo={confirmDialog?.tipo || 'warning'}
    textoBotaoConfirmar={confirmDialog?.textoBotaoConfirmar}
    onConfirm={confirmDialog?.onConfirm}
    onCancel={() => setConfirmDialog(null)}
  />
  </>;
}
