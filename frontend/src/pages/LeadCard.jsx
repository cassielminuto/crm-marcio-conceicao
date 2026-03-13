import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScriptChecklist from '../components/ScriptChecklist';
import CallRecorder from '../components/CallRecorder';
import {
  ArrowLeft, Phone, Mail, Instagram, Megaphone, Clock, User, Save,
  MessageSquare, PhoneCall, FileText, ChevronDown, ChevronUp, Bot,
} from 'lucide-react';

const ETAPA_COR = {
  novo: 'bg-blue-100 text-blue-700',
  em_abordagem: 'bg-yellow-100 text-yellow-700',
  qualificado: 'bg-purple-100 text-purple-700',
  proposta: 'bg-orange-100 text-orange-700',
  fechado_ganho: 'bg-green-100 text-green-700',
  fechado_perdido: 'bg-red-100 text-red-700',
  nurturing: 'bg-gray-100 text-gray-600',
};

const ETAPA_LABEL = {
  novo: 'Novo', em_abordagem: 'Em Abordagem', qualificado: 'Qualificado',
  proposta: 'Proposta', fechado_ganho: 'Fechado Ganho', fechado_perdido: 'Fechado Perdido',
  nurturing: 'Nurturing',
};

const CLASSE_COR = {
  A: 'bg-red-100 text-red-700', B: 'bg-yellow-100 text-yellow-700', C: 'bg-blue-100 text-blue-700',
};

function scoreBadge(pontuacao) {
  if (pontuacao >= 75) return { bg: 'bg-red-500', label: 'Quente' };
  if (pontuacao >= 45) return { bg: 'bg-yellow-500', label: 'Morno' };
  return { bg: 'bg-blue-500', label: 'Frio' };
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
  nota: FileText, email: Mail,
};

const INTERACAO_LABEL = {
  call: 'Call', whatsapp_enviado: 'WhatsApp enviado', whatsapp_recebido: 'WhatsApp recebido',
  nota: 'Nota', email: 'Email',
};

function CampoIA({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
        {label}
        <span className="px-1 py-0.5 bg-purple-100 text-purple-600 rounded text-[9px] font-bold flex items-center gap-0.5">
          <Bot size={8} /> IA
        </span>
      </label>
      {children}
    </div>
  );
}

