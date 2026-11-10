// Formulier om een item (of mix-item) toe te voegen, aan te passen of te verwijderen.
//
// Werking: we bewerken een "concept" (een kopie van het item). Pas bij "Opslaan"
// gaat het concept door de validatie en komt het in de echte data.
// Bij elke knop die het formulier verandert (bron erbij, categorie wisselen) lezen
// we eerst alle velden in het concept, passen het aan en tekenen opnieuw.

import { leesGetal, maakId, slaItemOp, waarGebruikt, verwijderItem } from '../lib/beheer.js';
import { EENHEDEN, STATUSSEN } from '../lib/validatie.js';
import { esc, herstelKeuzes } from '../ui/html.js';

let concept = null; // het item dat bewerkt wordt, of null als er geen formulier open is
let fouten = []; // foutmeldingen van de laatste poging om op te slaan

const leegBron = () => ({
  co2e_kg: null, water_l: null, bron: '', link: null, jaar: null,
  scope: '', notitie: '', actief: true, status: 'nog te onderzoeken',
});

export const isBewerken = () => concept !== null;

// Open het formulier. item = bestaand item, of null voor een nieuw item.
export function startBewerken(item, data, { mix = false, categorie } = {}) {
  fouten = [];
  if (item) {
    concept = structuredClone(item);
    return;
  }
  const cat = data.categorieen.find((c) => c.id === categorie) ?? data.categorieen[0];
  concept = { id: null, naam: '', categorie: cat.id, eenheid: cat.standaardEenheid, uitleg: '', alternatieven: [] };
  if (mix) {
    Object.assign(concept, { type: 'mix', mix: [], mixBron: { bron: '', link: null, jaar: null, status: 'nog te onderzoeken', notitie: '' } });
  } else {
    concept.bronnen = [leegBron()];
  }
}

// ---------- Tekenen ----------

// <option>-lijst; lijst = [{ waarde, tekst }]
const opties = (lijst, gekozen) =>
  lijst.map((o) => `<option value="${esc(o.waarde)}" ${o.waarde === gekozen ? 'selected' : ''}>${esc(o.tekst)}</option>`).join('');

const veld = (label, html) => `<label class="veld"><span>${label}</span>${html}</label>`;
const tekstveld = (naam, waarde, extra = '') => `<input name="${naam}" value="${esc(waarde ?? '')}" ${extra}>`;
// Getallen tonen met een komma, zoals je ze ook intypt. NaN (foute invoer) tonen we leeg.
const getalveld = (naam, waarde, extra = '') =>
  tekstveld(naam, typeof waarde === 'number' && !Number.isNaN(waarde) ? String(waarde).replace('.', ',') : '', `inputmode="decimal" ${extra}`);

