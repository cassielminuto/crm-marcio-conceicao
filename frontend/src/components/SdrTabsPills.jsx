export default function SdrTabsPills({ tabs, activeTab, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-bg-elevated border border-border-subtle">
      {tabs.map(tab => {
        const isActive = tab.key === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-accent-violet text-white shadow-[0_2px_8px_rgba(124,58,237,0.3)]'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-card-hover'
            }`}
          >
            {Icon && <Icon size={15} />}
            {tab.label}
            {tab.count != null && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-bg-card text-text-muted border border-border-subtle'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
