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

/**
 * Formata Date como "DD/MM/YYYY HH:mm" em horário de Brasília.
 * Usa timeZone: America/Sao_Paulo pra forçar conversão correta no servidor (que pode rodar UTC).
 */
function formatarBrasilia(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

module.exports = { parseDateBrasilia, formatarBrasilia };
