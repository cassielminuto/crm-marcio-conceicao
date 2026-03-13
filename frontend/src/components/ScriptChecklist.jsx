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
  // Verificar campos do lead
  for (const c of etapa.camposLead || []) {
    if (lead?.[c]) return { completa: true, porIa: false };
  }
  // Verificar campos IA (da última interação)
  for (const c of etapa.camposIa || []) {
    if (camposIa?.[c]) return { completa: true, porIa: true };
  }
  return { completa: false, porIa: false };
}

export default function ScriptChecklist({ lead, resumoIa, camposIa }) {
  const [checkedSteps, setCheckedSteps] = useState({});
  const [iaSteps, setIaSteps] = useState({});
  const [expandida, setExpandida] = useState(null);

  // Recalcular quando lead ou camposIa mudam
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
        <h3 className="text-sm font-semibold text-gray-700">Script SPIN Selling</h3>
        <span className={`text-xs font-medium ${pct === 100 ? 'text-green-600' : 'text-gray-400'}`}>
          {etapasConcluidas}/{totalEtapas} etapas
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1">
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 text-right">{pct}% completo</p>
      </div>

      {/* Etapas */}
      <div className="space-y-1">
        {ETAPAS_SCRIPT.map((etapa) => {
          const isChecked = checkedSteps[etapa.id];
          const isIa = iaSteps[etapa.id];
          const isExpanded = expandida === etapa.id;

          return (
            <div key={etapa.id} className="border border-gray-100 rounded-lg overflow-hidden">
              <div
                className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                  isChecked ? 'bg-green-50' : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => setExpandida(isExpanded ? null : etapa.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCheck(etapa.id); }}
                  className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isChecked
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {isChecked && <Check size={12} />}
                </button>

                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <p className={`text-xs font-medium truncate ${isChecked ? 'text-green-700' : 'text-gray-700'}`}>
                    {etapa.titulo}
                  </p>
                  {isIa && (
                    <span className="px-1 py-0.5 bg-purple-100 text-purple-600 rounded text-[8px] font-bold flex items-center gap-0.5 shrink-0">
                      <Bot size={8} /> IA
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-gray-400 shrink-0">{etapa.duracao}</span>

                {isExpanded ? (
                  <ChevronDown size={14} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-gray-400 shrink-0" />
                )}
              </div>

              {isExpanded && (
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                  <ul className="space-y-1.5">
                    {etapa.perguntas.map((p, i) => (
                      <li key={i} className="text-xs text-gray-600 pl-2 border-l-2 border-blue-200">
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
                              preenchido ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            {preenchido ? '✓ ' : ''}{c}
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

      {/* Resumo da call por IA */}
      <div className="border border-gray-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
          Resumo da Call
          {resumoIa && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px]">IA</span>}
        </h4>
        {resumoIa ? (
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{resumoIa}</p>
        ) : (
          <p className="text-xs text-gray-400 italic">
            Nenhum resumo disponivel. Grave uma call para gerar automaticamente.
          </p>
        )}
      </div>
    </div>
  );
}
