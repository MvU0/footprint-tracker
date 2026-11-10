// De lijst met schermen (tabbladen) van de app.
// Een scherm toevoegen = hier een regel toevoegen + een bestand in src/views/.

export const ROUTES = [
  { pad: 'overzicht', titel: 'Overzicht' },
  { pad: 'items', titel: 'Items' },
  { pad: 'vergelijk', titel: 'Vergelijk' },
  { pad: 'loggen', titel: 'Loggen' },
  { pad: 'logboek', titel: 'Logboek' },
  { pad: 'instellingen', titel: 'Instellingen' },
];

// Het scherm bij het openen van de app.
// Wordt 'overzicht' zodra dat scherm gebouwd is (stap 6).
const STARTSCHERM = 'items';

// Zet de "hash" uit de adresbalk (bijv. "#/vergelijk") om naar een route.
// Onbekend of leeg? Dan het startscherm.
export function routeUitHash(hash) {
  const pad = (hash || '').replace(/^#\/?/, '');
  return ROUTES.find((r) => r.pad === pad) ?? ROUTES.find((r) => r.pad === STARTSCHERM);
}
