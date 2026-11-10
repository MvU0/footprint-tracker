# Bronnen van de startdata

Dit overzicht hoort bij [src/data/startdata.json](src/data/startdata.json). Het laat zien waar elk cijfer vandaan komt, hoe het is opgehaald en wat er nog onzeker is.

**Alle cijfers zijn schattingen.** Bronnen gebruiken verschillende methodes en afbakeningen (scopes). Vergelijk daarom alleen waarden met dezelfde scope.

Opgehaald op: **10 november 2026**. Alle cijfers zijn op dezelfde dag opnieuw naast de originele bronnen gelegd (fact-check). Alles klopte, behalve de refurbished-percentages (zie §7).

## Uitgangspunten

1. **Nederlandse bronnen gaan voor.** Een buitenlandse bron is alleen gebruikt als er geen Nederlandse bron met absolute cijfers was, of als tweede bron ter vergelijking.
2. **Geen verzonnen cijfers.** Elke waarde heeft een `status`:

| Status | Betekenis |
|---|---|
| `gecontroleerd` | Waarde is direct uit de bron overgenomen (zie "Hoe opgehaald"). |
| `afgeleid` | Waarde is berekend uit één of meer bronnen. De berekening staat in de notitie. |
| `aanname` | Er is geen bron; de redenering staat in de notitie. |
| `niet gecontroleerd` | Waarde is overgenomen, maar er is twijfel over de interpretatie. |
| `nog te onderzoeken` | Waarde ontbreekt nog. |

---

## 1. Vervoer: co2emissiefactoren.nl (Nederland)

- **Wat:** Nederlandse standaardlijst met CO2-emissiefactoren, beheerd door Rijkswaterstaat en Stichting Stimular.
- **Versie:** lijst 2026, thema Personenvervoer.
- **Link:** https://co2emissiefactoren.nl/factoren/2026/13/personenvervoer/
- **Hoe opgehaald:** de pagina is gedownload en de getallen zijn letterlijk uit de tabel overgenomen.
- **Scope:**
  - **Well-to-wheel (WTW)** staat standaard **aan**: verbranding van brandstof plus de productie van die brandstof of stroom.
  - **Tank-to-wheel (TTW)** is als tweede bron opgenomen en staat standaard **uit**: alleen de verbranding tijdens het rijden.
  - Het **bouwen van het voertuig** zit in geen van beide.
- **Let op:**
  - Autowaarden gelden **per voertuigkilometer**: met z'n tweeën in de auto betekent de helft per persoon.
  - Trein, bus en vliegtuig gelden **per reizigerskilometer**.
  - Bij vliegen is nog niet gecontroleerd of niet-CO2-effecten op grote hoogte (zoals condensstrepen) zijn meegenomen. De pagina zelf zegt er niets over.
  - De TTW-waarden van vliegtuig en e-bike staan in de tabel hieronder, maar (nog) niet als bron in startdata.json.

| Item | WTW (kg CO2e/km) | TTW | Regel in de lijst |
|---|---|---|---|
| Auto (gemiddeld) | 0,190 | 0,142 | Gemiddelde auto, brandstofsoort onbekend |
| Auto (benzine) | 0,196 | 0,150 | Benzine Middel |
| Auto (diesel) | 0,224 | 0,169 | Diesel Middel |
| Auto (elektrisch) | 0,056 | 0 | Elektrisch, gemiddelde stroommix |
| Trein | 0,030 | 0,002 | Trein (gemiddelde/type onbekend) |
| Bus | 0,104 | 0,071 | Bus (gemiddeld, brandstof onbekend) |
| Bus/tram/metro | 0,057 | 0,043 | Bus, Tram, Metro gemiddelde |
| Elektrische fiets | 0,002 | 0 | Fiets (elektrisch, gemiddelde stroommix) |
| Vliegtuig regionaal (< 700 km) | 0,234 | 0,202 | Regionaal |
| Vliegtuig Europa (700–2500 km) | 0,172 | 0,152 | Europees |
| Vliegtuig intercontinentaal (> 2500 km) | 0,157 | 0,140 | Intercontinentaal |

