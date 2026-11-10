# Plan: CO2e- en waterfootprint-tracker

Gebaseerd op [wensenn.md](wensenn.md) en je antwoorden:
- **Techniek:** Node.js + Vite, gewone JavaScript/HTML/CSS (geen framework), Vitest voor tests.
- **Referentie:** een *gemiddelde mix* van wat een persoon gemiddeld doet (bv. vlees = mix van rund/kip/varken/vis), niet één vaste keuze.
- **Water:** optioneel, alleen waar bronnen het hebben.
- **Eenheden:** kg CO2e en liters; grote totalen automatisch als ton CO2e / m³ water.

---

## 1. Architectuur in het kort

| Onderdeel | Keuze | Waarom |
|---|---|---|
| Bouwhulpmiddel | Vite | Snelle dev-server, kan JSON direct importeren, bouwt naar een map met losse statische bestanden. |
| UI | Gewone JS-modules, één pagina met tabbladen (hash-routing: `#/items`, `#/vergelijk`, …) | Geen framework nodig: de schermen zijn formulieren en lijsten. |
| Grafieken | Eigen SVG (staafjes met bereik-"snorharen") | Geen extra bibliotheek, werkt offline, laat bereik goed zien. |
| Opslag | `localStorage` (catalogus, logboek, instellingen) + export/import naar één JSON-bestand | Lokaal, geen server. Export is je back-up. |
| Offline | Service worker + manifest (PWA) | App blijft werken zonder internet en kan als snelkoppeling op je telefoon. |
| Tests | Vitest | Rekenregels (statistiek, mix, besparing, periodes) los testen met kleine, narekenbare voorbeelden. |

**Belangrijk principe:** alle rekenlogica zit in kleine, "pure" functies in `src/lib/` (geen schermcode). Die zijn makkelijk te testen en te lezen — vergelijkbaar met losse functies in Python/R.

### Mappenstructuur

```
EmissieApp/
├─ index.html
├─ package.json
├─ README.md
├─ public/
│  ├─ manifest.webmanifest
│  └─ sw.js                    # service worker (offline)
├─ src/
│  ├─ main.js                  # start app, routing tussen schermen
│  ├─ style.css
│  ├─ data/startdata.json      # startcatalogus: items + bronnen + mixen
│  ├─ lib/                     # rekenlogica, zonder UI
│  │  ├─ statistiek.js         # min, max, gemiddelde, mediaan, samenvatting
│  │  ├─ waarschuwingen.js     # verschillende eenheden/scopes
│  │  ├─ mix.js                # waarde van een mix-referentie
│  │  ├─ besparing.js          # uitstoot en besparing per logregel
│  │  ├─ periodes.js           # groeperen per week/maand/jaar
│  │  ├─ opslag.js             # localStorage lezen/schrijven
│  │  ├─ exportImport.js       # export/import + validatie
│  │  └─ format.js             # "3 tot 11 kg CO2e", ton/m³-omrekening
│  ├─ views/                   # één bestand per scherm
│  │  ├─ items.js  itemFormulier.js  vergelijk.js
│  │  ├─ loggen.js  logboek.js  overzicht.js  instellingen.js
│  └─ ui/grafiek.js            # SVG-staafdiagram met bereik
└─ tests/                      # *.test.js per lib-bestand
```

---

## 2. Datamodel

Uitbreiding op het voorbeeld uit wensenn.md §8 (bestaande velden blijven gelijk).

### Categorie
```json
{ "id": "vlees", "naam": "Vlees eten", "standaardEenheid": "kg" }
```
Categorieën staan in de data, niet in de code → later "energie thuis" toevoegen = alleen data.

### Item
```json
{
  "id": "rundvlees", "naam": "Rundvlees", "categorie": "vlees", "eenheid": "kg",
  "uitleg": "Korte uitleg…",
  "alternatieven": ["kip", "varkensvlees", "linzen"],
  "scopeKeuze": null,
  "bronnen": [ … ]
}
```
- `alternatieven`: suggesties voor het vergelijkscherm.
- `scopeKeuze`: als bronnen verschillende scopes hebben, kies je hier welke scope-groep meetelt (zie wensenn.md §5.3).

