// Scherm "Loggen": vastleggen wat je gedaan of gekocht hebt.
//
// Je ziet meteen wat het oplevert: "uitgestoten X, bespaard A–B" ten opzichte van
// de referentie (standaard: die van het item of de categorie; zelf te kiezen).
// Vanuit het Logboek kun je een regel hier opnieuw openen om aan te passen.

import { berekenLogregel, referentieVoor } from '../lib/besparing.js';
import { slaLogregelOp, BASISSEN } from '../lib/logboek.js';
import { leesGetal } from '../lib/beheer.js';
import * as fmt from '../lib/format.js';
import { esc, herstelKeuzes } from '../ui/html.js';

// Uitleg in gewone taal bij de basis (de opgeslagen waarde blijft 'gemiddeld', 'laag' of 'hoog').
const BASIS_TEKST = {
  gemiddeld: 'Gemiddelde van de bronnen (aangeraden)',
  laag: 'Laagste bron',
  hoog: 'Hoogste bron',
};

// Het formulier zoals het nu ingevuld is (blijft bewaard zolang de app open is).
let concept = null;
let melding = ''; // "Opgeslagen: …"
let fouten = [];

// Datum van vandaag in de lokale tijdzone, als "JJJJ-MM-DD".
function vandaag() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Vanuit het Logboek: deze regel aanpassen.
export function bewerkLogregel(regel) {
  concept = { ...regel, hoeveelheidTekst: String(regel.hoeveelheid).replace('.', ',') };
  melding = '';
  fouten = [];
}

// Het concept omzetten naar een logregel (zoals hij wordt opgeslagen).
const alsRegel = (c) => ({
  id: c.id,
  datum: c.datum,
  item: c.item,
  hoeveelheid: leesGetal(c.hoeveelheidTekst),
  basis: c.basis,
  referentie: c.referentie || null, // leeg = de standaardreferentie
  notitie: c.notitie,
});