**Aannames (geen bron):**
- **Fiets, lopen:** 0. Binnen deze scope (alleen energie voor de rit) is dat logisch, maar het is geen brongetal. Een levenscyclusbron voor de fiets is nog te onderzoeken.
- **Meerijden als passagier:** 0, omdat de uitstoot per voertuigkilometer al bij de bestuurder wordt geteld. Dit item is nodig om de vervoersmix goed op te tellen.

## 2. Vervoersmix: CBS, Onderweg in Nederland (Nederland)

- **Wat:** hoeveel kilometer Nederlanders (6 jaar of ouder) per vervoermiddel binnen Nederland afleggen.
- **Bron:** CBS, *Onderweg in Nederland (ODiN) 2024 – Plausibiliteitsrapportage*, tabel 3.1.1.
- **Link:** https://www.cbs.nl/nl-nl/longread/rapportages/2025/onderweg-in-nederland--odin---2024-plausibiliteitsrapportage/3-reizigerskilometers
- **Gebruikte cijfers (2024, miljard reizigerskilometers):**

| Vervoerwijze | Aandeel | Gekoppeld aan item |
|---|---|---|
| Auto als bestuurder | 98,8 | Auto (gemiddeld) |
| Auto als passagier | 34,8 | Meerijden als passagier |
| Trein | 19,9 | Trein |
| Bus/tram/metro | 5,6 | Bus/tram/metro |
| Fiets | 17,1 | Fiets |
| Lopen | 5,8 | Lopen |
| *Overig (brommer, motor, boot …)* | *14,3* | *weggelaten (nog geen item)* |

- **Controle:** dit geeft een vervoersmix van ongeveer **0,108 kg CO2e per km** (WTW). Je kunt dat narekenen: (98,8 × 0,190 + 19,9 × 0,030 + 5,6 × 0,057) ÷ 181,9 ≈ 0,108.

## 3. Eten: RIVM Database Milieubelasting Voedingsmiddelen (Nederland)

- **Wat:** levenscyclusanalyses (LCA) van ongeveer 400 voedingsmiddelen die in Nederland gegeten worden. Uitgevoerd door Mérieux NutriSciences | Blonk in opdracht van het RIVM.
- **Versie:** database van 23 september 2024 (LCA-data geüpdatet in 2023), Excel-bestand.
- **Link:** https://www.rivm.nl/voeding/duurzaam-voedsel/database-milieubelasting-voedingsmiddelen
- **Hoe opgehaald:** het Excel-bestand is gedownload en de waarden zijn uitgelezen uit het tabblad **"tot-en-met-retail"**. In de notitie bij elke waarde staat de exacte regelnaam.
- **Scope:** van de boerderij tot het product in de Nederlandse supermarkt, per kg product.
  - **CO2e:** "Global warming (kg CO2 eq/kg)".
  - **Water:** "Water consumption (m³/kg)", omgerekend naar liters (× 1000). Dit is **blauw waterverbruik**: irrigatiewater dat niet terugkeert.
- **Belangrijk voorbehoud van het RIVM:** de cijfers zijn niet kritisch gereviewd volgens ISO-14040. Het RIVM zegt daarom dat je ze niet moet gebruiken om *individuele* producten (zoals een appel en een peer) te vergelijken, wel om *productgroepen*. Houd daar rekening mee bij het vergelijken.
- **Licentie:** CC BY 4.0.

| Item | kg CO2e/kg | Water (L/kg) | Regel in de database |
|---|---|---|---|
| Rundvlees | 19,84 | 121,4 | Minced beef |
| Varkensvlees | 7,47 | 42,5 | Pork <5% fat |
| Kip | 3,94 | 47,3 | Chicken fillet |
| Zalm (kweek) | 5,33 | 61,4 | Salmon, fillet (aquaculture) |
| Kabeljauw | 4,31 | 27,7 | Cod |
| Linzen | 2,68 | 39,5 | Lentils (*status: niet gecontroleerd, onduidelijk of droog of gekookt*) |
| Tofu | 2,29 | 25,1 | Tahoe soya curd |
| Vegetarisch gehakt | 3,36 | 51,8 | Mincemeat vegetarian unprepared |

## 4. Eten (tweede bron): Our World in Data / Poore & Nemecek 2018 (internationaal)

