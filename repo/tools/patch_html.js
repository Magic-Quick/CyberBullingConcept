import fs from 'fs';
import path from 'path';

const distHtml = path.resolve('dist/index.html');
const gameHtml = path.resolve('../game.html');
const distAssets = path.resolve('dist/assets');
const rootAssets = path.resolve('../assets');

let html = fs.readFileSync(distHtml, 'utf-8');

// Prefix all new URL(`filename`, ...) with assets/
html = html.replace(/new URL\(([`'"])([^`'"]+)\1/g, (match, quote, filename) => {
  if (!filename.startsWith('assets/') && !filename.startsWith('./assets/') && !filename.startsWith('data:') && !filename.startsWith('http')) {
    return `new URL(${quote}assets/${filename}${quote}`;
  }
  return match;
});

// Fix CSS font/image urls if needed
html = html.replace(/url\((['"]?)\/?assets\//g, 'url($1./assets/');

// Write patched html to dist/index.html and root game.html!
fs.writeFileSync(distHtml, html, 'utf-8');
fs.writeFileSync(gameHtml, html, 'utf-8');
console.log('[patch_html] Successfully patched dist/index.html and root game.html with assets/ prefix!');

if (fs.existsSync(distAssets)) {
  fs.cpSync(distAssets, rootAssets, { recursive: true });
  console.log('[patch_html] Synchronized dist/assets to root assets/');
}
