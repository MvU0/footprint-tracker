// De lijst met schermen (tabbladen) van de app.
// Een scherm toevoegen = hier een regel toevoegen + een bestand in src/views/.

export const ROUTES = [
  { pad: 'items', titel: 'Items' },
  { pad: 'vergelijk', titel: 'Vergelijk' },
  { pad: 'loggen', titel: 'Loggen' },
  { pad: 'logboek', titel: 'Logboek' },
  { pad: 'overzicht', titel: 'Overzicht' },
  { pad: 'instellingen', titel: 'Instellingen' },
];

// Zet de "hash" uit de adresbalk (bijv. "#/vergelijk") om naar een route.
// Onbekend of leeg? Dan het eerste scherm.
export function routeUitHash(hash) {
  const pad = (hash || '').replace(/^#\/?/, '');
  return ROUTES.find((r) => r.pad === pad) ?? ROUTES[0];
}
