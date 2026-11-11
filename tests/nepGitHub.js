// Gedeeld door tests: een nagebootste GitHub-API.

// Een nagebootste GitHub (alleen het deel van de API dat we gebruiken: bestanden lezen en schrijven).
// bestanden: "repo/pad" → { content (base64), sha }. Alleen token "goed" mag erin; repo "bestaat-niet" bestaat niet.
export function nepGitHub({ offline = false } = {}) {
  const bestanden = new Map();
  let teller = 0;
  const aanroepen = [];
  const antwoord = (status, body = {}) => ({ ok: status < 300, status, json: async () => body });
  const fetchFn = async (url, opties = {}) => {
    aanroepen.push({ url, methode: opties.method ?? 'GET' });
    if (offline) throw new TypeError('Failed to fetch');
    if (opties.headers?.Authorization !== 'Bearer goed') return antwoord(401);
    const [, repo, pad] = url.match(/repos\/ik\/([^/]+)\/contents\/([^?]+)/);
    if (repo === 'bestaat-niet') return antwoord(404);
    const sleutel = `${repo}/${decodeURIComponent(pad)}`;
    if ((opties.method ?? 'GET') === 'GET') {
      return bestanden.has(sleutel) ? antwoord(200, bestanden.get(sleutel)) : antwoord(404);
    }
    const body = JSON.parse(opties.body);
    const bestaand = bestanden.get(sleutel);
    if (bestaand && body.sha !== bestaand.sha) return antwoord(409); // verkeerde versie
    bestanden.set(sleutel, { content: body.content, sha: `sha${++teller}` });
    return antwoord(bestaand ? 200 : 201);
  };
  return { fetchFn, bestanden, aanroepen };
}
