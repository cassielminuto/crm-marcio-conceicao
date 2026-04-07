import { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus, Upload, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';
import SdrLeadCard from '../components/SdrLeadCard';

const COLUNAS = [
  { slug: 'f1_abertura', label: 'F1 - Abertura', cor: '#74b9ff' },
  { slug: 'f2_conexao', label: 'F2 - Conexao', cor: '#ffeaa7' },
  { slug: 'f3_qualificacao', label: 'F3 - Qualificacao', cor: '#fdcb6e' },
  { slug: 'f4_convite', label: 'F4 - Convite', cor: '#55efc4' },
  { slug: 'reuniao_marcada', label: 'Reuniao Marcada', cor: '#00b894' },
  { slug: 'lixeira', label: 'Lixeira', cor: '#b2bec3' },
];

// ─────────────────────────────────────────────
// NovoLeadModal
// ─────────────────────────────────────────────
function NovoLeadModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    nome: '',
    instagram: '',
    tipoInteracao: 'curtiu',
    mensagemEnviada: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.instagram.trim()) {
      setError('Nome e Instagram são obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/sdr/leads', form);
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar lead.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-backdrop-fade">
      <div className="bg-bg-card border border-border-default rounded-2xl w-full max-w-md p-6 animate-modal-scale-in shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-text-primary">Novo Lead SDR</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1.5">Nome</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Nome do lead"
              className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1.5">Instagram</label>
            <input
              type="text"
              value={form.instagram}
              onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
              placeholder="@usuario"
              className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1.5">Tipo de Interacao</label>
            <select
              value={form.tipoInteracao}
              onChange={e => setForm(f => ({ ...f, tipoInteracao: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary focus:border-accent-violet/40 outline-none transition-colors"
            >
              <option value="curtiu">Curtiu</option>
              <option value="comentou">Comentou</option>
              <option value="story">Story</option>
              <option value="seguiu">Seguiu</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1.5">Mensagem Enviada (opcional)</label>
            <textarea
              value={form.mensagemEnviada}
              onChange={e => setForm(f => ({ ...f, mensagemEnviada: e.target.value }))}
              placeholder="Mensagem de abertura enviada..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-[12px] text-accent-danger flex items-center gap-1.5">
              <AlertCircle size={13} /> {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-text-muted border border-border-default hover:border-border-hover hover:text-text-primary transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold bg-accent-violet text-white hover:bg-accent-violet/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Criar Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SdrLeadDetailModal
// ─────────────────────────────────────────────
function SdrLeadDetailModal({ lead, onClose, onSaved }) {
  const [form, setForm] = useState({
    respostaLead: lead.respostaLead || '',
    temperaturaInicial: lead.temperaturaInicial || '',
    dorAparente: lead.dorAparente || '',
    tentouSolucaoAnterior: lead.tentouSolucaoAnterior ?? false,
    temperaturaFinal: lead.temperaturaFinal || '',
    decisaoRota: lead.decisaoRota || '',
    detalheSituacao: lead.detalheSituacao || '',
    aceitouDiagnostico: lead.aceitouDiagnostico ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const etapa = lead.etapa || 'f1_abertura';
  const fase = parseInt(etapa.replace('f', '').split('_')[0]) || 1;

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.patch(`/sdr/leads/${lead.id}`, form);
      onSaved(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-backdrop-fade">
      <div className="bg-bg-card border border-border-default rounded-2xl w-full max-w-lg p-6 animate-modal-scale-in shadow-[0_24px_64px_rgba(0,0,0,0.6)] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">{lead.nome}</h2>
            {lead.instagram && (
              <p className="text-[11px] text-text-muted mt-0.5">@{lead.instagram.replace('@', '')}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* F1+ */}
          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1.5">Resposta do Lead</label>
            <textarea
              value={form.respostaLead}
              onChange={e => setForm(f => ({ ...f, respostaLead: e.target.value }))}
              placeholder="O que o lead respondeu..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1.5">Temperatura Inicial</label>
            <select
              value={form.temperaturaInicial}
              onChange={e => setForm(f => ({ ...f, temperaturaInicial: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary focus:border-accent-violet/40 outline-none transition-colors"
            >
              <option value="">Selecionar...</option>
              <option value="quente">Quente</option>
              <option value="morno">Morno</option>
              <option value="frio">Frio</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1.5">Dor Aparente</label>
            <input
              type="text"
              value={form.dorAparente}
              onChange={e => setForm(f => ({ ...f, dorAparente: e.target.value }))}
              placeholder="Principal dor identificada..."
              className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors"
            />
          </div>

          {/* F2+ */}
          {fase >= 2 && (
            <>
              <div className="border-t border-border-subtle pt-4">
                <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-3">F2 — Conexao</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tentouSolucao"
                  checked={form.tentouSolucaoAnterior}
                  onChange={e => setForm(f => ({ ...f, tentouSolucaoAnterior: e.target.checked }))}
                  className="w-4 h-4 rounded accent-accent-violet"
                />
                <label htmlFor="tentouSolucao" className="text-[13px] text-text-primary cursor-pointer">
                  Tentou solucao anterior
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1.5">Temperatura Final</label>
                <select
                  value={form.temperaturaFinal}
                  onChange={e => setForm(f => ({ ...f, temperaturaFinal: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary focus:border-accent-violet/40 outline-none transition-colors"
                >
                  <option value="">Selecionar...</option>
                  <option value="quente">Quente</option>
                  <option value="morno">Morno</option>
                  <option value="frio">Frio</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1.5">Decisao de Rota</label>
                <input
                  type="text"
                  value={form.decisaoRota}
                  onChange={e => setForm(f => ({ ...f, decisaoRota: e.target.value }))}
                  placeholder="Qual a decisao de rota..."
                  className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1.5">Detalhe da Situacao</label>
                <textarea
                  value={form.detalheSituacao}
                  onChange={e => setForm(f => ({ ...f, detalheSituacao: e.target.value }))}
                  rows={2}
                  placeholder="Contexto adicional..."
                  className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors resize-none"
                />
              </div>
            </>
          )}

          {/* F3+ */}
          {fase >= 3 && (
            <>
              <div className="border-t border-border-subtle pt-4">
                <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-3">F3 — Qualificacao</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="aceitouDiagnostico"
                  checked={form.aceitouDiagnostico}
                  onChange={e => setForm(f => ({ ...f, aceitouDiagnostico: e.target.checked }))}
                  className="w-4 h-4 rounded accent-accent-violet"
                />
                <label htmlFor="aceitouDiagnostico" className="text-[13px] text-text-primary cursor-pointer">
                  Aceitou diagnostico
                </label>
              </div>
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 text-[12px] text-accent-danger flex items-center gap-1.5">
            <AlertCircle size={13} /> {error}
          </p>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-text-muted border border-border-default hover:border-border-hover hover:text-text-primary transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold bg-accent-violet text-white hover:bg-accent-violet/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HandoffModalInline
// ─────────────────────────────────────────────
function HandoffModalInline({ lead, onClose, onHandoffDone }) {
  const [closers, setClosers] = useState([]);
  const [prints, setPrints] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [resumoIA, setResumoIA] = useState('');
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    whatsapp: lead.whatsapp || '',
    dataReuniao: '',
    closerDestinoId: '',
    tomEmocional: '',
    resumoSituacao: '',
    oqueFuncionou: '',
    oqueEvitar: '',
    fraseChaveLead: '',
  });
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    api.get('/vendedores').then(({ data }) => {
      const lista = Array.isArray(data) ? data : (data.vendedores || []);
      setClosers(lista.filter(v => v.papel === 'closer_lider'));
    }).catch(() => {});
  }, []);

  function handleFiles(files) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    setPrints(prev => [...prev, ...arr]);
    arr.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(prev => [...prev, e.target.result]);
      reader.readAsDataURL(f);
    });
  }

  function removePrint(idx) {
    setPrints(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function gerarResumoIA() {
    if (prints.length === 0) {
      setError('Adicione ao menos um print para gerar o resumo.');
      return;
    }
    setGerandoResumo(true);
    setError('');
    try {
      // Upload prints first
      const fd = new FormData();
      prints.forEach(p => fd.append('prints', p));
      await api.post(`/sdr/leads/${lead.id}/prints`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Generate AI summary
      const { data } = await api.post(`/sdr/leads/${lead.id}/resumo-ia`);
      setResumoIA(data.resumo || data.resumoIA || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar resumo.');
    } finally {
      setGerandoResumo(false);
    }
  }

  const canConfirm = form.whatsapp && form.dataReuniao && form.closerDestinoId && form.tomEmocional && form.resumoSituacao;

  async function handleConfirm() {
    if (!canConfirm) return;
    setConfirmando(true);
    setError('');
    try {
      await api.post(`/sdr/leads/${lead.id}/handoff`, {
        ...form,
        resumoIA,
        closerDestinoId: parseInt(form.closerDestinoId),
      });
      onHandoffDone(lead.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao executar handoff.');
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-backdrop-fade">
      <div className="bg-bg-card border border-border-default rounded-2xl w-full max-w-2xl animate-modal-scale-in shadow-[0_24px_64px_rgba(0,0,0,0.6)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Handoff — Reuniao Marcada</h2>
            <p className="text-[11px] text-text-muted mt-0.5">{lead.nome} · @{(lead.instagram || '').replace('@', '')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1.5">WhatsApp</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                placeholder="+55 11 99999-9999"
                className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1.5">Data da Reuniao</label>
              <input
                type="datetime-local"
                value={form.dataReuniao}
                onChange={e => setForm(f => ({ ...f, dataReuniao: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary focus:border-accent-violet/40 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1.5">Closer de Destino</label>
              <select
                value={form.closerDestinoId}
                onChange={e => setForm(f => ({ ...f, closerDestinoId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary focus:border-accent-violet/40 outline-none transition-colors"
              >
                <option value="">Selecionar closer...</option>
                {closers.map(c => (
                  <option key={c.id} value={c.id}>{c.nomeExibicao || c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1.5">Tom Emocional</label>
              <select
                value={form.tomEmocional}
                onChange={e => setForm(f => ({ ...f, tomEmocional: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary focus:border-accent-violet/40 outline-none transition-colors"
              >
                <option value="">Selecionar...</option>
                <option value="ansioso">Ansioso</option>
                <option value="esperancoso">Esperancoso</option>
                <option value="resistente">Resistente</option>
                <option value="animado">Animado</option>
                <option value="neutro">Neutro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1.5">Resumo da Situacao <span className="text-accent-danger">*</span></label>
            <textarea
              value={form.resumoSituacao}
              onChange={e => setForm(f => ({ ...f, resumoSituacao: e.target.value }))}
              rows={3}
              placeholder="Contexto completo da conversa..."
              className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1.5">O que Funcionou</label>
              <textarea
                value={form.oqueFuncionou}
                onChange={e => setForm(f => ({ ...f, oqueFuncionou: e.target.value }))}
                rows={2}
                placeholder="Gatilhos que funcionaram..."
                className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1.5">O que Evitar</label>
              <textarea
                value={form.oqueEvitar}
                onChange={e => setForm(f => ({ ...f, oqueEvitar: e.target.value }))}
                rows={2}
                placeholder="Pontos de tensao..."
                className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1.5">Frase-Chave do Lead</label>
            <input
              type="text"
              value={form.fraseChaveLead}
              onChange={e => setForm(f => ({ ...f, fraseChaveLead: e.target.value }))}
              placeholder='Ex: "Eu quero salvar meu casamento"'
              className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-default text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-violet/40 outline-none transition-colors"
            />
          </div>

          {/* Print upload */}
          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1.5">Prints da Conversa</label>
            <div
              ref={dropRef}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              className="border border-dashed border-border-default rounded-lg p-4 text-center cursor-pointer hover:border-accent-violet/40 hover:bg-bg-elevated/30 transition-colors"
            >
              <Upload size={20} className="mx-auto text-text-muted mb-2" />
              <p className="text-[12px] text-text-muted">Arraste prints aqui ou <span className="text-accent-violet-light">clique para selecionar</span></p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
            </div>

            {previews.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative group/thumb">
                    <img src={src} alt="" className="w-16 h-16 rounded-lg object-cover border border-border-subtle" />
                    <button
                      onClick={() => removePrint(i)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent-danger text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI summary */}
          <div className="flex items-center gap-3">
            <button
              onClick={gerarResumoIA}
              disabled={gerandoResumo || prints.length === 0}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-bg-elevated border border-border-default text-text-primary hover:border-accent-violet/40 hover:text-accent-violet-light disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              {gerandoResumo ? <Loader2 size={13} className="animate-spin" /> : null}
              Gerar Resumo IA
            </button>
            <span className="text-[11px] text-text-faint">{prints.length} print{prints.length !== 1 ? 's' : ''} selecionado{prints.length !== 1 ? 's' : ''}</span>
          </div>

          {resumoIA && (
            <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4">
              <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle size={11} className="text-accent-emerald" /> Resumo gerado pela IA
              </p>
              <pre className="text-[12px] text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">{resumoIA}</pre>
            </div>
          )}

          {error && (
            <p className="text-[12px] text-accent-danger flex items-center gap-1.5">
              <AlertCircle size={13} /> {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle shrink-0 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-text-muted border border-border-default hover:border-border-hover hover:text-text-primary transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || confirmando}
            className="flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#00b894] text-white hover:bg-[#00b894]/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {confirmando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Confirmar Handoff
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MetricsBar
// ─────────────────────────────────────────────
function MetricaItem({ label, value, meta, cor }) {
  let corClass = 'text-accent-emerald';
  if (cor === 'pct') {
    const pct = meta ? (value / meta) * 100 : 0;
    if (pct < 20) corClass = 'text-accent-danger';
    else if (pct > 50) corClass = 'text-accent-amber';
    else corClass = 'text-accent-emerald';
  }
  return (
    <div className="flex flex-col items-center px-5 first:pl-0 last:pr-0 border-r border-border-subtle last:border-0">
      <span className={`text-[20px] font-bold font-display ${corClass}`}>{value}</span>
      <span className="text-[10px] text-text-muted mt-0.5">{label}{meta ? ` / ${meta}` : ''}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// SdrKanban (main)
// ─────────────────────────────────────────────
export default function SdrKanban() {
  const [kanban, setKanban] = useState({ f1_abertura: [], f2_conexao: [], f3_qualificacao: [], f4_convite: [], reuniao_marcada: [], lixeira: [] });
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNovoLead, setShowNovoLead] = useState(false);
  const [leadDetalhe, setLeadDetalhe] = useState(null);
  const [handoffLead, setHandoffLead] = useState(null);
  const [handoffPendingDrag, setHandoffPendingDrag] = useState(null);

  const carregarDados = useCallback(async () => {
    try {
      const [leadsRes, metRes] = await Promise.all([
        api.get('/sdr/leads'),
        api.get('/sdr/metricas/diarias'),
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

  async function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const leadId = parseInt(draggableId);
    const destSlug = destination.droppableId;
    const srcSlug = source.droppableId;

    // Find the lead object
    const lead = (kanban[srcSlug] || []).find(l => l.id === leadId);
    if (!lead) return;

    // If moving to reuniao_marcada, open handoff modal
    if (destSlug === 'reuniao_marcada' && srcSlug !== 'reuniao_marcada') {
      setHandoffPendingDrag({ lead, source, destination });
      setHandoffLead(lead);
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
      await api.patch(`/sdr/leads/${leadId}/mover`, {
        etapa: destSlug,
        ordem: destination.index,
      });
    } catch (err) {
      // Revert
      setKanban(prev);
      const camposFaltando = err.response?.data?.camposFaltando;
      if (camposFaltando?.length) {
        alert(`Campos obrigatorios faltando: ${camposFaltando.join(', ')}`);
        setLeadDetalhe(lead);
      } else {
        alert(err.response?.data?.error || 'Erro ao mover lead.');
      }
    }
  }

  function handleLeadCreated(newLead) {
    const etapa = newLead.etapa || 'f1_abertura';
    setKanban(k => ({
      ...k,
      [etapa]: [newLead, ...(k[etapa] || [])],
    }));
  }

  function handleLeadSaved(updated) {
    setKanban(k => {
      const next = { ...k };
      COLUNAS.forEach(col => {
        next[col.slug] = (next[col.slug] || []).map(l => l.id === updated.id ? updated : l);
      });
      return next;
    });
  }

  function handleDeleteLead(lead) {
    if (!window.confirm(`Mover "${lead.nome}" para a lixeira?`)) return;
    const srcSlug = Object.keys(kanban).find(k => kanban[k].some(l => l.id === lead.id));
    if (!srcSlug) return;

    setKanban(k => {
      const srcArr = (k[srcSlug] || []).filter(l => l.id !== lead.id);
      const lixeira = [{ ...lead, etapa: 'lixeira' }, ...(k.lixeira || [])];
      return { ...k, [srcSlug]: srcArr, lixeira };
    });

    api.delete(`/sdr/leads/${lead.id}`).catch(() => carregarDados());
  }

  function handleHandoffDone(leadId) {
    setKanban(k => {
      const next = { ...k };
      // Move from wherever to reuniao_marcada
      let movedLead = null;
      COLUNAS.forEach(col => {
        const idx = (next[col.slug] || []).findIndex(l => l.id === leadId);
        if (idx !== -1) {
          const arr = [...next[col.slug]];
          [movedLead] = arr.splice(idx, 1);
          next[col.slug] = arr;
        }
      });
      if (movedLead) {
        next.reuniao_marcada = [{ ...movedLead, etapa: 'reuniao_marcada' }, ...(next.reuniao_marcada || [])];
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
    <div className="flex flex-col h-full min-h-0 animate-page-enter">
      {/* ── Metrics bar ── */}
      <div className="shrink-0 bg-bg-secondary border-b border-border-subtle px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-0">
          <MetricaItem
            label="Abordagens hoje"
            value={metricas?.abordagensHoje ?? 0}
            meta={10}
            cor="pct"
          />
          <MetricaItem
            label="Respostas"
            value={metricas?.respostasHoje ?? 0}
          />
          <MetricaItem
            label="Reunioes"
            value={metricas?.reunioesHoje ?? 0}
          />
          <MetricaItem
            label="Conversas ativas"
            value={metricas?.conversasAtivas ?? 0}
          />
          {metricas?.pipeline != null && (
            <MetricaItem
              label="Pipeline"
              value={`R$${(metricas.pipeline / 1000).toFixed(0)}k`}
            />
          )}
        </div>

        <button
          onClick={() => setShowNovoLead(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-accent-violet text-white hover:bg-accent-violet/90 transition-colors"
        >
          <Plus size={15} />
          Novo Lead
        </button>
      </div>

      {/* ── Kanban board ── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto min-h-0">
          <div className="flex gap-3 p-4 h-full min-w-max">
            {COLUNAS.map(col => {
              const leads = kanban[col.slug] || [];
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
                          <SdrLeadCard
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

      {/* ── Modals ── */}
      {showNovoLead && (
        <NovoLeadModal
          onClose={() => setShowNovoLead(false)}
          onCreated={handleLeadCreated}
        />
      )}

      {leadDetalhe && (
        <SdrLeadDetailModal
          lead={leadDetalhe}
          onClose={() => setLeadDetalhe(null)}
          onSaved={handleLeadSaved}
        />
      )}

      {handoffLead && (
        <HandoffModalInline
          lead={handoffLead}
          onClose={() => { setHandoffLead(null); setHandoffPendingDrag(null); }}
          onHandoffDone={handleHandoffDone}
        />
      )}
    </div>
  );
}
