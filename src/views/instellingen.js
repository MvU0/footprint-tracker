// Scherm "Instellingen": standaardreferentie per categorie en "terug naar startdata".

import { terugNaarStartdata } from '../lib/opslag.js';
import { esc, herstelKeuzes } from '../ui/html.js';

let melding = '';

export function toonInstellingen(el, app) {
  const { data } = app;
  const refs = data.instellingen?.standaardReferentie ?? {};

  const rijen = data.categorieen
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

  el.innerHTML = `
    <h2>Instellingen</h2>
    ${melding ? `<div class="melding info">${esc(melding)}</div>` : ''}
    <section class="formulier">
      <fieldset>
        <legend>Standaardreferentie per categorie</legend>
        <p class="hulp">Waarmee je keuze vergeleken wordt als je logt. Heeft een item een eigen
          standaardreferentie (zoals tweedehands → nieuw), dan gaat die voor. Bij elke logregel kun je ook zelf een andere kiezen.</p>
        <div class="rij">${rijen}</div>
      </fieldset>
      <fieldset>
        <legend>Terug naar startdata</legend>
        <p class="hulp">Zet de items uit de startdata terug zoals ze in de app zaten (bv. na een update van de bronnen).
          Je eigen items en categorieën, je instellingen en je logboek blijven bewaard.</p>
        <button type="button" class="knop gevaar" data-actie="startdata">Terug naar startdata</button>
      </fieldset>
    </section>`;
  herstelKeuzes(el);

  el.querySelectorAll('select[data-categorie]').forEach((select) =>
    select.addEventListener('change', () => {
      data.instellingen ??= { standaardReferentie: {} };
      data.instellingen.standaardReferentie[select.dataset.categorie] = select.value || null;
      melding = '';
      app.bewaar();
      app.herteken();
    }),
  );

  el.querySelector('[data-actie="startdata"]').addEventListener('click', () => {
    const vraag = 'Items uit de startdata terugzetten? Wijzigingen die je aan die items hebt gemaakt, gaan verloren. '
      + 'Je eigen items, instellingen en logboek blijven bewaard.';
    if (!confirm(vraag)) return;
    app.data = terugNaarStartdata(data);
    app.bewaar();
    melding = 'De items uit de startdata zijn teruggezet.';
    app.herteken();
  });
}
