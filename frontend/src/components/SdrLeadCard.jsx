import { Draggable } from '@hello-pangea/dnd';
import { Heart, MessageCircle, Eye, UserPlus, Trash2 } from 'lucide-react';

const TIPO_ICONE = {
  curtiu: Heart,
  comentou: MessageCircle,
  story: Eye,
  seguiu: UserPlus,
};

const TEMP_COR = {
  quente: { bg: 'bg-[rgba(225,112,85,0.12)]', text: 'text-[#e17055]', label: 'Quente' },
  morno: { bg: 'bg-[rgba(253,203,110,0.12)]', text: 'text-[#fdcb6e]', label: 'Morno' },
  frio: { bg: 'bg-[rgba(116,185,255,0.1)]', text: 'text-[#74b9ff]', label: 'Frio' },
};

function diasNaFase(updatedAt) {
  if (!updatedAt) return 0;
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.floor(diff / 86400000);
}

export default function SdrLeadCard({ lead, index, onClick, onDelete }) {
  const TipoIcone = TIPO_ICONE[lead.tipoInteracao] || MessageCircle;
  const tempKey = lead.temperaturaFinal || lead.temperaturaInicial;
  const temp = TEMP_COR[tempKey] || TEMP_COR.frio;
  const dias = diasNaFase(lead.updatedAt);

  return (
    <Draggable draggableId={String(lead.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(lead)}
          style={{
            ...provided.draggableProps.style,
            ...(snapshot.isDragging
              ? { transform: `${provided.draggableProps.style?.transform || ''} rotate(1.5deg)` }
              : {}),
          }}
          className={`group relative bg-bg-card border rounded-[10px] p-3 mb-2 cursor-grab active:cursor-grabbing transition-all duration-200 ${
            snapshot.isDragging
              ? 'shadow-[0_16px_40px_rgba(0,0,0,0.45),0_0_0_1px_rgba(124,58,237,0.3)] border-accent-violet/40 z-50'
              : 'border-border-subtle hover:border-accent-violet/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:-translate-y-0.5'
          }`}
        >
          {/* Delete button */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
            className="absolute top-2 right-2 p-1 rounded-md text-text-muted hover:text-accent-danger hover:bg-[rgba(225,112,85,0.08)] opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 size={12} />
          </button>

          {/* Name */}
          <p className="text-[12px] font-medium text-text-primary truncate pr-6 mb-1.5">
            {lead.nome}
          </p>

          {/* Instagram handle */}
          {lead.instagram && (
            <p className="text-[11px] text-text-muted truncate mb-1.5 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              @{lead.instagram.replace('@', '')}
            </p>
          )}

          {/* Tags row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Tipo interacao */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-muted bg-bg-elevated border border-border-subtle">
              <TipoIcone size={9} />
              <span className="capitalize">{lead.tipoInteracao}</span>
            </span>

            {/* Temperature badge */}
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${temp.bg} ${temp.text}`}>
              {temp.label}
            </span>

            {/* Days in phase */}
            <span className="inline-flex items-center gap-1 text-[10px] text-text-faint ml-auto">
              {dias === 0 ? 'hoje' : `${dias}d`}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}
