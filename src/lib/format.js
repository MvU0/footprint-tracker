// Getallen en bereiken netjes opschrijven in het Nederlands (komma als decimaalteken).

// Aantal decimalen hangt af van de grootte, zodat er geen schijnnauwkeurigheid ontstaat:
//   ≥ 100 → 0 decimalen, ≥ 10 → 1, ≥ 1 → 2, kleiner → 3 significante cijfers.
export function getal(x) {
  if (x === null || x === undefined) return '–';
  if (x === 0) return '0';
  const abs = Math.abs(x);
  const opties =
    abs >= 100 ? { maximumFractionDigits: 0 }
    : abs >= 10 ? { maximumFractionDigits: 1 }
    : abs >= 1 ? { maximumFractionDigits: 2 }
    : { maximumSignificantDigits: 3 };
  return new Intl.NumberFormat('nl-NL', opties).format(x);
}

// kg CO2e; vanaf 1000 kg als ton.
export function co2(kg) {
  if (kg !== null && Math.abs(kg) >= 1000) return `${getal(kg / 1000)} ton CO2e`;
  return `${getal(kg)} kg CO2e`;
}

// Liters; vanaf 1000 L als m³.
export function water(liter) {
  if (liter !== null && Math.abs(liter) >= 1000) return `${getal(liter / 1000)} m³ water`;
  return `${getal(liter)} L water`;
}

// Beschrijft een samenvatting (uit statistiek.js) volgens de regels uit het plan.
//   0 bronnen  → "geen bronnen"
//   1 bron     → "5,2 kg CO2e (1 bron, geen bereik)"
//   2–3        → "3 tot 11 kg CO2e, gemiddeld 7 (3 bronnen)"
//   > 3        → "... gemiddeld 28, mediaan 5 (4 bronnen)"
// 'opmaak' is co2 of water (hierboven); 'woord' is wat er geteld wordt.
export function bereik(s, opmaak = co2, woord = 'bronnen') {
  const enkel = woord === 'bronnen' ? 'bron' : woord;
  if (!s || s.n === 0) return woord === 'bronnen' ? 'geen bronnen' : 'geen gegevens';
  if (s.n === 1) return `${opmaak(s.laag)} (1 ${enkel}, geen bereik)`;
  if (s.laag === s.hoog) return `${opmaak(s.laag)} (${s.n} ${woord}, allemaal gelijk)`;
  let tekst = `${getal(s.laag)} tot ${opmaak(s.hoog)}, gemiddeld ${getal(s.gemiddeld)}`;
  if (s.mediaan !== null) tekst += `, mediaan ${getal(s.mediaan)}`;
  return `${tekst} (${s.n} ${woord})`;
}

// Bereik van een mix: hier gaat het niet om aantal bronnen maar om onderdelen.
export function mixBereik(s, opmaak = co2) {
  if (!s || s.n === 0) return 'kan niet worden berekend';
  if (!s.heeftBereik || s.laag === s.hoog) return `${opmaak(s.gemiddeld)} (gewogen, ${s.n} onderdelen)`;
  return `${getal(s.laag)} tot ${opmaak(s.hoog)}, gewogen gemiddeld ${getal(s.gemiddeld)} (${s.n} onderdelen)`;
}
