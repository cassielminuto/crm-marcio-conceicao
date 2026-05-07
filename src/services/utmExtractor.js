/**
 * Extrai UTMs, fbclid e gclid de payload do Respondi.
 *
 * CLAUDE.md§"UTMs ficam em respondent.respondent_utms":
 * no payload do Respondi, UTMs NAO estao no nivel raiz.
 * Caminho correto: respondent.respondent_utms.utm_source, etc.
 *
 * fbclid (Meta Ads) e gclid (Google Ads) tambem moram em respondent_utms.
 */

/**
 * @param {object} payloadRespondi - corpo bruto do webhook do Respondi
 * @returns {{ utm_source, utm_medium, utm_campaign, utm_term, utm_content, fbclid, gclid }}
 *          (todos podem ser null)
 */
function extrairUtms(payloadRespondi) {
  const utms = payloadRespondi?.respondent?.respondent_utms || {};
  return {
    utm_source: utms.utm_source || null,
    utm_medium: utms.utm_medium || null,
    utm_campaign: utms.utm_campaign || null,
    utm_term: utms.utm_term || null,
    utm_content: utms.utm_content || null,
    fbclid: utms.fbclid || null,
    gclid: utms.gclid || null,
  };
}

module.exports = { extrairUtms };
