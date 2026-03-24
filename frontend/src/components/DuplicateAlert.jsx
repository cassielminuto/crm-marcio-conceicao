import { useState } from 'react';
import api from '../services/api';
import { AlertTriangle, X, GitMerge, Trash2, Phone, Mail, Instagram, Megaphone } from 'lucide-react';

const CLASSE_COR = {
  A: 'bg-[rgba(225,112,85,0.12)] text-[#e17055]',
  B: 'bg-[rgba(253,203,110,0.12)] text-[#fdcb6e]',
  C: 'bg-[rgba(116,185,255,0.1)] text-[#74b9ff]',
};

function LeadCompare({ lead, label, selecionado, onSelecionar }) {
  const CanalIcone = lead.canal === 'bio' ? Instagram : Megaphone;

  return (
    <div
      onClick={onSelecionar}
      className={`rounded-[14px] border-2 p-4 cursor-pointer transition-all ${
        selecionado ? 'border-accent-violet bg-[rgba(108,92,231,0.06)]' : 'border-border-default hover:border-border-hover'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-text-muted uppercase">{label}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CLASSE_COR[lead.classe]}`}>
          {lead.classe} — {lead.pontuacao}pts
        </span>
      </div>

      <h3 className="font-semibold text-white text-[13px]">{lead.nome}</h3>

      <div className="mt-2 space-y-1 text-[11px] text-text-secondary">
        <div className="flex items-center gap-1"><Phone size={10} /> {lead.telefone}</div>
        {lead.email && <div className="flex items-center gap-1"><Mail size={10} /> {lead.email}</div>}
        <div className="flex items-center gap-1"><CanalIcone size={10} /> {lead.canal}</div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.04)] text-text-muted rounded text-[10px]">
          {lead.etapaFunil?.replace('_', ' ')}
        </span>
        {lead.vendedor && (
          <span className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.04)] text-text-muted rounded text-[10px]">
            {lead.vendedor.nomeExibicao}
          </span>
        )}
        {lead.dorPrincipal && (
          <span className="px-1.5 py-0.5 bg-[rgba(108,92,231,0.1)] text-accent-violet-light rounded text-[10px]">
            Dor: {lead.dorPrincipal.slice(0, 30)}...
          </span>
        )}
      </div>

      <p className="text-[10px] text-text-faint mt-2">
        Entrada: {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
      </p>
    </div>
  );
}

export default function DuplicateAlert({ leadId, duplicatas, onResolvido }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [selecionadoPrincipal, setSelecionadoPrincipal] = useState(null);
  const [processando, setProcessando] = useState(false);

  if (!duplicatas || duplicatas.length === 0) return null;

  const handleMerge = async (principalId, duplicadoId) => {
    setProcessando(true);
    try {
      await api.post(`/leads/${principalId}/merge/${duplicadoId}`);
      setModalAberto(false);
      if (onResolvido) onResolvido();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao mergear');
    } finally {
      setProcessando(false);
    }
  };

  const handleDescartar = async (dup) => {
    const outroId = dup.leadOrigemId === leadId ? dup.leadDuplicataId : dup.leadOrigemId;
    try {
      await api.delete(`/leads/${leadId}/duplicatas/${outroId}`);
      if (onResolvido) onResolvido();
    } catch (err) {
      console.error('Erro ao descartar:', err);
    }
  };

  return (
    <>
      {/* Banner */}
      <div className="bg-[rgba(253,203,110,0.06)] border-2 border-[rgba(253,203,110,0.2)] rounded-[14px] p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-accent-amber shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-[12px] font-semibold text-accent-amber">
              Possivel duplicata detectada
            </h3>
            <p className="text-[11px] text-text-secondary mt-1">
              {duplicatas.length} lead(s) com dados semelhantes encontrado(s):
            </p>
            <ul className="mt-2 space-y-1">
              {duplicatas.map((dup) => {
                const outro = dup.leadOrigemId === leadId ? dup.leadDuplicata : dup.leadOrigem;
                return (
                  <li key={dup.id} className="flex items-center justify-between bg-bg-elevated rounded-[10px] p-2">
                    <span className="text-[11px] text-text-primary">
                      <span className="font-medium">{outro.nome}</span>
                      {' — '}
                      <span className="text-accent-amber">match por {dup.tipoMatch}</span>
                      {' — '}{outro.telefone}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setSelecionadoPrincipal(leadId); setModalAberto(true); }}
                        className="px-2 py-1 bg-[rgba(108,92,231,0.1)] text-accent-violet-light rounded text-[10px] font-medium hover:bg-[rgba(108,92,231,0.18)] transition-colors"
                      >
                        <GitMerge size={10} className="inline mr-1" />
                        Comparar e Unificar
                      </button>
                      <button
                        onClick={() => handleDescartar(dup)}
                        className="px-2 py-1 bg-[rgba(255,255,255,0.04)] text-text-muted rounded text-[10px] hover:bg-white/[0.06] transition-colors"
                      >
                        <Trash2 size={10} className="inline mr-1" />
                        Descartar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border-subtle rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[16px] font-bold text-white">Comparar e Unificar Leads</h2>
              <button onClick={() => setModalAberto(false)} className="p-1 hover:bg-white/[0.03] rounded text-text-muted">
                <X size={18} />
              </button>
            </div>

            <p className="text-[11px] text-text-secondary mb-4">
              Selecione o lead que sera mantido como principal. O outro sera marcado como perdido e suas interacoes transferidas.
            </p>

            {duplicatas.map((dup) => {
              const leadA = dup.leadOrigem;
              const leadB = dup.leadDuplicata;

              return (
                <div key={dup.id} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] text-accent-amber bg-[rgba(253,203,110,0.1)] px-2 py-1 rounded font-medium">
                      Match: {dup.tipoMatch}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <LeadCompare
                      lead={leadA}
                      label={`Lead #${leadA.id}`}
                      selecionado={selecionadoPrincipal === leadA.id}
                      onSelecionar={() => setSelecionadoPrincipal(leadA.id)}
                    />
                    <LeadCompare
                      lead={leadB}
                      label={`Lead #${leadB.id}`}
                      selecionado={selecionadoPrincipal === leadB.id}
                      onSelecionar={() => setSelecionadoPrincipal(leadB.id)}
                    />
                  </div>

                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => {
                        const principal = selecionadoPrincipal || leadA.id;
                        const duplicado = principal === leadA.id ? leadB.id : leadA.id;
                        handleMerge(principal, duplicado);
                      }}
                      disabled={processando}
                      className="flex items-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white px-6 py-2.5 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] disabled:opacity-50 transition-all duration-250"
                    >
                      <GitMerge size={16} />
                      {processando ? 'Unificando...' : `Manter Lead #${selecionadoPrincipal || leadA.id} e unificar`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