### Bron
Zoals §8 in wensenn.md, plus:
- `eenheid` (optioneel): alleen invullen als de bron een andere eenheid gebruikt dan het item (bv. "portie"). Dat geeft een waarschuwing.
- `status`: `"gecontroleerd"` | `"afgeleid"` | `"aanname"` | `"niet gecontroleerd"` | `"nog te onderzoeken"`. Zo zie je in de app welke cijfers bij de bron zijn nagekeken. Uitleg per status en alle bronnen: [BRONNEN.md](BRONNEN.md).
- Nederlandse bronnen gaan voor; buitenlandse bronnen alleen als er geen Nederlandse is, of als tweede bron.
- `gassen` (optioneel): `{ "co2": …, "ch4": …, "n2o": … }` in kg CO2e, alleen als de bron dit uitsplitst.

### Mix-item (nieuw, voor jouw "gemiddelde persoon"-referentie)
Een item zonder eigen bronnen, opgebouwd uit andere items met gewichten:
```json
{
  "id": "vlees-gemiddeld", "naam": "Gemiddelde vleesmix (NL)", "categorie": "vlees",
  "eenheid": "kg", "type": "mix",
  "mix": [
    { "item": "rundvlees",    "aandeel": null },
    { "item": "kip",          "aandeel": null },
    { "item": "varkensvlees", "aandeel": null },
    { "item": "vis",          "aandeel": null }
  ],
  "mixBron": { "bron": "nog te onderzoeken", "link": null, "jaar": null, "status": "nog te onderzoeken" }
}
```
- Waarde = gewogen som van de onderdelen: `laag = Σ aandeel × laag_i`, idem voor gemiddeld en hoog. Aandelen worden genormaliseerd naar totaal 1.
- De verhoudingen haal ik uit een bron over Nederlands consumptiegedrag (bv. Wageningen/RIVM voor vlees, CBS voor vervoer). Kan ik dat niet goed onderbouwen, dan blijft `aandeel` leeg en vul jij het in. Je kunt de verhoudingen altijd zelf aanpassen.
- **Voorstel standaardreferenties** (aanpasbaar in Instellingen):
  - Vlees: *gemiddelde vleesmix* (rund/kip/varken/vis)
  - Vervoer: *gemiddelde vervoersmix per km* (auto/OV/fiets, volgens CBS-verplaatsingsdata)
  - Kleding: *nieuw* van hetzelfde type (t-shirt nieuw vs tweedehands)
  - Grote aankopen: *nieuw* van hetzelfde type (laptop nieuw vs refurbished)
  - Bij kleding/aankopen heeft een mix weinig zin: je vergelijkt een spijkerbroek met een spijkerbroek. Daar is de referentie per item "de nieuwe variant van dit item".

### Logregel
```json
{
  "id": "uuid", "datum": "2026-11-10", "item": "kip", "hoeveelheid": 0.15,
  "basis": "gemiddeld",
  "referentie": null,
  "notitie": ""
}
```
- `basis`: `gemiddeld` | `laag` | `hoog`.
- `referentie`: `null` = standaard van de categorie, anders een item-id.
- Uitstoot wordt **niet** opgeslagen maar steeds opnieuw berekend. Pas je later een bron aan, dan klopt het logboek meteen. Nadeel: oude logregels veranderen mee. Dat staat in de README.

### Instellingen
`{ "standaardReferentie": { "vlees": "vlees-gemiddeld", … }, "schemaVersie": 1 }`

---

## 3. Rekenregels (precies vastgelegd, zodat je ze kunt narekenen)

**Statistiek per item** (alleen actieve bronnen, binnen de gekozen scope-groep):

| Aantal bronnen | Wat de app toont |
|---|---|
| 0 | "geen bronnen" |
| 1 | de waarde + "1 bron, geen bereik" |
| 2–3 | bereik vooraan ("3 tot 11 kg CO2e, 3 bronnen"), gemiddelde klein erbij, geen mediaan |
| meer dan 3 | bereik + gemiddelde + mediaan |

- Mediaan bij een even aantal = gemiddelde van de twee middelste waarden.
- Water: dezelfde statistiek over alleen de bronnen mét waterwaarde, met het aantal apart erbij ("water: 2 van 4 bronnen").

**Uitstoot van een logregel** = hoeveelheid × waarde(basis).