export function toonFormulier(el, app) {
  const { data } = app;
  const c = concept;
  const isMix = c.type === 'mix';
  // Andere items in dezelfde categorie (voor alternatieven, referentie en mix-onderdelen).
  const zelfdeCategorie = data.items.filter((i) => i.categorie === c.categorie && i.id !== c.id);

  const titel = c.id ? `${esc(c.naam)} bewerken` : isMix ? 'Nieuw mix-item' : 'Nieuw item';

  el.innerHTML = `
    <h2>${titel}</h2>
    ${fouten.length ? `<div class="melding waarschuwing"><strong>Niet opgeslagen:</strong><ul>${fouten.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>` : ''}
    <form class="formulier" data-form="item" novalidate>
      ${veld('Naam', tekstveld('naam', c.naam))}
      <div class="rij">
        ${veld('Categorie', `<select name="categorie">${opties(data.categorieen.map((k) => ({ waarde: k.id, tekst: k.naam })), c.categorie)}</select>`)}
        ${veld('Eenheid', `<select name="eenheid">${opties(EENHEDEN.map((e) => ({ waarde: e, tekst: e })), c.eenheid)}</select>`)}
      </div>
      ${veld('Uitleg', `<textarea name="uitleg" rows="2">${esc(c.uitleg)}</textarea>`)}
      ${isMix ? mixVelden(c, zelfdeCategorie) : gewoneVelden(c, zelfdeCategorie)}
      <div class="knoppen">
        <button type="submit" class="knop hoofd">Opslaan</button>
        <button type="button" class="knop" data-actie="annuleren">Annuleren</button>
        ${c.id ? '<button type="button" class="knop gevaar" data-actie="verwijderen">Item verwijderen</button>' : ''}
      </div>
    </form>`;

  herstelKeuzes(el);
  koppelActies(el, app);
}

function gewoneVelden(c, zelfdeCategorie) {
  const alternatieven = zelfdeCategorie
    .map((i) => `<label class="vinkje"><input type="checkbox" name="alt" value="${esc(i.id)}" ${c.alternatieven?.includes(i.id) ? 'checked' : ''}> ${esc(i.naam)}</label>`)
    .join('');
  const referentie = [{ waarde: '', tekst: '(geen)' }, ...zelfdeCategorie.map((i) => ({ waarde: i.id, tekst: i.naam }))];
  return `
    <fieldset><legend>Vergelijken</legend>
      <p class="hulp">Alternatieven: suggesties in het vergelijkscherm.</p>
      <div class="vinkjes">${alternatieven || '<span class="hulp">Nog geen andere items in deze categorie.</span>'}</div>
      ${veld('Standaardreferentie voor dit item (optioneel, bv. tweedehands → nieuw)', `<select name="standaardReferentie">${opties(referentie, c.standaardReferentie ?? '')}</select>`)}
    </fieldset>
    <h3>Bronnen</h3>
    ${c.bronnen.map((b, i) => bronVelden(b, i)).join('')}
    <button type="button" class="knop" data-actie="bron-erbij">+ Bron toevoegen</button>`;
}

function bronVelden(b, i) {
  const p = `b${i}-`; // voorvoegsel, zodat elk veld een unieke naam heeft
  return `
    <fieldset class="bronvak">
      <legend>Bron ${i + 1}</legend>
      <label class="vinkje"><input type="checkbox" name="${p}actief" ${b.actief ? 'checked' : ''}> Telt mee (aan)</label>
      <div class="rij">
        ${veld('CO2e (kg per eenheid)', getalveld(`${p}co2e`, b.co2e_kg))}
        ${veld('Water (L per eenheid, optioneel)', getalveld(`${p}water`, b.water_l))}
      </div>
      ${veld('Bronnaam', tekstveld(`${p}bron`, b.bron))}
      <div class="rij">
        ${veld('Link', tekstveld(`${p}link`, b.link, 'inputmode="url"'))}
        ${veld('Jaar', getalveld(`${p}jaar`, b.jaar))}
      </div>
      ${veld('Scope / methode', tekstveld(`${p}scope`, b.scope))}
      <div class="rij">
        ${veld('Status', `<select name="${p}status">${opties(STATUSSEN.map((s) => ({ waarde: s, tekst: s })), b.status)}</select>`)}
        ${veld('Andere eenheid dan het item?', `<select name="${p}eenheid">${opties([{ waarde: '', tekst: '(zelfde als item)' }, ...EENHEDEN.map((e) => ({ waarde: e, tekst: e }))], b.eenheid ?? '')}</select>`)}
      </div>
      ${veld('Notitie', `<textarea name="${p}notitie" rows="2">${esc(b.notitie)}</textarea>`)}
      <button type="button" class="knop klein gevaar" data-actie="bron-weg" data-i="${i}">Bron ${i + 1} verwijderen</button>
    </fieldset>`;
}

function mixVelden(c, zelfdeCategorie) {
  // Een mix bestaat uit gewone items met dezelfde eenheid.
  const kandidaten = zelfdeCategorie.filter((i) => i.type !== 'mix' && i.eenheid === c.eenheid);
  const rijen = kandidaten
    .map((i) => {
      const deel = c.mix.find((d) => d.item === i.id);
      return `<tr><td>${esc(i.naam)}</td><td>${getalveld(`mix-${i.id}`, deel?.aandeel ?? null, `data-mix="${esc(i.id)}" aria-label="Aandeel ${esc(i.naam)}"`)}</td></tr>`;
    })
    .join('');
  const mb = c.mixBron;
  return `
    <h3>Samenstelling</h3>
    <p class="hulp">Vul per onderdeel een aandeel in (bv. miljard km of kg per persoon). De app rekent de verhouding zelf uit. Leeg = doet niet mee.</p>
    ${kandidaten.length ? `<table class="mixtabel"><thead><tr><th>Onderdeel</th><th>Aandeel</th></tr></thead><tbody>${rijen}</tbody></table>` : '<p class="hulp">Geen items met deze categorie en eenheid.</p>'}
    <fieldset><legend>Bron van de verhoudingen</legend>
      ${veld('Bronnaam', tekstveld('mb-bron', mb.bron))}
      <div class="rij">
        ${veld('Link', tekstveld('mb-link', mb.link, 'inputmode="url"'))}
        ${veld('Jaar', getalveld('mb-jaar', mb.jaar))}
      </div>
      ${veld('Status', `<select name="mb-status">${opties(STATUSSEN.map((s) => ({ waarde: s, tekst: s })), mb.status)}</select>`)}
      ${veld('Notitie', `<textarea name="mb-notitie" rows="2">${esc(mb.notitie)}</textarea>`)}
    </fieldset>`;
}

// ---------- Formulier uitlezen ----------

// Zet alle ingevulde velden in het concept.
function leesFormulier(el) {
  const c = concept;
  const v = (naam) => el.querySelector(`[name="${naam}"]`)?.value.trim() ?? '';
  const aan = (naam) => el.querySelector(`[name="${naam}"]`)?.checked ?? false;

  c.naam = v('naam');
  c.categorie = v('categorie');
  c.eenheid = v('eenheid');
  c.uitleg = v('uitleg');

  if (c.type === 'mix') {
    // shortcut: een leeg aandeel betekent "doet niet mee"; onderdelen met aandeel "nog in te vullen" (null) kun je hier niet maken.
    c.mix = [...el.querySelectorAll('[data-mix]')]
      .map((input) => ({ item: input.dataset.mix, aandeel: leesGetal(input.value) }))
      .filter((d) => d.aandeel !== null);
    c.mixBron = { ...c.mixBron, bron: v('mb-bron'), link: v('mb-link') || null, jaar: leesGetal(v('mb-jaar')), status: v('mb-status'), notitie: v('mb-notitie') };
    return;
  }

  c.alternatieven = [...el.querySelectorAll('[name="alt"]:checked')].map((x) => x.value);
  if (v('standaardReferentie')) c.standaardReferentie = v('standaardReferentie');
  else delete c.standaardReferentie;

  c.bronnen = c.bronnen.map((oud, i) => {
    const p = `b${i}-`;
    // {...oud} houdt velden die niet in het formulier staan (zoals 'gassen').
    const b = {
      ...oud,
      co2e_kg: leesGetal(v(`${p}co2e`)),
      water_l: leesGetal(v(`${p}water`)),
      bron: v(`${p}bron`),
      link: v(`${p}link`) || null,
      jaar: leesGetal(v(`${p}jaar`)),
      scope: v(`${p}scope`),
      status: v(`${p}status`),
      notitie: v(`${p}notitie`),
      actief: aan(`${p}actief`),
    };
    if (v(`${p}eenheid`)) b.eenheid = v(`${p}eenheid`);
    else delete b.eenheid;
    return b;
  });

  // Is de gekozen scope verdwenen (bron weg of scope hernoemd)? Dan weer "alle scopes".
  if (c.scopeKeuze && !c.bronnen.some((b) => b.scope === c.scopeKeuze)) c.scopeKeuze = null;
}

// ---------- Knoppen ----------

function koppelActies(el, app) {
  const form = el.querySelector('form');
  const sluit = () => { concept = null; fouten = []; app.herteken(); };
  const bewaar = (data) => { app.data = data; app.bewaar(); sluit(); };

  form.addEventListener('submit', (e) => {
    e.preventDefault(); // voorkomt dat de browser de pagina herlaadt
    leesFormulier(el);
    const item = { ...concept, id: concept.id ?? maakId(concept.naam, app.data.items.map((i) => i.id)) };
    const resultaat = slaItemOp(app.data, item);
    if (resultaat.fouten.length) {
      fouten = resultaat.fouten;
      app.herteken();
      el.querySelector('.melding')?.scrollIntoView?.(); // op een telefoon staat de melding anders buiten beeld
    } else {
      bewaar(resultaat.data);
    }
  });

  // Categorie of eenheid gewijzigd: opnieuw tekenen (de lijsten met items hangen ervan af).
  form.querySelector('[name="categorie"]').addEventListener('change', () => {
    leesFormulier(el);
    concept.eenheid = app.data.categorieen.find((k) => k.id === concept.categorie)?.standaardEenheid ?? concept.eenheid;
    app.herteken();
  });
  form.querySelector('[name="eenheid"]').addEventListener('change', () => { leesFormulier(el); app.herteken(); });

  form.addEventListener('click', (e) => {
    const actie = e.target.dataset?.actie;
    if (actie === 'annuleren') sluit();
    if (actie === 'bron-erbij') { leesFormulier(el); concept.bronnen.push(leegBron()); app.herteken(); }
    if (actie === 'bron-weg') { leesFormulier(el); concept.bronnen.splice(Number(e.target.dataset.i), 1); app.herteken(); }
    if (actie === 'verwijderen') verwijder(app, bewaar);
  });
}

function verwijder(app, bewaar) {
  const { logboek, verwijzingen } = waarGebruikt(app.data, concept.id);
  if (logboek === 0) {
    const vraag = verwijzingen.length
      ? `"${concept.naam}" wordt gebruikt als:\n- ${verwijzingen.join('\n- ')}\n\nDie verwijzingen worden opgeruimd. Toch verwijderen?`
      : `"${concept.naam}" verwijderen?`;
    if (!confirm(vraag)) return;
  }
  const resultaat = verwijderItem(app.data, concept.id);
  if (resultaat.fouten.length) {
    fouten = resultaat.fouten;
    app.herteken();
  } else {
    bewaar(resultaat.data);
  }
}
