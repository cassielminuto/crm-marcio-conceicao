import { Draggable } from '@hello-pangea/dnd';
import { Trash2, Phone, ArrowRight } from 'lucide-react';

const CLASSE_COR = {
  A: { bg: 'bg-[rgba(0,184,148,0.12)]', text: 'text-[#00b894]' },
  B: { bg: 'bg-[rgba(253,203,110,0.12)]', text: 'text-[#fdcb6e]' },
  C: { bg: 'bg-[rgba(116,185,255,0.1)]', text: 'text-[#74b9ff]' },
};

function diasNoKanban(createdAt) {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

export default function SdrInboundLeadCard({ lead, index, onClick, onDelete }) {
  const classeCor = lead.classe ? CLASSE_COR[lead.classe] : null;
  const dias = diasNoKanban(lead.updatedAt || lead.createdAt);

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
          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
            className="absolute top-2 right-2 p-1 rounded-md text-text-muted hover:text-accent-danger hover:bg-[rgba(225,112,85,0.08)] opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 size={12} />
          </button>

          {/* Nome */}
          <p className="text-[12px] font-medium text-text-primary truncate pr-6 mb-1">
            {lead.nome}
          </p>

          {/* Telefone */}
          <p className="text-[11px] text-text-muted truncate mb-1.5 flex items-center gap-1">
            <Phone size={10} className="shrink-0" />
            {lead.telefone}
          </p>

          {/* Próximo passo (truncado) */}
          {lead.proximoPasso && (
            <p className="text-[10px] text-text-faint truncate mb-1.5 flex items-center gap-1">
              <ArrowRight size={9} className="shrink-0" />
              {lead.proximoPasso}
            </p>
          )}

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {classeCor && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${classeCor.bg} ${classeCor.text}`}>
                {lead.classe}
              </span>
            )}

            {lead.dorPrincipal && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-text-muted bg-bg-elevated border border-border-subtle truncate max-w-[120px]">
                {lead.dorPrincipal}
              </span>
            )}

            <span className="inline-flex items-center text-[10px] text-text-faint ml-auto">
              {dias === 0 ? 'hoje' : `${dias}d`}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}
