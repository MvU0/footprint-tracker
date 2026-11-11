// Service worker: laat de app ook zonder internet werken.
//
// Werking ("netwerk eerst"): elk bestand van de app wordt gewoon van het internet gehaald,
// en tegelijk bewaard in een cache. Lukt het ophalen niet (geen internet), dan komt het
// uit de cache. Zo heb je online altijd de nieuwste versie en offline de laatst geziene.
// Verzoeken naar andere sites (zoals de GitHub-API) laten we met rust.
// shortcut: de eerste keer zijn de bestanden al geladen vóór de service worker actief is;
// offline werkt daarom pas na één keer herladen.

const CACHE = 'footprint-tracker-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  // Oude caches (van een vorige versie van dit bestand) opruimen.
  event.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const verzoek = event.request;
  if (verzoek.method !== 'GET' || new URL(verzoek.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(verzoek)
      .then((antwoord) => {
        const kopie = antwoord.clone();
        caches.open(CACHE).then((cache) => cache.put(verzoek, kopie));
        return antwoord;
      })
      .catch(() =>
        caches.match(verzoek).then((uitCache) => uitCache ?? caches.match('./')), // onbekende pagina → de app zelf
      ),
  );
});
