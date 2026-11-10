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
| 3 | Items en bronnen **beheren** (formulieren) | ✅ klaar (akkoord, plus lijstweergave) |
| 4 | Vergelijken (tabel + SVG-grafiek met bereik) | ✅ klaar (akkoord) |
| 5 | Loggen met referentie en besparing, scherm Logboek, scherm Instellingen | ⏭ volgende |
| 6 | Overzicht per week, maand en jaar, met grafieken | open |
| 7 | Export/import JSON, PWA (manifest + service worker), README | open |

- **Laatste commits:** stap 3 (`bca8da1` bewerkfuncties + commit met het formulier), daarvoor `73c6d18` en `b303eae` (review/fact-check). Alles gepusht naar `origin/main`.
- **Stap 3, wat er is:**
  - `src/lib/beheer.js`: `leesGetal` (komma of punt), `maakId`, `slaItemOp`, `waarGebruikt`, `verwijderItem`, `voegCategorieToe`. Puur en getest.
  - `src/views/itemFormulier.js`: formulier voor item of mix, werkt op een concept (kopie); pas bij Opslaan + geslaagde validatie verandert de data. Fouten bovenaan in gewone taal.
  - Scherm Items: knoppen "Nieuw item", "Nieuw mix-item", "Nieuwe categorie" en "Bewerken" per kaart.
  - **Keuzes van de gebruiker:** een item dat in het logboek staat, kan niet worden verwijderd; andere verwijzingen (mix, alternatief, referentie) worden na bevestiging opgeruimd. Items aan/uit zetten is overgeslagen (bronnen kunnen wel aan/uit).
  - **Layout (wens van de gebruiker):** items als **lijst** in plaats van grote kaarten. Elke regel = naam + korte waarde (`fmt.kort`, bv. "3–11 kg CO2e"); klik om uit te klappen (bereik, water, uitleg, bronnen, Bewerken). Open regels blijven open na opnieuw tekenen.
  - **Tabbladen (wens van de gebruiker):** Overzicht eerst, Items ernaast. Overzicht wordt de **startpagina** zodra stap 6 af is; tot dan start de app op Items (`STARTSCHERM` in src/routes.js).
  - **Bewuste beperkingen:** id is niet aan te passen (blijft gelijk na hernoemen); categorie verwijderen/hernoemen kan niet; in het mixformulier betekent een leeg aandeel "doet niet mee"; "1.451" zonder komma wordt 1,451 gelezen.
- **Review en fact-check (10 nov 2026, vóór stap 3):** met de skills ponytail, tdd en fact-checker.
  - Bug opgelost: een bereik over de 1000 (bv. "121 tot 2,71 m³") stond in gemengde eenheden.
  - Alle cijfers opnieuw naast de bronnen gelegd. Alles klopte, behalve de refurbished-percentages: die staan sinds juni 2026 niet meer op de Milieu Centraal-pagina. Die bronnen staan nu op `niet gecontroleerd` (zie BRONNEN.md §7).
- **Stap 4, wat er is:**
  - `src/lib/vergelijk.js`: `vergelijk(data, ids, hoeveelheid, referentieId)` en `verschil(a, b)` (laag−laag, gem−gem, hoog−hoog; herbruikbaar voor de besparing in stap 5).
  - `format.verschilTekst()`: "6,4 kg CO2e minder", "2–14 kg CO2e minder", "1 kg minder tot 2 kg meer".
  - `src/ui/grafiek.js`: `staafGrafiek(rijen, { titel, opmaak })`, liggende staven (gemiddeld) + snorhaar (laag–hoog), groot → klein, hover via `<title>`. Volgens de dataviz-skill; staafkleur `--staaf` gevalideerd (licht `#2f7d4f`, donker `#4fa874`).
  - Scherm Vergelijk: startitem (alternatieven staan aan), items aan/uit (zelfde categorie en eenheid), hoeveelheid, en **zelf kiezen waarmee je vergelijkt** (standaard het startitem; wens van de gebruiker). Tabel + CO2e-grafiek + watergrafiek.
  - De gebruiker hoeft de app **niet per se op de telefoon** te gebruiken; desktop gaat voor.
- **Tests:** 100 tests slagen (`npm test`) en `npm run build` werkt.
- **Visueel controleren:** Edge headless kan schermafbeeldingen maken (`msedge --headless=new --screenshot=... --window-size=...`). Het venster kan niet smaller dan ~500 px; voor telefoonbreedte de app in een iframe van 390 px zetten.

## 3. Werkafspraken met de gebruiker

- **Spreek de gebruiker aan met "je", nooit met "u".**
- **Skills** staan in `.claude/skills/` (gecommit): tdd, ponytail, verification-before-completion, fact-checker, research, grilling. Gebruik ze bij het bouwen.
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
  - Refurbished is afgeleid met de besparingspercentages van Milieu Centraal. Die percentages staan sinds juni 2026 niet meer op de pagina; status `niet gecontroleerd`, nieuwe bron nog te zoeken.
- **De afgeleide waarden** hebben de status `afgeleid` en een notitie met de berekening.
- **Hulpscripts** (exceljs, pdfjs-dist) stonden in de scratchpad van de vorige sessie en zijn niet bewaard. Installeer ze opnieuw in een scratchpad als je een xlsx of pdf moet lezen.

## 9. Bekende aandachtspunten

- Zodra de gebruiker iets wijzigt, staat de data in localStorage. **Latere wijzigingen in `startdata.json` bereiken die data dan niet.** De knop "terug naar startdata" (`terugNaarStartdata()` in opslag.js bestaat al en bewaart het logboek) moet nog in het scherm Instellingen komen.
- **Checklist in BRONNEN.md, "Nog te onderzoeken":** vis in de mix, levenscyclus van de fiets, niet-CO2-effecten van vliegen, linzen droog of gekookt, meer kledingbronnen, een tweede bron voor refurbished laptops, en water voor kleding en elektronica.

## 10. Volgende stap: stap 5, loggen

Volgens PLAN.md:

- `besparing.js` met tests (hergebruik `verschil()` uit vergelijk.js). Voorbeeld: referentie 10 kg CO2e/kg, keuze 2, hoeveelheid 0,5 kg → besparing 4 kg; ook het bereik met laag/hoog.
- Scherm **Loggen**: item, hoeveelheid, datum (standaard vandaag), basis (gemiddeld/laag/hoog), referentie (standaard uit Instellingen of `standaardReferentie` van het item). Direct "uitgestoten X, bespaard tussen A en B".
- Scherm **Logboek**: lijst, aanpassen, verwijderen, filteren op categorie.
- Scherm **Instellingen**: standaardreferentie per categorie + knop "terug naar startdata" (`terugNaarStartdata()` bestaat al).
- Skills: tdd (seams eerst afspreken), ponytail, verification-before-completion.
