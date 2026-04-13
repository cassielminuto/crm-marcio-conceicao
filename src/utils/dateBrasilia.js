/**
 * Interpreta string de data como horário de Brasília (UTC-3).
 * Se a string já contém timezone (Z ou +/-HH:MM), usa direto.
 * Se não tem timezone (ex: "2026-04-14T15:00" de datetime-local), appenda -03:00.
 */
function parseDateBrasilia(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  // Já tem timezone info
  if (/[Zz]|[+-]\d{2}:\d{2}$/.test(str)) return new Date(str);
  // Interpretar como Brasília (UTC-3)
  return new Date(`${str}-03:00`);
}

module.exports = { parseDateBrasilia };
