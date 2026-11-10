// Scherm "Vergelijk": twee of meer items naast elkaar voor dezelfde hoeveelheid.
//
// 1. Kies een startitem; de alternatieven daarvan staan meteen aan.
// 2. Vink items aan of uit (zelfde categorie en eenheid) en vul een hoeveelheid in.
// 3. Kies waarmee je vergelijkt (standaard het startitem).
// Alleen het resultaat (tabel + grafieken) wordt opnieuw getekend bij typen,
// zodat het invoerveld de cursor houdt.

import { vergelijk } from '../lib/vergelijk.js';
import { leesGetal } from '../lib/beheer.js';
import * as fmt from '../lib/format.js';
import { staafGrafiek } from '../ui/grafiek.js';
import { esc, herstelKeuzes } from '../ui/html.js';

// Keuzes blijven bewaard zolang de app open is.
let startId = null;
let gekozen = []; // ids van de aangevinkte items
let referentieId = null;
let hoeveelheidTekst = '1';

// Items die met het startitem te vergelijken zijn: zelfde categorie en eenheid.
const vergelijkbaar = (data, start) => data.items.filter((i) => i.categorie === start.categorie && i.eenheid === start.eenheid);

function kiesStart(data, id) {
  const start = data.items.find((i) => i.id === id);
  const ids = vergelijkbaar(data, start).map((i) => i.id);
  startId = id;
  gekozen = [id, ...(start.alternatieven ?? []).filter((a) => ids.includes(a))];
  referentieId = id;
}

export function toonVergelijk(el, app) {
  const { data } = app;
  // Eerste keer (of het startitem bestaat niet meer): een item met alternatieven.
  if (!data.items.some((i) => i.id === startId)) {
    kiesStart(data, (data.items.find((i) => i.alternatieven?.length) ?? data.items[0]).id);
  }
  const start = data.items.find((i) => i.id === startId);

  const startOpties = data.categorieen
    .map((c) => {
      const opties = data.items
        .filter((i) => i.categorie === c.id)
        .map((i) => `<option value="${esc(i.id)}" ${i.id === startId ? 'selected' : ''}>${esc(i.naam)}</option>`)
        .join('');
      return opties ? `<optgroup label="${esc(c.naam)}">${opties}</optgroup>` : '';
    })
    .join('');

  const vinkjes = vergelijkbaar(data, start)
    .map((i) => `<label class="vinkje"><input type="checkbox" name="item" value="${esc(i.id)}" ${gekozen.includes(i.id) ? 'checked' : ''}> ${esc(i.naam)}</label>`)
    .join('');

  el.innerHTML = `
    <h2>Vergelijk</h2>
    <p class="intro">Zet keuzes naast elkaar voor dezelfde hoeveelheid. Alle cijfers zijn schattingen.</p>
    <div class="formulier">
      <div class="rij">
        <label class="veld"><span>Startitem</span><select name="start">${startOpties}</select></label>
        <label class="veld"><span>Hoeveelheid (${esc(start.eenheid)})</span>
          <input name="hoeveelheid" value="${esc(hoeveelheidTekst)}" inputmode="decimal"></label>
      </div>
      <fieldset><legend>Vergelijk deze items</legend><div class="vinkjes">${vinkjes}</div></fieldset>
    </div>
    <div class="resultaat"></div>`;
  herstelKeuzes(el);

  el.querySelector('[name="start"]').addEventListener('change', (e) => {
    kiesStart(data, e.target.value);
    app.herteken();
  });
  el.querySelector('[name="hoeveelheid"]').addEventListener('input', (e) => {
    hoeveelheidTekst = e.target.value;
    tekenResultaat(el, data, start);
  });
  el.querySelectorAll('[name="item"]').forEach((vak) =>
    vak.addEventListener('change', () => {
      gekozen = [...el.querySelectorAll('[name="item"]:checked')].map((x) => x.value);
      tekenResultaat(el, data, start);
    }),
  );

  tekenResultaat(el, data, start);
}

