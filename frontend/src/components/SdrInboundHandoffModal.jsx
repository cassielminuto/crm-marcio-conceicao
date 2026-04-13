import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Send } from 'lucide-react';
import api from '../services/api';
import SeletorHorariosCloser from './SeletorHorariosCloser';

export default function SdrInboundHandoffModal({ lead, onClose, onHandoffDone }) {
  const [closers, setClosers] = useState([]);
  const [form, setForm] = useState({
    dataReuniao: '',
    closerDestinoId: '',
    observacoes: lead.observacoes || '',
    proximoPasso: lead.proximoPasso || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/vendedores').then(res => {
      const lista = (res.data.vendedores || res.data || []).filter(
        v => v.ativo && v.papel !== 'sdr' && v.papel !== 'trainee'
      );
      setClosers(lista);
    }).catch(() => {});
  }, []);

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.dataReuniao || !form.closerDestinoId) {
      alert('Preencha data da reunião e closer responsável');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post(`/sdr-inbound/leads/${lead.id}/handoff`, {
        ...form,
        closerDestinoId: Number(form.closerDestinoId),
      });
      onHandoffDone(lead.id, res.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao realizar handoff');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md my-8 bg-bg-card rounded-2xl border border-border-subtle shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-[15px] font-bold text-text-primary">Handoff — {lead.nome}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-[12px] text-text-muted">
            Ao confirmar, o lead será passado ao closer escolhido com uma reunião agendada.
          </p>

          {/* Data reunião */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">Data e hora da reunião *</label>
            <input
              type="datetime-local"
              value={form.dataReuniao}
              onChange={e => handleChange('dataReuniao', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
            />
          </div>

          {/* Closer */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">Closer responsável *</label>
            <select
              value={form.closerDestinoId}
              onChange={e => handleChange('closerDestinoId', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
            >
              <option value="">Selecione...</option>
              {closers.map(c => (
                <option key={c.id} value={c.id}>{c.nomeExibicao}</option>
              ))}
            </select>
          </div>

          {/* Seletor visual de horários do closer */}
          {form.closerDestinoId && (
            <SeletorHorariosCloser
              vendedorId={Number(form.closerDestinoId)}
              valorAtual={form.dataReuniao}
              onSelect={(valor) => handleChange('dataReuniao', valor)}
            />
          )}

          {/* Observações */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">Observações para o closer</label>
            <textarea
              value={form.observacoes}
              onChange={e => handleChange('observacoes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary resize-none focus:outline-none focus:border-accent-violet"
              placeholder="Contexto da conversa, dor principal, etc..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-accent-emerald text-white hover:bg-accent-emerald/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Confirmar Handoff
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
