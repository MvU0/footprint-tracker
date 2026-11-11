// Scherm "Instellingen":
// - standaardreferentie per categorie;
// - back-up: exporteren naar een bestand en importeren (vervangen of samenvoegen);
// - GitHub: items naar de openbare app-repository, logboek naar een privé-repository (met knoppen);
// - terug naar startdata.

import { terugNaarStartdata } from '../lib/opslag.js';
import { maakExport, leesImport, voegSamen, dagenSindsBackup } from '../lib/exportImport.js';
import { laadGitHub, bewaarGitHub, slaItemsOp, slaLogboekOp, haalLogboekOp } from '../lib/github.js';
import { esc, herstelKeuzes } from '../ui/html.js';

let melding = ''; // groene/grijze melding bovenaan
let fouten = []; // rode meldingen bovenaan
let importVoorstel = null; // { data, samenvatting } na het kiezen van een bestand
let bezig = false; // GitHub-verzoek loopt

function vandaag() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Een tekst als bestand laten downloaden.
function download(bestandsnaam, tekst) {
  const url = URL.createObjectURL(new Blob([tekst], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = bestandsnaam;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Export maken en de datum van de laatste back-up onthouden.
function exporteer(app) {
  const { bestandsnaam, tekst } = maakExport(app.data, vandaag());
  download(bestandsnaam, tekst);
  app.data.laatsteBackup = vandaag();
  app.bewaar();
  return bestandsnaam;
}

const toon = (app, nieuweMelding, nieuweFouten = []) => {
  melding = nieuweMelding;
  fouten = nieuweFouten;
  app.herteken();
};

export function toonInstellingen(el, app) {
  const { data } = app;
  const refs = data.instellingen?.standaardReferentie ?? {};
  const gh = laadGitHub();
  const dagen = dagenSindsBackup(data, vandaag());

  const refRijen = data.categorieen
    .map((c) => {
      const opties = [
        `<option value="">(geen)</option>`,
        ...data.items
          .filter((i) => i.categorie === c.id)
          .map((i) => `<option value="${esc(i.id)}" ${i.id === refs[c.id] ? 'selected' : ''}>${esc(i.naam)}</option>`),
      ].join('');
      return `<label class="veld"><span>${esc(c.naam)}</span><select name="ref-${esc(c.id)}" data-categorie="${esc(c.id)}">${opties}</select></label>`;
    })
    .join('');

  const voorstel = importVoorstel
    ? `<div class="melding info">
        <p><strong>Gevonden in het bestand:</strong> ${importVoorstel.samenvatting.items} items,
          ${importVoorstel.samenvatting.categorieen} categorieën, ${importVoorstel.samenvatting.logregels} logregels.</p>
        <p>Vóór het importeren wordt automatisch een export van je huidige data gemaakt.</p>
        <div class="knoppen">
          <button type="button" class="knop" data-actie="import-vervang">Vervangen (alles uit het bestand)</button>
          <button type="button" class="knop" data-actie="import-samen">Samenvoegen (bij hetzelfde id wint het bestand)</button>
          <button type="button" class="knop" data-actie="import-annuleer">Annuleren</button>
        </div>
      </div>`
    : '';

  el.innerHTML = `
    <h2>Instellingen</h2>
    ${melding ? `<div class="melding info">${esc(melding)}</div>` : ''}
    ${fouten.length ? `<div class="melding waarschuwing"><ul>${fouten.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>` : ''}
    <section class="formulier">
      <fieldset>
        <legend>Standaardreferentie per categorie</legend>
        <p class="hulp">Waarmee je keuze vergeleken wordt als je logt. Heeft een item een eigen
          standaardreferentie (zoals tweedehands → nieuw), dan gaat die voor. Bij elke logregel kun je ook zelf een andere kiezen.</p>
        <div class="rij">${refRijen}</div>
      </fieldset>

      <fieldset>
        <legend>Back-up (bestand)</legend>
        <p class="hulp">Je data staat alleen in deze browser. Wis je je browserdata ("cookies en sitegegevens"), dan is ze weg.
          Maak daarom af en toe een export. ${dagen === null ? 'Je hebt nog geen back-up gemaakt.' : `Laatste back-up: ${dagen === 0 ? 'vandaag' : `${dagen} dag(en) geleden`}.`}</p>
        <div class="knoppen">
          <button type="button" class="knop hoofd" data-actie="exporteer">Exporteer alles</button>
          <label class="knop">Importeer een bestand… <input type="file" accept=".json,application/json" hidden></label>
        </div>
        ${voorstel}
      </fieldset>

      <fieldset>
        <legend>GitHub</legend>
        <p class="hulp"><strong>Items</strong> gaan naar je <em>openbare</em> app-repository en worden daar de nieuwe startdata
          (iedereen kan ze zien). Je <strong>logboek</strong> gaat naar een <em>privé</em>-repository. Allebei alleen als je op de knop drukt.</p>
        <form data-form="github" class="formulier" novalidate>
          <div class="rij">
            <label class="veld"><span>GitHub-gebruikersnaam</span><input name="gh-eigenaar" value="${esc(gh.eigenaar ?? '')}" autocomplete="off"></label>
            <label class="veld"><span>Token</span><input name="gh-token" type="password" autocomplete="off"
              placeholder="${gh.token ? 'opgeslagen; laat leeg om te houden' : 'github_pat_…'}"></label>
          </div>
          <div class="rij">
            <label class="veld"><span>Openbare app-repository (items)</span><input name="gh-coderepo" value="${esc(gh.codeRepo ?? 'footprint-tracker')}"></label>
            <label class="veld"><span>Privé-repository (logboek)</span><input name="gh-datarepo" value="${esc(gh.dataRepo ?? 'footprint-data')}"></label>
          </div>
          <div class="knoppen"><button type="submit" class="knop">GitHub-gegevens opslaan</button></div>
        </form>
        <details>
          <summary>Hoe maak ik een token?</summary>
          <ol class="hulp">
            <li>Maak op GitHub eerst de privé-repository aan (bv. <code>footprint-data</code>, zet hem op <em>Private</em>).</li>
            <li>Ga naar github.com → je profielfoto → Settings → Developer settings → Personal access tokens → <em>Fine-grained tokens</em> → Generate new token.</li>
            <li>Repository access: <em>Only select repositories</em> → kies je app-repository en je privé-repository.</li>
            <li>Permissions → Repository permissions → <em>Contents: Read and write</em>. Verder niets.</li>
            <li>Kies een vervaldatum (bv. 1 jaar), maak het token en plak het hierboven. Bewaar het ook in je wachtwoordmanager:
              na het wissen van je browserdata moet je het opnieuw invullen.</li>
          </ol>
          <p class="hulp">Het token staat alleen in deze browser, apart van je data, en komt nooit in een export.</p>
        </details>
        <div class="knoppen">
          <button type="button" class="knop" data-actie="gh-logboek" ${bezig ? 'disabled' : ''}>Logboek opslaan op GitHub</button>
          <button type="button" class="knop" data-actie="gh-herstel" ${bezig ? 'disabled' : ''}>Logboek herstellen van GitHub</button>
          <button type="button" class="knop" data-actie="gh-items" ${bezig ? 'disabled' : ''}>Items opslaan in de app-repository</button>
        </div>
        ${bezig ? '<p class="hulp">Bezig met GitHub…</p>' : ''}
      </fieldset>

      <fieldset>
        <legend>Terug naar startdata</legend>
        <p class="hulp">Zet de items uit de startdata terug zoals ze in de app zaten (bv. na een update van de bronnen).
          Je eigen items en categorieën, je instellingen en je logboek blijven bewaard.</p>
        <button type="button" class="knop gevaar" data-actie="startdata">Terug naar startdata</button>
      </fieldset>
    </section>`;
  herstelKeuzes(el);

  // ---------- Standaardreferenties ----------
  el.querySelectorAll('select[data-categorie]').forEach((select) =>
    select.addEventListener('change', () => {
      app.data.instellingen ??= { standaardReferentie: {} };
      app.data.instellingen.standaardReferentie[select.dataset.categorie] = select.value || null;
      app.bewaar();
      toon(app, '');
    }),
  );

  // ---------- Back-up ----------
  el.querySelector('[data-actie="exporteer"]').addEventListener('click', () => {
    const naam = exporteer(app);
    toon(app, `Export gemaakt: ${naam} (staat in je Downloads-map).`);
  });

  el.querySelector('input[type="file"]').addEventListener('change', async (e) => {
    const bestand = e.target.files?.[0];
    if (!bestand) return;
    const resultaat = leesImport(await bestand.text());
    importVoorstel = resultaat.data ? resultaat : null;
    toon(app, '', resultaat.fouten.length ? ['Dit bestand kan niet worden geïmporteerd:', ...resultaat.fouten] : []);
  });

  const importeer = (samenvoegen) => {
    const naam = exporteer(app); // eerst een back-up van wat er nu is
    const resultaat = samenvoegen ? voegSamen(app.data, importVoorstel.data) : { data: importVoorstel.data, fouten: [] };
    if (resultaat.fouten.length) return toon(app, '', resultaat.fouten);
    app.data = { ...resultaat.data, laatsteBackup: vandaag() };
    app.bewaar();
    importVoorstel = null;
    toon(app, `Geïmporteerd (${samenvoegen ? 'samengevoegd' : 'vervangen'}). Je vorige data staat in ${naam}.`);
  };
  el.querySelector('[data-actie="import-vervang"]')?.addEventListener('click', () => importeer(false));
  el.querySelector('[data-actie="import-samen"]')?.addEventListener('click', () => importeer(true));
  el.querySelector('[data-actie="import-annuleer"]')?.addEventListener('click', () => { importVoorstel = null; toon(app, ''); });

  // ---------- GitHub ----------
  el.querySelector('form[data-form="github"]').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (naam) => el.querySelector(`[name="${naam}"]`).value.trim();
    bewaarGitHub({
      eigenaar: v('gh-eigenaar'),
      token: v('gh-token') || gh.token || '',
      codeRepo: v('gh-coderepo'),
      dataRepo: v('gh-datarepo'),
    });
    toon(app, 'GitHub-gegevens opgeslagen (alleen in deze browser).');
  });

  // Een GitHub-actie uitvoeren met "bezig"-melding en nette foutafhandeling.
  const metGitHub = async (actie) => {
    bezig = true;
    toon(app, '');
    try {
      const tekst = await actie(laadGitHub());
      bezig = false;
      toon(app, tekst);
    } catch (fout) {
      bezig = false;
      toon(app, '', [fout.message]);
    }
  };

  el.querySelector('[data-actie="gh-logboek"]').addEventListener('click', () =>
    metGitHub(async (cfg) => {
      await slaLogboekOp(cfg, app.data);
      app.data.laatsteBackup = vandaag();
      app.bewaar();
      return `Logboek opgeslagen op GitHub (${app.data.logboek.length} logregels in ${cfg.eigenaar}/${cfg.dataRepo}).`;
    }),
  );

  el.querySelector('[data-actie="gh-herstel"]').addEventListener('click', () =>
    metGitHub(async (cfg) => {
      const logboek = await haalLogboekOp(cfg);
      if (!logboek) return `Nog geen logboek gevonden in ${cfg.eigenaar}/${cfg.dataRepo}.`;
      const resultaat = voegSamen(app.data, { categorieen: [], items: [], instellingen: {}, logboek });
      if (resultaat.fouten.length) throw new Error(resultaat.fouten.join(' '));
      app.data = resultaat.data;
      app.bewaar();
      const bekend = new Set(app.data.items.map((i) => i.id));
      const onbekend = logboek.filter((r) => !bekend.has(r.item)).length;
      return `${logboek.length} logregels hersteld van GitHub (samengevoegd met wat er al stond).`
        + (onbekend ? ` Let op: ${onbekend} logregel(s) verwijzen naar items die in deze app niet bestaan.` : '');
    }),
  );

  el.querySelector('[data-actie="gh-items"]').addEventListener('click', () => {
    const cfg = laadGitHub();
    const vraag = `Je ${app.data.items.length} items worden de nieuwe startdata in de OPENBARE repository "${cfg.eigenaar ?? '?'}/${cfg.codeRepo ?? '?'}". `
      + 'Iedereen kan ze zien; je logboek gaat niet mee. Doorgaan?';
    if (!confirm(vraag)) return;
    metGitHub(async (c) => {
      await slaItemsOp(c, app.data);
      return `Items opgeslagen in ${c.eigenaar}/${c.codeRepo} (src/data/startdata.json). Haal ze op je computer binnen met "git pull" en draai daarna "npm test".`;
    });
  });

  // ---------- Terug naar startdata ----------
  el.querySelector('[data-actie="startdata"]').addEventListener('click', () => {
    const vraag = 'Items uit de startdata terugzetten? Wijzigingen die je aan die items hebt gemaakt, gaan verloren. '
      + 'Je eigen items, instellingen en logboek blijven bewaard.';
    if (!confirm(vraag)) return;
    app.data = terugNaarStartdata(app.data);
    app.bewaar();
    toon(app, 'De items uit de startdata zijn teruggezet.');
  });
}
