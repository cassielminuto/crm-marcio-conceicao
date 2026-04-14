import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const ETAPAS = [
  { value: 'novo_lead', label: 'Novo Lead' },
  { value: 'tentativa_contato', label: 'Tentativa de Contato' },
  { value: 'contato_feito', label: 'Contato Feito' },
  { value: 'reuniao_marcada', label: 'Reunião Marcada' },
  { value: 'passado_closer', label: 'Passado ao Closer' },
  { value: 'nao_qualificado', label: 'Não Qualificado' },
];

export default function SdrInboundLeadModal({ lead, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    observacoes: lead.observacoes || '',
    proximoPasso: lead.proximoPasso || '',
    classe: lead.classe || '',
    etapa: lead.etapa || 'novo_lead',
  });
  const [saving, setSaving] = useState(false);

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.put(`/sdr-inbound/leads/${lead.id}`, form);
      onSaved(res.data.lead);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao salvar', 'urgente');
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
        className="w-full max-w-lg my-8 bg-bg-card rounded-2xl border border-border-subtle shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-[15px] font-bold text-text-primary">Lead Inbound — {lead.nome}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Read-only fields */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone" value={lead.telefone} />
            <Field label="Email" value={lead.email || '—'} />
            <Field label="Formulário" value={lead.formularioOrigem || '—'} />
            <Field label="Entrada" value={new Date(lead.createdAt).toLocaleDateString('pt-BR')} />
          </div>

          {lead.dorPrincipal && (
            <div>
              <label className="text-[10px] font-semibold text-text-faint uppercase tracking-wider">Dor Principal</label>
              <p className="text-[13px] text-text-secondary mt-1 bg-bg-elevated rounded-lg px-3 py-2 border border-border-subtle">
                {lead.dorPrincipal}
              </p>
            </div>
          )}

          <div className="border-t border-border-subtle pt-4">
            <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-3">Campos editáveis</p>

            {/* Classe */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-text-muted mb-1 block">Classe do Lead</label>
              <select
                value={form.classe}
                onChange={e => handleChange('classe', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
              >
                <option value="">Sem classe</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>

            {/* Etapa */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-text-muted mb-1 block">Etapa</label>
              <select
                value={form.etapa}
                onChange={e => handleChange('etapa', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary focus:outline-none focus:border-accent-violet"
              >
                {ETAPAS.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>

            {/* Observações */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-text-muted mb-1 block">Observações da ligação</label>
              <textarea
                value={form.observacoes}
                onChange={e => handleChange('observacoes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary resize-none focus:outline-none focus:border-accent-violet"
                placeholder="Como foi o contato..."
              />
            </div>

            {/* Próximo passo */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-text-muted mb-1 block">Próximo passo</label>
              <textarea
                value={form.proximoPasso}
                onChange={e => handleChange('proximoPasso', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-[13px] text-text-primary resize-none focus:outline-none focus:border-accent-violet"
                placeholder="Ligar amanhã às 14h..."
              />
            </div>
          </div>

          {/* Origem do Anúncio (UTMs) */}
          <OrigemAnuncio dadosRespondi={lead.dadosRespondi} />

          {/* Respostas do Formulário */}
          <RespostasFormulario dadosRespondi={lead.dadosRespondi} />
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
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-accent-violet text-white hover:bg-accent-violet/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, value }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-text-faint uppercase tracking-wider">{label}</label>
      <p className="text-[13px] text-text-secondary mt-0.5 truncate">{value}</p>
    </div>
  );
}

const UTM_LABELS = {
  utm_source: 'Source',
  utm_medium: 'Medium',
  utm_campaign: 'Campaign',
  utm_content: 'Content',
  utm_term: 'Term',
  gclid: 'Google Click ID',
  fbclid: 'Facebook Click ID',
};

function extrairUtms(dadosRespondi) {
  if (!dadosRespondi || typeof dadosRespondi !== 'object') return {};

  // Buscar UTMs em vários locais possíveis do payload Respondi
  const fontes = [
    dadosRespondi.respondent?.respondent_utms,
    dadosRespondi.utm_params,
    dadosRespondi.respondent?.utm_params,
    dadosRespondi.respondent?.url_params,
    dadosRespondi,
    dadosRespondi.respondent,
  ];

  const utms = {};
  for (const fonte of fontes) {
    if (!fonte || typeof fonte !== 'object') continue;
    for (const key of Object.keys(UTM_LABELS)) {
      if (!utms[key] && fonte[key]) {
        utms[key] = String(fonte[key]);
      }
    }
  }
  return utms;
}

function OrigemAnuncio({ dadosRespondi }) {
  const [aberto, setAberto] = useState(true);
  const utms = extrairUtms(dadosRespondi);
  const entries = Object.entries(utms).filter(([, v]) => v);

  if (entries.length === 0) return null;

  return (
    <div className="border-t border-border-subtle pt-4">
      <button
        onClick={() => setAberto(a => !a)}
        className="flex items-center gap-2 w-full text-left mb-3"
      >
        {aberto ? <ChevronDown size={14} className="text-text-muted" /> : <ChevronRight size={14} className="text-text-muted" />}
        <span className="text-[10px] font-semibold text-text-faint uppercase tracking-wider">
          Origem do Anúncio
        </span>
      </button>

      {aberto && (
        <div className="grid grid-cols-2 gap-2">
          {entries.map(([key, value]) => (
            <div key={key} className="bg-bg-elevated rounded-lg px-3 py-2 border border-border-subtle">
              <p className="text-[10px] font-medium text-text-muted mb-0.5">{UTM_LABELS[key]}</p>
              <p className="text-[13px] text-text-primary truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RespostasFormulario({ dadosRespondi }) {
  const [aberto, setAberto] = useState(true);

  if (!dadosRespondi) return null;

  // Extrair respostas do formato Respondi
  const rawAnswers = dadosRespondi?.respondent?.raw_answers;
  const answers = dadosRespondi?.respondent?.answers;

  // Montar lista de perguntas/respostas
  let itens = [];

  if (rawAnswers && Array.isArray(rawAnswers)) {
    itens = rawAnswers
      .filter(a => a.question?.question_title && a.answer != null)
      .map(a => ({
        pergunta: a.question.question_title,
        resposta: formatarResposta(a.answer),
      }));
  } else if (answers && typeof answers === 'object') {
    itens = Object.entries(answers).map(([pergunta, resposta]) => ({
      pergunta,
      resposta: formatarResposta(resposta),
    }));
  }

  if (itens.length === 0) return null;

  return (
    <div className="border-t border-border-subtle pt-4">
      <button
        onClick={() => setAberto(a => !a)}
        className="flex items-center gap-2 w-full text-left mb-3"
      >
        {aberto ? <ChevronDown size={14} className="text-text-muted" /> : <ChevronRight size={14} className="text-text-muted" />}
        <span className="text-[10px] font-semibold text-text-faint uppercase tracking-wider">
          Respostas do Formulário ({itens.length})
        </span>
      </button>

      {aberto && (
        <div className="space-y-2.5">
          {itens.map((item, i) => (
            <div key={i} className="bg-bg-elevated rounded-lg px-3 py-2 border border-border-subtle">
              <p className="text-[10px] font-medium text-text-muted mb-0.5">{item.pergunta}</p>
              <p className="text-[13px] text-text-primary whitespace-pre-wrap">{item.resposta || '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatarResposta(valor) {
  if (valor == null) return '';
  if (Array.isArray(valor)) return valor.join(', ');
  if (typeof valor === 'object') {
    // Phone format: { country: '55', phone: '21999...' }
    if (valor.phone) return (valor.country || '') + valor.phone;
    return JSON.stringify(valor);
  }
  return String(valor);
}
