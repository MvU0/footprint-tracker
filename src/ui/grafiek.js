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
