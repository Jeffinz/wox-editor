// ABOUTME: เทสของตัวหาและแก้ sim ใน app chunk (LOC) ที่ v3.4.0 ใช้สร้าง import map shim
// ABOUTME: รันด้วย `node --test "tests/**/*.test.mjs"` ต้องมี bundle/ (node tools/fetch-bundle.mjs) และ skip 0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const LOC = require('../wox-editor.user.js');
// เลือกไฟล์เกมแบบเดียวกับ tests/locate.test.mjs: WOX_BUNDLE (path หรือชื่อ BUILD) → โฟลเดอร์ที่ใหม่สุด
const bundleDir = () => {
  const env = process.env.WOX_BUNDLE;
  if (env) {
    const full = resolve(env);
    if (existsSync(join(full, 'index.html'))) return pathToFileURL(full + sep);
    const asBuild = new URL('../bundle/' + env + '/', import.meta.url);
    return existsSync(new URL('index.html', asBuild)) ? asBuild : null;
  }
  const root = new URL('../bundle/', import.meta.url);
  let best = null;
  let bestMs = -1;
  let names = [];
  try { names = readdirSync(root); } catch { return null; }
  for (const name of names) {
    const dir = new URL(name + '/', root);
    if (!existsSync(new URL('index.html', dir))) continue;
    const ms = statSync(dir).mtimeMs;
    if (ms > bestMs) { bestMs = ms; best = dir; }
  }
  return best;
};

const appText = (dir) => {
  const read = (p) => readFileSync(new URL(p.replace(/^\//, ''), dir), 'utf8');
  const index = read('index.html');
  const boot = LOC.chunkChain(index, '', '').boot;
  const app = LOC.chunkChain(index, read(boot), '').app;
  return { src: read(app), path: app };
};

const NAMES = { majorTexts: 'a', majorEvent: 'b', events: 'c', rarityFor: 'd', openOptions: 'e', statOdds: 'f' };

test('simPatch สร้างบรรทัดเปิด sim จากชื่อที่ให้', () => {
  assert.equal(
    LOC.simPatch(NAMES),
    ';window.__woxSim={majorTexts:a,majorEvent:b,events:c,rarityFor:d,openOptions:e,statOdds:f};'
  );
});

test('importMapJson map เฉพาะ URL ที่ให้', () => {
  assert.deepEqual(
    JSON.parse(LOC.importMapJson('https://g.test/b/app-1.js', 'blob:https://g.test/x')),
    { imports: { 'https://g.test/b/app-1.js': 'blob:https://g.test/x' } }
  );
});

test('absolutize เขียน specifier ทุกรูปเป็น URL เต็ม', () => {
  const src = 'import{a}from"./c-1.js";import"./c-2.js";import("./c-3.js");x="./keep.js";';
  const { src: out, n } = LOC.absolutize(src, 'https://g.test/b/');
  assert.equal(n, 3);
  assert.ok(out.includes('from"https://g.test/b/c-1.js"'));
  assert.ok(out.includes('import"https://g.test/b/c-2.js"'));
  assert.ok(out.includes('import("https://g.test/b/c-3.js")'));
  // "./" ที่ไม่ใช่ specifier ต้องไม่ถูกแตะ
  assert.ok(out.includes('x="./keep.js"'));
});

test('absolutize ไม่ throw กับค่าที่ไม่ใช่สตริง', () => {
  for (const bad of [null, undefined, 42, {}]) {
    assert.deepEqual(LOC.absolutize(bad, 'https://g.test/b/'), { src: '', n: 0 });
  }
});

test('simNames ตอบ null เมื่อชื่อใดชื่อหนึ่งมีสองที่ประกาศ', () => {
  const fn = 'function a(e,t=b(e.pending?.id),n=e.pending?.npc){}';
  assert.equal(LOC.simNames(fn + fn), null);
});

test('simNames ทำงานได้เมื่อถูกแปลงเป็นซอร์ส (เส้นทางจริงของ shim)', (t) => {
  // shim ฝังฟังก์ชันด้วย Function.prototype.toString แล้วรันใน module
  // เทสนี้พิสูจน์ว่าฟังก์ชันไม่พึ่งตัวแปรนอกฟังก์ชัน
  const clone = new Function('return (' + LOC.simNames.toString() + ')')();
  const dir = bundleDir();
  if (!dir) return t.skip('ไม่มี bundle/: รัน node tools/fetch-bundle.mjs ก่อน');
  const { src } = appText(dir);
  assert.deepEqual(clone(src), LOC.simNames(src));
});

test('simNames หา sim ครบ 6 ตัวใน build จริง', (t) => {
  const dir = bundleDir();
  if (!dir) return t.skip('ไม่มี bundle/: รัน node tools/fetch-bundle.mjs ก่อน');
  const { src } = appText(dir);
  const names = LOC.simNames(src);
  assert.ok(names, 'ต้องหา sim ครบ');
  assert.deepEqual(Object.keys(names).sort(), [...LOC.SIM_KEYS].sort());
  for (const k of LOC.SIM_KEYS) assert.match(names[k], /^[A-Za-z0-9_$]+$/);
});

test('absolutize กับ app จริงแล้ว node --check ผ่าน', (t) => {
  const dir = bundleDir();
  if (!dir) return t.skip('ไม่มี bundle/: รัน node tools/fetch-bundle.mjs ก่อน');
  const { src, path } = appText(dir);
  const names = LOC.simNames(src);
  const base = new URL('https://way-of-xian.wox-game.workers.dev' + path.replace(/[^/]+$/, '')).href;
  const { src: out, n } = LOC.absolutize(src, base);
  assert.ok(n >= 5, 'app ต้องมี specifier สัมพัทธ์อย่างน้อย 5 จุด ได้ ' + n);
  assert.ok(!/(?:from|import)\s*\(?\s*"\.\//.test(out), 'ต้องไม่มี specifier สัมพัทธ์เหลือ');
  const file = join(mkdtempSync(join(tmpdir(), 'woxsim-')), 'app.mjs');
  writeFileSync(file, out + LOC.simPatch(names));
  execFileSync(process.execPath, ['--check', file]);
});
