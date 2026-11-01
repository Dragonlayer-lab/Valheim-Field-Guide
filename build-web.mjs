// Builds www/index.html for the Android app from ../src.html + ../data.json.
// - fonts bundled locally (works offline)
// - everything the guide saves (localStorage "vfg.*") is mirrored into native app storage
//   (Capacitor Preferences = Android SharedPreferences), and restored from it on launch
import fs from 'node:fs'; import path from 'node:path'; import { buildSync } from 'esbuild';
const root = path.resolve('web-src'), www = path.resolve('www');
fs.rmSync(www, { recursive: true, force: true }); fs.mkdirSync(path.join(www, 'fonts'), { recursive: true });
let s = fs.readFileSync(path.join(root, 'src.html'), 'utf8');
const data = fs.readFileSync(path.join(root, 'data.json'), 'utf8');
s = s.replace('__DATA__', () => data);

// fonts
const F = [['almendra','Almendra',400],['almendra','Almendra',700],['alegreya-sans','Alegreya Sans',400],['alegreya-sans','Alegreya Sans',500],['alegreya-sans','Alegreya Sans',700],['ibm-plex-mono','IBM Plex Mono',400],['ibm-plex-mono','IBM Plex Mono',500]];
let ff = '';
for (const [pkg, fam, w] of F) { const f = `${pkg}-latin-${w}-normal.woff2`;
  fs.copyFileSync(path.join('node_modules/@fontsource', pkg, 'files', f), path.join(www, 'fonts', f));
  ff += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format('woff2')}\n`; }
s = s.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, `<style>${ff}</style>`);
s = s.replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, '');

// defer the main script until native storage is restored
const i = s.indexOf('<script>\n(function(){');
if (i < 0) throw new Error('main script not found');
s = s.slice(0, i) + '<script type="text/plain" id="vfg-main">' + s.slice(i + '<script>'.length);
const bridge = buildSync({ entryPoints: ['native-bridge.js'], bundle: true, write: false, format: 'iife', minify: true, target: 'es2020' }).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const boot = `<script>${bridge}</script>
<script>
(function(){
  var N = window.VFGNative || {}, P = N.native ? N.Preferences : null, App = N.native ? N.App : null;
  function start(){ var m = document.getElementById('vfg-main'), x = document.createElement('script'); x.textContent = m.textContent; document.body.appendChild(x); }
  // open outside links in the phone's browser
  var wo = window.open; window.open = function(u){ if (u && /^https?:/i.test(u)) { location.href = u; return null } return wo.apply(window, arguments) };
  if (N.native) { var bk = document.querySelector('.foot.bk'); if (bk && bk.childNodes[1]) bk.childNodes[1].textContent = ' is stored in the app on this phone: progress, loadouts and settings. It stays until you uninstall the app. To move it to another phone, copy a backup here and restore it there.'; }
  if (App) App.addListener('backButton', function(e){ if (location.hash && location.hash !== '#home' && e.canGoBack) history.back(); else App.exitApp(); });
  try { if (N.native && N.StatusBar) { N.StatusBar.setStyle({style:N.Style.Dark}).catch(function(){}); N.StatusBar.setBackgroundColor({color:'#1E1813'}).catch(function(){}); } } catch(e){}
  if (!P) { start(); return; }
  var set = Storage.prototype.setItem, rem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function(k, v){ set.call(this, k, v); if (this === localStorage && /^vfg[.-]/.test(k)) P.set({key:k, value:String(v)}).catch(function(){}); };
  Storage.prototype.removeItem = function(k){ rem.call(this, k); if (this === localStorage && /^vfg[.-]/.test(k)) P.remove({key:k}).catch(function(){}); };
  P.keys().then(function(r){
    return Promise.all((r.keys||[]).filter(function(k){return /^vfg[.-]/.test(k)}).map(function(k){
      return P.get({key:k}).then(function(g){ if (g && g.value != null) set.call(localStorage, k, g.value); });
    }));
  }).catch(function(){}).then(start);
})();
</script>`;
s = s.replace(/<\/script>\s*$/, '</script>\n' + boot + '\n');
const head = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">';
fs.writeFileSync(path.join(www, 'index.html'), head + '</head><body>' + s + '</body></html>');
console.log('www/index.html', (fs.statSync(path.join(www, 'index.html')).size/1024|0)+'KB');
