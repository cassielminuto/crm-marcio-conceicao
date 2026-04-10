import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus, X, Loader2, Search } from 'lucide-react';
import api from '../services/api';
import SdrInboundLeadCard from '../components/SdrInboundLeadCard';
import SdrInboundLeadModal from '../components/SdrInboundLeadModal';
import SdrInboundHandoffModal from '../components/SdrInboundHandoffModal';

const COLUNAS = [
  { slug: 'novo_lead', label: 'Novo Lead', cor: '#74b9ff' },
  { slug: 'tentativa_contato', label: 'Tentativa de Contato', cor: '#a29bfe' },
  { slug: 'contato_feito', label: 'Contato Feito', cor: '#ffeaa7' },
  { slug: 'reuniao_marcada', label: 'Reunião Marcada', cor: '#00b894' },
  { slug: 'passado_closer', label: 'Passado ao Closer', cor: '#55efc4' },
  { slug: 'nao_qualificado', label: 'Não Qualificado', cor: '#b2bec3' },
];

const ETAPA_SLUGS = COLUNAS.map(c => c.slug);

// ─────────────────────────────────────────────
// NovoLeadInboundModal
// ─────────────────────────────────────────────
function NovoLeadInboundModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', dorPrincipal: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.telefone.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/sdr-inbound/leads', form);
      onCreated(res.data.lead);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar lead');
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
      <div className="w-full max-w-md my-8 bg-bg-card rounded-2xl border border-border-subtle shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-[15px] font-bold text-text-primary">Novo Lead Inbound</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
              placeholder="Nome do lead"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">Telefone *</label>
            <input
              type="text"
              value={form.telefone}
              onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
              placeholder="5521999999999"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">Dor Principal</label>
            <textarea
              value={form.dorPrincipal}
              onChange={e => setForm(f => ({ ...f, dorPrincipal: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary resize-none focus:outline-none focus:border-accent-violet"
              placeholder="Qual a situação do lead..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.nome.trim() || !form.telefone.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-accent-violet text-white hover:bg-accent-violet/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Criar Lead
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// MetricaItem
// ─────────────────────────────────────────────
function MetricaItem({ label, value }) {
  return (
    <div className="flex flex-col items-center px-5 first:pl-0 last:pr-0 border-r border-border-subtle last:border-0">
      <span className="text-[20px] font-bold font-display text-accent-emerald">{value}</span>
      <span className="text-[10px] text-text-muted mt-0.5">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// SdrInboundKanban (main)
// ─────────────────────────────────────────────
export default function SdrInboundKanban() {
  const [kanban, setKanban] = useState(() => {
    const init = {};
    ETAPA_SLUGS.forEach(s => { init[s] = []; });
    return init;
  });
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNovoLead, setShowNovoLead] = useState(false);
  const [leadDetalhe, setLeadDetalhe] = useState(null);
  const [handoffLead, setHandoffLead] = useState(null);
  const [handoffPendingDrag, setHandoffPendingDrag] = useState(null);

  // Filters
  const [busca, setBusca] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');

  const carregarDados = useCallback(async () => {
    try {
      const [leadsRes, metRes] = await Promise.all([
        api.get('/sdr-inbound/kanban'),
        api.get('/sdr-inbound/metricas'),
      ]);
      setKanban(leadsRes.data.kanban || leadsRes.data);
      setMetricas(metRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // Client-side filtering
  const kanbanFiltrado = useMemo(() => {
    const filtered = {};
    const buscaLower = busca.toLowerCase().trim();
    const agora = new Date();

    for (const slug of ETAPA_SLUGS) {
      if (filtroEtapa && slug !== filtroEtapa) {
        filtered[slug] = [];
        continue;
      }

      let leads = kanban[slug] || [];

      if (buscaLower) {
        leads = leads.filter(l =>
          l.nome.toLowerCase().includes(buscaLower) ||
          l.telefone.includes(buscaLower)
        );
      }

      if (filtroPeriodo) {
        const dias = filtroPeriodo === 'hoje' ? 0 : filtroPeriodo === '7d' ? 7 : filtroPeriodo === '30d' ? 30 : null;
        if (dias !== null) {
          const limite = new Date(agora);
          limite.setDate(limite.getDate() - (dias || 1));
          limite.setHours(0, 0, 0, 0);
          leads = leads.filter(l => new Date(l.createdAt) >= limite);
        }
      }

      filtered[slug] = leads;
    }
    return filtered;
  }, [kanban, busca, filtroEtapa, filtroPeriodo]);

  async function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const leadId = parseInt(draggableId);
    const destSlug = destination.droppableId;
    const srcSlug = source.droppableId;

    const lead = (kanban[srcSlug] || []).find(l => l.id === leadId);
    if (!lead) return;

    // Handoff modal para reuniao_marcada
    if (destSlug === 'reuniao_marcada' && srcSlug !== 'reuniao_marcada') {
      setHandoffPendingDrag({ lead, source, destination });
      setHandoffLead(lead);
      return;
    }

    // Bloquear drag direto pra passado_closer
    if (destSlug === 'passado_closer') {
      alert('Use o handoff para passar lead ao closer');
      return;
    }

    // Optimistic update
    const prev = { ...kanban };
    setKanban(k => {
      const srcArr = [...(k[srcSlug] || [])];
      const [moved] = srcArr.splice(source.index, 1);
      const destArr = [...(k[destSlug] || [])];
      destArr.splice(destination.index, 0, { ...moved, etapa: destSlug });
      return { ...k, [srcSlug]: srcArr, [destSlug]: destArr };
    });

    try {
      await api.post(`/sdr-inbound/leads/${leadId}/mover`, {
        etapa: destSlug,
        ordem: destination.index,
      });
    } catch (err) {
      setKanban(prev);
      alert(err.response?.data?.error || 'Erro ao mover lead.');
    }
  }

  function handleLeadCreated(newLead) {
    const lead = newLead.lead || newLead;
    const etapa = lead.etapa || 'novo_lead';
    setKanban(k => ({
      ...k,
      [etapa]: [lead, ...(k[etapa] || [])],
    }));
  }

  function handleLeadSaved(updated) {
    setKanban(k => {
      const next = {};
      // Lead may have changed etapa via modal
      let found = false;
      for (const slug of ETAPA_SLUGS) {
        const arr = (k[slug] || []).filter(l => {
          if (l.id === updated.id) { found = true; return false; }
          return true;
        });
        next[slug] = arr;
      }
      const destEtapa = updated.etapa || 'novo_lead';
      next[destEtapa] = [updated, ...(next[destEtapa] || [])];
      return next;
    });
  }

  function handleDeleteLead(lead) {
    const naoQualificado = lead.etapa === 'nao_qualificado';
    const msg = naoQualificado
      ? `Excluir "${lead.nome}" definitivamente?`
      : `Mover "${lead.nome}" para não qualificado?`;
    if (!window.confirm(msg)) return;

    if (naoQualificado) {
      setKanban(k => ({
        ...k,
        nao_qualificado: (k.nao_qualificado || []).filter(l => l.id !== lead.id),
      }));
      api.delete(`/sdr-inbound/leads/${lead.id}`).catch(() => carregarDados());
      return;
    }

    const srcSlug = Object.keys(kanban).find(k => kanban[k].some(l => l.id === lead.id));
    if (!srcSlug) return;

    setKanban(k => {
      const srcArr = (k[srcSlug] || []).filter(l => l.id !== lead.id);
      const dest = [{ ...lead, etapa: 'nao_qualificado' }, ...(k.nao_qualificado || [])];
      return { ...k, [srcSlug]: srcArr, nao_qualificado: dest };
    });

    api.delete(`/sdr-inbound/leads/${lead.id}`).catch(() => carregarDados());
  }

  function handleHandoffDone(leadId) {
    setKanban(k => {
      const next = { ...k };
      let movedLead = null;
      ETAPA_SLUGS.forEach(slug => {
        const idx = (next[slug] || []).findIndex(l => l.id === leadId);
        if (idx !== -1) {
          const arr = [...next[slug]];
          [movedLead] = arr.splice(idx, 1);
          next[slug] = arr;
        }
      });
      if (movedLead) {
        next.passado_closer = [{ ...movedLead, etapa: 'passado_closer' }, ...(next.passado_closer || [])];
      }
      return next;
    });
    setHandoffPendingDrag(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-accent-violet" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Metrics bar */}
      <div className="shrink-0 bg-bg-secondary border-b border-border-subtle px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-0">
          <MetricaItem label="Leads hoje" value={metricas?.leadsCriadosHoje ?? 0} />
          <MetricaItem label="Reuniões" value={metricas?.reunioesMarcadasHoje ?? 0} />
          <MetricaItem label="Handoffs" value={metricas?.handoffsHoje ?? 0} />
        </div>

        <button
          onClick={() => setShowNovoLead(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-accent-violet text-white hover:bg-accent-violet/90 transition-colors"
        >
          <Plus size={15} />
          Novo Lead
        </button>
      </div>

      {/* Filters bar */}
      <div className="shrink-0 bg-bg-secondary border-b border-border-subtle px-6 py-2 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar nome ou telefone..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-[12px] text-text-primary focus:outline-none focus:border-accent-violet"
          />
        </div>

        <select
          value={filtroPeriodo}
          onChange={e => setFiltroPeriodo(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-[12px] text-text-primary focus:outline-none focus:border-accent-violet"
        >
          <option value="">Todos os períodos</option>
          <option value="hoje">Hoje</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
        </select>

        <select
          value={filtroEtapa}
          onChange={e => setFiltroEtapa(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-[12px] text-text-primary focus:outline-none focus:border-accent-violet"
        >
          <option value="">Todas as etapas</option>
          {COLUNAS.map(c => (
            <option key={c.slug} value={c.slug}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto min-h-0">
          <div className="flex gap-3 p-4 h-full min-w-max">
            {COLUNAS.map(col => {
              const leads = kanbanFiltrado[col.slug] || [];
              return (
                <div key={col.slug} className="flex flex-col w-64 shrink-0">
                  {/* Column header */}
                  <div
                    className="rounded-t-[10px] px-3 py-2.5 border-t-[3px] bg-bg-card relative overflow-hidden"
                    style={{ borderTopColor: col.cor }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `linear-gradient(180deg, ${col.cor}0A 0%, transparent 60%)` }}
                    />
                    <div className="flex items-center gap-2 relative">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.cor }} />
                      <span className="text-[12px] font-semibold text-text-primary truncate flex-1">{col.label}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-bg-elevated text-text-muted border border-border-subtle shrink-0">
                        {leads.length}
                      </span>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <Droppable droppableId={col.slug}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 rounded-b-[10px] border-x border-b border-border-subtle overflow-y-auto kanban-scrollbar transition-colors ${
                          snapshot.isDraggingOver ? 'bg-bg-elevated/60' : 'bg-bg-secondary'
                        }`}
                        style={{ minHeight: 120 }}
                      >
                        {leads.map((lead, index) => (
                          <SdrInboundLeadCard
                            key={lead.id}
                            lead={lead}
                            index={index}
                            onClick={setLeadDetalhe}
                            onDelete={handleDeleteLead}
                          />
                        ))}
                        {provided.placeholder}
                        {leads.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex items-center justify-center h-20 text-[11px] text-text-faint">
                            Vazio
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      {/* Modals */}
      {showNovoLead && (
        <NovoLeadInboundModal
          onClose={() => setShowNovoLead(false)}
          onCreated={handleLeadCreated}
        />
      )}

      {leadDetalhe && (
        <SdrInboundLeadModal
          lead={leadDetalhe}
          onClose={() => setLeadDetalhe(null)}
          onSaved={handleLeadSaved}
        />
      )}

      {handoffLead && (
        <SdrInboundHandoffModal
          lead={handoffLead}
          onClose={() => { setHandoffLead(null); setHandoffPendingDrag(null); }}
          onHandoffDone={handleHandoffDone}
        />
      )}
    </div>
  );
}
