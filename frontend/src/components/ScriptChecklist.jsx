import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check, Bot } from 'lucide-react';

const ETAPAS_SCRIPT = [
  {
    id: 'rapport',
    titulo: 'Etapa 1 — Abertura & Rapport',
    duracao: '2-3 min',
    perguntas: [
      '"[Nome], oi! Aqui e [seu nome], do Compativeis — programa do Marcio Conceicao."',
      '"Tenho uns 25 minutinhos. Voce esta em um lugar tranquilo para falar?"',
    ],
    campos: ['rapport_realizado'],
    camposLead: [],
  },
  {
    id: 'situacao',
    titulo: 'Etapa 2 — SPIN: Perguntas de Situacao',
    duracao: '3-5 min',
    perguntas: [
      '"Voce esta em um relacionamento? Como esta a situacao hoje em casa?"',
      '"Ha quanto tempo voces estao juntos?"',
      '"Seu parceiro(a) sabe que voce procurou esse diagnostico?"',
    ],
    campos: ['status_relacionamento', 'tempo_juntos', 'parceiro_sabe'],
    camposLead: [],
    camposIa: ['parceiro_sabe'],
  },
  {
    id: 'problema',
    titulo: 'Etapa 3 — SPIN: Perguntas de Problema',
    duracao: '5-7 min',
    perguntas: [
      '"O que esta te incomodando mais nesse relacionamento?"',
      '"Voce consegue identificar se isso e um padrao?"',
      '"Quando acontece uma briga, como voce reage?"',
    ],
    campos: ['dorPrincipal', 'tracoCarater'],
    camposLead: ['dorPrincipal', 'tracoCarater'],
  },
  {
    id: 'implicacao',
    titulo: 'Etapa 4 — SPIN: Perguntas de Implicacao',
    duracao: '5-7 min',
    perguntas: [
      '"Quanto tempo voce ja esta nessa situacao?"',
      '"Esse desgaste afeta sono, produtividade, humor?"',
      '"Se daqui a 1 ano estiver igual ou pior, o que acontece?"',
    ],
    campos: ['tempo_na_situacao', 'impacto_outras_areas'],
    camposLead: [],
    camposIa: ['tempo_na_situacao', 'impacto_outras_areas'],
  },
  {
    id: 'necessidade',
    titulo: 'Etapa 5 — Necessidade + Oferta',
    duracao: '7-10 min',
    perguntas: [
      '"O que precisaria mudar para voce sentir que vale a pena continuar?"',
      'Apresentar stack de valor + preco R$1.229',
    ],
    campos: ['interesse_demonstrado', 'objecaoPrincipal'],
    camposLead: ['objecaoPrincipal'],
  },
  {
    id: 'fechamento',
    titulo: 'Etapa 6 — Fechamento',
    duracao: '3-5 min',
    perguntas: [
      '"Prefere parcelado em 12x ou condicao no Pix?"',
      '"Assim que confirmar, recebe acesso hoje."',
    ],
    campos: ['resultadoCall'],
    camposLead: ['resultadoCall'],
  },
  {
    id: 'objecoes',
    titulo: 'Etapa 7 — Quebra de Objecoes',
    duracao: 'conforme necessario',
    perguntas: [
      '"Meu parceiro nao quer" → 80% comecaram sozinhos',
      '"Ja tentei terapia" → Terapia=sintoma, Compativeis=causa raiz',
      '"E caro" → Quanto custaria uma separacao?',
    ],
    campos: ['objecaoPrincipal'],
    camposLead: ['objecaoPrincipal'],
  },
];

function verificarEtapaPreenchida(etapa, lead, camposIa) {
  for (const c of etapa.camposLead || []) {
    if (lead?.[c]) return { completa: true, porIa: false };
  }
  for (const c of etapa.camposIa || []) {
    if (camposIa?.[c]) return { completa: true, porIa: true };
  }
  return { completa: false, porIa: false };
}

