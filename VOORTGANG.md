# Voortgang en gemaakte keuzes

Overdrachtsdocument zodat een nieuwe chat direct verder kan. Bijgewerkt: 10 november 2026.

Lees daarnaast: [wensenn.md](wensenn.md) (wensen van de gebruiker), [PLAN.md](PLAN.md) (volledig bouwplan) en [BRONNEN.md](BRONNEN.md) (herkomst van elk cijfer).

## 1. Wat de app is

Persoonlijke CO2e- en waterfootprint-tracker, in het Nederlands. Werkt lokaal, zonder accounts of server.

- **Categorieën:** vervoer (per km), vlees (per kg), kleding (per stuk) en grote aankopen (per stuk).
- **Items:** elk item kan meerdere bronnen hebben. De app toont min, max, gemiddelde en mediaan.
- **Functies:**
  - keuzes vergelijken;
  - loggen met een referentie, plus de besparing als bereik;
  - overzicht per periode, met grafieken;
  - export en import van JSON.
- **Werkt** offline en op elk schermformaat.

## 2. Status

| Stap | Inhoud | Status |
|---|---|---|
| 0 | Projectopzet (Vite, Vitest, git, GitHub) | ✅ klaar |
| 1 | Datamodel, validatie, opslag, startdata met bronnen | ✅ klaar |
| 2 | Rekenlogica + scherm **Items** (bekijken) | ✅ klaar |
| 3 | Items en bronnen **beheren** (formulieren) | ⏭ volgende |
| 4 | Vergelijken (tabel + SVG-grafiek met bereik) | open |
| 5 | Loggen met referentie en besparing, scherm Logboek, scherm Instellingen | open |
| 6 | Overzicht per week, maand en jaar, met grafieken | open |
| 7 | Export/import JSON, PWA (manifest + service worker), README | open |

- **Laatste commits:** `194e998` (scherm Items) en `f9c81f8` (rekenlogica). Beide zijn gepusht naar `origin/main`.
- **Tests:** 48 tests slagen (`npm test`) en `npm run build` werkt.

## 3. Werkafspraken met de gebruiker

- **De gebruiker kent Python en R, maar geen JavaScript.** Houd de code simpel, zet korte Nederlandse uitleg in commentaar en leg nieuwe JS-concepten kort uit, met een vergelijking met Python of R waar dat helpt.
- **Na elke stap** laten zien wat werkt en wat de volgende stap is. Pas verder na een akkoord van de gebruiker.
- **Test de rekenlogica na elke stap.** Pure functies krijgen unit-tests. Schermen krijgen een rooktest met happy-dom (`// @vitest-environment happy-dom`).
- **Git:** kleine commits met Nederlandse berichten, gepusht naar https://github.com/MvU0/footprint-tracker.git.
  - Identiteit (alleen lokale repo-config): `Mees van Uden` / `164372187+MvU0@users.noreply.github.com`. Het no-reply-adres is bewust gekozen voor privacy.
  - Commits eindigen met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Verzin geen cijfers.** Elke waarde heeft een bron en een status. Leg niet-gecontroleerde waarden vast in BRONNEN.md.
- **Nederlandse bronnen gaan voor** (expliciete feedback van de gebruiker). Een buitenlandse bron (OWID, ADEME) alleen als er geen Nederlandse is, of als tweede bron.

## 4. Technische keuzes

- **Stack:** Node.js + Vite 8 + Vitest 5 + happy-dom. Plain JS (ES-modules), HTML en CSS, zonder framework.
- **Hash-routing** (`#/items`, `#/vergelijk`, ...): zie [src/routes.js](src/routes.js) en [src/main.js](src/main.js).
  - `main.js` geeft elk scherm een `app`-object mee: `{ data, bewaar(), herteken() }`.
  - Schermen die nog niet af zijn, tonen een placeholder. Een nieuw scherm voeg je toe aan `SCHERMEN` in main.js.
- **Opslag:** alles staat in één object in localStorage, onder de sleutel `footprint-tracker:v1` (zie [src/lib/opslag.js](src/lib/opslag.js)). Bij ontbrekende of corrupte data valt de app terug op de startdata.
- **Structuur:**
  - Pure rekenfuncties staan in `src/lib/` en zijn goed testbaar.
  - Schermen staan in `src/views/`.
  - HTML-hulpjes staan in `src/ui/html.js`. Gebruik `esc()` voor alle tekst, en `link()` laat alleen http/https-links toe.
- **Uitstoot wordt nooit opgeslagen.** De app berekent die altijd opnieuw uit de bronnen.
- **Eenheden:** kg CO2e en liters. Grote totalen worden ton en m³ (vanaf 1000). Getallen krijgen nl-NL-opmaak (zie [src/lib/format.js](src/lib/format.js)).

### Omgeving (Windows)

- Node v26 en npm 11 staan in `C:\Program Files\nodejs`.
- **Bash-tool van Claude:** het PATH is verouderd. Begin commando's met `export PATH="/c/Program Files/nodejs:$PATH"`.
- **Terminal van de gebruiker:** als `npm` niet herkend wordt, VS Code helemaal herstarten of het PATH verversen:
  `$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")`
- `.gitattributes` zet LF-regeleindes.
- De map `.claude/` is niet getrackt. Hij is nog niet gecommit en staat nog niet in .gitignore; vraag de gebruiker wat ermee moet.

## 5. Datamodel (kort)

Zie PLAN.md voor de volledige beschrijving. De validatie staat in [src/lib/validatie.js](src/lib/validatie.js).

