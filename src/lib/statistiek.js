// Eenvoudige statistiek over een lijst getallen.
// Vergelijkbaar met min(), max(), mean() en median() in R.

export function gemiddelde(getallen) {
  if (getallen.length === 0) return null;
  return getallen.reduce((som, x) => som + x, 0) / getallen.length;
}

export function mediaan(getallen) {
  if (getallen.length === 0) return null;
  const gesorteerd = [...getallen].sort((a, b) => a - b);
  const midden = Math.floor(gesorteerd.length / 2);
  // Even aantal: gemiddelde van de twee middelste waarden.
  return gesorteerd.length % 2 === 0
    ? (gesorteerd[midden - 1] + gesorteerd[midden]) / 2
    : gesorteerd[midden];
}

// Vat een lijst waarden samen volgens de regels uit het plan:
// - n = 1: laag = hoog = de waarde, geen bereik
// - mediaan alleen bij meer dan 3 waarden (bij 2-3 is die weinig zeggend)
export function samenvatting(getallen) {
  const n = getallen.length;
  if (n === 0) {
    return { n: 0, laag: null, hoog: null, gemiddeld: null, mediaan: null, heeftBereik: false };
  }
  return {
    n,
    laag: Math.min(...getallen),
    hoog: Math.max(...getallen),
    gemiddeld: gemiddelde(getallen),
    mediaan: n > 3 ? mediaan(getallen) : null,
    heeftBereik: n >= 2,
  };
}
