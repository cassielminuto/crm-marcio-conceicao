const CORES = [
  'from-[#7C3AED] to-[#3B82F6]',
  'from-[#10B981] to-[#06B6D4]',
  'from-[#F59E0B] to-[#EF4444]',
  'from-[#3B82F6] to-[#8B5CF6]',
  'from-[#EC4899] to-[#8B5CF6]',
  'from-[#EF4444] to-[#F59E0B]',
  'from-[#06B6D4] to-[#10B981]',
  'from-[#8B5CF6] to-[#EC4899]',
];

function getIniciais(nome) {
  if (!nome) return '?';
  const p = nome.trim().split(' ');
  if (p.length === 1) return p[0][0].toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function AvatarVendedor({ nome, fotoUrl, id, tamanho = 36, className = '' }) {
  const tam = tamanho;
  const fontSize = Math.max(tam * 0.38, 10);
  const grad = CORES[(id || 0) % CORES.length];

  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={nome || ''}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: tam, height: tam }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{ width: tam, height: tam, fontSize }}
    >
      {getIniciais(nome)}
    </div>
  );
}
