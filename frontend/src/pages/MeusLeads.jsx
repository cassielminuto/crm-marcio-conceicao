import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, ChevronLeft, ChevronRight, Phone, Mail, Instagram, Megaphone } from 'lucide-react';

const ETAPAS_LABEL = {
  novo: 'Novo',
  em_abordagem: 'Em Abordagem',
  qualificado: 'Qualificado',
  proposta: 'Proposta',
  fechado_ganho: 'Fechado Ganho',
  fechado_perdido: 'Fechado Perdido',
  nurturing: 'Nurturing',
};

const ETAPA_COR = {
  novo: 'bg-blue-100 text-blue-700',
  em_abordagem: 'bg-yellow-100 text-yellow-700',
  qualificado: 'bg-purple-100 text-purple-700',
  proposta: 'bg-orange-100 text-orange-700',
  fechado_ganho: 'bg-green-100 text-green-700',
  fechado_perdido: 'bg-red-100 text-red-700',
  nurturing: 'bg-gray-100 text-gray-600',
};

const CLASSE_COR = {
  A: 'bg-red-100 text-red-700',
  B: 'bg-yellow-100 text-yellow-700',
  C: 'bg-blue-100 text-blue-700',
};

function scoreCor(pontuacao) {
  if (pontuacao >= 75) return 'text-red-600 font-bold';
  if (pontuacao >= 45) return 'text-yellow-600 font-semibold';
  return 'text-blue-600';
}

export default function MeusLeads() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [paginacao, setPaginacao] = useState({ pagina: 1, total: 0, totalPaginas: 1 });
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [filtroClasse, setFiltroClasse] = useState('');
  const [pagina, setPagina] = useState(1);

  // Debounce de busca
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Meus Leads</h1>
        <p className="text-sm text-gray-500 mt-1">{paginacao.total} leads encontrados</p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap bg-white rounded-lg border border-gray-200 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filtroEtapa}
          onChange={(e) => { setFiltroEtapa(e.target.value); setPagina(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as etapas</option>
          {Object.entries(ETAPAS_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={filtroClasse}
          onChange={(e) => { setFiltroClasse(e.target.value); setPagina(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as classes</option>
          <option value="A">Classe A</option>
          <option value="B">Classe B</option>
          <option value="C">Classe C</option>
        </select>

        {(busca || filtroEtapa || filtroClasse) && (
          <button
            onClick={() => { setBusca(''); setFiltroEtapa(''); setFiltroClasse(''); setPagina(1); }}
            className="text-xs text-blue-600 hover:underline"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Lead</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Contato</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Score</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Classe</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Canal</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Etapa</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Vendedor</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Entrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {carregando ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const CanalIcone = lead.canal === 'bio' ? Instagram : Megaphone;
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p
                          className="text-sm font-medium text-gray-800 hover:text-blue-600 cursor-pointer"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                        >{lead.nome}</p>
                        {lead.dorPrincipal && (
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">{lead.dorPrincipal}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone size={12} />
                          <span>{lead.telefone}</span>
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Mail size={10} />
                            <span className="truncate max-w-[150px]">{lead.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm ${scoreCor(lead.pontuacao)}`}>
                          {lead.pontuacao}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CLASSE_COR[lead.classe]}`}>
                          {lead.classe}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <CanalIcone size={12} />
                          {lead.canal === 'bio' ? 'Bio' : 'Anuncio'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ETAPA_COR[lead.etapaFunil] || 'bg-gray-100 text-gray-600'}`}>
                          {ETAPAS_LABEL[lead.etapaFunil] || lead.etapaFunil}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {lead.vendedor?.nomeExibicao || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {paginacao.totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Pagina {paginacao.pagina} de {paginacao.totalPaginas} ({paginacao.total} leads)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, paginacao.totalPaginas) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className={`w-7 h-7 rounded text-xs font-medium ${
                      p === pagina
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPagina((p) => Math.min(paginacao.totalPaginas, p + 1))}
                disabled={pagina >= paginacao.totalPaginas}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
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
