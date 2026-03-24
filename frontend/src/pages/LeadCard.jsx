import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScriptChecklist from '../components/ScriptChecklist';
import CallRecorder from '../components/CallRecorder';
import PrintUploader from '../components/PrintUploader';
import DuplicateAlert from '../components/DuplicateAlert';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Phone, Mail, Instagram, Megaphone, Clock, User, Save,
  MessageSquare, PhoneCall, FileText, ChevronDown, ChevronUp, Bot, Camera,
  Zap, CalendarPlus, RefreshCw, Loader, ChevronRight, Trash2,
} from 'lucide-react';

const ETAPA_COR = {
  novo: 'bg-[rgba(116,185,255,0.12)] text-accent-info',
  em_abordagem: 'bg-[rgba(253,203,110,0.12)] text-accent-amber',
  qualificado: 'bg-[rgba(108,92,231,0.12)] text-accent-violet-light',
  proposta: 'bg-[rgba(225,112,85,0.12)] text-accent-danger',
  fechado_ganho: 'bg-[rgba(0,184,148,0.12)] text-accent-emerald',
  fechado_perdido: 'bg-[rgba(225,112,85,0.12)] text-accent-danger',
  nurturing: 'bg-[rgba(255,255,255,0.06)] text-text-muted',
};

const ETAPA_LABEL = {
  novo: 'Novo', em_abordagem: 'Em Abordagem', qualificado: 'Qualificado',
  proposta: 'Proposta', fechado_ganho: 'Fechado Ganho', fechado_perdido: 'Fechado Perdido',
  nurturing: 'Nurturing',
};

const CLASSE_COR = {
  A: 'bg-[rgba(225,112,85,0.12)] text-[#e17055]',
  B: 'bg-[rgba(253,203,110,0.12)] text-[#fdcb6e]',
  C: 'bg-[rgba(116,185,255,0.1)] text-[#74b9ff]',
};

function scoreBadge(pontuacao) {
  if (pontuacao >= 75) return { bg: 'bg-gradient-to-r from-red-600 to-red-500', label: 'Quente' };
  if (pontuacao >= 45) return { bg: 'bg-gradient-to-r from-amber-600 to-amber-500', label: 'Morno' };
  return { bg: 'bg-gradient-to-r from-blue-600 to-blue-500', label: 'Frio' };
}

const TRACO_OPTIONS = [
  { value: '', label: 'Selecionar...' },
  { value: 'esquizoide', label: 'Esquizoide' },
  { value: 'oral', label: 'Oral' },
  { value: 'masoquista', label: 'Masoquista' },
  { value: 'rigido', label: 'Rigido' },
  { value: 'nao_identificado', label: 'Nao identificado' },
];

const RESULTADO_OPTIONS = [
  { value: '', label: 'Selecionar...' },
  { value: 'fechou', label: 'Fechou' },
  { value: 'nao_fechou', label: 'Nao fechou' },
  { value: 'reagendar', label: 'Reagendar' },
  { value: 'sem_call', label: 'Sem call' },
];

const INTERACAO_ICONE = {
  call: PhoneCall, whatsapp_enviado: MessageSquare, whatsapp_recebido: MessageSquare,
  nota: FileText, email: Mail, print_whatsapp: Camera,
};

const INTERACAO_LABEL = {
  call: 'Call', whatsapp_enviado: 'WhatsApp enviado', whatsapp_recebido: 'WhatsApp recebido',
  nota: 'Nota', email: 'Email', print_whatsapp: 'Print WhatsApp',
};

const INTERACAO_DOT = {
  call: 'bg-[rgba(108,92,231,0.1)]',
  whatsapp_enviado: 'bg-[rgba(0,184,148,0.1)]',
  whatsapp_recebido: 'bg-[rgba(0,184,148,0.1)]',
  nota: 'bg-[rgba(255,255,255,0.06)]',
  email: 'bg-[rgba(116,185,255,0.1)]',
  print_whatsapp: 'bg-[rgba(0,184,148,0.1)]',
};

