// Scherm "Items": alle items per categorie, met hun waarden, bronnen en waarschuwingen.

import { berekenItem, selecteerBronnen, groepeerPerScope } from '../lib/itemwaarden.js';
import * as fmt from '../lib/format.js';
import { esc, link, PER_EENHEID } from '../ui/html.js';
import { isBewerken, startBewerken, toonFormulier } from './itemFormulier.js';
import { voegCategorieToe } from '../lib/beheer.js';
import { EENHEDEN } from '../lib/validatie.js';

// Onthoudt welk categoriefilter gekozen is zolang de app open is.
let gekozenCategorie = 'alle';
let categorieFouten = []; // meldingen bij "nieuwe categorie"

export function toonItems(el, app) {
  // Staat er een formulier open? Dan tonen we dat in plaats van de lijst.
  if (isBewerken()) return toonFormulier(el, app);

  const { data } = app;
  const itemsPerId = new Map(data.items.map((i) => [i.id, i]));

  const filterKnoppen = [{ id: 'alle', naam: 'Alle' }, ...data.categorieen]
    .map((c) => `<button type="button" class="chip ${c.id === gekozenCategorie ? 'actief' : ''}" data-categorie="${esc(c.id)}">${esc(c.naam)}</button>`)
    .join('');

  const secties = data.categorieen
    .filter((c) => gekozenCategorie === 'alle' || c.id === gekozenCategorie)
    .map((c) => {
      const items = data.items.filter((i) => i.categorie === c.id);
      // Mix-items bovenaan: dat zijn de standaardreferenties.
      items.sort((a, b) => (b.type === 'mix') - (a.type === 'mix'));
      return `
        <section class="categorie">
          <h3>${esc(c.naam)} <span class="aantal">${items.length} items</span></h3>
          <div class="kaarten">${items.map((i) => itemKaart(i, itemsPerId)).join('')}</div>
        </section>`;
    })
    .join('');

  el.innerHTML = `
    <h2>Items</h2>
    <p class="intro">Per item de uitstoot en het watergebruik volgens de bronnen die meetellen.
      Klik op "Bronnen" voor de herkomst van elk cijfer.</p>
    <div class="knoppen">
      <button type="button" class="knop hoofd" data-actie="nieuw-item">+ Nieuw item</button>
      <button type="button" class="knop" data-actie="nieuw-mix">+ Nieuw mix-item</button>
    </div>
    <details class="nieuwe-categorie" ${categorieFouten.length ? 'open' : ''}>
      <summary>+ Nieuwe categorie</summary>
      ${categorieFouten.map((f) => `<div class="melding waarschuwing">${esc(f)}</div>`).join('')}
      <form data-form="categorie" class="formulier rij" novalidate>
        <label class="veld"><span>Naam</span><input name="cat-naam"></label>
        <label class="veld"><span>Standaardeenheid</span><select name="cat-eenheid">${EENHEDEN.map((e) => `<option>${e}</option>`).join('')}</select></label>
        <button type="submit" class="knop">Toevoegen</button>
      </form>
    </details>
    <div class="chips">${filterKnoppen}</div>
    ${secties}`;

  // Nieuw item of mix: het formulier opent in de gekozen categorie.
  const categorie = gekozenCategorie === 'alle' ? undefined : gekozenCategorie;
  el.querySelector('[data-actie="nieuw-item"]').addEventListener('click', () => {
    startBewerken(null, data, { categorie });
    app.herteken();
  });
  el.querySelector('[data-actie="nieuw-mix"]').addEventListener('click', () => {
    startBewerken(null, data, { mix: true, categorie });
    app.herteken();
  });
  el.querySelectorAll('[data-bewerk]').forEach((knop) =>
    knop.addEventListener('click', () => {
      startBewerken(itemsPerId.get(knop.dataset.bewerk), data);
      app.herteken();
    }),
  );

  el.querySelector('form[data-form="categorie"]').addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = el.querySelector('[name="cat-naam"]').value;
    const eenheid = el.querySelector('[name="cat-eenheid"]').value;
    const resultaat = voegCategorieToe(data, naam, eenheid);
    categorieFouten = resultaat.fouten;
    if (resultaat.data) {
      app.data = resultaat.data;
      app.bewaar();
    }
    app.herteken();
  });

  // Klikken op een filterknop.
  el.querySelectorAll('[data-categorie]').forEach((knop) =>
    knop.addEventListener('click', () => {
      gekozenCategorie = knop.dataset.categorie;
      app.herteken();
    }),
  );

  // Een andere scope kiezen bij een item met verschillende scopes.
  el.querySelectorAll('select[data-scope-item]').forEach((select) =>
    select.addEventListener('change', () => {
      const item = itemsPerId.get(select.dataset.scopeItem);
      item.scopeKeuze = select.value || null;
      app.bewaar();
      app.herteken();
    }),
  );
}