**Besparing** = referentie − werkelijk. Steeds wordt dezelfde basis vergeleken (laag met laag, gemiddeld met gemiddeld, hoog met hoog).
- Het getal dat meetelt in totalen hoort bij de basis die je bij de logregel kiest (standaard gemiddeld).
- Het **bereik** dat getoond wordt loopt van de laagste tot de hoogste van die drie verschillen: "tussen 12 en 40 kg bespaard".
- Negatieve besparing (je keuze was slechter dan de referentie) wordt getoond als "extra uitstoot", niet weggepoetst.
- Water: alleen als zowel het item als de referentie waterdata hebben, anders "geen waterdata". Ontbrekend water telt **niet** als 0 mee. Het overzicht toont hoeveel logregels geen waterdata hebben.

**Waarschuwingen:**
- Bronnen met verschillende eenheden geven een oranje melding met een voorstel om ze te groeperen of uit te zetten. Bronnen met een afwijkende eenheid tellen standaard niet mee in de statistiek.
- Meer dan één verschillende scope geeft een melding en een keuzelijst "welke scope-groep telt mee" (of "alle, ik accepteer het verschil").
- Overal in de app staat de vaste regel: *"Alle cijfers zijn schattingen."*

**Periodes:** week = ISO-week (ma–zo), maand en jaar, volgens de lokale datum.

---

## 4. Bouwstappen

Dit volgt jouw volgorde uit wensenn.md §10, met een stap 0 ervoor. Na elke stap draai ik de tests, laat ik zien wat werkt en wat de volgende stap is, en maak ik een of meer kleine git-commits.

### Stap 0: Voorbereiding (jij + ik)
- **Jij:** Node.js LTS installeren (`winget install OpenJS.NodeJS.LTS` of via nodejs.org) en daarna VS Code / de terminal herstarten. Ik controleer met `node --version`.
- **Ik:** `git init`, `.gitignore`, een Vite-project (vanilla JS-template) en Vitest. Ik ruim het op tot een lege app met tabbladen.
- *Commit:* "Projectopzet met Vite en Vitest"

### Stap 1: Datamodel en startdata
- `startdata.json` met categorieën en een eerste set items. Voorstel:
  - Vervoer: benzineauto, elektrische auto, trein, bus, fiets, vliegtuig (kort/lang), plus vervoersmix
  - Vlees: rund, kip, varken, vis, linzen/peulvruchten, tofu, plus vleesmix
  - Kleding: t-shirt, spijkerbroek, jas (elk nieuw + tweedehands)
  - Grote aankopen: smartphone, laptop (elk nieuw + refurbished)
- **Bronnenonderzoek:** ik haal cijfers bij co2emissiefactoren.nl, Our World in Data (Poore & Nemecek), ADEME en, voor kleding, meerdere bronnen. Elke waarde krijgt bron, link, jaar, scope en `status`.
  - Wat ik niet kan controleren, markeer ik. Wat ik niet kan vinden, laat ik leeg. **Ik verzin geen getallen.**
  - Je krijgt een lijst van wat gecontroleerd is en wat niet.
- `opslag.js`: bij de eerste start wordt de startdata naar localStorage gekopieerd. Daarna is localStorage leidend. In Instellingen komt een knop "terug naar startdata".
- Tests: de data voldoet aan het schema (elk item heeft een geldige categorie, elke mix verwijst naar bestaande items, enzovoort).

### Stap 2: Items en bronnen bekijken
- `statistiek.js`, `waarschuwingen.js`, `mix.js` en `format.js`, met tests.
- Scherm **Items**: een lijst per categorie. Elk item krijgt een kaart met:
  - bereik, gemiddelde en mediaan volgens de regels in §3;
  - water, uitleg en waarschuwingen;
  - een uitklapbare bronnenlijst met links en statuslabel;
  - optioneel de uitsplitsing per gas.
- Testvoorbeelden om zelf na te rekenen:
  - bronnen [3, 7, 11] → laag 3, hoog 11, gem 7, geen mediaan;
  - [2, 4, 6, 100] → mediaan 5, gem 28;
  - mix 50% × 10 + 50% × 2 = 6.

### Stap 3: Items en bronnen beheren
- Formulieren voor:
  - items toevoegen, aanpassen en verwijderen;
  - bronnen toevoegen, aanpassen, aan/uit zetten en verwijderen;
  - mix-items samenstellen;
  - categorieën toevoegen.
