// Instellingen voor Vite (het bouwprogramma).
//
// base: './' = verwijs naar bestanden met relatieve paden ("./assets/...") in plaats van
// vanaf de root ("/assets/..."). Op GitHub Pages staat de app in een submap
// (https://mvu0.github.io/footprint-tracker/); met relatieve paden werkt hij daar én lokaal.
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
});
