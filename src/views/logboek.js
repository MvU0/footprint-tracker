// Scherm "Logboek": alles wat je gelogd hebt, nieuwste eerst.
// Filteren op categorie, een regel aanpassen (opent Loggen) of verwijderen.
// Uitstoot en besparing worden steeds opnieuw berekend uit de huidige bronnen.

import { berekenLogregel } from '../lib/besparing.js';
import { verwijderLogregel } from '../lib/logboek.js';
import * as fmt from '../lib/format.js';
import { esc } from '../ui/html.js';
import { bewerkLogregel } from './loggen.js';

let gekozenCategorie = 'alle';

// "2026-11-10" → "10 nov. 2026"
const datumTekst = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });

export function toonLogboek(el, app) {
  const { data } = app;
  const itemsPerId = new Map(data.items.map((i) => [i.id, i]));

  // Nieuwste datum bovenaan (JJJJ-MM-DD sorteert als tekst goed).
  const regels = [...data.logboek]
    .sort((a, b) => b.datum.localeCompare(a.datum))
    .filter((r) => gekozenCategorie === 'alle' || itemsPerId.get(r.item)?.categorie === gekozenCategorie);

  const filterKnoppen = [{ id: 'alle', naam: 'Alle' }, ...data.categorieen]
    .map((c) => `<button type="button" class="chip ${c.id === gekozenCategorie ? 'actief' : ''}" data-categorie="${esc(c.id)}">${esc(c.naam)}</button>`)
    .join('');

  const rijen = regels
    .map((r) => {
      const w = berekenLogregel(data, r);
      const naam = w.item?.naam ?? `onbekend item "${r.item}"`;
      return `
        <tr>
          <td>${esc(datumTekst(r.datum))}</td>
          <td>${esc(naam)}${r.notitie ? `<div class="hulp">${esc(r.notitie)}</div>` : ''}</td>
          <td class="getal">${esc(fmt.getal(r.hoeveelheid))} ${esc(w.item?.eenheid ?? '')}</td>
          <td class="getal">${esc(fmt.kort(w.uitstoot))}</td>
          <td>${w.besparing ? `${esc(fmt.besparingTekst(w.besparing))}<div class="hulp">t.o.v. ${esc(w.referentie.naam)}</div>` : '<span class="leeg">geen referentie</span>'}</td>
          <td class="acties">
            <button type="button" class="knop klein" data-bewerk="${esc(r.id)}">Bewerken</button>
            <button type="button" class="knop klein gevaar" data-verwijder="${esc(r.id)}">Verwijderen</button>
          </td>
        </tr>`;
    })
    .join('');

  el.innerHTML = `
    <h2>Logboek</h2>
    <p class="intro">Alles wat je gelogd hebt. De cijfers worden steeds opnieuw berekend uit de huidige bronnen.</p>
    <div class="chips">${filterKnoppen}</div>
    ${regels.length
      ? `<div class="tabelvak"><table class="vergelijktabel logtabel">
          <thead><tr><th>Datum</th><th>Item</th><th class="getal">Hoeveelheid</th><th class="getal">Uitstoot</th><th>Besparing</th><th></th></tr></thead>
          <tbody>${rijen}</tbody>
        </table></div>`
      : `<p class="leeg">${data.logboek.length ? 'Geen regels in deze categorie.' : 'Nog niets gelogd. Ga naar <a href="#/loggen">Loggen</a> om te beginnen.'}</p>`}`;

  el.querySelectorAll('[data-categorie]').forEach((knop) =>
    knop.addEventListener('click', () => {
      gekozenCategorie = knop.dataset.categorie;
      app.herteken();
    }),
  );
  el.querySelectorAll('[data-bewerk]').forEach((knop) =>
    knop.addEventListener('click', () => {
      bewerkLogregel(data.logboek.find((r) => r.id === knop.dataset.bewerk));
      location.hash = '#/loggen';
    }),
  );
  el.querySelectorAll('[data-verwijder]').forEach((knop) =>
    knop.addEventListener('click', () => {
      if (!confirm('Deze logregel verwijderen?')) return;
      app.data = verwijderLogregel(data, knop.dataset.verwijder);
      app.bewaar();
      app.herteken();
    }),
  );
}