- **Wat:** een grote meta-analyse van ongeveer 38.700 boerderijen wereldwijd, gepubliceerd in *Science* (2018) en verwerkt door Our World in Data. Deze bron stond in je wensen.
- **Links:**
  - CO2e: https://ourworldindata.org/grapher/ghg-per-kg-poore
  - Water: https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore
- **Hoe opgehaald:** de CSV-bestanden van beide grafieken zijn gedownload en de waarden zijn letterlijk overgenomen.
- **Scope:** boerderij tot winkel, **mondiaal gemiddelde**, data rond 2010.
  - **Water:** *zoetwateronttrekking*. Dat is een andere maat dan het RIVM gebruikt (blauw waterverbruik), dus de waterwaarden zijn niet direct vergelijkbaar.
- **Gevolg in de app:** de RIVM- en OWID-bron bij hetzelfde item hebben een **andere scope**. De app gaat daarvoor waarschuwen, zoals je in je wensen vroeg. Daarna kun je ze apart bekijken of er één uitzetten.

| Item | kg CO2e/kg | Water (L/kg) | Regel bij OWID |
|---|---|---|---|
| Rundvlees | 99,48 | 1451,2 | Beef (beef herd): vleesvee |
| Rundvlees | 33,30 | 2714,3 | Beef (dairy herd): melkvee |
| Varkensvlees | 12,31 | 1795,8 | Pig Meat |
| Kip | 9,87 | 660,0 | Poultry Meat |
| Zalm (kweek) | 13,63 | 3691,3 | Fish (farmed): alle kweekvis samen |
| Linzen | 1,79 | 435,7 | Other Pulses: overige peulvruchten |
| Tofu | 3,16 | 148,6 | Tofu |

## 5. Vleesmix: WUR, vleesconsumptie per hoofd (Nederland)

- **Bron:** Dagevos, Verhoog, Bondt & Hoste (2025). *Vleesconsumptie per hoofd van de bevolking in Nederland, 2005–2024.* Wageningen Social & Economic Research, Nota 2025-145, tabel 3.1.
- **Link:** https://edepot.wur.nl/701454
- **Hoe opgehaald:** de pdf is gedownload en de tabel is uitgelezen.
- **Gebruikte cijfers (2024, kg per persoon, op basis van karkasgewicht):**

| Vleessoort | kg | Gekoppeld aan item |
|---|---|---|
| Varkensvlees | 35,1 | Varkensvlees |
| Pluimveevlees | 22,0 | Kip |
| Rundvlees + kalfsvlees | 14,9 + 1,4 = 16,3 | Rundvlees |
| *Schapen-/geitenvlees, paardenvlees* | *1,0 + 0,1* | *weggelaten (geen item, en het RIVM heeft lamsvlees uit de database gehaald)* |

- **Let op:**
  - Karkasgewicht (met been) is niet hetzelfde als het gewicht van het product dat je koopt. De verhouding is dus een benadering.
  - **Vis zit nog niet in de mix.** Ik heb geen Nederlands verbruikscijfer voor vis gevonden dat op dezelfde manier is gemeten.
- **Controle:** met de RIVM-waarden komt de vleesmix op ongeveer **9,16 kg CO2e per kg**. Narekenen: (16,3 × 19,84 + 35,1 × 7,47 + 22,0 × 3,94) ÷ 73,4.

## 6. Kleding en elektronica, nieuw: ADEME Impact CO2 (Frankrijk)

- **Waarom een Franse bron:** bij Nederlandse bronnen heb ik geen absolute cijfers per kledingstuk of per apparaat gevonden.
  - Milieu Centraal geeft voor kleding alleen een bereik per kg kleding (15–35 kg CO2e per kg) en voor elektronica alleen percentages.
- **Wat:** Impact CO2, de officiële calculator van het Franse overheidsagentschap ADEME.
  - Kleding: data van ADEME (Base Empreinte).
  - Eten (niet gebruikt): Agribalyse.
- **Link:** https://impactco2.fr. De data is opgehaald via de openbare API: `impactco2.fr/api/v1/thematiques/ecv/{1 = numérique, 5 = habillement}`.
- **Scope:** het veld `footprint`, dat is **productie en distributie**. Gebruik (opladen, wassen) en afdanken zitten er niet in. Die waarden staan wel in de notities.

