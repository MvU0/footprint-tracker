// Scherm "Overzicht" (startpagina): je totalen per week, maand of jaar.
//
// - Vakken ("tegels") met uitgestoten, bespaard, water en aantal logregels,
//   elk vergeleken met de vorige periode (staafjes + verschil in woorden).
// - Een tabel per categorie en een grafiek over de laatste 12 periodes.

import { regelsIn, totalen, perCategorie, perPeriode, verandering } from '../lib/overzicht.js';
import { periodeVan, verschuif, periodeLabel, laatstePeriodes } from '../lib/periodes.js';
import { dagenSindsBackup } from '../lib/exportImport.js';
import * as fmt from '../lib/format.js';
import { kolomGrafiek } from '../ui/grafiek.js';
import { esc } from '../ui/html.js';

const SOORTEN = [
  { id: 'week', naam: 'Week' },
  { id: 'maand', naam: 'Maand' },
  { id: 'jaar', naam: 'Jaar' },
];

let soort = 'maand';
let sleutel = null; // de gekozen periode, bv. "2026-11"

// Vandaag als "JJJJ-MM-DD" (lokale tijd).
function vandaag() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function toonOverzicht(el, app) {
  const { data } = app;
  sleutel ??= periodeVan(vandaag(), soort);

  if (data.logboek.length === 0) {
    el.innerHTML = `
      <h2>Overzicht</h2>
      <p class="leeg">Nog niets gelogd. Ga naar <a href="#/loggen">Loggen</a> en leg vast wat je gedaan of gekocht hebt;
        hier zie je daarna je uitstoot en besparing per week, maand en jaar.</p>`;
    return;
  }

  const vorige = verschuif(sleutel, soort, -1);
  const nu = totalen(data, regelsIn(data, sleutel, soort));
  const toen = totalen(data, regelsIn(data, vorige, soort));
  // "oktober 2026" → "oktober" als het hetzelfde jaar is (korter in de vergelijkingszin).
  const vorigeNaam = periodeLabel(vorige, soort).replace(new RegExp(`,? ${sleutel.slice(0, 4)}$`), '');
  const namen = { nu: periodeLabel(sleutel, soort, true), toen: periodeLabel(vorige, soort, true) };

  const soortKnoppen = SOORTEN
    .map((s) => `<button type="button" class="chip ${s.id === soort ? 'actief' : ''}" data-soort="${s.id}">${s.naam}</button>`)
    .join('');

  // Herinnering: je data staat alleen in deze browser.
  const dagen = dagenSindsBackup(data, vandaag());
  const herinnering = dagen === null || dagen >= 30
    ? `<div class="melding waarschuwing herinnering">Je hebt ${dagen === null ? 'nog geen back-up gemaakt' : `al ${dagen} dagen geen back-up gemaakt`}.
        Je data staat alleen in deze browser. Maak een export of sla je logboek op GitHub op via <a href="#/instellingen">Instellingen</a>.</div>`
    : '';

  el.innerHTML = `
    <h2>Overzicht</h2>
    ${herinnering}
    <div class="periodekeuze">
      <div class="chips">${soortKnoppen}</div>
      <div class="bladeren">
        <button type="button" class="knop klein" data-actie="vorige" aria-label="Vorige periode">←</button>
        <strong class="periodenaam">${esc(periodeLabel(sleutel, soort))}</strong>
        <button type="button" class="knop klein" data-actie="volgende" aria-label="Volgende periode">→</button>
      </div>
    </div>
    <div class="tegels">
      ${tegelUitstoot(nu, toen, namen, vorigeNaam)}
      ${tegelBesparing(nu, toen, namen, vorigeNaam)}
      ${tegelWater(nu)}
      ${tegelAantal(nu)}
    </div>
    ${categorieTabel(data, regelsIn(data, sleutel, soort))}
    ${grafiekOverTijd(data)}`;

  el.querySelectorAll('[data-soort]').forEach((knop) =>
    knop.addEventListener('click', () => {
      soort = knop.dataset.soort;
      sleutel = periodeVan(vandaag(), soort); // nieuwe soort: begin bij de huidige periode
      app.herteken();
    }),
  );
  el.querySelector('[data-actie="vorige"]').addEventListener('click', () => { sleutel = verschuif(sleutel, soort, -1); app.herteken(); });
  el.querySelector('[data-actie="volgende"]').addEventListener('click', () => { sleutel = verschuif(sleutel, soort, 1); app.herteken(); });
}

// ---------- Tegels ----------

// Bereik van een totaal als tekst, alleen als laag en hoog verschillen.
const bereikTekst = (t, opmaak) =>
  t.n > 0 && t.laag !== t.hoog ? `<p class="hulp">bereik ${esc(fmt.kort({ n: 2, laag: t.laag, hoog: t.hoog, heeftBereik: true }, opmaak))}</p>` : '';

