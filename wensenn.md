# Project: persoonlijke CO2- en waterfootprint-tracker

> Dit bestand beschrijft wat ik wil. Lees het helemaal, maak daarna een plan en stel me vragen voordat je code schrijft.

## 1. Doel

Ik wil een app voor mezelf waarmee ik de uitstoot van broeikasgassen (CO2-equivalenten, CO2e) en het watergebruik van mijn keuzes kan tracken en vergelijken. Het gaat niet alleen om wat ik uitstoot, maar ook om wat ik bespaar ten opzichte van een alternatief. "Bespaard" bestaat alleen ten opzichte van iets anders, dus elke keuze moet met een referentie kunnen worden vergeleken.

## 2. Gebruiker en uitgangspunten

- Alleen voor mezelf: geen accounts, geen inlog, geen server.
- Alle data blijft lokaal op mijn apparaat.
- Ik heb programmeerervaring in Python en R, maar niet in de talen die nodig zijn voor deze app. Leg daarom kort uit wat je doet en waarom, en houd de code simpel en leesbaar.
- Taal van de app en de uitleg: Nederlands.

## 3. Eerste categorieën

Begin met deze vier en maak het eenvoudig om later categorieën toe te voegen (bijvoorbeeld energie thuis):

1. **Vervoer** (auto, trein, fiets, bus, vliegtuig enzovoort; eenheid: km)
2. **Vlees eten** (rund, kip, varken, vegetarische alternatieven als vergelijking; eenheid: kg of portie)
3. **Kleding kopen** (t-shirt, spijkerbroek, jas, tweedehands versus nieuw; eenheid: stuk)
4. **Grote aankopen** (elektronica zoals telefoon en laptop, nieuw versus refurbished; eenheid: stuk)

## 4. Belangrijkste functies

### 4.1 Keuzes met informatie
Elk item (bijvoorbeeld "spijkerbroek", "40 km met de auto", "rundvlees") toont:
- uitstoot per eenheid in kg CO2e;
- watergebruik per eenheid in liters (optioneel, niet overal beschikbaar);
- een korte uitleg;
- de bronnen waarop dit is gebaseerd.

Voor andere broeikasgassen (zoals methaan en lachgas) geldt: CO2e is de hoofdmaat. Als een bron de gassen apart vermeldt, mag de app die uitsplitsing optioneel tonen, vooral bij eten.

### 4.2 Vergelijken
Ik kan twee of meer keuzes naast elkaar zetten voor dezelfde hoeveelheid, bijvoorbeeld auto, trein en fiets voor 40 km, of rundvlees, kip en linzen voor één maaltijd. De app toont de verschillen in CO2e en water, bij voorkeur ook visueel.

### 4.3 Tracken met een referentie
- Ik log wat ik gedaan of gekocht heb (item, hoeveelheid, datum).
- Per categorie kan ik een "gewone keuze" instellen (bijvoorbeeld normaal ga ik met de auto).
- De app berekent wat ik zou hebben uitgestoten bij de gewone keuze. Het verschil is mijn besparing.
- Bij een logregel kan ik ook een andere referentie kiezen dan de standaard.

### 4.4 Overzicht
- Totaal uitgestoten en totaal bespaard (CO2e en water).
- Uitsplitsing per categorie en per periode (week, maand, jaar).
- Een lijst van mijn gelogde acties, die ik kan aanpassen en verwijderen.

## 5. Eigen bronnen toevoegen (kernwens)

Ik wil zelf nieuwe items en bronnen kunnen toevoegen, aanpassen en verwijderen, zodat ik nieuwe dingen kan gaan tracken zonder de code aan te passen.

### 5.1 Datamodel

**Item**
- naam
- categorie
- eenheid (km, kg, stuk, portie)
- optioneel: alternatieven of vergelijkbare items

**Bron** (meerdere per item mogelijk)
- waarde in kg CO2e per eenheid
- watergebruik in liters per eenheid (optioneel)
- bronnaam
- link
- jaartal
- methode of scope (bijvoorbeeld "tank-to-wheel" versus "well-to-wheel", of "alleen productie" versus "hele levenscyclus")
- notitie
- aan/uit-schakelaar: telt deze bron mee of niet

### 5.2 Berekening bij meerdere bronnen
De app berekent per item uit de actieve bronnen:
- laagste waarde, hoogste waarde, gemiddelde en mediaan;
- het aantal bronnen.

Gedrag:
- Toon altijd het bereik (bijvoorbeeld "3 tot 11 kg CO2e, gemiddeld 7, 4 bronnen").
- Bij één bron is er geen echt bereik. Laat dat duidelijk zien ("1 bron, geen bereik").
- Bij weinig bronnen (twee of drie) is het gemiddelde weinig zeggend. Benadruk dan het bereik. Gebruik de mediaan pas bij meer dan drie bronnen.
- Bij het loggen kan ik kiezen welke waarde telt: gemiddelde, laag of hoog (standaard: gemiddelde).
- Besparingen toon ik als bereik (bijvoorbeeld "tussen 12 en 40 kg bespaard") in plaats van één schijnnauwkeurig getal.

