import { useState } from 'react';
import api from '../services/api';
import { Bot, Loader, RefreshCw, Sparkles } from 'lucide-react';

export default function AIResumoPeriodo({ dataInicio, dataFim }) {
  const [resumo, setResumo] = useState(null);
  const [metricas, setMetricas] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const gerarResumo = async () => {
    setCarregando(true);
    setErro('');
    try {
      const params = new URLSearchParams({
        data_inicio: dataInicio.toISOString(),
        data_fim: dataFim.toISOString(),
      });
      const { data } = await api.get(`/relatorios/resumo-ia?${params}`);
      setResumo(data.resumoIA);
      setMetricas(data.metricas);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao gerar resumo');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[rgba(108,92,231,0.1)] flex items-center justify-center">
            <Sparkles size={16} className="text-accent-violet-light" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-white">Resumo do Periodo</h3>
            <p className="text-[10px] text-text-muted">Analise gerada por IA</p>
          </div>
        </div>

        <button
          onClick={gerarResumo}
          disabled={carregando}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
            resumo
              ? 'text-text-muted hover:text-accent-violet-light hover:bg-[rgba(108,92,231,0.06)]'
              : 'text-white bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] hover:shadow-[0_4px_12px_rgba(108,92,231,0.25)]'
          } disabled:opacity-50`}
        >
          {carregando ? (
            <><Loader size={12} className="animate-spin" /> Analisando...</>
          ) : resumo ? (
            <><RefreshCw size={12} /> Atualizar</>
          ) : (
            <><Bot size={12} /> Gerar resumo IA</>
          )}
        </button>
      </div>

      {erro && (
        <div className="bg-[rgba(225,112,85,0.06)] border border-[rgba(225,112,85,0.15)] rounded-lg p-3 text-[12px] text-accent-danger">
          {erro}
        </div>
      )}

      {resumo && (
        <div className="mt-3">
          <p className="text-[12px] text-text-secondary leading-relaxed">{resumo}</p>

          {metricas && (
            <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-border-subtle">
              <div className="text-center">
                <p className="text-[16px] font-bold text-white">{metricas.totalLeads}</p>
                <p className="text-[9px] text-text-muted">Leads</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-accent-emerald">{metricas.vendasGanhas}</p>
                <p className="text-[9px] text-text-muted">Vendas</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-accent-danger">{metricas.vendasPerdidas}</p>
                <p className="text-[9px] text-text-muted">Perdidas</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-accent-violet-light">{metricas.taxaConversaoGeral}</p>
                <p className="text-[9px] text-text-muted">Conversao</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-accent-amber">R$ {(metricas.receitaTotal || 0).toLocaleString('pt-BR')}</p>
                <p className="text-[9px] text-text-muted">Receita</p>
              </div>
            </div>
          )}
        </div>
      )}

      {!resumo && !carregando && !erro && (
        <p className="text-[11px] text-text-muted mt-2 italic">
          Clique em "Gerar resumo IA" para obter uma analise do periodo selecionado.
        </p>
      )}
    </div>
  );
}
