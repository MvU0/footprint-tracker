// Datums groeperen per week, maand of jaar.
//
// Een periode heeft een "sleutel" (tekst die ook goed sorteert):
//   week  → "2026-W46"  (ISO-week: maandag t/m zondag; week 1 bevat de eerste donderdag)
//   maand → "2026-11"
//   jaar  → "2026"
// We rekenen in UTC, zodat zomertijd en tijdzones geen dag verschuiven.

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const DAG = 24 * 60 * 60 * 1000;

const twee = (n) => String(n).padStart(2, '0');
const alsDatum = (tekst) => new Date(`${tekst}T00:00:00Z`);

// ISO-week van een datum: de donderdag van dezelfde week bepaalt jaar en weeknummer.
function isoWeek(d) {
  const donderdag = new Date(d.getTime() + (3 - ((d.getUTCDay() + 6) % 7)) * DAG);
  const jaar = donderdag.getUTCFullYear();
  const dagVanJaar = Math.round((donderdag - Date.UTC(jaar, 0, 1)) / DAG); // 0 = 1 januari
  return { jaar, week: Math.floor(dagVanJaar / 7) + 1 };
}

// Maandag van ISO-week w in jaar j. (4 januari valt altijd in week 1.)
function maandagVan(jaar, week) {
  const vier = new Date(Date.UTC(jaar, 0, 4));
  const maandagWeek1 = vier.getTime() - ((vier.getUTCDay() + 6) % 7) * DAG;
  return new Date(maandagWeek1 + (week - 1) * 7 * DAG);
}

// "2026-11-10" → sleutel van de week, maand of het jaar.
export function periodeVan(datum, soort) {
  if (soort === 'jaar') return datum.slice(0, 4);
  if (soort === 'maand') return datum.slice(0, 7);
  const { jaar, week } = isoWeek(alsDatum(datum));
  return `${jaar}-W${twee(week)}`;
}

// n periodes later (n < 0: eerder).
export function verschuif(sleutel, soort, n) {
  if (soort === 'jaar') return String(Number(sleutel) + n);
  if (soort === 'maand') {
    const [j, m] = sleutel.split('-').map(Number);
    const totaal = j * 12 + (m - 1) + n; // maanden sinds jaar 0
    return `${Math.floor(totaal / 12)}-${twee((totaal % 12) + 1)}`;
  }
  const [j, w] = sleutel.split('-W').map(Number);
  const maandag = new Date(maandagVan(j, w).getTime() + n * 7 * DAG);
  return periodeVan(maandag.toISOString().slice(0, 10), 'week');
}

// "november 2026" / "week 46, 2026" / "2026"; kort: "nov" / "w46" / "2026".
export function periodeLabel(sleutel, soort, kort = false) {
  if (soort === 'jaar') return sleutel;
  if (soort === 'maand') {
    const [j, m] = sleutel.split('-').map(Number);
    return kort ? MAANDEN_KORT[m - 1] : `${MAANDEN[m - 1]} ${j}`;
  }
  const [j, w] = sleutel.split('-W').map(Number);
  return kort ? `w${w}` : `week ${w}, ${j}`;
}

// De n periodes die eindigen bij 'eind', oudste eerst (ook lege periodes, zodat je gaten ziet).
export function laatstePeriodes(eind, soort, n) {
  return Array.from({ length: n }, (_, i) => verschuif(eind, soort, i - (n - 1)));
}