- Foutmeldingen in gewone taal, bijvoorbeeld "CO2e moet een getal ≥ 0 zijn".
- Een item dat in het logboek of in een mix gebruikt wordt, verwijder je niet zomaar. De app vraagt eerst om bevestiging en laat zien waar het gebruikt wordt.

### Stap 4: Vergelijken
- Je kiest een categorie, een hoeveelheid en twee of meer items. De `alternatieven` van een item staan alvast geselecteerd.
- Tabel + SVG-staafdiagram met bereik-snorharen, voor CO2e en water.
- Voorbeeld: 40 km auto / trein / fiets, of 0,15 kg rund / kip / linzen.

### Stap 5: Loggen met referentie
- `besparing.js`, met tests. Voorbeeld: referentie 10 kg CO2e/kg, keuze 2 kg CO2e/kg, hoeveelheid 0,5 kg → besparing 4 kg. Ook een test voor het bereik met laag/hoog.
- Scherm **Loggen**:
  - velden: item, hoeveelheid, datum (standaard vandaag), basis (gemiddeld/laag/hoog) en referentie (standaard uit Instellingen, aanpasbaar);
  - je ziet direct "uitgestoten X, bespaard tussen A en B".
- Scherm **Instellingen**: standaardreferentie per categorie.
- Scherm **Logboek**: een lijst van logregels die je kunt aanpassen, verwijderen en filteren op categorie.

### Stap 6: Overzicht met grafieken
- Het Overzicht wordt de **startpagina** van de app (eerste tabblad, met Items ernaast). Zet daarvoor `STARTSCHERM` in `src/routes.js` op `'overzicht'`.
- `periodes.js`, met tests rond de jaarwisseling en ISO-week 53.
- Het overzicht toont:
  - totaal uitgestoten en totaal bespaard (CO2e en water, met bereik);
  - een uitsplitsing per categorie;
  - een periodekeuze (week, maand, jaar);
  - een staafdiagram over de tijd;
  - een melding hoeveel regels geen waterdata hebben.

### Stap 7: Export, import en offline
- Export: één JSON-bestand `emissieapp-backup-JJJJ-MM-DD.json` met catalogus, logboek, instellingen en schemaVersie.
- Import:
  1. De app controleert het bestand en toont een samenvatting ("12 items, 87 logregels").
  2. Je kiest tussen **vervangen** en **samenvoegen**.
  3. Vóór het importeren maakt de app automatisch een export van je huidige data.
- PWA: manifest + service worker. De app werkt dan offline en kan op het beginscherm van je telefoon.
- README afronden met:
  - starten: `npm install`, `npm run dev`, `npm test`;
  - de datastructuur;
  - bronnen toevoegen, via de app én via `startdata.json`;
  - back-ups maken.

### Daarna (optioneel)
- **Op je telefoon:** de gebouwde app (`npm run build`) gratis als statische site neerzetten, bijvoorbeeld via GitHub Pages.
  - Online staat dan alleen de code. Je data blijft in de browser van je telefoon.
  - Telefoon en computer hebben elk hun eigen data. Overzetten doe je met export/import.

---

## 5. Risico's en aandachtspunten

- **localStorage kan gewist worden**, bijvoorbeeld als je browserdata wist of een privévenster gebruikt. Daarom staat de exportknop goed zichtbaar, en herinnert de app je als je 30 dagen geen back-up hebt gemaakt.
- **Bronwaarden veranderen**, want co2emissiefactoren.nl wordt jaarlijks bijgewerkt. Het jaartal per bron laat zien hoe oud een cijfer is.
- **Mix-verhoudingen zijn lastig goed te onderbouwen.** Vind ik geen betrouwbare bron, dan blijven ze leeg en vul jij ze in.
- **Eenheid "portie" bij vlees:** voorstel is om intern in kg te rekenen en "portie" alleen als invoerhulp te gebruiken. 1 portie = een instelbaar aantal gram. Dat blijft leeg tot jij het invult of een bron het geeft.

## 6. Verificatie

- `npm test`: alle rekenregels, met handmatig narekenbare voorbeelden (die staan als commentaar in de tests).
- `npm run dev`: na elke stap handmatig doorlopen in de browser, op desktop en in de telefoonweergave (DevTools).
- Stap 7:
  1. Exporteren.
  2. localStorage wissen.
  3. Importeren en controleren dat alles terug is.
- Offline-test: `npm run build && npm run preview`, netwerk uit in DevTools en herladen.