| Item | kg CO2e/stuk | Naam bij ADEME |
|---|---|---|
| T-shirt (katoen), nieuw | 5,2 | T-shirt en coton |
| Spijkerbroek, nieuw | 23,2 | Jeans |
| Jas, nieuw | 85,8 | Manteau |
| Smartphone, nieuw | 79,27 | Smartphone |
| Laptop, nieuw | 182,3 | Ordinateur portable |

## 7. Tweedehands kleding en refurbished elektronica: Milieu Centraal (Nederland)

Deze waarden zijn **afgeleid**. Ze zijn berekend met een Nederlandse factor of een Nederlands percentage, toegepast op de ADEME-waarde voor nieuw.

**Tweedehands kleding**
- **Bron:** Milieu Centraal, *Factsheet duurzaamheid van tweedehands kleding* (februari 2024).
- **Link:** https://milieucentraal.nl/media/xiqdgwun/milieu-centraal-2024-factsheet-tweedehands-kleding.pdf
- **Wat staat erin:** tweedehands kopen voorkomt niet altijd een nieuwe aankoop. De **vervangingsfactor** in de literatuur ligt tussen **0,36 en 0,75**; Milieu Centraal rekent met **0,5**.
- **Berekening:** tweedehands = nieuw × (1 − vervangingsfactor). Er zijn drie bronnen per item: met 0,5, 0,75 en 0,36.
  - Voorbeeld T-shirt: 5,2 × 0,5 = 2,6; 5,2 × 0,25 = 1,3; 5,2 × 0,64 = 3,328.

**Refurbished elektronica**
- **Bron:** Milieu Centraal, pagina *Kies refurbished*.
- **Link:** https://www.milieucentraal.nl/spullen-en-kleding/kies-refurbished/
- **⚠️ Status sinds de fact-check van 10 november 2026: `niet gecontroleerd`.** De pagina is op 24 juni 2026 gewijzigd en noemt geen percentages meer, alleen dat refurbished "een stuk beter voor het milieu" is. De percentages hieronder zijn dus niet meer te controleren via deze link.
- **Wat er eerder stond (bij het ophalen in een vorige sessie):**
  - Een refurbished smartphone geeft **40–60%** minder klimaatimpact; sommige studies komen op 80–90%.
  - Een refurbished laptop geeft **tot 85%** minder.
- **Berekening:** refurbished = nieuw × (1 − besparing).
  - Smartphone: 40% en 60% staan **aan**; 80% en 90% staan **uit**, omdat Milieu Centraal die als uitschieters noemde.
  - Laptop: er is maar één waarde (85%). Dat is het gunstigste geval; een tweede bron is nog te onderzoeken.
- **Gevonden bij de fact-check, niet bruikbaar:**
  - Leapp (webshop) schrijft dat de Milieu Centraal-campagne "Kies refurbished" ongeveer 70 kg CO2 besparing per smartphone en ruim 300 kg per laptop noemt. Die pagina geeft nu een 404, en de cijfers komen niet direct van Milieu Centraal.
  - refurbed (verkoper) noemt 80–85% besparing. Dat is een eigen berekening van een verkoper.

---

## Nog te onderzoeken

- [ ] Vis in de vleesmix: een Nederlands verbruikscijfer per vissoort.
- [ ] Een levenscyclusbron voor de (gewone) fiets.
- [ ] Of de vliegtuigfactoren van co2emissiefactoren.nl niet-CO2-effecten bevatten.
- [ ] Linzen bij het RIVM: per kg droog of gekookt? Aanwijzing: de regel is een zak van 500 g die bij kamertemperatuur bewaard wordt, dus waarschijnlijk droog. De koppeling is wel aan NEVO "gekookt", en de toelichting zegt het niet letterlijk.
- [ ] Een nieuwe Nederlandse bron voor de besparing van refurbished smartphones en laptops (de Milieu Centraal-pagina noemt sinds juni 2026 geen percentages meer). Eventueel de oude versie van de pagina terugzoeken in het webarchief.
- [ ] Of "fiets" in CBS ODiN ook e-bikes bevat.
- [ ] Meer bronnen per kledingstuk (nu alleen ADEME).
- [ ] Een tweede bron voor refurbished laptops.
- [ ] Waterverbruik voor kleding en elektronica: geen bruikbare waarde per stuk gevonden.
