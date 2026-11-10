// Kleine hulpfuncties om veilig HTML te maken.
//
// Waarom esc()? Later kun je zelf tekst invoeren (namen, notities). Als daar
// bijvoorbeeld "<script>" in staat, moet dat als tekst getoond worden en niet
// als code worden uitgevoerd. esc() zet zulke tekens om.

export function esc(tekst) {
  return String(tekst ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Alleen echte web-links (http/https) worden klikbaar.
export function link(url, tekst) {
  if (typeof url === 'string' && /^https?:\/\//.test(url)) {
    return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(tekst)}</a>`;
  }
  return esc(tekst);
}

// Zet elke <select> expliciet op de optie met 'selected'. In een echte browser verandert
// dit niets; de testbrowser (happy-dom 21) pakt anders soms de verkeerde optie.
export function herstelKeuzes(el) {
  el.querySelectorAll('select').forEach((s) => {
    const gekozen = s.querySelector('option[selected]');
    if (gekozen) s.value = gekozen.value;
  });
}

export const PER_EENHEID = { km: 'per km', kg: 'per kg', stuk: 'per stuk', portie: 'per portie' };