export function toonLoggen(el, app) {
  const { data } = app;
  if (!concept || !data.items.some((i) => i.id === concept.item)) {
    concept = { datum: vandaag(), item: data.items[0].id, hoeveelheidTekst: '', basis: 'gemiddeld', referentie: '', notitie: '' };
  }
  const c = concept;
  const item = data.items.find((i) => i.id === c.item);
  const standaard = referentieVoor(data, { ...alsRegel(c), referentie: null });

  const itemOpties = data.categorieen
    .map((cat) => {
      const opties = data.items
        .filter((i) => i.categorie === cat.id)
        .map((i) => `<option value="${esc(i.id)}" ${i.id === c.item ? 'selected' : ''}>${esc(i.naam)}</option>`)
        .join('');
      return opties ? `<optgroup label="${esc(cat.naam)}">${opties}</optgroup>` : '';
    })
    .join('');

  // Referentie: "standaard" of een item uit dezelfde categorie met dezelfde eenheid.
  const refOpties = [
    `<option value="">Standaard: ${esc(standaard?.naam ?? 'geen')}</option>`,
    ...data.items
      .filter((i) => i.categorie === item.categorie && i.eenheid === item.eenheid)
      .map((i) => `<option value="${esc(i.id)}" ${i.id === c.referentie ? 'selected' : ''}>${esc(i.naam)}</option>`),
  ].join('');

  el.innerHTML = `
    <h2>${c.id ? 'Logregel aanpassen' : 'Loggen'}</h2>
    <p class="intro">Leg vast wat je gedaan of gekocht hebt. Je ziet meteen de uitstoot en wat je bespaart ten opzichte van de referentie.</p>
    ${melding ? `<div class="melding info">${esc(melding)}</div>` : ''}
    ${fouten.length ? `<div class="melding waarschuwing"><strong>Niet opgeslagen:</strong><ul>${fouten.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>` : ''}
    <form class="formulier" novalidate>
      <div class="rij">
        <label class="veld"><span>Item</span><select name="item">${itemOpties}</select></label>
        <label class="veld"><span>Hoeveelheid (${esc(item.eenheid)})</span>
          <input name="hoeveelheid" value="${esc(c.hoeveelheidTekst)}" inputmode="decimal" placeholder="bv. 40 of 0,15"></label>
        <label class="veld"><span>Datum</span><input type="date" name="datum" value="${esc(c.datum)}"></label>
      </div>
      <div class="rij">
        <label class="veld"><span>Vergelijken met (referentie)</span><select name="referentie">${refOpties}</select></label>
        <label class="veld"><span>Welke waarde telt mee in je totalen</span><select name="basis">${BASISSEN.map((b) => `<option value="${b}" ${b === c.basis ? 'selected' : ''}>${BASIS_TEKST[b]}</option>`).join('')}</select></label>
      </div>
      <p class="hulp basis-uitleg">Een item kan meerdere bronnen hebben die verschillende cijfers geven.
        Kies welke meetelt: het gemiddelde, de laagste of de hoogste bron. Het bereik (laag tot hoog) zie je altijd apart.
        Heeft een item maar één bron, dan maakt deze keuze niets uit.</p>
      <label class="veld"><span>Notitie (optioneel)</span><input name="notitie" value="${esc(c.notitie)}"></label>
      <div class="voorbeeld"></div>
      <div class="knoppen">
        <button type="submit" class="knop hoofd">${c.id ? 'Wijziging opslaan' : 'Opslaan'}</button>
        ${c.id ? '<button type="button" class="knop" data-actie="annuleren">Annuleren</button>' : ''}
      </div>
    </form>`;

  herstelKeuzes(el);
  const form = el.querySelector('form');
  const lees = () => {
    const v = (naam) => form.querySelector(`[name="${naam}"]`).value;
    Object.assign(concept, { item: v('item'), hoeveelheidTekst: v('hoeveelheid'), datum: v('datum'), referentie: v('referentie'), basis: v('basis'), notitie: v('notitie').trim() });
  };

  // Typen in hoeveelheid: alleen het voorbeeld bijwerken (zo houdt het veld de cursor).
  form.querySelector('[name="hoeveelheid"]').addEventListener('input', () => { lees(); toonVoorbeeld(el, data); });
  form.querySelector('[name="item"]').addEventListener('change', () => {
    lees();
    concept.referentie = ''; // andere item → terug naar de standaardreferentie
    melding = '';
    app.herteken();
  });
  for (const naam of ['referentie', 'basis', 'datum']) {
    form.querySelector(`[name="${naam}"]`).addEventListener('change', () => { lees(); toonVoorbeeld(el, data); });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    lees();
    const resultaat = slaLogregelOp(data, alsRegel(concept));
    fouten = resultaat.fouten;
    if (fouten.length) {
      melding = '';
      app.herteken();
      return;
    }
    const wasBewerken = Boolean(concept.id);
    const w = berekenLogregel(resultaat.data, alsRegel(concept));
    app.data = resultaat.data;
    app.bewaar();
    if (wasBewerken) {
      concept = null;
      location.hash = '#/logboek';
      return;
    }
    melding = `Opgeslagen: ${w.item.naam}, ${fmt.kort(w.uitstoot)}${w.besparing ? `, ${fmt.besparingTekst(w.besparing)}` : ''}.`;
    // Item en datum blijven staan, zodat je snel nog iets kunt loggen.
    Object.assign(concept, { hoeveelheidTekst: '', notitie: '', referentie: '' });
    app.herteken();
  });

  el.querySelector('[data-actie="annuleren"]')?.addEventListener('click', () => {
    concept = null;
    fouten = [];
    location.hash = '#/logboek';
  });

  toonVoorbeeld(el, data);
}

// "Uitgestoten X; bespaard A–B t.o.v. referentie", meteen tijdens het invullen.
function toonVoorbeeld(el, data) {
  const vak = el.querySelector('.voorbeeld');
  const regel = alsRegel(concept);
  if (concept.hoeveelheidTekst.trim() === '') {
    vak.innerHTML = '<p class="hulp">Vul een hoeveelheid in om de uitstoot en besparing te zien.</p>';
    return;
  }
  if (Number.isNaN(regel.hoeveelheid) || regel.hoeveelheid < 0) {
    vak.innerHTML = '<p class="melding waarschuwing">Vul een hoeveelheid in (een getal ≥ 0, bv. 40 of 0,15).</p>';
    return;
  }
  const w = berekenLogregel(data, regel);
  const basis = regel.basis !== 'gemiddeld' || w.uitstoot?.heeftBereik
    ? ` (in je totalen telt: ${fmt.co2(w.uitstootTelt)}, ${BASIS_TEKST[regel.basis].replace(' (aangeraden)', '').toLowerCase()})`
    : '';
  const regels = [
    `<p><strong>Uitgestoten:</strong> ${esc(fmt.kort(w.uitstoot))}${esc(basis)}</p>`,
    w.referentie
      ? `<p><strong>Ten opzichte van ${esc(w.referentie.naam)}:</strong> ${esc(fmt.besparingTekst(w.besparing))}</p>`
      : '<p class="hulp">Geen referentie: er is geen besparing te berekenen. Kies hierboven een item om mee te vergelijken.</p>',
  ];
  if (w.water) {
    regels.push(`<p><strong>Water:</strong> ${esc(fmt.kort(w.water, fmt.water))}${w.waterBesparing ? `; ${esc(fmt.besparingTekst(w.waterBesparing, fmt.water))}` : ''}</p>`);
  }
  vak.innerHTML = regels.join('');
}
