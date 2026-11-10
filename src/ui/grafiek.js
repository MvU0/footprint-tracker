// Liggend staafdiagram als SVG-tekst (geen bibliotheek nodig).
//
// - Eén staaf per item: de lengte is het gemiddelde.
// - "Snorhaar": een dun lijntje van laag naar hoog, alleen als er een bereik is.
// - Gesorteerd van groot naar klein; de grootste waarde (ook een snorhaar) vult de breedte.
// - Kleuren komen uit style.css (klassen), zodat licht en donker vanzelf werken.
//
// rijen: [{ naam, laag, gemiddeld, hoog, heeftBereik, isReferentie }]
// opties: { titel, opmaak } — opmaak is bv. co2 of water uit format.js.

import { esc } from './html.js';

const BREEDTE = 900; // ≈ breedte op een desktop, zodat de tekst niet opgerekt wordt; de SVG schaalt mee
const LABEL = 220; // ruimte links voor de namen
const WAARDE = 170; // ruimte rechts voor het getal bij de staaf
const RIJ = 34; // hoogte per item
const DIK = 16; // dikte van een staaf (hoogstens 24 px, de rest is lucht)
const R = 4; // afronding van het uiteinde van de staaf

// Staaf met een rond uiteinde rechts en een rechte kant op de basislijn.
function staafPad(x, y, lengte) {
  if (lengte <= 0) return '';
  const r = Math.min(R, lengte, DIK / 2);
  return `M${x},${y} h${lengte - r} a${r},${r} 0 0 1 ${r},${r} v${DIK - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(lengte - r)} Z`;
}

// Lange namen inkorten; de volledige naam staat in de hover-tekst.
const kortNaam = (t) => (t.length > 28 ? `${t.slice(0, 27)}…` : t);

export function staafGrafiek(rijen, { titel, opmaak }) {
  const gesorteerd = [...rijen].sort((a, b) => b.gemiddeld - a.gemiddeld);
  const max = Math.max(...gesorteerd.map((r) => Math.max(r.hoog, r.gemiddeld)), 0) || 1; // alles 0 → niet delen door 0
  const vlak = BREEDTE - LABEL - WAARDE; // breedte van het deel waar de staven staan
  const x = (waarde) => LABEL + (Math.max(waarde, 0) / max) * vlak;
  const hoogte = gesorteerd.length * RIJ + 8;

  const regels = gesorteerd
    .map((r, i) => {
      const yMidden = 4 + i * RIJ + RIJ / 2;
      const yStaaf = yMidden - DIK / 2;
      const lengte = x(r.gemiddeld) - LABEL;
      const naam = r.isReferentie ? `${r.naam} (referentie)` : r.naam;
      const hover = r.heeftBereik
        ? `${naam}: ${opmaak(r.gemiddeld)} gemiddeld (${opmaak(r.laag)} tot ${opmaak(r.hoog)})`
        : `${naam}: ${opmaak(r.gemiddeld)}`;
      const snor = r.heeftBereik
        ? `<g class="snor" data-tot="${r.hoog / max}">
             <line x1="${x(r.laag)}" x2="${x(r.hoog)}" y1="${yMidden}" y2="${yMidden}"/>
             <line x1="${x(r.laag)}" x2="${x(r.laag)}" y1="${yMidden - 5}" y2="${yMidden + 5}"/>
             <line x1="${x(r.hoog)}" x2="${x(r.hoog)}" y1="${yMidden - 5}" y2="${yMidden + 5}"/>
           </g>`
        : '';
      const eind = r.heeftBereik ? Math.max(x(r.hoog), x(r.gemiddeld)) : x(r.gemiddeld);
      return `
        <g class="regel ${r.isReferentie ? 'referentie' : ''}">
          <title>${esc(hover)}</title>
          <rect class="raak" x="0" y="${yMidden - RIJ / 2}" width="${BREEDTE}" height="${RIJ}"/>
          <text class="naam" x="${LABEL - 10}" y="${yMidden}" text-anchor="end" dominant-baseline="middle">${esc(kortNaam(naam))}</text>
          <path class="staaf" data-lengte="${lengte}" d="${staafPad(LABEL, yStaaf, lengte)}"/>
          ${snor}
          <text class="getal" x="${eind + 8}" y="${yMidden}" dominant-baseline="middle">${r.heeftBereik ? 'gem. ' : ''}${esc(opmaak(r.gemiddeld))}</text>
        </g>`;
    })
    .join('');

  return `
    <figure class="grafiek">
      <figcaption>${esc(titel)}</figcaption>
      <svg viewBox="0 0 ${BREEDTE} ${hoogte}" role="img" aria-label="${esc(titel)}">
        <line class="basislijn" x1="${LABEL}" x2="${LABEL}" y1="0" y2="${hoogte}"/>
        ${regels}
      </svg>
    </figure>`;
}

// ---------- Kolomgrafiek: meerdere reeksen over de tijd ----------
//
// periodes: [{ label, waarden: [reeks1, reeks2, …], gekozen? }]
// opties:   { titel, reeksen: [{ naam }], opmaak }
// - Per periode staan de kolommen van de reeksen naast elkaar (2 px ruimte ertussen).
// - Een negatieve waarde (bv. extra uitstoot) gaat onder de nullijn.
// - Kleuren via klassen reeks-1, reeks-2 (style.css); de legenda noemt de reeksen.

