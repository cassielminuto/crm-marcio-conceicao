import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Pencil, Trash2, CheckCircle, XCircle, RotateCcw, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from './ConfirmDialog';

const LABELS_TIPO = {
  reuniao_sdr_instagram: 'SDR Instagram',
  reuniao_sdr_inbound: 'SDR Inbound',
  reuniao_manual: 'Reunião manual',
  bloco_on: 'Disponível',
  bloco_off: 'Indisponível',
  evento_personalizado: 'Evento',
};

const CORES_TIPO = {
  reuniao_sdr_instagram: '#3b82f6',
  reuniao_sdr_inbound: '#10b981',
  reuniao_manual: '#8b5cf6',
  bloco_on: '#6b7280',
  bloco_off: '#fca5a5',
  evento_personalizado: '#f59e0b',
};

const LABELS_STATUS = {
  realizada: { label: 'Realizada', icon: CheckCircle, color: 'text-accent-emerald' },
  no_show: { label: 'No-show', icon: XCircle, color: 'text-accent-danger' },
  remarcada: { label: 'Remarcada', icon: RotateCcw, color: 'text-accent-amber' },
};

export default function AgendaEventoModal({ evento, onClose, onEditar, onDeleted, onStatusUpdated }) {
  const { toast } = useToast();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const [excluindo, setExcluindo] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  if (!evento) return null;

  const isAdminGestor = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';
  const isDono = usuario?.vendedorId === evento.vendedorId;
  const podeEditar = isDono || isAdminGestor;
  const isReuniao = evento.tipo.startsWith('reuniao_');
  const corTipo = evento.cor || CORES_TIPO[evento.tipo] || '#6b7280';

  function formatData(d) {
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function handleExcluir() {
    setConfirmDialog({
      titulo: 'Excluir evento?',
      mensagem: 'Esta ação não pode ser desfeita.',
      tipo: 'danger',
      textoBotaoConfirmar: 'Excluir',
      onConfirm: async () => {
        setExcluindo(true);
        try {
          await api.delete(`/agenda/${evento.id}`);
          onDeleted();
          onClose();
        } catch (err) {
          toast(err.response?.data?.error || 'Erro ao excluir evento', 'urgente');
        } finally {
          setExcluindo(false);
        }
        setConfirmDialog(null);
      },
    });
  }

  async function handleStatus(status) {
    setAtualizandoStatus(true);
    try {
      await api.patch(`/agenda/${evento.id}/status`, { status });
      onStatusUpdated();
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao atualizar status', 'urgente');
    } finally {
      setAtualizandoStatus(false);
    }
  }

  function handleOverlayClick(e) {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm animate-backdrop-fade"
      onClick={handleOverlayClick}
    >
      <div ref={modalRef} className="bg-bg-card border border-border-default rounded-2xl w-full max-w-[480px] mx-4 overflow-hidden animate-modal-scale-in shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: corTipo }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              {LABELS_TIPO[evento.tipo] || evento.tipo}
            </span>
            {evento.statusReuniao && (
              <span className={`text-[11px] font-semibold ${LABELS_STATUS[evento.statusReuniao]?.color || 'text-text-muted'}`}>
                — {LABELS_STATUS[evento.statusReuniao]?.label || evento.statusReuniao}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-[var(--t-hover-bg)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Título */}
          <h3 className="text-lg font-semibold text-text-primary">{evento.titulo}</h3>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {evento.marcadoEmHorarioOff && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-accent-danger text-[11px] font-medium">
                <AlertTriangle size={12} /> Horário OFF
              </span>
            )}
          </div>

          {/* Horário */}
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="text-text-muted w-14">Início:</span>
              <span className="text-text-primary font-medium">{formatData(evento.inicio)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-text-muted w-14">Fim:</span>
              <span className="text-text-primary font-medium">{formatData(evento.fim)}</span>
            </div>
          </div>

          {/* Vendedor */}
          {evento.vendedor && (
            <div className="flex gap-2 text-sm">
              <span className="text-text-muted w-14">Closer:</span>
              <span className="text-text-primary font-medium">{evento.vendedor.nomeExibicao}</span>
            </div>
          )}

          {/* Lead vinculado */}
          {evento.leadId && (
            <div className="flex gap-2 text-sm items-center">
              <span className="text-text-muted w-14">Lead:</span>
              <button
                onClick={() => { navigate(`/leads/${evento.leadId}`); onClose(); }}
                className="text-accent-violet hover:text-accent-violet-light font-medium flex items-center gap-1 transition-colors"
              >
                Ver lead <ExternalLink size={12} />
              </button>
            </div>
          )}

          {/* Contato livre */}
          {!evento.leadId && (evento.contatoNome || evento.contatoTelefone) && (
            <div className="space-y-1 text-sm">
              {evento.contatoNome && (
                <div className="flex gap-2">
                  <span className="text-text-muted w-14">Contato:</span>
                  <span className="text-text-primary font-medium">{evento.contatoNome}</span>
                </div>
              )}
              {evento.contatoTelefone && (
                <div className="flex gap-2">
                  <span className="text-text-muted w-14">Tel:</span>
                  <span className="text-text-primary font-medium">{evento.contatoTelefone}</span>
                </div>
              )}
            </div>
          )}

          {/* Descrição */}
          {evento.descricao && (
            <div className="text-sm">
              <span className="text-text-muted block mb-1">Descrição:</span>
              <p className="text-text-secondary bg-bg-input rounded-lg px-3 py-2 whitespace-pre-wrap">{evento.descricao}</p>
            </div>
          )}

          {/* Marcar status (reuniões sem status ainda) */}
          {isReuniao && !evento.statusReuniao && podeEditar && (
            <div>
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">Marcar como</span>
              <div className="flex gap-2">
                {Object.entries(LABELS_STATUS).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => handleStatus(key)}
                      disabled={atualizandoStatus}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border-default bg-bg-input hover:border-border-hover transition-colors disabled:opacity-50 ${cfg.color}`}
                    >
                      {atualizandoStatus ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {podeEditar && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-subtle">
            <button
              onClick={handleExcluir}
              disabled={excluindo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-accent-danger hover:bg-[rgba(239,68,68,0.08)] transition-colors disabled:opacity-50"
            >
              {excluindo ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Excluir
            </button>
            <button
              onClick={() => { onEditar(evento); onClose(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-accent-violet hover:bg-accent-violet-light text-white transition-colors"
            >
              <Pencil size={14} />
              Editar
            </button>
          </div>
        )}
      </div>
      {confirmDialog && (
        <ConfirmDialog
          isOpen
          titulo={confirmDialog.titulo}
          mensagem={confirmDialog.mensagem}
          tipo={confirmDialog.tipo}
          textoBotaoConfirmar={confirmDialog.textoBotaoConfirmar || 'Confirmar'}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          loading={excluindo}
        />
      )}
    </div>,
    document.body
  );
}