export default function ScriptChecklist({ lead, resumoIa, camposIa }) {
  const [checkedSteps, setCheckedSteps] = useState({});
  const [iaSteps, setIaSteps] = useState({});
  const [expandida, setExpandida] = useState(null);

  useEffect(() => {
    const checked = {};
    const ia = {};
    for (const etapa of ETAPAS_SCRIPT) {
      const { completa, porIa } = verificarEtapaPreenchida(etapa, lead, camposIa);
      checked[etapa.id] = completa || (checkedSteps[etapa.id] ?? false);
      if (porIa || completa) ia[etapa.id] = true;
    }
    setCheckedSteps(checked);
    setIaSteps(ia);
  }, [lead, camposIa]);

  const toggleCheck = (id) => {
    setCheckedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalEtapas = ETAPAS_SCRIPT.length;
  const etapasConcluidas = Object.values(checkedSteps).filter(Boolean).length;
  const pct = Math.round((etapasConcluidas / totalEtapas) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px]">Script SPIN Selling</h3>
        <span className="text-[11px] font-medium text-accent-violet-light">
          {etapasConcluidas}/{totalEtapas} etapas
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1">
        <div className="w-full bg-bg-elevated rounded-sm h-[4px]">
          <div
            className="h-[4px] rounded-sm bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-text-muted text-right">{pct}% completo</p>
      </div>

      {/* Etapas */}
      <div className="space-y-1">
        {ETAPAS_SCRIPT.map((etapa) => {
          const isChecked = checkedSteps[etapa.id];
          const isIa = iaSteps[etapa.id];
          const isExpanded = expandida === etapa.id;

          return (
            <div key={etapa.id} className="border border-border-subtle rounded-[10px] overflow-hidden">
              <div
                className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                  isChecked ? 'bg-[rgba(108,92,231,0.06)]' : 'bg-bg-card hover:bg-white/[0.02]'
                }`}
                onClick={() => setExpandida(isExpanded ? null : etapa.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCheck(etapa.id); }}
                  className={`w-[18px] h-[18px] rounded-[6px] border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                    isChecked
                      ? 'bg-accent-violet border-accent-violet text-white'
                      : 'border-border-active hover:border-accent-violet-light'
                  }`}
                >
                  {isChecked && <Check size={10} strokeWidth={3} />}
                </button>

                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <p className={`text-[12px] font-medium truncate ${isChecked ? 'text-accent-violet-light' : 'text-text-secondary'}`}>
                    {etapa.titulo}
                  </p>
                  {isIa && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[rgba(108,92,231,0.1)] text-accent-violet-light rounded text-[8px] font-bold shrink-0">
                      <Bot size={8} /> IA
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-text-faint shrink-0">{etapa.duracao}</span>

                {isExpanded ? (
                  <ChevronDown size={14} className="text-text-muted shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-text-muted shrink-0" />
                )}
              </div>

              {isExpanded && (
                <div className="px-3 py-2 bg-bg-elevated border-t border-border-subtle">
                  <ul className="space-y-1.5">
                    {etapa.perguntas.map((p, i) => (
                      <li key={i} className="text-[11px] text-text-secondary pl-2 border-l-2 border-[rgba(108,92,231,0.3)]">
                        {p}
                      </li>
                    ))}
                  </ul>
                  {etapa.campos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {etapa.campos.map((c) => {
                        const preenchido = lead?.[c] || camposIa?.[c];
                        return (
                          <span
                            key={c}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              preenchido ? 'bg-[rgba(0,184,148,0.1)] text-accent-emerald' : 'bg-[rgba(108,92,231,0.1)] text-accent-violet-light'
                            }`}
                          >
                            {preenchido && <Check size={8} className="inline mr-0.5" />}{c}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumo da call */}
      <div className="border border-border-subtle rounded-[10px] p-3">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-2 flex items-center gap-1">
          Resumo da Call
          {resumoIa && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[rgba(108,92,231,0.1)] text-accent-violet-light rounded text-[8px] font-bold">
              IA
            </span>
          )}
        </h4>
        {resumoIa ? (
          <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">{resumoIa}</p>
        ) : (
          <p className="text-[11px] text-text-muted italic">
            Nenhum resumo disponivel. Grave uma call para gerar automaticamente.
          </p>
        )}
      </div>
    </div>
  );
}
