import { useState } from 'react';
import api from '../services/api';
import { AlertTriangle, X, GitMerge, Trash2, Phone, Mail, Instagram, Megaphone } from 'lucide-react';

const CLASSE_COR = {
  A: 'bg-red-100 text-red-700', B: 'bg-yellow-100 text-yellow-700', C: 'bg-blue-100 text-blue-700',
};

function LeadCompare({ lead, label, selecionado, onSelecionar }) {
  const CanalIcone = lead.canal === 'bio' ? Instagram : Megaphone;

  return (
    <div
      onClick={onSelecionar}
      className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
        selecionado ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CLASSE_COR[lead.classe]}`}>
          {lead.classe} — {lead.pontuacao}pts
        </span>
      </div>

      <h3 className="font-semibold text-gray-800 text-sm">{lead.nome}</h3>

      <div className="mt-2 space-y-1 text-xs text-gray-600">
        <div className="flex items-center gap-1"><Phone size={10} /> {lead.telefone}</div>
        {lead.email && <div className="flex items-center gap-1"><Mail size={10} /> {lead.email}</div>}
        <div className="flex items-center gap-1"><CanalIcone size={10} /> {lead.canal}</div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
          {lead.etapaFunil?.replace('_', ' ')}
        </span>
        {lead.vendedor && (
          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
            {lead.vendedor.nomeExibicao}
          </span>
        )}
        {lead.dorPrincipal && (
          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px]">
            Dor: {lead.dorPrincipal.slice(0, 30)}...
          </span>
        )}
      </div>

      <p className="text-[10px] text-gray-400 mt-2">
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
      {/* Banner de alerta */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-800">
              Possivel duplicata detectada
            </h3>
            <p className="text-xs text-yellow-700 mt-1">
              {duplicatas.length} lead(s) com dados semelhantes encontrado(s):
            </p>
            <ul className="mt-2 space-y-1">
              {duplicatas.map((dup) => {
                const outro = dup.leadOrigemId === leadId ? dup.leadDuplicata : dup.leadOrigem;
                return (
                  <li key={dup.id} className="flex items-center justify-between bg-white rounded-lg p-2">
                    <span className="text-xs text-gray-700">
                      <span className="font-medium">{outro.nome}</span>
                      {' — '}
                      <span className="text-yellow-600">match por {dup.tipoMatch}</span>
                      {' — '}{outro.telefone}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setSelecionadoPrincipal(leadId); setModalAberto(true); }}
                        className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-[10px] font-medium hover:bg-blue-200"
                      >
                        <GitMerge size={10} className="inline mr-1" />
                        Comparar e Unificar
                      </button>
                      <button
                        onClick={() => handleDescartar(dup)}
                        className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-[10px] hover:bg-gray-200"
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

      {/* Modal de comparação */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Comparar e Unificar Leads</h2>
              <button onClick={() => setModalAberto(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Selecione o lead que sera mantido como principal. O outro sera marcado como perdido e suas interacoes transferidas.
            </p>

            {duplicatas.map((dup) => {
              const leadA = dup.leadOrigem;
              const leadB = dup.leadDuplicata;

              return (
                <div key={dup.id} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded font-medium">
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
                      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
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