const K_BREEDTE = 900;
const K_LINKS = 56; // ruimte voor de getallen langs de as
const K_BOVEN = 30; // ruimte voor de eenheid boven de as
const K_ONDER = 26; // ruimte voor de periodenamen
const K_HOOGTE = 220; // hoogte van het tekenvlak
const K_MAX_DIK = 24;

// Een "mooie" stap voor de as: 1, 2 of 5 × 10^k.
function mooieStap(ruw) {
  const macht = 10 ** Math.floor(Math.log10(ruw));
  const f = ruw / macht;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * macht;
}

// Kolom met een rond uiteinde aan de kant van de waarde, recht op de nullijn.
function kolomPad(x, yNul, hoogte, breedte) {
  const h = Math.abs(hoogte);
  if (h < 0.5) return '';
  const r = Math.min(R, h, breedte / 2);
  if (hoogte > 0) {
    return `M${x},${yNul} v${-(h - r)} a${r},${r} 0 0 1 ${r},${-r} h${breedte - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} Z`;
  }
  return `M${x},${yNul} v${h - r} a${r},${r} 0 0 0 ${r},${r} h${breedte - 2 * r} a${r},${r} 0 0 0 ${r},${-r} v${-(h - r)} Z`;
}

export function kolomGrafiek(periodes, { titel, reeksen, opmaak }) {
  const alle = periodes.flatMap((p) => p.waarden);
  const laag = Math.min(0, ...alle);
  const hoog = Math.max(0, ...alle);
  const stap = mooieStap((hoog - laag) / 4 || 1); // alles 0 → stap 1
  const asMin = Math.floor(laag / stap) * stap;
  const asMax = Math.max(Math.ceil(hoog / stap) * stap, asMin + stap);
  const schaal = Math.max(Math.abs(asMin), Math.abs(asMax)); // bepaalt kg of ton op de as
  const y = (v) => K_BOVEN + ((asMax - v) / (asMax - asMin)) * K_HOOGTE;
  const yNul = y(0);

  const vlak = K_BREEDTE - K_LINKS;
  const groep = vlak / Math.max(periodes.length, 1);
  const dik = Math.min(K_MAX_DIK, (groep * 0.7 - 2 * (reeksen.length - 1)) / reeksen.length);
  const groepBreedte = reeksen.length * dik + 2 * (reeksen.length - 1);

  // Hulplijnen en getallen langs de as (zonder eenheid; de eenheid staat boven de as).
  const kaal = (v) => opmaak(v, schaal).split(' ')[0];
  const eenheid = opmaak(schaal, schaal).split(' ').slice(1).join(' ');
  const lijnen = [];
  for (let v = asMin; v <= asMax + stap / 2; v += stap) {
    lijnen.push(`
      <line class="${Math.abs(v) < stap / 2 ? 'nullijn' : 'hulplijn'}" x1="${K_LINKS}" x2="${K_BREEDTE}" y1="${y(v)}" y2="${y(v)}"/>
      <text class="as" x="${K_LINKS - 8}" y="${y(v)}" text-anchor="end" dominant-baseline="middle">${esc(kaal(Math.abs(v) < stap / 2 ? 0 : v))}</text>`);
  }

  const kolommen = periodes
    .map((p, i) => {
      const x0 = K_LINKS + i * groep + (groep - groepBreedte) / 2;
      const staven = p.waarden
        .map((v, j) => {
          const hoogte = yNul - y(v); // positief = omhoog
          return `<path class="kolom reeks-${j + 1}" data-hoogte="${hoogte}" d="${kolomPad(x0 + j * (dik + 2), yNul, hoogte, dik)}"/>`;
        })
        .join('');
      const hover = `${p.label} — ${reeksen.map((r, j) => `${r.naam}: ${opmaak(p.waarden[j])}`).join('; ')}`;
      return `
        <g class="periode ${p.gekozen ? 'gekozen' : ''}">
          <title>${esc(hover)}</title>
          <rect class="raak" x="${K_LINKS + i * groep}" y="0" width="${groep}" height="${K_BOVEN + K_HOOGTE + K_ONDER}"/>
          ${staven}
          <text class="label" x="${K_LINKS + i * groep + groep / 2}" y="${K_BOVEN + K_HOOGTE + 18}" text-anchor="middle">${esc(p.label)}</text>
        </g>`;
    })
    .join('');

  const legenda = reeksen.map((r, j) => `<li><span class="sleutel reeks-${j + 1}"></span>${esc(r.naam)}</li>`).join('');

  return `
    <figure class="grafiek">
      <figcaption>${esc(titel)}</figcaption>
      <ul class="legenda">${legenda}</ul>
      <svg viewBox="0 0 ${K_BREEDTE} ${K_BOVEN + K_HOOGTE + K_ONDER}" role="img" aria-label="${esc(titel)}">
        <text class="as eenheid" x="0" y="12">${esc(eenheid)}</text>
        ${lijnen.join('')}
        ${kolommen}
      </svg>
    </figure>`;
}