function itemKaart(item, itemsPerId) {
  const w = berekenItem(item, itemsPerId);
  const isMix = item.type === 'mix';
  const per = PER_EENHEID[item.eenheid] ?? item.eenheid;

  const co2Tekst = isMix ? fmt.mixBereik(w.co2, fmt.co2) : fmt.bereik(w.co2, fmt.co2);
  const waterTekst = w.water.n === 0
    ? 'Water: geen gegevens'
    : isMix ? fmt.mixBereik(w.water, fmt.water) : fmt.bereik(w.water, fmt.water);

  return `
    <article class="kaart">
      <header>
        <h4>${esc(item.naam)}</h4>
        ${isMix ? '<span class="label mix">referentie-mix</span>' : ''}
        <button type="button" class="knop klein" data-bewerk="${esc(item.id)}">Bewerken</button>
      </header>
      <p class="waarde"><strong>${esc(co2Tekst)}</strong> <span class="per">${per}</span></p>
      <p class="water ${w.water.n === 0 ? 'leeg' : ''}">${esc(waterTekst)}${w.water.n ? ` <span class="per">${per}</span>` : ''}</p>
      ${meldingen(item, w)}
      ${item.uitleg ? `<p class="uitleg">${esc(item.uitleg)}</p>` : ''}
      ${isMix ? mixDetails(item, w) : bronnenDetails(item)}
    </article>`;
}

// Waarschuwingen, plus de keuzelijst voor de scope als er meerdere scopes zijn.
function meldingen(item, w) {
  let html = w.waarschuwingen
    .map((m) => `<div class="melding ${m.type === 'scope-gekozen' ? 'info' : 'waarschuwing'}">${esc(m.tekst)}</div>`)
    .join('');

  if (item.type !== 'mix') {
    const { scopes, scopeKeuze } = selecteerBronnen(item);
    if (scopes.length > 1) {
      const groepen = groepeerPerScope(item)
        .map((g) => `<li><span class="scope">${esc(g.scope)}</span>: ${esc(fmt.bereik(g.co2, fmt.co2))}</li>`)
        .join('');
      const opties = [
        `<option value="" ${!scopeKeuze ? 'selected' : ''}>Alle scopes samen (appels met peren)</option>`,
        ...scopes.map((s) => `<option value="${esc(s)}" ${s === scopeKeuze ? 'selected' : ''}>${esc(s)}</option>`),
      ].join('');
      html += `
        <div class="scopekeuze">
          <p>Per scope apart:</p>
          <ul>${groepen}</ul>
          <label>Telt mee: <select data-scope-item="${esc(item.id)}">${opties}</select></label>
        </div>`;
    }
  }
  return html;
}

function statusLabel(status) {
  const klasse = String(status).replaceAll(' ', '-');
  return `<span class="status status-${esc(klasse)}">${esc(status)}</span>`;
}

function bronnenDetails(item) {
  const bronnen = item.bronnen ?? [];
  const { tellend } = selecteerBronnen(item);
  const lijst = bronnen
    .map((b) => {
      const telt = tellend.includes(b);
      const reden = !b.actief ? 'uitgeschakeld'
        : b.co2e_kg === null ? 'geen waarde'
        : b.eenheid && b.eenheid !== item.eenheid ? `andere eenheid (${b.eenheid})`
        : !telt ? 'andere scope'
        : '';
      return `
        <li class="bron ${telt ? '' : 'telt-niet'}">
          <div class="bron-kop">
            <strong>${b.co2e_kg === null ? '?' : esc(fmt.co2(b.co2e_kg))}</strong>
            ${b.water_l !== null && b.water_l !== undefined ? ` · ${esc(fmt.water(b.water_l))}` : ''}
            ${statusLabel(b.status)}
            ${reden ? `<span class="label">telt niet mee: ${esc(reden)}</span>` : ''}
          </div>
          <div>${link(b.link, b.bron)}${b.jaar ? ` (${esc(b.jaar)})` : ''}</div>
          <div class="scope">Scope: ${esc(b.scope)}</div>
          ${b.notitie ? `<div class="notitie">${esc(b.notitie)}</div>` : ''}
        </li>`;
    })
    .join('');
  return `
    <details>
      <summary>Bronnen (${bronnen.length}, waarvan ${tellend.length} tellen mee)</summary>
      <ul class="bronnen">${lijst}</ul>
    </details>`;
}

function mixDetails(item, w) {
  const totaal = w.totaalAandeel ?? 0;
  const rijen = (item.mix ?? [])
    .map((deel) => {
      const d = w.delen?.find((x) => x.item.id === deel.item);
      const pct = deel.aandeel !== null && totaal > 0 ? `${fmt.getal((deel.aandeel / totaal) * 100)}%` : 'nog in te vullen';
      const naam = d?.item.naam ?? deel.item;
      const waarde = d ? fmt.co2(d.waarden.co2.gemiddeld) : '–';
      return `<tr><td>${esc(naam)}</td><td class="getal">${esc(pct)}</td><td class="getal">${esc(waarde)}</td></tr>`;
    })
    .join('');
  const mb = item.mixBron ?? {};
  return `
    <details>
      <summary>Samenstelling en bron</summary>
      <table class="mixtabel">
        <thead><tr><th>Onderdeel</th><th class="getal">Aandeel</th><th class="getal">Gemiddeld</th></tr></thead>
        <tbody>${rijen}</tbody>
      </table>
      <ul class="bronnen">
        <li class="bron">
          <div class="bron-kop">Verhoudingen ${statusLabel(mb.status ?? 'nog te onderzoeken')}</div>
          <div>${link(mb.link, mb.bron ?? 'onbekend')}${mb.jaar ? ` (${esc(mb.jaar)})` : ''}</div>
          ${mb.notitie ? `<div class="notitie">${esc(mb.notitie)}</div>` : ''}
        </li>
      </ul>
    </details>`;
}