function CampoIA({ label, children }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1 flex items-center gap-1">
        {label}
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[rgba(108,92,231,0.1)] text-accent-violet-light rounded text-[8px] font-bold">
          <Bot size={10} /> IA
        </span>
      </label>
      {children}
    </div>
  );
}

export default function LeadCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';
  const [lead, setLead] = useState(null);
  const [interacoes, setInteracoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvoMsg, setSalvoMsg] = useState('');
  const [timelineAberta, setTimelineAberta] = useState(true);
  const [duplicatas, setDuplicatas] = useState([]);
  const [atualizandoResumo, setAtualizandoResumo] = useState(false);
  const [vendedores, setVendedores] = useState([]);
  const [editandoCloser, setEditandoCloser] = useState(false);
  const [redistribuindo, setRedistribuindo] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [campos, setCampos] = useState({
    dorPrincipal: '',
    tracoCarater: '',
    objecaoPrincipal: '',
    resultadoCall: '',
    valorVenda: '',
    previsaoFechamento: '',
  });

  const redistribuirLead = async (novoVendedorId) => {
    setRedistribuindo(true);
    try {
      const { data } = await api.patch(`/leads/${lead.id}/vendedor`, {
        vendedor_id: novoVendedorId,
        motivo: 'Redistribuicao manual pelo admin',
      });
      setLead(data);
      setEditandoCloser(false);
    } catch (err) {
      console.error('Erro ao redistribuir:', err);
    } finally {
      setRedistribuindo(false);
    }
  };

  const excluirLead = async () => {
    setExcluindo(true);
    try {
      await api.delete(`/leads/${id}`);
      navigate('/meus-leads');
    } catch (err) {
      console.error('Erro ao excluir:', err);
      setExcluindo(false);
      setConfirmandoExclusao(false);
    }
  };

  const carregar = useCallback(async () => {
    try {
      const [leadRes, intRes, dupRes, vendRes] = await Promise.all([
        api.get(`/leads/${id}`),
        api.get(`/leads/${id}/interacoes`),
        api.get(`/leads/${id}/duplicatas`).catch(() => ({ data: [] })),
        api.get('/vendedores').catch(() => ({ data: [] })),
      ]);
      setLead(leadRes.data);
      setInteracoes(intRes.data);
      setDuplicatas(dupRes.data);
      setVendedores(Array.isArray(vendRes.data) ? vendRes.data : []);
      setCampos({
        dorPrincipal: leadRes.data.dorPrincipal || '',
        tracoCarater: leadRes.data.tracoCarater || '',
        objecaoPrincipal: leadRes.data.objecaoPrincipal || '',
        resultadoCall: leadRes.data.resultadoCall || '',
        valorVenda: leadRes.data.valorVenda || '',
        previsaoFechamento: leadRes.data.previsaoFechamento ? new Date(leadRes.data.previsaoFechamento).toISOString().slice(0, 10) : '',
      });
    } catch (err) {
      console.error('Erro ao carregar lead:', err);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    setSalvando(true);
    setSalvoMsg('');
    try {
      const payload = {};
      if (campos.dorPrincipal !== (lead.dorPrincipal || '')) payload.dorPrincipal = campos.dorPrincipal || null;
      if (campos.tracoCarater !== (lead.tracoCarater || '')) payload.tracoCarater = campos.tracoCarater || null;
      if (campos.objecaoPrincipal !== (lead.objecaoPrincipal || '')) payload.objecaoPrincipal = campos.objecaoPrincipal || null;
      if (campos.resultadoCall !== (lead.resultadoCall || '')) payload.resultadoCall = campos.resultadoCall || null;
      if (campos.valorVenda !== '' && campos.valorVenda !== (lead.valorVenda || '')) payload.valorVenda = parseFloat(campos.valorVenda);
      else if (campos.valorVenda === '' && lead.valorVenda) payload.valorVenda = null;
      if (campos.previsaoFechamento !== (lead.previsaoFechamento ? new Date(lead.previsaoFechamento).toISOString().slice(0, 10) : '')) payload.previsaoFechamento = campos.previsaoFechamento || null;

      if (Object.keys(payload).length === 0) {
        setSalvoMsg('Sem alteracoes');
        setTimeout(() => setSalvoMsg(''), 2000);
        setSalvando(false);
        return;
      }

      const { data } = await api.patch(`/leads/${id}`, payload);
      setLead(data);
      setSalvoMsg('Salvo!');
      setTimeout(() => setSalvoMsg(''), 2000);
    } catch (err) {
      setSalvoMsg('Erro ao salvar');
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  if (!lead) {
    return <p className="text-text-muted text-center py-12">Lead nao encontrado</p>;
  }

  const score = scoreBadge(lead.pontuacao);
  const CanalIcone = lead.canal === 'bio' ? Instagram : Megaphone;
  const ultimaCallComResumo = interacoes.find((i) => i.tipo === 'call' && i.resumoIa);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-[10px] hover:bg-white/[0.03] text-text-secondary transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{lead.nome}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CLASSE_COR[lead.classe]}`}>
              Classe {lead.classe}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${score.bg}`}>
              {lead.pontuacao} — {score.label}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ETAPA_COR[lead.etapaFunil]}`}>
              {ETAPA_LABEL[lead.etapaFunil]}
            </span>
          </div>
        </div>
        <button
          onClick={() => setConfirmandoExclusao(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-semibold text-accent-danger/70 hover:text-accent-danger hover:bg-[rgba(225,112,85,0.06)] transition-all"
          title="Excluir lead"
        >
          <Trash2 size={14} />
        </button>
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white px-4 py-2 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] disabled:opacity-50 transition-all duration-250"
        >
          <Save size={14} />
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        {salvoMsg && (
          <span className={`text-[11px] ${salvoMsg === 'Salvo!' ? 'text-accent-emerald' : 'text-text-muted'}`}>
            {salvoMsg}
          </span>
        )}
      </div>

      <DuplicateAlert leadId={lead.id} duplicatas={duplicatas} onResolvido={carregar} />

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Coluna esquerda */}
        <div className="lg:col-span-3 space-y-4">
          {/* Resumo + Proxima Acao */}
          {(lead.resumoConversa || lead.proximaAcao) ? (
            <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] space-y-4">
              {lead.proximaAcao && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(108,92,231,0.1)] flex items-center justify-center">
                        <Zap size={16} className="text-accent-violet-light" />
                      </div>
                      <span className="text-[12px] font-bold text-white uppercase tracking-[0.5px]">Proxima Acao</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          setAtualizandoResumo(true);
                          try {
                            const { data } = await api.post(`/leads/${lead.id}/resumo`);
                            if (data.lead) setLead(data.lead);
                          } catch (err) {
                            console.error('Erro ao atualizar resumo:', err);
                          } finally {
                            setAtualizandoResumo(false);
                          }
                        }}
                        disabled={atualizandoResumo}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-muted hover:text-accent-violet-light hover:bg-[rgba(108,92,231,0.06)] transition-all disabled:opacity-50"
                        title="Atualizar resumo com IA"
                      >
                        {atualizandoResumo ? <Loader size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                        Atualizar
                      </button>
                      {lead.proximaAcaoData && (
                        <button
                          onClick={async () => {
                            try {
                              const response = await api.get(`/leads/${lead.id}/agenda.ics`, {
                                responseType: 'blob',
                              });
                              const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/calendar' }));
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `crm-${lead.nome.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (err) {
                              console.error('Erro ao baixar .ics:', err);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white text-[10px] font-semibold hover:shadow-[0_4px_12px_rgba(108,92,231,0.25)] transition-all"
                        >
                          <CalendarPlus size={12} />
                          Adicionar a agenda
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] text-text-primary leading-relaxed">{lead.proximaAcao}</p>
                  {lead.proximaAcaoData && (
                    <p className="text-[11px] text-accent-violet-light mt-2 flex items-center gap-1.5">
                      <Clock size={12} />
                      {new Date(lead.proximaAcaoData).toLocaleDateString('pt-BR')} as {new Date(lead.proximaAcaoData).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}

              {lead.proximaAcao && lead.resumoConversa && (
                <div className="border-t border-border-subtle" />
              )}

              {lead.resumoConversa && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(0,206,201,0.1)] flex items-center justify-center">
                      <FileText size={16} className="text-accent-cyan" />
                    </div>
                    <span className="text-[12px] font-bold text-white uppercase tracking-[0.5px]">Resumo da Conversa</span>
                    <span className="px-1.5 py-0.5 rounded bg-[rgba(108,92,231,0.1)] text-accent-violet-light text-[8px] font-bold flex items-center gap-1">
                      <Bot size={9} /> IA
                    </span>
                  </div>
                  <p className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap">{lead.resumoConversa}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-bg-card border border-border-subtle border-dashed rounded-[14px] p-[22px] text-center">
              <div className="w-10 h-10 rounded-xl bg-[rgba(108,92,231,0.06)] flex items-center justify-center mx-auto mb-3">
                <Zap size={18} className="text-text-muted" />
              </div>
              <p className="text-[12px] text-text-muted">Grave uma call ou envie prints para gerar o resumo e a proxima acao automaticamente.</p>
            </div>
          )}

          {/* Informacoes de contato */}
          <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] space-y-4">
            <h2 className="text-[12px] font-semibold text-text-secondary">Informacoes do Lead</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-[12px]">
                <Phone size={14} className="text-text-muted" />
                <span className="text-text-primary">{lead.telefone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-[12px]">
                  <Mail size={14} className="text-text-muted" />
                  <span className="text-text-primary truncate">{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[12px]">
                <CanalIcone size={14} className="text-text-muted" />
                <span className="text-text-primary">{lead.canal === 'bio' ? 'Bio (organico)' : 'Anuncio (pago)'}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <Clock size={14} className="text-text-muted" />
                <span className="text-text-primary">
                  {new Date(lead.createdAt).toLocaleDateString('pt-BR')} {new Date(lead.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <User size={14} className="text-text-muted" />
                {isAdmin && !editandoCloser ? (
                  <button
                    onClick={() => setEditandoCloser(true)}
                    className="flex items-center gap-1 text-text-primary hover:text-accent-violet-light transition-colors group"
                    title="Clique para alterar o closer"
                  >
                    <span>{lead.vendedor?.nomeExibicao || 'Nao atribuido'}</span>
                    <ChevronRight size={12} className="text-text-muted group-hover:text-accent-violet-light transition-colors" />
                  </button>
                ) : isAdmin && editandoCloser ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={lead.vendedorId || ''}
                      onChange={(e) => redistribuirLead(parseInt(e.target.value, 10))}
                      disabled={redistribuindo}
                      className="bg-bg-input border border-border-default rounded-lg text-text-primary text-[12px] px-2 py-1 outline-none focus:border-[rgba(108,92,231,0.4)] disabled:opacity-50"
                    >
                      <option value="" disabled>Selecionar closer...</option>
                      {vendedores.filter(v => v.ativo !== false).map(v => (
                        <option key={v.id} value={v.id}>{v.nomeExibicao || v.usuario?.nome}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setEditandoCloser(false)}
                      className="text-text-muted hover:text-text-primary text-[10px]"
                    >
                      Cancelar
                    </button>
                    {redistribuindo && (
                      <Loader size={12} className="animate-spin text-accent-violet-light" />
                    )}
                  </div>
                ) : (
                  <span className="text-text-primary">{lead.vendedor?.nomeExibicao || 'Nao atribuido'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Campos IA */}
          <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] space-y-4">
            <h2 className="text-[12px] font-semibold text-text-secondary">Analise do Lead</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoIA label="Dor Principal">
                <textarea
                  value={campos.dorPrincipal}
                  onChange={(e) => setCampos({ ...campos, dorPrincipal: e.target.value })}
                  rows={3}
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] resize-none transition-all"
                  placeholder="Descreva a dor principal do lead..."
                />
              </CampoIA>

              <CampoIA label="Objecao Principal">
                <textarea
                  value={campos.objecaoPrincipal}
                  onChange={(e) => setCampos({ ...campos, objecaoPrincipal: e.target.value })}
                  rows={3}
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] resize-none transition-all"
                  placeholder="Qual a principal objecao?"
                />
              </CampoIA>

              <CampoIA label="Traco de Carater">
                <select
                  value={campos.tracoCarater}
                  onChange={(e) => setCampos({ ...campos, tracoCarater: e.target.value })}
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] transition-all"
                >
                  {TRACO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </CampoIA>

              <CampoIA label="Resultado da Call">
                <select
                  value={campos.resultadoCall}
                  onChange={(e) => setCampos({ ...campos, resultadoCall: e.target.value })}
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] transition-all"
                >
                  {RESULTADO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </CampoIA>

              <div>
                <label className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1 flex items-center gap-1">
                  Valor da Venda (R$)
                </label>
                <input
                  type="number"
                  value={campos.valorVenda}
                  onChange={(e) => setCampos({ ...campos, valorVenda: e.target.value })}
                  placeholder="1229"
                  step="0.01"
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1 flex items-center gap-1">
                  Previsao de Fechamento
                </label>
                <input
                  type="date"
                  value={campos.previsaoFechamento}
                  onChange={(e) => setCampos({ ...campos, previsaoFechamento: e.target.value })}
                  className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-bg-card border border-border-subtle rounded-[14px] overflow-hidden">
            <button
              onClick={() => setTimelineAberta(!timelineAberta)}
              className="w-full flex items-center justify-between px-[22px] py-3 hover:bg-white/[0.02] transition-colors"
            >
              <h2 className="text-[12px] font-semibold text-text-secondary">
                Timeline de Interacoes ({interacoes.length})
              </h2>
              {timelineAberta ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
            </button>

            {timelineAberta && (
              <div className="border-t border-border-subtle">
                {interacoes.length === 0 ? (
                  <p className="text-[12px] text-text-muted text-center py-6">Nenhuma interacao registrada</p>
                ) : (
                  <div>
                    {interacoes.map((int) => {
                      const Icone = INTERACAO_ICONE[int.tipo] || FileText;
                      const dotBg = INTERACAO_DOT[int.tipo] || 'bg-[rgba(255,255,255,0.06)]';
                      return (
                        <div key={int.id} className="flex gap-3 px-[22px] py-3 border-b border-border-subtle last:border-b-0">
                          <div className="mt-0.5">
                            <div className={`w-8 h-8 rounded-lg ${dotBg} flex items-center justify-center`}>
                              <Icone size={13} className="text-text-secondary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-text-primary">
                                {INTERACAO_LABEL[int.tipo] || int.tipo}
                              </span>
                              <span className="text-[10px] text-text-muted">
                                {int.vendedor?.nomeExibicao}
                              </span>
                              {int.duracao && (
                                <span className="text-[10px] text-text-muted">
                                  {Math.round(int.duracao / 60)}min
                                </span>
                              )}
                              {int.resumoIa && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[rgba(108,92,231,0.1)] text-accent-violet-light rounded text-[8px] font-bold">
                                  <Bot size={8} /> IA
                                </span>
                              )}
                            </div>
                            {int.conteudo && (
                              <p className="text-[11px] text-text-secondary mt-1 whitespace-pre-wrap">{int.conteudo}</p>
                            )}
                            {int.tipo === 'print_whatsapp' && int.gravacaoUrl && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {int.gravacaoUrl.split(',').map((url, idx) => (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={url}
                                      alt={`Print ${idx + 1}`}
                                      className="w-20 h-20 object-cover rounded-lg border border-border-default hover:border-accent-violet transition-colors cursor-pointer"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                            {int.resumoIa && (
                              <div className="mt-1 bg-[rgba(108,92,231,0.06)] border border-[rgba(108,92,231,0.1)] rounded-lg p-[8px_10px] text-[11px] text-[#b0b0d0]">
                                {int.resumoIa}
                              </div>
                            )}
                            {int.tipo === 'print_whatsapp' && int.transcricao && (
                              <details className="mt-1 text-[11px]">
                                <summary className="cursor-pointer text-accent-violet-light hover:underline">
                                  Ver conversa extraida
                                </summary>
                                <p className="mt-1 text-[#b0b0d0] leading-relaxed whitespace-pre-wrap bg-bg-elevated rounded-[10px] p-2 max-h-40 overflow-y-auto">
                                  {int.transcricao}
                                </p>
                              </details>
                            )}
                            <p className="text-[10px] text-text-muted mt-1">
                              {new Date(int.createdAt).toLocaleDateString('pt-BR')}{' '}
                              {new Date(int.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
            <CallRecorder
              leadId={lead.id}
              onTranscricaoConcluida={(resultado) => {
                if (resultado.lead) {
                  setLead(resultado.lead);
                  setCampos({
                    dorPrincipal: resultado.lead.dorPrincipal || '',
                    tracoCarater: resultado.lead.tracoCarater || '',
                    objecaoPrincipal: resultado.lead.objecaoPrincipal || '',
                    resultadoCall: resultado.lead.resultadoCall || '',
                  });
                }
                if (resultado.interacao) {
                  setInteracoes((prev) => [resultado.interacao, ...prev]);
                }
              }}
            />
          </div>

          <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
            <PrintUploader
              leadId={lead.id}
              onPrintAnalisado={(resultado) => {
                if (resultado.lead) {
                  setLead(resultado.lead);
                  setCampos({
                    dorPrincipal: resultado.lead.dorPrincipal || '',
                    tracoCarater: resultado.lead.tracoCarater || '',
                    objecaoPrincipal: resultado.lead.objecaoPrincipal || '',
                    resultadoCall: resultado.lead.resultadoCall || '',
                  });
                }
                if (resultado.interacao) {
                  setInteracoes((prev) => [resultado.interacao, ...prev]);
                }
              }}
            />
          </div>

          <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] sticky top-6">
            <ScriptChecklist
              lead={lead}
              resumoIa={ultimaCallComResumo?.resumoIa || interacoes.find(i => i.resumoIa)?.resumoIa}
              camposIa={interacoes.find(i => i.camposIa)?.camposIa}
            />
          </div>
        </div>
      </div>

      {confirmandoExclusao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-default rounded-2xl p-6 max-w-[400px] w-full mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[rgba(225,112,85,0.1)] flex items-center justify-center">
                <Trash2 size={20} className="text-accent-danger" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-white">Excluir lead?</h3>
                <p className="text-[11px] text-text-muted">Esta acao nao pode ser desfeita</p>
              </div>
            </div>
            <p className="text-[12px] text-text-secondary mb-5">
              O lead <strong className="text-white">{lead.nome}</strong> e todo o seu historico (interacoes, follow-ups, gravacoes) serao excluidos permanentemente.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmandoExclusao(false)}
                disabled={excluindo}
                className="px-4 py-2 rounded-lg text-[12px] font-semibold text-text-secondary bg-bg-elevated border border-border-default hover:border-border-hover transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={excluirLead}
                disabled={excluindo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-accent-danger hover:bg-[#c0392b] transition-all disabled:opacity-50"
              >
                <Trash2 size={13} />
                {excluindo ? 'Excluindo...' : 'Excluir permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
