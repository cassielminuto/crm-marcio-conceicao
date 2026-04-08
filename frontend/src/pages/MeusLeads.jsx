import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, ChevronLeft, ChevronRight, Phone, Mail, Instagram, Megaphone, Zap, Trash2, MessageCircle, Users } from 'lucide-react';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const CLASSE_CONFIG = {
  A: { bg: 'rgba(239,68,68,0.08)', text: '#EF4444', ring: 'rgba(239,68,68,0.18)', glow: 'rgba(239,68,68,0.06)' },
  B: { bg: 'rgba(245,158,11,0.08)', text: '#F59E0B', ring: 'rgba(245,158,11,0.18)', glow: 'rgba(245,158,11,0.06)' },
  C: { bg: 'rgba(59,130,246,0.08)', text: '#3B82F6', ring: 'rgba(59,130,246,0.18)', glow: 'rgba(59,130,246,0.06)' },
};

function scoreConfig(pontuacao) {
  if (pontuacao >= 75) return { bg: 'rgba(16,185,129,0.10)', text: '#10B981', border: 'rgba(16,185,129,0.25)' };
  if (pontuacao >= 45) return { bg: 'rgba(245,158,11,0.10)', text: '#F59E0B', border: 'rgba(245,158,11,0.25)' };
  return { bg: 'rgba(239,68,68,0.08)', text: '#EF4444', border: 'rgba(239,68,68,0.20)' };
}