function tekenResultaat(el, data, start) {
  const vak = el.querySelector('.resultaat');
  const hoeveelheid = leesGetal(hoeveelheidTekst);
  if (hoeveelheid === null || Number.isNaN(hoeveelheid) || hoeveelheid < 0) {
    vak.innerHTML = '<p class="melding waarschuwing">Vul een hoeveelheid in (een getal ≥ 0, bv. 40 of 0,15).</p>';
    return;
  }
  if (gekozen.length === 0) {
    vak.innerHTML = '<p class="leeg">Vink minstens één item aan.</p>';
    return;
  }
  if (!gekozen.includes(referentieId)) referentieId = gekozen[0];

  const rijen = vergelijk(data, gekozen, hoeveelheid, referentieId);
  const ref = rijen.find((r) => r.isReferentie);
  const voor = `voor ${fmt.getal(hoeveelheid)} ${start.eenheid}`;

  const refOpties = rijen
    .map((r) => `<option value="${esc(r.item.id)}" ${r.isReferentie ? 'selected' : ''}>${esc(r.item.naam)}</option>`)
    .join('');

  const tabel = rijen
    .map((r) => `
      <tr class="${r.isReferentie ? 'referentie' : ''}">
        <td>${esc(r.item.naam)}${r.isReferentie ? ' <span class="label">referentie</span>' : ''}</td>
        <td class="getal">${esc(fmt.kort(r.co2))}</td>
        <td class="getal">${r.isReferentie ? '' : esc(fmt.verschilTekst(r.verschil))}</td>
        <td class="getal">${r.water.n ? esc(fmt.kort(r.water, fmt.water)) : '<span class="leeg">geen gegevens</span>'}</td>
        <td class="getal">${r.isReferentie || !r.verschilWater ? '' : esc(fmt.verschilTekst(r.verschilWater, fmt.water))}</td>
      </tr>`)
    .join('');

  // Voor de grafiek: alleen items met een waarde. Een "bereik" van laag = hoog is geen bereik.
  const staven = (soort) =>
    rijen
      .filter((r) => r[soort].n > 0)
      .map((r) => ({
        naam: r.item.naam,
        laag: r[soort].laag,
        gemiddeld: r[soort].gemiddeld,
        hoog: r[soort].hoog,
        heeftBereik: r[soort].heeftBereik && r[soort].laag !== r[soort].hoog,
        isReferentie: r.isReferentie,
      }));
  const co2Staven = staven('co2');
  const waterStaven = staven('water');
  const zonderWater = rijen.filter((r) => r.water.n === 0).map((r) => r.item.naam);

  vak.innerHTML = `
    <label class="veld smal"><span>Verschil berekenen ten opzichte van</span><select name="referentie">${refOpties}</select></label>
    <div class="tabelvak">
      <table class="vergelijktabel">
        <thead><tr>
          <th>Item</th><th class="getal">CO2e ${esc(voor)}</th><th class="getal">Verschil met ${esc(ref?.item.naam ?? '')}</th>
          <th class="getal">Water</th><th class="getal">Verschil water</th>
        </tr></thead>
        <tbody>${tabel}</tbody>
      </table>
    </div>
    <p class="hulp">Een bereik (bv. "3–11") betekent dat de bronnen verschillen; het verschil vergelijkt steeds laag met laag, gemiddeld met gemiddeld en hoog met hoog.</p>
    ${co2Staven.length ? staafGrafiek(co2Staven, { titel: `CO2e ${voor} (staaf = gemiddeld, lijntje = laag tot hoog)`, opmaak: fmt.co2 }) : ''}
    ${waterStaven.length ? staafGrafiek(waterStaven, { titel: `Water ${voor}`, opmaak: fmt.water }) : ''}
    ${zonderWater.length && waterStaven.length ? `<p class="hulp">Geen waterdata voor: ${esc(zonderWater.join(', '))}.</p>` : ''}`;

  herstelKeuzes(vak);
  vak.querySelector('[name="referentie"]').addEventListener('change', (e) => {
    referentieId = e.target.value;
    tekenResultaat(el, data, start);
  });
}
