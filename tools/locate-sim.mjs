// ABOUTME: Spike tool: finds the minified names of the game's sim functions in an app-*.js file by code shape.
// ABOUTME: Usage: node tools/locate-sim.mjs bundle/<BUILD>/b/app-*.js  (regexes become LOC.simNames in v3.4.0)
import { readFileSync } from 'node:fs';
const app = readFileSync(process.argv[2], 'utf8');
const id = '[A-Za-z0-9_$]+';
const esc = (s) => s.replace(/\$/g, '\\$');
const out = {};
const mt = app.match(new RegExp(`function (${id})\\(e,t=(${id})\\(e\\.pending\\?\\.id\\),n=e\\.pending\\?\\.npc\\)`));
out.majorTexts = mt?.[1]; out.majorEvent = mt?.[2];
out.events = mt && app.match(new RegExp(`[,; ]${esc(mt[2])}=e=>(${id})\\.get\\(e\\)`))?.[1];
out.rarityFor = app.match(new RegExp(`(${id})=e=>e\\.story\\?${id}\\(${id}\\.get\\(e\\.story\\)\\):${id}\\(e\\)`))?.[1];
out.openOptions = app.match(new RegExp(`[,; ](${id})=\\(e,t\\)=>\\{let n=t\\.options\\.filter\\(`))?.[1];
out.statOdds = app.match(new RegExp(`T\\("small","odds",""\\)[^]{0,250}?\\$\\{${id}\\(${id}\\((${id})\\(e,t,n,o\\)\\)\\)\\}`))?.[1];
console.log(out);
for (const n of Object.values(out)) {
  if (!n) continue;
  const all = [...app.matchAll(new RegExp(`(function ${esc(n)}\\(|[,; ]${esc(n)}=|var ${esc(n)}=|let ${esc(n)}=|const ${esc(n)}=)`, 'g'))];
  console.log(n, all.length, 'decls');
}
