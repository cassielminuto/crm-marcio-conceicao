import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, ChevronLeft, ChevronRight, Phone, Mail, Instagram, Megaphone, Zap } from 'lucide-react';

const ETAPAS_LABEL = {
  novo: 'Novo', em_abordagem: 'Em Abordagem', qualificado: 'Qualificado',
  proposta: 'Proposta', fechado_ganho: 'Fechado Ganho', fechado_perdido: 'Fechado Perdido',
  nurturing: 'Nurturing',
};

const ETAPA_COR = {
  novo: 'bg-[rgba(116,185,255,0.12)] text-accent-info',
  em_abordagem: 'bg-[rgba(253,203,110,0.12)] text-accent-amber',
  qualificado: 'bg-[rgba(108,92,231,0.12)] text-accent-violet-light',
  proposta: 'bg-[rgba(225,112,85,0.12)] text-accent-danger',
  fechado_ganho: 'bg-[rgba(0,184,148,0.12)] text-accent-emerald',
  fechado_perdido: 'bg-[rgba(225,112,85,0.12)] text-accent-danger',
  nurturing: 'bg-[rgba(255,255,255,0.06)] text-text-muted',
};

const CLASSE_COR = {
  A: 'bg-[rgba(225,112,85,0.12)] text-[#e17055]',
  B: 'bg-[rgba(253,203,110,0.12)] text-[#fdcb6e]',
  C: 'bg-[rgba(116,185,255,0.1)] text-[#74b9ff]',
};

function scoreCor(pontuacao) {
  if (pontuacao >= 75) return 'text-[#e17055] font-bold';
  if (pontuacao >= 45) return 'text-[#fdcb6e] font-semibold';
  return 'text-[#74b9ff]';
}

export default function MeusLeads() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [paginacao, setPaginacao] = useState({ pagina: 1, total: 0, totalPaginas: 1 });
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [filtroClasse, setFiltroClasse] = useState('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca);
      setPagina(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [busca]);

  const carregarLeads = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({ page: String(pagina), limit: '15' });
      if (buscaDebounced) params.set('busca', buscaDebounced);
      if (filtroEtapa) params.set('etapa', filtroEtapa);
      if (filtroClasse) params.set('classe', filtroClasse);

      const { data } = await api.get(`/leads?${params}`);
      setLeads(data.dados);
      setPaginacao(data.paginacao);
    } catch (err) {
      console.error('Erro ao carregar leads:', err);
    } finally {
      setCarregando(false);
    }
  }, [pagina, buscaDebounced, filtroEtapa, filtroClasse]);

  useEffect(() => {
    carregarLeads();
  }, [carregarLeads]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold text-white">Meus Leads</h1>
        <p className="text-[13px] text-text-secondary mt-1">{paginacao.total} leads encontrados</p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap bg-bg-card border border-border-subtle rounded-[14px] p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-9 pr-3 py-1.5 bg-bg-input border border-border-default rounded-lg text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
          />
        </div>

        <select
          value={filtroEtapa}
          onChange={(e) => { setFiltroEtapa(e.target.value); setPagina(1); }}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
        >
          <option value="">Todas as etapas</option>
          {Object.entries(ETAPAS_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={filtroClasse}
          onChange={(e) => { setFiltroClasse(e.target.value); setPagina(1); }}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
        >
          <option value="">Todas as classes</option>
          <option value="A">Classe A</option>
          <option value="B">Classe B</option>
          <option value="C">Classe C</option>
        </select>

        {(busca || filtroEtapa || filtroClasse) && (
          <button
            onClick={() => { setBusca(''); setFiltroEtapa(''); setFiltroClasse(''); setPagina(1); }}
            className="text-[11px] text-accent-violet-light hover:underline"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-bg-card border border-border-subtle rounded-[14px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-card border-b border-border-subtle">
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Lead</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Contato</th>
                <th className="text-center text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Score</th>
                <th className="text-center text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Classe</th>
                <th className="text-center text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Canal</th>
                <th className="text-center text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Etapa</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Vendedor</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase px-4 py-3">Entrada</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-violet mx-auto" />
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-muted">
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const CanalIcone = lead.canal === 'bio' ? Instagram : Megaphone;
                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] border-b border-border-subtle last:border-b-0 transition-colors">
                      <td className="px-4 py-3">
                        <p
                          className="text-[12px] font-medium text-text-primary hover:text-accent-violet-light cursor-pointer"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                        >{lead.nome}</p>
                        {lead.proximaAcao && (
                          <p className="text-[10px] text-accent-violet-light truncate max-w-[250px] flex items-center gap-1">
                            <Zap size={9} />
                            {lead.proximaAcao}
                          </p>
                        )}
                        {!lead.proximaAcao && lead.dorPrincipal && (
                          <p className="text-[10px] text-text-muted truncate max-w-[200px]">{lead.dorPrincipal}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[12px] text-text-secondary">
                          <Phone size={12} />
                          <span>{lead.telefone}</span>
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1 text-[10px] text-text-muted mt-0.5">
                            <Mail size={10} />
                            <span className="truncate max-w-[150px]">{lead.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[12px] ${scoreCor(lead.pontuacao)}`}>
                          {lead.pontuacao}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CLASSE_COR[lead.classe]}`}>
                          {lead.classe}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                          <CanalIcone size={12} />
                          {lead.canal === 'bio' ? 'Bio' : 'Anuncio'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ETAPA_COR[lead.etapaFunil] || 'bg-[rgba(255,255,255,0.06)] text-text-muted'}`}>
                          {ETAPAS_LABEL[lead.etapaFunil] || lead.etapaFunil}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-text-secondary">
                        {lead.vendedor?.nomeExibicao || '—'}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-text-muted">
                        {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacao */}
        {paginacao.totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
            <p className="text-[11px] text-text-muted">
              Pagina {paginacao.pagina} de {paginacao.totalPaginas} ({paginacao.total} leads)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
                className="p-1 rounded text-text-muted hover:bg-white/[0.03] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, paginacao.totalPaginas) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className={`w-7 h-7 rounded text-[11px] font-medium ${
                      p === pagina
                        ? 'bg-accent-violet text-white'
                        : 'hover:bg-white/[0.03] text-text-secondary'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPagina((p) => Math.min(paginacao.totalPaginas, p + 1))}
                disabled={pagina >= paginacao.totalPaginas}
                className="p-1 rounded text-text-muted hover:bg-white/[0.03] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