// Kleine vergelijking met de vorige periode: twee staafjes en het verschil in woorden.
// minderIsBeter: bij uitstoot is minder goed, bij besparing meer.
function vergelijking(waardeNu, waardeToen, namen, vorigeNaam, minderIsBeter) {
  if (waardeNu === 0 && waardeToen === 0) return '';
  const max = Math.max(Math.abs(waardeNu), Math.abs(waardeToen)) || 1;
  const balk = (naam, waarde, klasse) => `
    <div class="minibalk ${klasse}">
      <span class="naam">${esc(naam)}</span>
      <span class="spoor"><span class="vulling" style="width:${(Math.abs(waarde) / max) * 100}%"></span></span>
      <span class="getal">${esc(fmt.co2(waarde))}</span>
    </div>`;
  const v = verandering(waardeNu, waardeToen);
  let zin;
  if (v.verschil === 0) {
    zin = `gelijk aan ${esc(vorigeNaam)}`;
  } else {
    const meer = v.verschil > 0;
    const goed = meer !== minderIsBeter;
    const procent = v.procent === null ? '' : ` (${meer ? '+' : '−'}${Math.round(Math.abs(v.procent))}%)`;
    zin = `<span class="${goed ? 'goed' : 'slecht'}">${meer ? '▲' : '▼'} ${esc(fmt.co2(Math.abs(v.verschil)))} ${meer ? 'meer' : 'minder'} dan ${esc(vorigeNaam)}${procent}</span>`;
  }
  return `<div class="vergelijking">${balk(namen.nu, waardeNu, 'nu')}${balk(namen.toen, waardeToen, 'toen')}<p class="verschilzin">${zin}</p></div>`;
}

function tegelUitstoot(nu, toen, namen, vorigeNaam) {
  return `
    <section class="tegel" data-tegel="uitstoot">
      <h3>Uitgestoten</h3>
      <p class="kerngetal">${esc(fmt.co2(nu.uitstoot.telt))}</p>
      ${bereikTekst(nu.uitstoot, fmt.co2)}
      ${vergelijking(nu.uitstoot.telt, toen.uitstoot.telt, namen, vorigeNaam, true)}
    </section>`;
}

function tegelBesparing(nu, toen, namen, vorigeNaam) {
  const b = nu.besparing;
  const waarde = b.n === 0
    ? '<p class="kerngetal leeg">–</p><p class="hulp">geen logregels met een referentie</p>'
    : `<p class="kerngetal">${esc(fmt.co2(b.telt))}</p>${b.telt < 0 ? '<p class="hulp">per saldo extra uitstoot t.o.v. je referenties</p>' : ''}`;
  return `
    <section class="tegel" data-tegel="besparing">
      <h3>Bespaard</h3>
      ${waarde}
      ${bereikTekst(b, fmt.co2)}
      ${vergelijking(b.telt, toen.besparing.telt, namen, vorigeNaam, false)}
    </section>`;
}

function tegelWater(nu) {
  const w = nu.water;
  return `
    <section class="tegel" data-tegel="water">
      <h3>Water</h3>
      <p class="kerngetal ${w.n ? '' : 'leeg'}">${w.n ? esc(fmt.water(w.telt)) : '–'}</p>
      ${nu.waterBesparing.n ? `<p class="hulp">${esc(fmt.besparingTekst({ laag: nu.waterBesparing.telt, gemiddeld: nu.waterBesparing.telt, hoog: nu.waterBesparing.telt }, fmt.water))}</p>` : ''}
      ${nu.zonderWater ? `<p class="hulp">${nu.zonderWater} van ${nu.aantal} logregels zonder waterdata (tellen niet mee)</p>` : ''}
    </section>`;
}

function tegelAantal(nu) {
  return `
    <section class="tegel" data-tegel="aantal">
      <h3>Logregels</h3>
      <p class="kerngetal">${nu.aantal}</p>
      ${nu.zonderReferentie ? `<p class="hulp">${nu.zonderReferentie} zonder referentie (geen besparing)</p>` : ''}
    </section>`;
}

// ---------- Per categorie en over de tijd ----------

function categorieTabel(data, regels) {
  const lijst = perCategorie(data, regels);
  if (lijst.length === 0) return '<p class="leeg">Geen logregels in deze periode.</p>';
  const rijen = lijst
    .map(({ categorie, totalen: t }) => `
      <tr>
        <td>${esc(categorie.naam)}</td>
        <td class="getal">${esc(fmt.co2(t.uitstoot.telt))}</td>
        <td class="getal">${t.besparing.n ? esc(fmt.co2(t.besparing.telt)) : '–'}</td>
        <td class="getal">${t.aantal}</td>
      </tr>`)
    .join('');
  return `
    <h3>Per categorie</h3>
    <div class="tabelvak">
      <table class="vergelijktabel categorietabel">
        <thead><tr><th>Categorie</th><th class="getal">Uitgestoten</th><th class="getal">Bespaard</th><th class="getal">Logregels</th></tr></thead>
        <tbody>${rijen}</tbody>
      </table>
    </div>`;
}

function grafiekOverTijd(data) {
  // Week en maand: de laatste 12. Jaar: vanaf het eerste gelogde jaar (hoogstens 12).
  let aantal = 12;
  if (soort === 'jaar') {
    const eerste = Math.min(...data.logboek.map((r) => Number(r.datum.slice(0, 4))));
    aantal = Math.min(12, Math.max(1, Number(sleutel) - eerste + 1));
  }
  const periodes = perPeriode(data, laatstePeriodes(sleutel, soort, aantal), soort).map((p) => ({
    label: periodeLabel(p.sleutel, soort, true),
    waarden: [p.totalen.uitstoot.telt, p.totalen.besparing.telt],
    gekozen: p.sleutel === sleutel,
  }));
  const per = { week: 'Per week', maand: 'Per maand', jaar: 'Per jaar' }[soort];
  return kolomGrafiek(periodes, {
    titel: `${per}: uitgestoten en bespaard`,
    reeksen: [{ naam: 'Uitgestoten' }, { naam: 'Bespaard' }],
    opmaak: fmt.co2,
  });
}
