# Footprint-tracker

Persoonlijke tracker voor je CO2e-uitstoot en waterverbruik, in het Nederlands. Je logt wat je doet of koopt, en de app laat zien wat dat uitstoot en wat je bespaart ten opzichte van een referentie (bv. "de gemiddelde Nederlander" of "nieuw in plaats van tweedehands").

**Alle cijfers zijn schattingen.** Waar elk cijfer vandaan komt, staat in [BRONNEN.md](BRONNEN.md).

- Werkt in de browser, zonder account of server. Je data blijft op je eigen apparaat.
- Werkt ook offline, en is te installeren als app (PWA).

## Online

De app staat op **https://mvu0.github.io/footprint-tracker/**. Bij elke push naar `main` draait GitHub eerst de tests, en als die slagen zet het de nieuwe versie online (zie [.github/workflows/pages.yml](.github/workflows/pages.yml)). Je data blijft ook daar alleen in je eigen browser.

## Lokaal starten

Je hebt [Node.js](https://nodejs.org) (LTS) nodig.

```bash
npm install        # eenmalig: hulpprogramma's installeren
npm run dev        # app starten tijdens het ontwikkelen → open het adres dat verschijnt
npm test           # alle tests draaien
npm run build      # de app bouwen naar de map dist/
npm run preview    # de gebouwde app bekijken (zo test je ook offline werken)
```

## De schermen

| Tabblad | Wat je er doet |
|---|---|
| **Overzicht** (startpagina) | Totalen per week, maand of jaar: uitgestoten, bespaard, water. Vergelijking met de vorige periode, per categorie en een grafiek over de laatste 12 periodes. |
| **Items** | Alle items met hun waarden en bronnen. Items, bronnen, mixen en categorieën toevoegen, aanpassen en verwijderen. |
| **Vergelijk** | Keuzes naast elkaar voor dezelfde hoeveelheid (bv. 40 km auto, trein en fiets). |
| **Loggen** | Vastleggen wat je gedaan of gekocht hebt; je ziet direct de uitstoot en besparing. |
| **Logboek** | Alles wat je gelogd hebt; aanpassen, verwijderen, filteren. |
| **Instellingen** | Standaardreferenties, back-up (export/import), GitHub, terug naar startdata. |

## Hoe er gerekend wordt

- Een item kan **meerdere bronnen** hebben. De app toont dan het bereik (laagste tot hoogste bron), het gemiddelde en bij meer dan 3 bronnen de mediaan.
- **Besparing** = referentie − jouw keuze, steeds op dezelfde basis (laag met laag, gemiddeld met gemiddeld, hoog met hoog). Negatief = extra uitstoot.
- In je **totalen** telt per logregel de waarde die je bij "Welke waarde telt mee" kiest (standaard het gemiddelde).
- **Ontbrekend water telt nooit als 0**; de app meldt hoeveel regels geen waterdata hebben.
- Uitstoot wordt **niet opgeslagen** maar steeds opnieuw berekend. Pas je een bron aan, dan veranderen oude logregels mee.

De precieze regels staan in [PLAN.md](PLAN.md) §3 en in de tests (`tests/`), met voorbeelden die je zelf kunt narekenen.

## Datastructuur

Alle data staat in één object (in de browser onder de sleutel `footprint-tracker:v1`):

```json
{
  "schemaVersie": 1,
  "categorieen": [{ "id": "vlees", "naam": "Vlees eten", "standaardEenheid": "kg" }],
  "items": [
    {
      "id": "kip", "naam": "Kip", "categorie": "vlees", "eenheid": "kg",
      "uitleg": "…", "alternatieven": ["rundvlees"], "scopeKeuze": null,
      "bronnen": [
        { "co2e_kg": 3.94, "water_l": 47.3, "bron": "RIVM …", "link": "https://…", "jaar": 2024,
          "scope": "Wieg tot supermarkt (NL)", "notitie": "…", "actief": true, "status": "gecontroleerd" }
      ]
    }
  ],
  "instellingen": { "standaardReferentie": { "vlees": "vlees-mix" } },
  "logboek": [
    { "id": "…", "datum": "2026-11-10", "item": "kip", "hoeveelheid": 0.15,
      "basis": "gemiddeld", "referentie": null, "notitie": "" }
  ]
}
```

- Een **mix-item** (bv. de vleesmix) heeft `"type": "mix"`, een lijst `mix: [{ item, aandeel }]` en een `mixBron`.
- `status` van een bron: `gecontroleerd`, `afgeleid`, `aanname`, `niet gecontroleerd` of `nog te onderzoeken`.
- `referentie: null` in een logregel = de standaardreferentie (die van het item, anders die van de categorie).

## Bronnen en items toevoegen

**In de app (aangeraden):** tabblad Items → "Nieuw item", of "Bewerken" bij een item → "+ Bron toevoegen". Getallen mogen met een komma. De app controleert alles vóór het opslaan.

**In de startdata:** [src/data/startdata.json](src/data/startdata.json) is wat de app bevat als je hem voor het eerst opent. Pas je dat bestand aan:

1. Leg de herkomst van nieuwe cijfers vast in [BRONNEN.md](BRONNEN.md).
2. Draai `npm test`: de tests controleren of de startdata klopt.
3. In een browser waar je de app al gebruikt, zie je de wijziging pas na Instellingen → **Terug naar startdata**. Je eigen items, instellingen en logboek blijven daarbij bewaard.

Je kunt je items uit de app ook als nieuwe startdata op GitHub zetten (zie hieronder).

## Back-ups

Je data staat alleen in deze browser. Wis je je browserdata ("cookies en sitegegevens"), dan is ze weg. De app herinnert je eraan als je 30 dagen geen back-up hebt gemaakt.

**Exporteren en importeren** (Instellingen → Back-up):
- *Exporteer alles* downloadt `emissieapp-backup-JJJJ-MM-DD.json` met items, instellingen en logboek.
- *Importeer een bestand* controleert het bestand en laat zien wat erin staat. Daarna kies je:
  - **Vervangen**: alles uit het bestand;
  - **Samenvoegen**: bij hetzelfde id wint het bestand, al het andere blijft.
- Vóór elke import maakt de app automatisch een export van wat er nu staat.

**GitHub** (Instellingen → GitHub), allebei met een knop:
- **Logboek** → een **privé**-repository (bv. `footprint-data`), als `logboek.json`. "Logboek herstellen van GitHub" haalt het terug (samenvoegen).
- **Items** → deze **openbare** app-repository, als nieuwe `src/data/startdata.json`. Iedereen kan die zien; het logboek gaat niet mee. Haal de wijziging daarna binnen met `git pull` en draai `npm test`.
- Je hebt een *fine-grained token* nodig met alleen toegang tot die twee repositories en alleen *Contents: Read and write*. De stappen staan in de app bij "Hoe maak ik een token?".
- Het token staat alleen in je browser (apart van je data) en komt nooit in een export. Bewaar het ook in je wachtwoordmanager.

## Offline en installeren

De gebouwde app (`npm run build`) werkt offline dankzij een service worker ([public/sw.js](public/sw.js)): online haalt hij altijd de nieuwste versie op, offline gebruikt hij de laatst geziene. Dat werkt vanaf de tweede keer dat je de app opent. Tijdens `npm run dev` staat dit uit.

Installeren als app: open de gebouwde app in Chrome of Edge en kies in de adresbalk "App installeren".

## Projectstructuur

```
src/
  main.js            start van de app, tabbladen (hash-routing: #/items, #/loggen, …)
  routes.js          lijst met tabbladen; Overzicht is het startscherm
  data/startdata.json
  lib/               rekenlogica zonder scherm (goed te testen)
  views/             één bestand per scherm
  ui/                hulpjes voor HTML en de SVG-grafieken
public/              manifest, service worker en iconen (offline/installeren)
tests/               één testbestand per onderdeel (Vitest + happy-dom)
```