- **Hoofdobject:** `{ schemaVersie: 1, categorieen, items, instellingen: { standaardReferentie: {categorie: itemId} }, logboek: [] }`
- **Item:** `id, naam, categorie, eenheid, uitleg, alternatieven[], scopeKeuze, standaardReferentie, bronnen[]`
- **Mix-item:** `type: "mix"`, `mix: [{item, aandeel}]` en `mixBron`. Een mix bevat geen andere mixen, en alle onderdelen hebben dezelfde eenheid.
- **Bron:** `co2e_kg, water_l, eenheid?, bron, link, jaar, scope, notitie, actief, status`
- **Statussen:** `gecontroleerd`, `afgeleid`, `aanname`, `niet gecontroleerd` en `nog te onderzoeken`. Een bron met `co2e_kg: null` moet de status `nog te onderzoeken` hebben.

## 6. Rekenregels (vastgelegd en getest)

- **Welke bronnen tellen mee:** een bron telt mee als hij actief is, een waarde heeft, dezelfde eenheid heeft als het item en (als `scopeKeuze` gezet is) die scope heeft.
- **Bereik:**
  - 1 bron: "geen bereik".
  - 2 of meer bronnen: laag tot hoog, met het gemiddelde.
  - Meer dan 3 bronnen: ook de mediaan.
- **Scopewaarschuwing:** als de meetellende bronnen verschillende scopes hebben en er geen scope gekozen is.
  - Etenswaren staan standaard op de RIVM-scope (`scopeKeuze`). De gebruiker kan in de UI wisselen.
  - Reden: rundvlees uit RIVM (19,8) en OWID (99,5 / 33,3) samen middelen mengt twee methodes.
- **Mix:** een gewogen gemiddelde, apart berekend voor laag, gemiddeld en hoog.
  - Een onderdeel met aandeel `null` wordt overgeslagen en gemeld.
  - Een onderdeel zonder waarde maakt de hele mix onberekenbaar.
  - Water telt alleen mee als alle meetellende onderdelen water hebben.
- **Ontbrekend water telt nooit als 0.** De app toont dan "geen gegevens".
- **Besparing (gepland, stap 5):** referentie − werkelijk, steeds op dezelfde basis (laag−laag, gemiddeld−gemiddeld, hoog−hoog). Het bereik loopt van het kleinste naar het grootste van die drie verschillen.

## 7. Keuzes van de gebruiker

- **Referentie = de "gemiddelde persoon".**
  - Vervoer: `vervoer-mix`, de NL-vervoersmix volgens CBS ODiN 2024. Uitkomst ≈ 0,108 kg/km.
  - Vlees: `vlees-mix`, consumptie volgens WUR 2024 (rund/varken/kip). Uitkomst ≈ 9,16 kg/kg.
  - Vis zit nog niet in de vleesmix (open punt).
  - Kleding en aankopen hebben geen mix. Daar is de referentie per item de nieuwe variant (`standaardReferentie` op het item, bv. tweedehands → nieuw).
- **Water is optioneel**, alleen waar een bron het geeft.
- **Eenheden:** kg CO2e en liters.

## 8. Bronkeuzes (details in BRONNEN.md)

- **Vervoer:** co2emissiefactoren.nl (2026).
  - De well-to-wheel-waarden (WTW) tellen mee; tank-to-wheel (TTW) staat erin, maar uitgeschakeld.
  - Autofactoren gelden per voertuigkm. Daarom staat een passagier in de mix op 0 (een aanname), zodat de totale uitstoot gedeeld door de totale personenkm klopt.
- **Vlees en eiwit:** RIVM 2024 (tot en met retail; water = blauw water) als hoofdbron. OWID (mondiaal) staat erbij als tweede scope.
- **Kleding:** ADEME (nieuw).
  - Tweedehands is afgeleid met de vervangingsfactor van Milieu Centraal (0,5; varianten 0,75 / 0,36).
- **Elektronica:** ADEME (nieuw).
  - Refurbished is afgeleid met de besparingspercentages van Milieu Centraal.
- **De afgeleide waarden** hebben de status `afgeleid` en een notitie met de berekening.
- **Hulpscripts** (exceljs, pdfjs-dist) stonden in de scratchpad van de vorige sessie en zijn niet bewaard. Installeer ze opnieuw in een scratchpad als je een xlsx of pdf moet lezen.

## 9. Bekende aandachtspunten

- Zodra de gebruiker iets wijzigt, staat de data in localStorage. **Latere wijzigingen in `startdata.json` bereiken die data dan niet.** De knop "terug naar startdata" (`terugNaarStartdata()` in opslag.js bestaat al en bewaart het logboek) moet nog in het scherm Instellingen komen.
- **Checklist in BRONNEN.md, "Nog te onderzoeken":** vis in de mix, levenscyclus van de fiets, niet-CO2-effecten van vliegen, linzen droog of gekookt, meer kledingbronnen, een tweede bron voor refurbished laptops, en water voor kleding en elektronica.

## 10. Volgende stap: stap 3, beheren

Volgens PLAN.md:

- **Items:** toevoegen, bewerken, aan/uit zetten en verwijderen.
- **Bronnen per item:** toevoegen, bewerken, aan/uit zetten en verwijderen, inclusief status, scope, link en notitie.
- **Mix-items:** samenstellen (onderdelen en aandelen kiezen).
- **Categorie:** toevoegen.
- **Verwijderen met bevestiging** als het item in een mix, in het logboek of als (standaard)referentie gebruikt wordt.
- **Validatie** met `valideerCatalogus()` vóór het opslaan. Toon fouten in het Nederlands.
- **Tests:** unit-tests voor de bewerkfuncties (puur, in `src/lib/`) en een happy-dom-rooktest voor de formulieren.
