// Opslaan op GitHub, met een knop (via de GitHub-API, rechtstreeks vanuit de browser).
//
// - Items  → de openbare app-repository, als nieuwe src/data/startdata.json (zonder logboek).
// - Logboek → een privé-repository, als logboek.json.
//
// Instellingen (eigenaar, token, repositorynamen) staan apart in localStorage onder
// 'footprint-tracker:github'. Ze komen nooit in een export of in een bestand op GitHub.
// 'fetchFn' is standaard de echte fetch; de tests geven een nagebootste GitHub mee.

const SLEUTEL = 'footprint-tracker:github';
const API = 'https://api.github.com';

export function laadGitHub(opslag = globalThis.localStorage) {
  try {
    return JSON.parse(opslag?.getItem(SLEUTEL) ?? 'null') ?? {};
  } catch {
    return {};
  }
}

export function bewaarGitHub(cfg, opslag = globalThis.localStorage) {
  opslag.setItem(SLEUTEL, JSON.stringify(cfg));
}

// Tekst ↔ base64 (GitHub verwacht bestandsinhoud in base64). Via UTF-8, zodat é en emoji goed gaan.
function naarBase64(tekst) {
  const bytes = new TextEncoder().encode(tekst);
  let binair = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binair += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binair);
}
function vanBase64(b64) {
  return new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0)));
}

function controleer(cfg, repoSleutel) {
  if (!cfg?.eigenaar || !cfg?.token || !cfg?.[repoSleutel]) {
    throw new Error('Vul eerst je GitHub-gegevens in bij Instellingen (gebruikersnaam, token en repository).');
  }
}

// Eén verzoek aan de GitHub-API, met foutmeldingen in gewone taal.
async function verzoek(cfg, repo, pad, fetchFn, opties = {}) {
  const url = `${API}/repos/${cfg.eigenaar}/${repo}/contents/${pad.split('/').map(encodeURIComponent).join('/')}`;
  let antwoord;
  try {
    antwoord = await fetchFn(url, {
      ...opties,
      headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    });
  } catch {
    throw new Error('Geen verbinding met GitHub. Controleer je internet en probeer het later opnieuw.');
  }
  return antwoord;
}

function fout(antwoord, cfg, repo) {
  if (antwoord.status === 401) return new Error('GitHub weigert het token (ongeldig of verlopen). Maak een nieuw token en vul het in bij Instellingen.');
  if (antwoord.status === 403) return new Error(`Het token mag niet schrijven in "${repo}". Geef het token "Contents: Read and write" voor deze repository.`);
  if (antwoord.status === 404) return new Error(`Repository "${cfg.eigenaar}/${repo}" niet gevonden, of het token heeft er geen toegang toe.`);
  return new Error(`GitHub gaf een fout (code ${antwoord.status}). Probeer het later opnieuw.`);
}

// Bestand lezen: { tekst, sha } of null als het (nog) niet bestaat.
async function leesBestand(cfg, repo, pad, fetchFn) {
  const antwoord = await verzoek(cfg, repo, pad, fetchFn);
  if (antwoord.status === 404) return null; // GitHub zegt 404 voor "bestand bestaat niet" én "repository onbekend"
  if (!antwoord.ok) throw fout(antwoord, cfg, repo);
  const body = await antwoord.json();
  return { tekst: vanBase64(body.content ?? ''), sha: body.sha };
}

// Bestand schrijven (nieuw of overschrijven). Is het in de tussentijd veranderd, dan één keer opnieuw.
async function schrijfBestand(cfg, repo, pad, tekst, bericht, fetchFn) {
  for (let poging = 1; poging <= 2; poging++) {
    const bestaand = await leesBestand(cfg, repo, pad, fetchFn);
    const antwoord = await verzoek(cfg, repo, pad, fetchFn, {
      method: 'PUT',
      body: JSON.stringify({ message: bericht, content: naarBase64(tekst), ...(bestaand ? { sha: bestaand.sha } : {}) }),
    });
    if (antwoord.ok) return;
    if ((antwoord.status === 409 || antwoord.status === 422) && poging === 1) continue;
    throw fout(antwoord, cfg, repo);
  }
}

// Items (catalogus) → openbare repository, als nieuwe startdata. Het logboek gaat hier NIET mee.
export async function slaItemsOp(cfg, data, fetchFn = globalThis.fetch) {
  controleer(cfg, 'codeRepo');
  const startdata = { schemaVersie: data.schemaVersie, categorieen: data.categorieen, instellingen: data.instellingen, items: data.items };
  await schrijfBestand(cfg, cfg.codeRepo, 'src/data/startdata.json', `${JSON.stringify(startdata, null, 2)}\n`, 'Items bijgewerkt vanuit de app', fetchFn);
}

// Logboek → privé-repository.
export async function slaLogboekOp(cfg, data, fetchFn = globalThis.fetch) {
  controleer(cfg, 'dataRepo');
  const inhoud = { app: 'footprint-tracker', schemaVersie: data.schemaVersie, logboek: data.logboek };
  await schrijfBestand(cfg, cfg.dataRepo, 'logboek.json', `${JSON.stringify(inhoud, null, 2)}\n`, 'Logboek bijgewerkt vanuit de app', fetchFn);
}

// Logboek ophalen uit de privé-repository: de lijst logregels, of null als er nog niets staat.
export async function haalLogboekOp(cfg, fetchFn = globalThis.fetch) {
  controleer(cfg, 'dataRepo');
  const bestand = await leesBestand(cfg, cfg.dataRepo, 'logboek.json', fetchFn);
  if (!bestand) return null;
  try {
    const inhoud = JSON.parse(bestand.tekst);
    if (!Array.isArray(inhoud.logboek)) throw new Error();
    return inhoud.logboek;
  } catch {
    throw new Error('logboek.json op GitHub is geen geldig logboek.');
  }
}
