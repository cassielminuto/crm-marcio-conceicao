import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Zap, CalendarPlus, RefreshCw, Loader, ChevronRight, Trash2, MessageCircle, ClipboardList, Package, DollarSign, Calendar, Pencil,
} from 'lucide-react';
import { extrairProduto } from '../utils/produtos';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  const [etapasConfig, setEtapasConfig] = useState([]);
  const [editandoEtapa, setEditandoEtapa] = useState(false);
  const [editandoCampoInfo, setEditandoCampoInfo] = useState(null);
  const [campoInfoValor, setCampoInfoValor] = useState('');
  const [campoInfoSalvo, setCampoInfoSalvo] = useState(null); // campo name when success
  const [campoInfoErro, setCampoInfoErro] = useState(null); // campo name when error

  const [campos, setCampos] = useState({
    dorPrincipal: '',
    tracoCarater: '',
    objecaoPrincipal: '',
    resultadoCall: '',
    valorVenda: '',
    previsaoFechamento: '',
  });

  const meuVendedorId = usuario?.vendedorId || usuario?.vendedor?.id || null;
  const podeEditar = isAdmin || (lead && meuVendedorId && lead.vendedorId === meuVendedorId);

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

  const salvarCampoInfo = async (campo, valor) => {
    setEditandoCampoInfo(null);
    try {
      const payload = { [campo]: valor || null };
      const { data } = await api.patch(`/leads/${id}`, payload);
      setLead(data);
      setCampoInfoErro(null);
      setCampoInfoSalvo(campo);
      setTimeout(() => setCampoInfoSalvo(null), 1200);
    } catch (err) {
      console.error('Erro ao salvar campo:', err);
      setCampoInfoErro(campo);
      setTimeout(() => setCampoInfoErro(null), 2000);
    }
  };

  const iniciarEdicaoCampoInfo = (campo, valorAtual) => {
    if (!podeEditar) return;
    setEditandoCampoInfo(campo);
    setCampoInfoValor(valorAtual || '');
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

  useEffect(() => {
    api.get('/etapas').then(r => setEtapasConfig(r.data)).catch(() => {});
  }, []);

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
            {editandoEtapa ? (
              <select
                value={lead.etapaFunil}
                onChange={async (e) => {
                  const novaEtapa = e.target.value;
                  if (novaEtapa === lead.etapaFunil) { setEditandoEtapa(false); return; }
                  try {
                    const { data } = await api.patch(`/leads/${lead.id}/etapa`, { etapa: novaEtapa });
                    setLead(data);
                    setEditandoEtapa(false);
                  } catch (err) {
                    console.error('Erro ao mudar etapa:', err);
                    setEditandoEtapa(false);
                  }
                }}
                onBlur={() => setTimeout(() => setEditandoEtapa(false), 150)}
                autoFocus
                className="bg-bg-input border border-border-default rounded-lg text-text-primary text-[11px] px-2 py-1 outline-none focus:border-[rgba(108,92,231,0.4)]"
              >
                {etapasConfig.map(et => (
                  <option key={et.slug} value={et.slug}>{et.label}</option>
                ))}
              </select>
            ) : (
              <span
                onClick={() => podeEditar && setEditandoEtapa(true)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${podeEditar ? 'cursor-pointer hover:ring-2 hover:ring-white/10' : 'cursor-default'}`}
                style={{ backgroundColor: hexToRgba((etapasConfig.find(e => e.slug === lead.etapaFunil)?.cor || '#6c5ce7'), 0.12), color: etapasConfig.find(e => e.slug === lead.etapaFunil)?.cor || '#6c5ce7' }}
                title={podeEditar ? 'Clique para mudar a etapa' : ''}
              >
                {etapasConfig.find(e => e.slug === lead.etapaFunil)?.label || lead.etapaFunil}
              </span>
            )}
            {lead.vendaRealizada && extrairProduto(lead) && (
              <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-[rgba(124,58,237,0.15)] text-[#7C3AED] flex items-center gap-1">
                <Package size={12} />
                {extrairProduto(lead)}
              </span>
            )}
          </div>
        </div>
        {podeEditar && (
          <button
            onClick={() => setConfirmandoExclusao(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-semibold text-accent-danger/70 hover:text-accent-danger hover:bg-[rgba(225,112,85,0.06)] transition-all"
            title="Excluir lead"
          >
            <Trash2 size={14} />
          </button>
        )}
        {podeEditar && (
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white px-4 py-2 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] disabled:opacity-50 transition-all duration-250"
          >
            <Save size={14} />
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        )}
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
              {/* Telefone - editavel inline */}
              <div className={`flex items-center gap-2 text-[12px] rounded-lg px-1.5 py-0.5 -mx-1.5 transition-all ${campoInfoSalvo === 'telefone' ? 'ring-1 ring-[#10B981]' : campoInfoErro === 'telefone' ? 'ring-1 ring-red-500' : ''}`}>
                <Phone size={14} className="text-text-muted shrink-0" />
                {editandoCampoInfo === 'telefone' ? (
                  <input
                    type="text"
                    autoFocus
                    value={campoInfoValor}
                    onChange={(e) => setCampoInfoValor(e.target.value)}
                    onBlur={() => salvarCampoInfo('telefone', campoInfoValor)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditandoCampoInfo(null); }}
                    className="bg-bg-input border border-[rgba(108,92,231,0.4)] rounded-lg text-text-primary text-[12px] px-2 py-0.5 outline-none w-[140px] transition-all"
                  />
                ) : (
                  <span
                    onClick={() => iniciarEdicaoCampoInfo('telefone', lead.telefone)}
                    className="text-text-primary cursor-pointer hover:text-accent-violet-light transition-colors group flex items-center gap-1"
                    title="Clique para editar"
                  >
                    {lead.telefone}
                    <Pencil size={10} className="text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                )}
                <a
                  href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(0,184,148,0.08)] border border-[rgba(0,184,148,0.15)] text-accent-emerald text-[10px] font-semibold hover:bg-[rgba(0,184,148,0.15)] transition-all"
                  title="Abrir WhatsApp"
                >
                  <MessageCircle size={12} />
                  WhatsApp
                </a>
              </div>

              {/* Email - editavel inline */}
              <div className={`flex items-center gap-2 text-[12px] rounded-lg px-1.5 py-0.5 -mx-1.5 transition-all ${campoInfoSalvo === 'email' ? 'ring-1 ring-[#10B981]' : campoInfoErro === 'email' ? 'ring-1 ring-red-500' : ''}`}>
                <Mail size={14} className="text-text-muted shrink-0" />
                {editandoCampoInfo === 'email' ? (
                  <input
                    type="email"
                    autoFocus
                    value={campoInfoValor}
                    onChange={(e) => setCampoInfoValor(e.target.value)}
                    onBlur={() => salvarCampoInfo('email', campoInfoValor)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditandoCampoInfo(null); }}
                    className="bg-bg-input border border-[rgba(108,92,231,0.4)] rounded-lg text-text-primary text-[12px] px-2 py-0.5 outline-none w-[180px] transition-all"
                  />
                ) : (
                  <span
                    onClick={() => iniciarEdicaoCampoInfo('email', lead.email)}
                    className="text-text-primary truncate cursor-pointer hover:text-accent-violet-light transition-colors group flex items-center gap-1"
                    title="Clique para editar"
                  >
                    {lead.email || 'Adicionar email...'}
                    <Pencil size={10} className="text-text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </span>
                )}
              </div>

              {/* Canal - select inline */}
              <div className={`flex items-center gap-2 text-[12px] rounded-lg px-1.5 py-0.5 -mx-1.5 transition-all ${campoInfoSalvo === 'canal' ? 'ring-1 ring-[#10B981]' : campoInfoErro === 'canal' ? 'ring-1 ring-red-500' : ''}`}>
                <CanalIcone size={14} className="text-text-muted shrink-0" />
                {editandoCampoInfo === 'canal' ? (
                  <select
                    autoFocus
                    value={campoInfoValor}
                    onChange={(e) => { setCampoInfoValor(e.target.value); salvarCampoInfo('canal', e.target.value); }}
                    onBlur={() => setEditandoCampoInfo(null)}
                    className="bg-bg-input border border-[rgba(108,92,231,0.4)] rounded-lg text-text-primary text-[12px] px-2 py-0.5 outline-none transition-all"
                  >
                    <option value="bio">Bio (organico)</option>
                    <option value="anuncio">Anuncio (pago)</option>
                    <option value="evento">Evento</option>
                  </select>
                ) : (
                  <span
                    onClick={() => iniciarEdicaoCampoInfo('canal', lead.canal)}
                    className="text-text-primary cursor-pointer hover:text-accent-violet-light transition-colors group flex items-center gap-1"
                    title="Clique para editar"
                  >
                    {lead.canal === 'bio' ? 'Bio (organico)' : lead.canal === 'evento' ? 'Evento' : 'Anuncio (pago)'}
                    <Pencil size={10} className="text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                )}
              </div>

              {/* Data de entrada - datetime-local inline */}
              <div className={`flex items-center gap-2 text-[12px] rounded-lg px-1.5 py-0.5 -mx-1.5 transition-all ${campoInfoSalvo === 'createdAt' ? 'ring-1 ring-[#10B981]' : campoInfoErro === 'createdAt' ? 'ring-1 ring-red-500' : ''}`}>
                <Clock size={14} className="text-text-muted shrink-0" />
                {editandoCampoInfo === 'createdAt' ? (
                  <input
                    type="datetime-local"
                    autoFocus
                    value={campoInfoValor}
                    onChange={(e) => setCampoInfoValor(e.target.value)}
                    onBlur={() => {
                      if (campoInfoValor) {
                        salvarCampoInfo('createdAt', new Date(campoInfoValor).toISOString());
                      } else {
                        setEditandoCampoInfo(null);
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditandoCampoInfo(null); }}
                    className="bg-bg-input border border-[rgba(108,92,231,0.4)] rounded-lg text-text-primary text-[12px] px-2 py-0.5 outline-none transition-all"
                  />
                ) : (
                  <span
                    onClick={() => {
                      const d = new Date(lead.createdAt);
                      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                      iniciarEdicaoCampoInfo('createdAt', local);
                    }}
                    className="text-text-primary cursor-pointer hover:text-accent-violet-light transition-colors group flex items-center gap-1"
                    title="Clique para editar"
                  >
                    {new Date(lead.createdAt).toLocaleDateString('pt-BR')} {new Date(lead.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    <Pencil size={10} className="text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                )}
              </div>

              {/* Vendedor - select inline */}
              <div className="flex items-center gap-2 text-[12px] rounded-lg px-1.5 py-0.5 -mx-1.5">
                <User size={14} className="text-text-muted shrink-0" />
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
                      autoFocus
                      value={lead.vendedorId || ''}
                      onChange={(e) => redistribuirLead(parseInt(e.target.value, 10))}
                      disabled={redistribuindo}
                      className="bg-bg-input border border-[rgba(108,92,231,0.4)] rounded-lg text-text-primary text-[12px] px-2 py-1 outline-none disabled:opacity-50"
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
                  onChange={(e) => podeEditar && setCampos({ ...campos, dorPrincipal: e.target.value })}
                  readOnly={!podeEditar}
                  rows={3}
                  className={`w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] resize-none transition-all ${!podeEditar ? 'opacity-70 cursor-default' : ''}`}
                  placeholder="Descreva a dor principal do lead..."
                />
              </CampoIA>

              <CampoIA label="Objecao Principal">
                <textarea
                  value={campos.objecaoPrincipal}
                  onChange={(e) => podeEditar && setCampos({ ...campos, objecaoPrincipal: e.target.value })}
                  readOnly={!podeEditar}
                  rows={3}
                  className={`w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] resize-none transition-all ${!podeEditar ? 'opacity-70 cursor-default' : ''}`}
                  placeholder="Qual a principal objecao?"
                />
              </CampoIA>

              <CampoIA label="Traco de Carater">
                <select
                  value={campos.tracoCarater}
                  onChange={(e) => podeEditar && setCampos({ ...campos, tracoCarater: e.target.value })}
                  disabled={!podeEditar}
                  className={`w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] transition-all ${!podeEditar ? 'opacity-70 cursor-default' : ''}`}
                >
                  {TRACO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </CampoIA>

              <CampoIA label="Resultado da Call">
                <select
                  value={campos.resultadoCall}
                  onChange={(e) => podeEditar && setCampos({ ...campos, resultadoCall: e.target.value })}
                  disabled={!podeEditar}
                  className={`w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] transition-all ${!podeEditar ? 'opacity-70 cursor-default' : ''}`}
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
                  onChange={(e) => podeEditar && setCampos({ ...campos, valorVenda: e.target.value })}
                  readOnly={!podeEditar}
                  placeholder="1229"
                  step="0.01"
                  className={`w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] transition-all ${!podeEditar ? 'opacity-70 cursor-default' : ''}`}
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1 flex items-center gap-1">
                  Previsao de Fechamento
                </label>
                <input
                  type="date"
                  value={campos.previsaoFechamento}
                  onChange={(e) => podeEditar && setCampos({ ...campos, previsaoFechamento: e.target.value })}
                  readOnly={!podeEditar}
                  className={`w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] transition-all ${!podeEditar ? 'opacity-70 cursor-default' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Respostas do Formulario */}
          {lead.dadosRespondi?.respondent?.answers && (
            <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[rgba(108,92,231,0.1)] flex items-center justify-center">
                  <ClipboardList size={16} className="text-accent-violet-light" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white">Respostas do Formulario</h3>
                  <p className="text-[10px] text-text-muted">{lead.dadosRespondi?.form?.form_name || lead.formularioTitulo || 'Respondi'}</p>
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(lead.dadosRespondi.respondent.answers)
                  .filter(([pergunta]) => !pergunta.toLowerCase().includes('nome') && !pergunta.toLowerCase().includes('email') && !pergunta.toLowerCase().includes('whatsapp'))
                  .map(([pergunta, resposta], idx) => (
                    <div key={idx} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                      <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide mb-1">{pergunta}</p>
                      <p className="text-[12px] text-text-primary">{String(resposta)}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {lead.dadosRespondi && !lead.dadosRespondi?.respondent?.answers && lead.dadosRespondi?.statusOriginal && (
            <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList size={16} className="text-text-muted" />
                <h3 className="text-[13px] font-bold text-white">Dados da Importacao</h3>
              </div>
              <p className="text-[12px] text-text-secondary">Status original: {lead.dadosRespondi.statusOriginal}</p>
            </div>
          )}

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

      {confirmandoExclusao && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-default rounded-2xl p-6 max-w-[400px] w-full mx-4 my-8 animate-fade-in">
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
      , document.body)}
    </div>
  );
}
