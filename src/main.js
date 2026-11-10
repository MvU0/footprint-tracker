// Startpunt van de app.
// We gebruiken "hash-routing": het deel na # in de adresbalk bepaalt welk
// scherm je ziet (bijv. index.html#/vergelijk). Dat werkt zonder server en
// de terug-knop van de browser werkt vanzelf.

import { ROUTES, routeUitHash } from './routes.js';
import { laadData, bewaarData } from './lib/opslag.js';
import { toonItems } from './views/items.js';
import { toonVergelijk } from './views/vergelijk.js';

const tabsEl = document.getElementById('tabs');
const schermEl = document.getElementById('scherm');

// Alle data (catalogus, logboek, instellingen) staat in één object.
// Schermen krijgen 'app' mee: daarmee kunnen ze de data lezen, opslaan en
// het scherm opnieuw tekenen na een wijziging.
const app = {
  data: laadData(),
  bewaar() {
    if (!bewaarData(app.data)) {
      alert('Opslaan is mislukt. Maak een export als back-up.');
    }
  },
  herteken: () => toonScherm(),
};

// Welke functie tekent welk scherm. Schermen die nog niet af zijn, staan hier nog niet in.
const SCHERMEN = {
  items: toonItems,
  vergelijk: toonVergelijk,
};

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

  const teken = SCHERMEN[route.pad];
  if (teken) {
    teken(schermEl, app);
  } else {
    schermEl.innerHTML = `
      <h2>${route.titel}</h2>
      <p class="leeg">Dit scherm wordt in een volgende stap gebouwd.</p>`;
  }
}

window.addEventListener('hashchange', toonScherm);
toonScherm();