export default function LeadCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [interacoes, setInteracoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvoMsg, setSalvoMsg] = useState('');
  const [timelineAberta, setTimelineAberta] = useState(true);

  // Campos editáveis
  const [campos, setCampos] = useState({
    dorPrincipal: '',
    tracoCarater: '',
    objecaoPrincipal: '',
    resultadoCall: '',
  });

  const carregar = useCallback(async () => {
    try {
      const [leadRes, intRes] = await Promise.all([
        api.get(`/leads/${id}`),
        api.get(`/leads/${id}/interacoes`),
      ]);
      setLead(leadRes.data);
      setInteracoes(intRes.data);
      setCampos({
        dorPrincipal: leadRes.data.dorPrincipal || '',
        tracoCarater: leadRes.data.tracoCarater || '',
        objecaoPrincipal: leadRes.data.objecaoPrincipal || '',
        resultadoCall: leadRes.data.resultadoCall || '',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!lead) {
    return <p className="text-gray-400 text-center py-12">Lead nao encontrado</p>;
  }

  const score = scoreBadge(lead.pontuacao);
  const CanalIcone = lead.canal === 'bio' ? Instagram : Megaphone;

  // Buscar último resumo de IA das interações
  const ultimaCallComResumo = interacoes.find((i) => i.tipo === 'call' && i.resumoIa);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">{lead.nome}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CLASSE_COR[lead.classe]}`}>
              Classe {lead.classe}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${score.bg}`}>
              {lead.pontuacao} — {score.label}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ETAPA_COR[lead.etapaFunil]}`}>
              {ETAPA_LABEL[lead.etapaFunil]}
            </span>
          </div>
        </div>
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save size={14} />
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        {salvoMsg && (
          <span className={`text-xs ${salvoMsg === 'Salvo!' ? 'text-green-600' : 'text-gray-400'}`}>
            {salvoMsg}
          </span>
        )}
      </div>

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Coluna esquerda — Dados do lead */}
        <div className="lg:col-span-3 space-y-4">
          {/* Informações de contato */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Informacoes do Lead</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-gray-400" />
                <span className="text-gray-700">{lead.telefone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-gray-400" />
                  <span className="text-gray-700 truncate">{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <CanalIcone size={14} className="text-gray-400" />
                <span className="text-gray-700">{lead.canal === 'bio' ? 'Bio (organico)' : 'Anuncio (pago)'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-gray-400" />
                <span className="text-gray-700">
                  {new Date(lead.createdAt).toLocaleDateString('pt-BR')} {new Date(lead.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-gray-400" />
                <span className="text-gray-700">{lead.vendedor?.nomeExibicao || 'Nao atribuido'}</span>
              </div>
            </div>
          </div>

          {/* Campos preenchíveis pela IA */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Analise do Lead</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoIA label="Dor Principal">
                <textarea
                  value={campos.dorPrincipal}
                  onChange={(e) => setCampos({ ...campos, dorPrincipal: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Descreva a dor principal do lead..."
                />
              </CampoIA>

              <CampoIA label="Objecao Principal">
                <textarea
                  value={campos.objecaoPrincipal}
                  onChange={(e) => setCampos({ ...campos, objecaoPrincipal: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Qual a principal objecao?"
                />
              </CampoIA>

              <CampoIA label="Traco de Carater">
                <select
                  value={campos.tracoCarater}
                  onChange={(e) => setCampos({ ...campos, tracoCarater: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {RESULTADO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </CampoIA>
            </div>
          </div>

          {/* Timeline de interações */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setTimelineAberta(!timelineAberta)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-sm font-semibold text-gray-700">
                Timeline de Interacoes ({interacoes.length})
              </h2>
              {timelineAberta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {timelineAberta && (
              <div className="border-t border-gray-100">
                {interacoes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhuma interacao registrada</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {interacoes.map((int) => {
                      const Icone = INTERACAO_ICONE[int.tipo] || FileText;
                      return (
                        <div key={int.id} className="px-5 py-3 flex gap-3">
                          <div className="mt-0.5">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                              <Icone size={13} className="text-gray-500" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-700">
                                {INTERACAO_LABEL[int.tipo] || int.tipo}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {int.vendedor?.nomeExibicao}
                              </span>
                              {int.duracao && (
                                <span className="text-[10px] text-gray-400">
                                  {Math.round(int.duracao / 60)}min
                                </span>
                              )}
                              {int.resumoIa && (
                                <span className="px-1 py-0.5 bg-purple-100 text-purple-600 rounded text-[9px] font-bold flex items-center gap-0.5">
                                  <Bot size={8} /> IA
                                </span>
                              )}
                            </div>
                            {int.conteudo && (
                              <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{int.conteudo}</p>
                            )}
                            {int.resumoIa && (
                              <div className="mt-1 p-2 bg-purple-50 rounded text-xs text-purple-700">
                                {int.resumoIa}
                              </div>
                            )}
                            <p className="text-[10px] text-gray-400 mt-1">
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

        {/* Coluna direita — Call Recorder + Script Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <CallRecorder
              leadId={lead.id}
              onTranscricaoConcluida={(resultado) => {
                // Atualizar campos do lead com dados da IA
                if (resultado.lead) {
                  setLead(resultado.lead);
                  setCampos({
                    dorPrincipal: resultado.lead.dorPrincipal || '',
                    tracoCarater: resultado.lead.tracoCarater || '',
                    objecaoPrincipal: resultado.lead.objecaoPrincipal || '',
                    resultadoCall: resultado.lead.resultadoCall || '',
                  });
                }
                // Atualizar timeline
                if (resultado.interacao) {
                  setInteracoes((prev) => [resultado.interacao, ...prev]);
                }
              }}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-6">
            <ScriptChecklist
              lead={lead}
              resumoIa={ultimaCallComResumo?.resumoIa || interacoes.find(i => i.resumoIa)?.resumoIa}
              camposIa={interacoes.find(i => i.camposIa)?.camposIa}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