export default function MeusLeads() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [etapasConfig, setEtapasConfig] = useState([]);
  const [paginacao, setPaginacao] = useState({ pagina: 1, total: 0, totalPaginas: 1 });
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [filtroClasse, setFiltroClasse] = useState('');
  const [pagina, setPagina] = useState(1);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [leadParaExcluir, setLeadParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca);
      setPagina(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [busca]);

  useEffect(() => {
    api.get('/etapas').then(r => setEtapasConfig(r.data)).catch(() => {});
  }, []);

  const carregarLeads = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({ page: String(pagina), limit: '15' });
      if (buscaDebounced) params.set('busca', buscaDebounced);
      if (filtroEtapa) params.set('etapa', filtroEtapa);
      if (filtroClasse) params.set('classe', filtroClasse);
      if (dataInicio) params.set('data_inicio', dataInicio);
      if (dataFim) params.set('data_fim', dataFim);

      const { data } = await api.get(`/leads?${params}`);
      setLeads(data.dados);
      setPaginacao(data.paginacao);
    } catch (err) {
      console.error('Erro ao carregar leads:', err);
    } finally {
      setCarregando(false);
    }
  }, [pagina, buscaDebounced, filtroEtapa, filtroClasse, dataInicio, dataFim]);

  useEffect(() => {
    carregarLeads();
  }, [carregarLeads]);

  const confirmarExclusao = async () => {
    if (!leadParaExcluir) return;
    setExcluindo(true);
    try {
      await api.delete(`/leads/${leadParaExcluir.id}`);
      setLeadParaExcluir(null);
      carregarLeads();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    } finally {
      setExcluindo(false);
    }
  };

  /* Pagination range helper */
  const getPaginationRange = () => {
    const total = paginacao.totalPaginas;
    const current = pagina;
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) rangeWithDots.push(1, '...');
    else rangeWithDots.push(1);

    rangeWithDots.push(...range);

    if (current + delta < total - 1) rangeWithDots.push('...', total);
    else if (total > 1) rangeWithDots.push(total);

    return rangeWithDots;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="font-display text-[22px] font-bold text-text-primary">Meus Leads</h1>
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
          {etapasConfig.map((et) => (
            <option key={et.slug} value={et.slug}>{et.label}</option>
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

        <input
          type="date"
          value={dataInicio}
          onChange={(e) => { setDataInicio(e.target.value); setPagina(1); }}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)]"
          title="Data inicio"
        />
        <input
          type="date"
          value={dataFim}
          onChange={(e) => { setDataFim(e.target.value); setPagina(1); }}
          className="bg-bg-input border border-border-default rounded-lg px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)]"
          title="Data fim"
        />

        {(busca || filtroEtapa || filtroClasse || dataInicio || dataFim) && (
          <button
            onClick={() => { setBusca(''); setFiltroEtapa(''); setFiltroClasse(''); setDataInicio(''); setDataFim(''); setPagina(1); }}
            className="text-[11px] text-accent-violet-light hover:underline"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-bg-card border border-border-subtle rounded-[14px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="sticky top-0 z-10" style={{ backdropFilter: 'blur(12px) saturate(180%)', WebkitBackdropFilter: 'blur(12px) saturate(180%)', background: 'rgba(17,17,27,0.85)' }}>
                <th className="text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider px-4 py-3 border-b border-white/[0.06]">Lead</th>
                <th className="text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider px-4 py-3 border-b border-white/[0.06]">Contato</th>
                <th className="text-center text-[10px] font-semibold text-text-muted uppercase tracking-wider px-4 py-3 border-b border-white/[0.06]">Score</th>
                <th className="text-center text-[10px] font-semibold text-text-muted uppercase tracking-wider px-4 py-3 border-b border-white/[0.06]">Classe</th>
                <th className="text-center text-[10px] font-semibold text-text-muted uppercase tracking-wider px-4 py-3 border-b border-white/[0.06]">Canal</th>
                <th className="text-center text-[10px] font-semibold text-text-muted uppercase tracking-wider px-4 py-3 border-b border-white/[0.06]">Etapa</th>
                <th className="text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider px-4 py-3 border-b border-white/[0.06]">Vendedor</th>
                <th className="text-center text-[10px] font-semibold text-text-muted uppercase tracking-wider px-4 py-3 border-b border-white/[0.06]">Valor</th>
                <th className="text-center text-[10px] font-semibold text-text-muted uppercase tracking-wider px-4 py-3 border-b border-white/[0.06]">Prev. Fech.</th>
                <th className="text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider px-4 py-3 border-b border-white/[0.06]">Entrada</th>
                <th className="w-[50px] border-b border-white/[0.06]"></th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-violet mx-auto" />
                    <p className="text-[11px] text-text-muted mt-3">Carregando leads...</p>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-20">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] flex items-center justify-center">
                        <Users size={28} className="text-text-faint" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-text-secondary">Nenhum lead encontrado</p>
                        <p className="text-[12px] text-text-muted mt-1.5 max-w-[280px] mx-auto leading-relaxed">Tente ajustar os filtros de busca ou aguarde a entrada de novos leads no sistema</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => {
                  const CanalIcone = lead.canal === 'bio' ? Instagram : Megaphone;
                  const canalIsBio = lead.canal === 'bio';
                  const sc = scoreConfig(lead.pontuacao);
                  const cc = CLASSE_CONFIG[lead.classe] || CLASSE_CONFIG.C;

                  return (
                    <tr
                      key={lead.id}
                      className="animate-row-enter group transition-all duration-200 cursor-default"
                      style={{
                        animationDelay: `${index * 30}ms`,
                        borderLeft: '2px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        e.currentTarget.style.borderLeft = '2px solid rgba(124,58,237,0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderLeft = '2px solid transparent';
                      }}
                    >
                      <td className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <p
                          className="text-[12px] font-medium text-text-primary hover:text-accent-violet-light cursor-pointer transition-colors"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                        >{lead.nome}</p>
                        {lead.proximaAcao && (
                          <p className="text-[10px] text-accent-violet-light truncate max-w-[250px] flex items-center gap-1 mt-0.5">
                            <Zap size={9} />
                            {lead.proximaAcao}
                          </p>
                        )}
                        {!lead.proximaAcao && lead.dorPrincipal && (
                          <p className="text-[10px] text-text-muted truncate max-w-[200px] mt-0.5">{lead.dorPrincipal}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                          <Phone size={11} className="text-text-muted shrink-0" />
                          <span>{lead.telefone}</span>
                          <a
                            href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md text-accent-emerald hover:bg-[rgba(0,184,148,0.08)] transition-all opacity-0 group-hover:opacity-100"
                            title="Abrir WhatsApp"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle size={13} />
                          </a>
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1 text-[10px] text-text-muted mt-0.5">
                            <Mail size={10} />
                            <span className="truncate max-w-[150px]">{lead.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tabular-nums"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                        >
                          {lead.pontuacao}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold"
                          style={{ background: cc.bg, color: cc.text, boxShadow: `0 0 0 1.5px ${cc.ring}, 0 0 8px ${cc.glow}` }}
                        >
                          {lead.classe}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                            canalIsBio
                              ? 'bg-[rgba(168,85,247,0.08)] text-[#C084FC] border-[rgba(168,85,247,0.15)]'
                              : 'bg-[rgba(59,130,246,0.08)] text-[#60A5FA] border-[rgba(59,130,246,0.15)]'
                          }`}
                        >
                          <CanalIcone size={11} />
                          {canalIsBio ? 'Bio' : 'Anuncio'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {(() => {
                          const et = etapasConfig.find(e => e.slug === lead.etapaFunil);
                          const cor = et?.cor || '#6c5ce7';
                          return (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium"
                              style={{ background: hexToRgba(cor, 0.10), color: cor, border: `1px solid ${hexToRgba(cor, 0.18)}` }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cor, boxShadow: `0 0 4px ${hexToRgba(cor, 0.4)}` }} />
                              {et?.label || lead.etapaFunil}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-text-secondary" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {lead.vendedor?.nomeExibicao || <span className="text-text-faint">--</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {lead.valorVenda ? (
                          <span className="text-[12px] font-semibold text-accent-amber" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            R$ {Number(lead.valorVenda).toLocaleString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-[11px] text-text-faint">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {lead.previsaoFechamento ? (
                          <span className="text-[11px] text-text-secondary">
                            {new Date(lead.previsaoFechamento).toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-[11px] text-text-faint">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-text-muted" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3.5 text-right" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setLeadParaExcluir(lead); }}
                          className="p-1.5 rounded-lg text-text-faint hover:text-accent-danger hover:bg-[rgba(239,68,68,0.08)] transition-all opacity-0 group-hover:opacity-100"
                          title="Excluir lead"
                        >
                          <Trash2 size={14} />
                        </button>
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-text-muted">
              Pagina {paginacao.pagina} de {paginacao.totalPaginas} ({paginacao.total} leads)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
                className="p-1.5 rounded-full text-text-muted hover:bg-white/[0.06] hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              {getPaginationRange().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-[11px] text-text-faint select-none">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className={`min-w-[32px] h-8 px-2 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                      p === pagina
                        ? 'bg-accent-violet text-white shadow-[0_0_16px_rgba(124,58,237,0.35),0_2px_8px_rgba(124,58,237,0.2)]'
                        : 'hover:bg-white/[0.06] text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPagina((p) => Math.min(paginacao.totalPaginas, p + 1))}
                disabled={pagina >= paginacao.totalPaginas}
                className="p-1.5 rounded-full text-text-muted hover:bg-white/[0.06] hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {leadParaExcluir && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-default rounded-2xl p-6 max-w-[400px] w-full mx-4 my-8 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
                <Trash2 size={20} className="text-accent-danger" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-text-primary">Excluir lead?</h3>
                <p className="text-[11px] text-text-muted">Esta acao nao pode ser desfeita</p>
              </div>
            </div>
            <p className="text-[12px] text-text-secondary mb-5">
              O lead <strong className="text-text-primary">{leadParaExcluir.nome}</strong> e todo o seu historico serao excluidos permanentemente.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setLeadParaExcluir(null)}
                disabled={excluindo}
                className="px-4 py-2 rounded-lg text-[12px] font-semibold text-text-secondary bg-bg-elevated border border-border-default hover:border-border-hover transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                disabled={excluindo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-accent-danger hover:bg-[#DC2626] transition-all disabled:opacity-50"
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