### 5.3 Waarschuwingen
Waarschuw me als bronnen bij hetzelfde item verschillende eenheden of verschillende scopes hebben, omdat het gemiddelde dan appels met peren vergelijkt. Laat me die bronnen dan apart groeperen of uitsluiten.

## 6. Startdata en bronnen

De startdata moet in één aanpasbaar JSON-bestand staan (zie voorbeeld in sectie 8). Gebruik bij voorkeur primaire bronnen en vermeld bij elke waarde bron, link, jaartal en scope. Alle cijfers zijn schattingen; maak dat ook in de app duidelijk.

Voorgestelde bronnen:
- **Vervoer:** co2emissiefactoren.nl (Nederlandse standaardlijst, per jaar bijgewerkt). Let op het verschil tussen tank-to-wheel en well-to-wheel.
- **Eten:** Poore & Nemecek (2018) via Our World in Data (ourworldindata.org); daar staan ook water- en landgebruik per kg.
- **Elektronica:** ADEME-studies over nieuw versus refurbished (Frankrijk), aangevuld met fabrikantgegevens.
- **Kleding:** de cijfers lopen sterk uiteen (een t-shirt zit grofweg tussen 2 en 11 kg CO2e, afhankelijk van methode en bron). Sla daarom meerdere bronnen op in plaats van één getal. Wees terughoudend met cijfers van blogs en webshops.

Belangrijk: verzin geen cijfers. Waar je een waarde niet uit een bron kunt halen, laat je het veld leeg of markeer je het als "nog te onderzoeken". Markeer ook waarden die je niet hebt kunnen controleren.

## 7. Data en opslag

- Emissiedata en mijn eigen items/bronnen: JSON.
- Mijn logboek: lokaal opgeslagen in de browser (localStorage), of in een JSON-bestand als dat betrouwbaarder is.
- **Export en import:** een knop om alle data (items, bronnen, logboek, instellingen) naar één JSON-bestand te exporteren en weer te importeren. Zo raak ik niets kwijt en kan ik back-ups maken.
- De app moet blijven werken zonder internet.

## 8. Voorbeeldstructuur van een item (waarden zijn alleen ter illustratie en moeten gecontroleerd worden)

```json
{
  "id": "rundvlees",
  "naam": "Rundvlees",
  "categorie": "vlees",
  "eenheid": "kg",
  "bronnen": [
    {
      "co2e_kg": 99.48,
      "water_l": null,
      "bron": "Our World in Data (Poore & Nemecek 2018)",
      "link": "https://ourworldindata.org/grapher/ghg-per-kg-poore",
      "jaar": 2018,
      "scope": "productie tot winkel, vleesvee",
      "notitie": "Waarde voor beef herd; controleren bij de bron",
      "actief": true
    },
    {
      "co2e_kg": 33.30,
      "water_l": null,
      "bron": "Our World in Data (Poore & Nemecek 2018)",
      "link": "https://ourworldindata.org/grapher/ghg-per-kg-poore",
      "jaar": 2018,
      "scope": "productie tot winkel, melkvee",
      "notitie": "Waarde voor dairy herd; controleren bij de bron",
      "actief": true
    }
  ]
}
```

## 9. Technische keuzes

- Webapp die in de browser draait, bruikbaar op computer en telefoon (responsive).
- Gewone JavaScript, HTML en CSS, zonder zwaar framework. Eventueel Vite als bouwhulpmiddel. Gebruik alleen een framework (zoals React) als je goed kunt uitleggen waarom dat hier nodig is.
- Eenvoudige grafieken zijn welkom (bijvoorbeeld een lichte bibliotheek of eigen SVG).
- Git-repository vanaf het begin; maak kleine, duidelijke commits.
- Schrijf een korte README met uitleg over starten, de datastructuur en hoe ik bronnen toevoeg.

## 10. Werkwijze

1. Lees dit bestand en stel eerst eventuele vragen.
2. Maak een kort plan met de stappen en leg dat aan me voor.
3. Bouw in kleine stappen. Mijn voorstel voor de volgorde:
   1. Projectopzet, datamodel en JSON-startbestand met een paar items.
   2. Items en bronnen bekijken, met min, max, gemiddelde en mediaan.
   3. Formulier om items en bronnen toe te voegen, aan te passen, uit te zetten en te verwijderen.
   4. Vergelijken van keuzes.
   5. Loggen met referentie en berekening van besparing.
   6. Overzicht per categorie en periode, met grafieken.
   7. Export en import.
4. Test na elke stap of de berekeningen kloppen (bijvoorbeeld met kleine voorbeelden waarvan ik het antwoord zelf kan narekenen).
5. Laat me na elke stap zien wat er werkt en wat de volgende stap is.

## 11. Nog niet nodig (later eventueel)

- Meerdere gebruikers, accounts of synchronisatie tussen apparaten
- Categorieën als energie thuis en eten buiten vlees
- Automatisch ophalen van emissiedata van internet
- Echte mobiele app (een webapp als snelkoppeling op mijn telefoon is voldoende)

## 12. Open vragen voor mij (stel ze me aan het begin)

- Welke "gewone keuze" gebruik ik per categorie als standaardreferentie?
- Welke eenheden wil ik standaard zien (kg CO2e, liters)?
- Wil ik dat water bij elk item verplicht is, of alleen waar bronnen het hebben?
