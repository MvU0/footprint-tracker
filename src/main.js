// Startpunt van de app.
// We gebruiken "hash-routing": het deel na # in de adresbalk bepaalt welk
// scherm je ziet (bijv. index.html#/vergelijk). Dat werkt zonder server en
// de terug-knop van de browser werkt vanzelf.

import { ROUTES, routeUitHash } from './routes.js';

const tabsEl = document.getElementById('tabs');
const schermEl = document.getElementById('scherm');

// Bouw de tabbladen één keer op.
tabsEl.innerHTML = ROUTES.map(
  (r) => `<a href="#/${r.pad}" data-pad="${r.pad}">${r.titel}</a>`,
).join('');

function toonScherm() {
  const route = routeUitHash(location.hash);

  // Markeer het actieve tabblad.
  for (const a of tabsEl.querySelectorAll('a')) {
    a.classList.toggle('actief', a.dataset.pad === route.pad);
  }

  // Voorlopig een tijdelijke tekst; in de volgende stappen komt hier
  // per scherm de echte inhoud (uit src/views/).
  schermEl.innerHTML = `
    <h2>${route.titel}</h2>
    <p class="leeg">Dit scherm wordt in een volgende stap gebouwd.</p>
  `;
}

window.addEventListener('hashchange', toonScherm);
toonScherm();
