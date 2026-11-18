# แท็บอีเว้นต์และช่วยเลือกสำหรับเกมแบบ bundle (v3.4.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> โปรเจ็คนี้ห้ามแยก subagent (CLAUDE.md §7) — ใช้ superpowers:executing-plans เท่านั้น

**Goal:** ทำให้แท็บอีเว้นต์ (รายการ/กรอง/เรียกอีเว้นต์) และแท็บช่วยเลือก (คะแนน/ป้าย/กดอัตโนมัติ) กลับมาใช้ได้กับเกมแบบ bundle โดยแทนที่ `b/app-*.js` ตัวเดียวด้วยสำเนาที่เติม `window.__woxSim` ผ่าน import map

**Architecture:** userscript ที่ `document-start` sync XHR `/` กับ boot เพื่อหาชื่อ app แล้วแทรก `<script type="importmap">` ที่ map URL ของ app ไปยัง blob module; blob นั้น fetch ข้อความ app, เขียน specifier สัมพัทธ์เป็น URL เต็ม, ต่อท้ายด้วย `;window.__woxSim={…};` แล้ว `import()` ตัวที่แก้แล้ว ถ้าขั้นใดพังให้ import app ตัวจริงด้วย `?woxed=raw` เพื่อให้เกมเล่นได้เสมอ ตรรกะที่ตัดสินใจได้ทั้งหมดอยู่ใน `LOC` เป็น pure function ที่มีเทส

**Tech Stack:** Vanilla ES2022, userscript (Tampermonkey, `@grant none`), `node --test`, ไม่มี dependency

**Spec:** `docs/superpowers/specs/2026-11-18-events-tab-design.md`

## Evidence from Task 0 (done 2026-11-18, build `mwll6s9j`)

- import map ที่แทรกเป็น **DOM node** ตอน `document-start` ทำงานจริง: `moduleScript in DOM before insert: false` → shim รันที่ 1590ms เกมขึ้นและเล่นได้ปกติ
- **`document.write` ห้ามใช้** — v0.0.1 ของ probe ทำให้หน้าจอดำ (เขียนทับเอกสาร)
- boot เรียก `wt()` แบบไม่ `await` → `load` event ยิงก่อน shim; ห้ามตัดสินสถานะ sim ที่ `load` ต้อง poll
- sync XHR `/` + boot กิน ~300-400ms ตอน `document-start` (ยอมรับได้)

## Global Constraints

- แทนที่เฉพาะ `b/app-*.js` — ห้ามแตะ boot, chunk `c-*`, หรือเพิ่ม import map key อื่น
- เกมต้องเล่นได้เสมอ: shim พังทุกกรณี → `import('<appUrl>?woxed=raw')` + ตั้ง `window.__woxSimError = <เหตุผล>`
- ห้ามใช้ `document.write` ในสคริปต์จริง (พิสูจน์แล้วว่าเขียนทับเอกสาร)
- ทำเฉพาะ `location.pathname === '/'`; หน้า wiki (`meta[name="wox-entry"][content="wiki"]`) ต้องไม่ถูกแตะ
- สคริปต์คง `@run-at document-start`, `@grant none`
- `LOC` ทุกตัวเป็น pure, ห้าม throw, ห้ามอ้างตัวแปรนอกฟังก์ชัน (ต้อง `.toString()` ไปรันใน shim ได้)
- ข้อความในแผงเป็นภาษาไทย ใช้สตริงตามสเปคเป๊ะ: `✔ sim (6 ฟังก์ชัน, อีเว้นต์ N)`, `✖ sim: <เหตุผล>`, `– sim: ยังรอ`
- เทส: `node --test "tests/**/*.test.mjs"` ต้อง **skip 0**; รัน `node tools/fetch-bundle.mjs` ก่อน
- ห้ามเพิ่ม dependency / `package.json` / jsdom / hardcode ชื่อ build
- ก่อนส่งงาน: `node --check wox-editor.user.js`, bump `@version` + `VERSION` พร้อมกันเป็น `3.4.0`, ปล่อยด้วย `node tools/release.mjs`
- คีย์ localStorage คงเดิม `woxed.*`

## Review Focus

1. **เกมต้องไม่ตายเมื่อ shim พัง** — sim names หาไม่ครบ / blob import throw / fetch ล้ม: ผู้ใช้ต้องเห็นเกมเล่นได้ปกติ ไม่ใช่จอค้าง. (Task 3)
2. **สถานะ sim ยังไม่มาแต่ผู้ใช้เปิดแท็บ** — ต้องขึ้น `– sim: ยังรอ` / เหตุผล ไม่ใช่ "ยังไม่รองรับ" ค้างหรือ "ไม่พบอีเว้นต์". (Task 2 + 3 + 6)
3. **Tampermonkey inject ไม่ทัน boot** — import map ถูกเมิน เกมเล่นได้แต่ไม่มี sim: ต้องเห็นเหตุผลในแผง. (Task 3 + 6)
4. **เรียกอีเว้นต์ด้วยตัวเลือกดิบ** `ev.options.map(o => o.id)` แทน `openOptions(t, ev)` — เกมจะปฏิเสธหรือการ์ดพัง. (Task 4)
5. **`statOdds` เรียกด้วย 3 อาร์กิวเมนต์** — `opt` หาย คะแนนช่วยเลือกผิดหรือ throw. (Task 5)
6. **sync XHR ล้ม (เน็ตช้า/ออฟไลน์)** — ต้องข้ามการติดตั้ง ไม่ทำให้หน้าเกมพัง. (Task 3)

---

### Task 1: LOC sim helpers (pure)

**Files:**
- Modify: `wox-editor.user.js:13-194` (`LOC` IIFE — เพิ่มฟังก์ชันก่อน `return`)
- Create: `tests/sim.test.mjs`

**Interfaces:**
- Produces:
  - `LOC.simNames(src: string) → { majorTexts, majorEvent, events, rarityFor, openOptions, statOdds } | null`
  - `LOC.absolutize(src: string, base: string) → { src: string, n: number }` (`base` = URL โฟลเดอร์ที่ลงท้ายด้วย `/`)
  - `LOC.simPatch(names) → string` — เริ่มด้วย `;` ต่อท้าย module ได้เลย
  - `LOC.importMapJson(appUrl: string, shimUrl: string) → string` — JSON พร้อมใส่ `<script type="importmap">`
  - `LOC.SIM_KEYS = ['majorTexts','majorEvent','events','rarityFor','openOptions','statOdds']`
- Consumes: `LOC.chunkChain` (มีแล้ว) สำหรับหา boot/app — ไม่ต้องเขียน `appFromBoot`/`bootFromIndex` ซ้ำ

- [ ] **Step 1: เขียนเทสที่ยังไม่ผ่าน** ใน `tests/sim.test.mjs`

```js
// ABOUTME: เทสของตัวหา/แก้ sim ใน app chunk (LOC) ที่ใช้สร้าง import map shim ของ v3.4.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const LOC = require('../wox-editor.user.js');

// เลือก bundle ล่าสุดแบบเดียวกับ tests/locate.test.mjs (WOX_BUNDLE หรือโฟลเดอร์ใหม่สุด)
const bundleDir = () => {
  const env = process.env.WOX_BUNDLE;
  if (env) {
    const full = new URL('file://' + env.replace(/\\/g, '/') + '/');
    if (existsSync(join(full.pathname.slice(1), 'index.html'))) return full;
    const asBuild = new URL('../bundle/' + env + '/', import.meta.url);
    return existsSync(new URL('index.html', asBuild)) ? asBuild : null;
  }
  const root = new URL('../bundle/', import.meta.url);
  let best = null, bestMs = -1, names = [];
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
  const src = 'function a(e,t=b(e.pending?.id),n=e.pending?.npc){}' +
    'function a(e,t=b(e.pending?.id),n=e.pending?.npc){}';
  assert.equal(LOC.simNames(src), null);
});

test('simNames ทำงานได้เมื่อถูกแปลงเป็นซอร์ส (เส้นทางจริงของ shim)', () => {
  // shim ฝังฟังก์ชันด้วย Function.prototype.toString แล้ว eval ใน module
  // เทสนี้พิสูจน์ว่าฟังก์ชันไม่พึ่งตัวแปรนอกฟังก์ชัน
  const clone = new Function('return (' + LOC.simNames.toString() + ')')();
  const dir = bundleDir();
  const { src } = dir ? appText(dir) : { src: '' };
  if (!dir) {
    assert.equal(typeof clone(''), 'object'); // null แต่ต้องไม่ throw
    return;
  }
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
  const { src: out, n } = LOC.absolutize(src, 'https://way-of-xian.wox-game.workers.dev' + path.replace(/[^/]+$/, ''));
  assert.ok(n >= 5, 'app ต้องมี specifier สัมพัทธ์อย่างน้อย 5 จุด ได้ ' + n);
  assert.ok(!/(?:from|import)\s*\(?\s*"\.\//.test(out), 'ต้องไม่มี specifier สัมพัทธ์เหลือ');
  const file = join(mkdtempSync(join(tmpdir(), 'woxsim-')), 'app.mjs');
  writeFileSync(file, out + LOC.simPatch(names));
  execFileSync(process.execPath, ['--check', file]);
});
```

- [ ] **Step 2: รันเทสให้เห็นว่าล้ม**

Run: `node tools/fetch-bundle.mjs && node --test tests/sim.test.mjs`
Expected: FAIL — `LOC.simPatch is not a function`

- [ ] **Step 3: เพิ่มฟังก์ชันใน `LOC`**

เพิ่มใน `wox-editor.user.js` ก่อน `return {…}` ของ `LOC` และใส่ชื่อใน object ที่ return (เรียงตามตัวอักษรเหมือนของเดิม)

```js
    const SIM_KEYS = ['majorTexts', 'majorEvent', 'events', 'rarityFor', 'openOptions', 'statOdds'];
    // ชื่อย่อของ sim ใน app chunk (pure, ห้าม throw, ห้ามอ้างตัวแปรนอกฟังก์ชัน: shim ฝังด้วย toString)
    // รูปร่างมาจาก tools/locate-sim.mjs (พิสูจน์กับ 3 build); ต้องเจอชื่อละ 1 ที่ประกาศ ไม่งั้นคืน null
    const simNames = (src) => {
      const s = typeof src === 'string' ? src : '';
      const id = '[A-Za-z0-9_$]+';
      const one = (re) => {
        const all = [...s.matchAll(re)];
        return all.length === 1 ? all[0][1] : null;
      };
      const mt = s.match(new RegExp('function (' + id + ')\\(e,t=(' + id + ')\\(e\\.pending\\?\\.id\\),n=e\\.pending\\?\\.npc\\)'));
      if (!mt || [...s.matchAll(new RegExp('function ' + mt[1] + '\\(', 'g'))].length !== 1) return null;
      const out = { majorTexts: mt[1], majorEvent: mt[2] };
      out.events = one(new RegExp('[,; ]' + out.majorEvent + '=e=>(' + id + ')\\.get\\(e\\)', 'g'));
      out.rarityFor = one(new RegExp('(' + id + ')=e=>e\\.story\\?' + id + '\\(' + id + '\\.get\\(e\\.story\\)\\):' + id + '\\(e\\)', 'g'));
      out.openOptions = one(new RegExp('[,; ](' + id + ')=\\(e,t\\)=>\\{let n=t\\.options\\.filter\\(', 'g'));
      // statOdds: หา call site ของข้อความ "small","odds" แล้วไล่ chain ${a(b(c( — ไม่ผูกกับชื่อ Translation helper
      out.statOdds = one(new RegExp(id + '\\("small","odds",""\\)[^]{0,250}?\\$\\{' + id + '\\(' + id + '\\(' + id + '\\(', 'g'));
      for (const k of SIM_KEYS) {
        if (!out[k]) return null;
        if ([...s.matchAll(new RegExp('(?:function |[,; ]|var |let |const )' + out[k] + '(?:\\(|=)', 'g'))].length !== 1) return null;
      }
      return out;
    };
    // เขียน specifier สัมพัทธ์ "…from"./" / "…import"./" / "…import("./" เป็น URL เต็ม (pure, ห้าม throw)
    // "./" ที่ไม่ตามหลัง from/import ต้องไม่ถูกแตะ
    const absolutize = (src, base) => {
      const s = typeof src === 'string' ? src : '';
      let n = 0;
      const out = s.replace(/((?:\bfrom|\bimport)\s*\(?\s*)"\.\//g, (m, head) => { n++; return head + '"' + base; });
      return { src: out, n };
    };
    // บรรทัดเปิด sim ต่อท้าย app module (pure)
    const simPatch = (names) => ';window.__woxSim={' + SIM_KEYS.map((k) => k + ':' + names[k]).join(',') + '};';
    // import map สำหรับ app URL เดียว (pure)
    const importMapJson = (appUrl, shimUrl) => JSON.stringify({ imports: { [String(appUrl)]: String(shimUrl) } });
```

- [ ] **Step 4: รันเทสให้ผ่าน**

Run: `node --test tests/sim.test.mjs`
Expected: PASS, skip 0

- [ ] **Step 5: Commit**

```bash
git add wox-editor.user.js tests/sim.test.mjs
git commit -m "feat: add LOC helpers that find and patch the bundled sim"
```

---

### Task 2: LOC.simLine สำหรับแผงตรวจระบบ

**Files:**
- Modify: `wox-editor.user.js` (`LOC` IIFE)
- Modify: `tests/health.test.mjs`

**Interfaces:**
- Consumes: ไม่มี
- Produces: `LOC.simLine(info) → string` โดย `info = { state: 'ok'|'waiting'|'error', funcs?: number, events?: number, reason?: string|null }`

- [ ] **Step 1: เขียนเทสที่ยังไม่ผ่าน** — ต่อท้าย `tests/health.test.mjs`

```js
test('simLine: sim พร้อมแล้วบอกจำนวนฟังก์ชันและอีเว้นต์', () => {
  assert.equal(LOC.simLine({ state: 'ok', funcs: 6, events: 16619 }), '✔ sim (6 ฟังก์ชัน, อีเว้นต์ 16619)');
});

test('simLine: ยังรอ sim', () => {
  assert.equal(LOC.simLine({ state: 'waiting' }), '– sim: ยังรอ');
  assert.equal(LOC.simLine(null), '– sim: ยังรอ');
});

test('simLine: sim พังบอกเหตุผล และไม่ throw เมื่อไม่มีเหตุผล', () => {
  assert.equal(LOC.simLine({ state: 'error', reason: 'หา sim ใน app ไม่เจอ' }), '✖ sim: หา sim ใน app ไม่เจอ');
  assert.equal(LOC.simLine({ state: 'error' }), '✖ sim: ไม่ทราบสาเหตุ');
});
```

- [ ] **Step 2: รันเทสให้เห็นว่าล้ม**

Run: `node --test tests/health.test.mjs`
Expected: FAIL — `LOC.simLine is not a function`

- [ ] **Step 3: เพิ่ม `simLine` ใน `LOC`** (ก่อน `return`, ใส่ใน object ที่ return)

```js
    // บรรทัดสถานะ sim ในแผงตรวจระบบ (pure, ห้าม throw); ข้อความตามสเปค v3.4.0
    const simLine = (info) => {
      if (info?.state === 'ok') return `✔ sim (${info.funcs ?? 6} ฟังก์ชัน, อีเว้นต์ ${info.events ?? 0})`;
      if (info?.state === 'error') return '✖ sim: ' + (info.reason || 'ไม่ทราบสาเหตุ');
      return '– sim: ยังรอ';
    };
```

- [ ] **Step 4: รันเทสให้ผ่าน**

Run: `node --test tests/health.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add wox-editor.user.js tests/health.test.mjs
git commit -m "feat: add LOC.simLine for the health panel"
```

---

### Task 3: ติดตั้ง shim และเก็บ `__woxSim` เป็น `SIM`

**Files:**
- Modify: `wox-editor.user.js:196-211` (หลัง `VERSION`/ตัวแปรกลาง), `:199` (`let … SIM = null, MJ = null`), `:688` (ลบบรรทัด `EV_UNSUPPORTED` ใน `renderCore`), `:1019` (จุดตั้ง `setTimeout` ตรวจระบบ)

**Interfaces:**
- Consumes: `LOC.simNames`, `LOC.absolutize`, `LOC.simPatch`, `LOC.importMapJson`, `LOC.chunkChain`, `LOC.chunkUrl`
- Produces:
  - `installSim()` — เรียกครั้งเดียวตอนต้น IIFE ก่อนสร้าง UI
  - `makeSim(w) → { majorEvent, majorTexts, statOdds, rarityFor, allMajors, openOptions }`
  - `simError: string|null`, `simReady: Promise<void>`
  - `window.__woxSim` (จาก shim), `window.__woxSimError`

- [ ] **Step 1: เพิ่ม `xhrText` + `installSim` หลังบรรทัด `let t = null, ITEMS = null, …`**

ค่า sim หาไม่ได้ต้องไม่ทำให้หน้าเกมพัง: ทุกขั้นอยู่ใน `try/catch` และเขียนเหตุผลลง `window.__woxSimError`

```js
  // ---------- ติดตั้ง import map shim ก่อนเกมโหลด app (พิสูจน์ในเกมจริงแล้ว 2026-11-18) ----------
  // ต้องเป็น DOM node: document.write เขียนทับเอกสาร (หน้าเกมจอดำ) ห้ามใช้
  const simErrorOf = (e) => String((e && e.message) || e);
  const xhrText = (path) => {
    const x = new XMLHttpRequest();
    x.open('GET', location.origin + path, false);
    x.send(null);
    if (x.status !== 200) throw new Error(path + ' ตอบ ' + x.status);
    return x.responseText;
  };
  const installSim = () => {
    // เฉพาะหน้าเกม '/' และเฉพาะตอนที่ parser ยังไม่เริ่ม: import map ที่มาสายถูกเมิน
    if (location.pathname !== '/') return;
    if (document.readyState !== 'loading') { window.__woxSimError = 'ติดตั้ง import map ไม่ทัน (หน้านี้โหลดไปแล้ว)'; return; }
    if (document.querySelector('script[type="module"]')) { window.__woxSimError = 'ติดตั้ง import map ไม่ทัน (boot เริ่มโหลดแล้ว)'; return; }
    try {
      const index = xhrText('/');
      const bootPath = LOC.chunkChain(index, '', '').boot;
      if (!bootPath) throw new Error('ไม่พบ boot script ใน index.html');
      const appPath = LOC.chunkChain(index, xhrText(bootPath), '').app;
      if (!appPath) throw new Error('ไม่พบ app chunk ใน boot');
      const appUrl = LOC.chunkUrl(appPath, location.origin);
      // shim ฝัง LOC ด้วย toString (จึงห้ามฟังก์ชันเหล่านี้อ้างตัวแปรนอกตัวเอง) แล้วรันเป็น ES module
      const shim = 'const simNames=' + LOC.simNames + ',absolutize=' + LOC.absolutize + ',simPatch=' + LOC.simPatch + ';\n' +
        'const appUrl=' + JSON.stringify(appUrl) + ';\n' +
        'try {\n' +
        '  const text = await (await fetch(appUrl, { cache: "force-cache" })).text();\n' +
        '  const names = simNames(text);\n' +
        '  if (!names) throw new Error("หา sim ใน app ไม่เจอ (โค้ดเกมเปลี่ยนรูปร่าง)");\n' +
        '  const a = absolutize(text, new URL(".", appUrl).href);\n' +
        '  const url = URL.createObjectURL(new Blob([a.src + simPatch(names)], { type: "text/javascript" }));\n' +
        '  await import(url);\n' +
        '} catch (e) {\n' +
        '  window.__woxSimError = String((e && e.message) || e);\n' +
        '  await import(appUrl + "?woxed=raw");\n' +
        '}\n';
      const shimUrl = URL.createObjectURL(new Blob([shim], { type: 'text/javascript' }));
      const map = document.createElement('script');
      map.type = 'importmap';
      map.textContent = LOC.importMapJson(appUrl, shimUrl);
      const parent = document.head || document.documentElement;
      if (!parent) throw new Error('ไม่มี head ให้แทรก import map');
      parent.insertBefore(map, parent.firstChild);
    } catch (e) {
      window.__woxSimError = simErrorOf(e); // เกมโหลดแบบเดิมต่อไปได้ ไม่มี sim
    }
  };
  installSim();
```

- [ ] **Step 2: เปลี่ยนบรรทัดตัวแปรกลาง** `wox-editor.user.js:199`

```js
  let t = null, ITEMS = null, REALMS = null, TIERS = null, SIM = null, EVENTS = [];
  let simError = null; // เหตุผลที่ไม่มี sim (จาก window.__woxSimError หรือรอเกินเวลา); null = ยังรอ
```

(`MJ` ยังอยู่จนถึง Task 4 เพราะ `buildEvents` ยังอ้างถึง — ลบพร้อมกันที่นั่น ไม่ให้โค้ดพังกลางทาง)

- [ ] **Step 3: เพิ่ม `makeSim` + ตัวรอ sim** หลัง `store` (ก่อน `const STYLE`)

```js
  // ห่อ __woxSim ด้วยชื่อเดิมที่โค้ดส่วนอื่นเรียกอยู่ (สเปค §2)
  const makeSim = (w) => ({
    majorEvent: (id) => w.majorEvent(id),
    majorTexts: (x) => w.majorTexts(x),
    statOdds: (x, chance, ev, opt) => w.statOdds(x, chance, ev, opt),
    rarityFor: (ev) => w.rarityFor(ev),
    allMajors: () => [...w.events.values()],
    openOptions: (x, ev) => w.openOptions(x, ev),
  });
  // ต้อง poll: boot เรียก wt() แบบไม่ await → load event มาก่อน shim
  const simReady = new Promise((res) => {
    const t0 = Date.now();
    const step = () => {
      if (window.__woxSim) { SIM = makeSim(window.__woxSim); return res(); }
      if (window.__woxSimError) { simError = String(window.__woxSimError); return res(); }
      if (Date.now() - t0 >= 60000) { simError = 'รอ sim เกิน 60 วินาที'; return res(); }
      setTimeout(step, 500);
    };
    step();
  });
```

- [ ] **Step 4: ต่อ sim เข้ากับ UI** — เพิ่มหลัง `startCore();` (`wox-editor.user.js:716`)

```js
    // sim มาถึงทีหลังเกมโหลด: drawEvents จัดการทั้งกรณีมีและไม่มี sim (แสดงเหตุผลเมื่อไม่มี)
    simReady.then(() => { drawEvents(); aiScan(); });
```

- [ ] **Step 5: ลบบรรทัดที่ทำให้สถานะ sim ถูกทับ** — `renderCore` (`wox-editor.user.js:688`)

ลบบรรทัด `$('hevn').textContent = LOC.EV_UNSUPPORTED;` ออกทั้งบรรทัด (สถานะถูกวาดโดย `drawEvents` และ `simReady.then`)

- [ ] **Step 6: ตรวจว่าไฟล์ยังโหลดได้**

Run: `node --check wox-editor.user.js && node --test "tests/**/*.test.mjs"`
Expected: `node --check` เงียบ, เทสผ่านทั้งหมด skip 0

- [ ] **Step 7: Commit**

```bash
git add wox-editor.user.js
git commit -m "feat: install the import-map shim and wrap __woxSim as SIM"
```

---

### Task 4: แท็บอีเว้นต์ใช้ sim จริง และตัดตัวกรอง "สาย"

**Files:**
- Modify: `wox-editor.user.js:407-419` (HTML แท็บ ev), `:550-586` (รายการอีเว้นต์), `:810-816` (ปุ่มเรียกอีเว้นต์)

**Interfaces:**
- Consumes: `SIM.allMajors()`, `SIM.rarityFor(ev)`, `SIM.openOptions(t, ev)`, `SIM.majorEvent(id)`, `LOC.EV_UNSUPPORTED`
- Produces: `EVENTS: object[]` (รายการอีเว้นต์ที่ไม่ซ้ำ มีตัวเลือก)

- [ ] **Step 1: ลบช่องกรอง "สาย" ออกจาก HTML** — ลบบรรทัด `<div class="field"><label for="hevg">สาย</label><select id="hevg"></select></div>` (`wox-editor.user.js:410`)

- [ ] **Step 2: แทน `GROUPS`/`GROUP_OF`/`buildEvents` ด้วยข้อมูลจาก sim**

ลบ `GROUPS` (`:555-557`), `$('hevg').innerHTML = …` (`:557`), `GROUP_OF` (`:558`) และแทน `buildEvents` (`:560-569`) ด้วย:

```js
    // sim เก็บอีเว้นต์ทุกสายใน Map เดียว เกมแบบ bundle ไม่มีข้อมูลกลุ่มให้กรอง (สเปค §2)
    const buildEvents = () => {
      if (!SIM?.allMajors) return;
      const seen = new Set();
      EVENTS = SIM.allMajors().filter((e) => e && e.id && e.options?.length && !seen.has(e.id) && seen.add(e.id));
    };
```

ลบ `MJ` ออกจากบรรทัดตัวแปรกลาง (`:199`) เหลือ `let t = null, ITEMS = null, REALMS = null, TIERS = null, SIM = null, EVENTS = [];`

- [ ] **Step 3: ตัดเงื่อนไขกลุ่มออกจาก `drawEvents`** (`:574-579`) — ลบบรรทัด `const … g = $('hevg').value` ส่วน `g`, ลบเงื่อนไข `(g === 'all' || (GROUP_OF.get(e.id) ?? 'other') === g) &&`, และลบ `$('hevg').onchange = drawEvents;` (`:585`)

ผลที่ต้องเหลือ:

```js
    const drawEvents = () => {
      buildEvents();
      if (!SIM && !EVENTS.length) { $('hevn').textContent = LOC.EV_UNSUPPORTED + (simError ? ' — ' + simError : ''); return; }
      const q = norm($('hevq').value).trim(), r = $('hevr').value;
      // …
    };
```

- [ ] **Step 4: เรียกอีเว้นต์ด้วยตัวเลือกที่เกมเปิดให้จริง** — ในปุ่ม `hevb` (`:810-816`)

```js
      } else if (b.id === 'hevb') {
        if (!SIM) return toast(LOC.EV_UNSUPPORTED + (simError ? ' — ' + simError : ''), true);
        const ev = SIM.majorEvent($('hevl').value);
        if (!ev) return toast('เลือกอีเว้นต์จากรายการก่อน', true);
        if (t.pending && !confirm('ตอนนี้มีอีเว้นต์ค้างอยู่ จะเขียนทับไหม')) return;
        t.pending = { kind: 'major', id: ev.id, options: SIM.openOptions(t, ev), rarity: SIM.rarityFor(ev) };
        msg = `เรียก "${evTitle(ev)}" แล้ว ทำอะไรในเกมสักอย่างเพื่อให้การ์ดขึ้น`;
      }
```

- [ ] **Step 5: ตรวจว่าไม่มีร่องรอยของตัวกรองเก่าและไฟล์ยังโหลดได้**

Run: `node --check wox-editor.user.js && grep -n "hevg\|GROUP_OF\|GROUPS\|MJ\|LIFE_PATH" wox-editor.user.js`
Expected: `node --check` เงียบ; `grep` ไม่พบผล (exit 1)

- [ ] **Step 6: Commit**

```bash
git add wox-editor.user.js
git commit -m "feat: events tab reads events and options from the live sim"
```

---

### Task 5: ช่วยเลือกใช้ sim ที่มาทีหลัง และส่ง `opt` ให้ `statOdds`

**Files:**
- Modify: `wox-editor.user.js:911-971` (aiScan + observer)

**Interfaces:**
- Consumes: `SIM.statOdds(t, chance, ev, opt)`, `SIM.majorEvent`, `SIM.majorTexts`, `aiScan()`
- Produces: ไม่มี (พฤติกรรม)

- [ ] **Step 1: ส่ง `opt` เป็นอาร์กิวเมนต์ที่ 4** — แทนบรรทัด `else if (opt.chance?.stat) p = SIM.statOdds(t, opt.chance, ev);` (`:933`)

```js
          else if (opt.chance?.stat) p = SIM.statOdds(t, opt.chance, ev, opt);
```

- [ ] **Step 2: เริ่ม observer ตั้งแต่ต้น ไม่รอ SIM** — แทน `if (SIM) aiObs.observe(document.body, { childList: true, subtree: true });` (`:971`)

```js
    // sim มาถึงทีหลัง (shim ~1.7 วินาที) จึงต้องเฝ้าตั้งแต่ต้น; aiScan ออกเร็วเมื่อยังไม่มี SIM
    aiObs.observe(document.body, { childList: true, subtree: true });
```

- [ ] **Step 3: ให้ simReady เรียก `aiScan`** — มีแล้วใน Task 3 Step 4 (`aiScan()` ท้าย `simReady.then`)

- [ ] **Step 4: ตรวจไฟล์**

Run: `node --check wox-editor.user.js`
Expected: เงียบ

- [ ] **Step 5: Commit**

```bash
git add wox-editor.user.js
git commit -m "fix: pass the option to statOdds and watch for cards before the sim lands"
```

---

### Task 6: ตรวจระบบ/ตรวจอัปเดต รายงาน sim

**Files:**
- Modify: `wox-editor.user.js:973-1019`

**Interfaces:**
- Consumes: `LOC.simLine`, `LOC.TABLES`, `SIM`, `simError`, `simReady`
- Produces: `simInfo()` (ภายใน), `found.sim` ใน `woxed.manifest`

- [ ] **Step 1: เพิ่ม `simInfo` ก่อน `runHealth`** (`:977`)

```js
    // สถานะ sim สำหรับแผงตรวจระบบ: ok เมื่อมี SIM, error เมื่อรู้เหตุผล, ไม่งั้นยังรอ
    const simInfo = () => SIM
      ? { state: 'ok', funcs: 6, events: SIM.allMajors().length }
      : { state: simError ? 'error' : 'waiting', reason: simError };
```

- [ ] **Step 2: แทนบรรทัด `EV_UNSUPPORTED` ใน `runHealth`** (`:990`)

ลบ `lines.push('– ' + LOC.EV_UNSUPPORTED);` และเพิ่มหลัง `lines.push(...LOC.tableLines(c));`:

```js
      await Promise.race([simReady, new Promise((r) => setTimeout(r, 2000))]); // ให้ sim มีโอกาสมาถึงก่อนสรุป
      lines.push(LOC.simLine(simInfo()));
```

- [ ] **Step 3: เก็บ `sim` ใน manifest** — ใน `checkUpdate` (`:1004-1006`)

```js
      const found = {};
      for (const [, key] of TABLES) found[key] = !!c[key];
      // sim ยังไม่รู้ผล = คงค่าฐานเดิมไว้ ไม่เขียน false ทับ (กันแจ้ง "หาย" ทั้งที่แค่ยังไม่มา)
      found.sim = SIM ? true : simError ? false : !!prev?.found?.sim;
```

และย้าย `let prev = null; try { prev = JSON.parse(store.get('manifest') || 'null'); } catch { /* ใช้ค่าใหม่ */ }` ขึ้นมาก่อนบล็อก `found` (เดิมอยู่หลัง `const cur`)

- [ ] **Step 4: ตรวจไฟล์**

Run: `node --check wox-editor.user.js && node --test "tests/**/*.test.mjs"`
Expected: เงียบ + เทสผ่าน skip 0

- [ ] **Step 5: Commit**

```bash
git add wox-editor.user.js
git commit -m "feat: health and update panels report the sim status"
```

---

### Task 7: ปล่อย 3.4.0 และอัปเดตเอกสาร

**Files:**
- Modify: `wox-editor.user.js:3` (`@version`), `:197` (`VERSION`)
- Modify: `CLAUDE.md` §3, §6, §8
- Modify: `docs/superpowers/plans/2026-11-17-bundle-port.md` (Global Constraint "ห้าม import `app-*.js`")
- Delete: `wox-probe.user.js` (throwaway ของ Task 0)

**Interfaces:**
- Consumes: ทุกอย่างข้างบน
- Produces: release `3.4.0` บน `main`

- [ ] **Step 1: bump เวอร์ชันทั้งสองที่**

`@version      3.4.0` และ `const VERSION = '3.4.0';`

- [ ] **Step 2: ตรวจทั้งชุดก่อนปล่อย**

Run: `node tools/fetch-bundle.mjs && node --check wox-editor.user.js && node --test "tests/**/*.test.mjs"`
Expected: `node --check` เงียบ, เทสผ่านทั้งหมด **skip 0**

- [ ] **Step 3: ลบ probe และอัปเดต CLAUDE.md**

- §3: เพิ่มย่อหน้าสถาปัตยกรรม shim — แทนที่ `b/app-*.js` ผ่าน import map, `LOC.simNames/absolutize/simPatch/importMapJson/simLine`, ห้าม `document.write`, `window.__woxSim` / `__woxSimError`, รอ sim ด้วย poll
- §6: เพิ่มสถานะ v3.4.0 (ยังไม่ทดสอบในเกมจริง)
- §8: เมื่อเกมอัปเดตต้องเช็ก `LOC.simNames` ก่อน (ถ้า sim หาย แท็บอีเว้นต์ถอยไป `EV_UNSUPPORTED` + เหตุผล)
- แผน bundle-port: แก้ข้อ "ห้าม import `app-*.js`" ให้ระบุว่ายกเลิกแล้วโดยนายท่าน 2026-11-18 เพราะ shim แทนที่โมดูลเดิม ไม่ได้โหลดเกมซ้ำ

```bash
rm wox-probe.user.js
```

- [ ] **Step 4: ปล่อย**

Run: `node tools/release.mjs "feat: events tab and helper work on the bundled game (v3.4.0)"`
Expected: ผ่านการตรวจ `@version`/`VERSION`, commit, push

- [ ] **Step 5: แจ้งนายท่านตรวจในเกม 4 ข้อ** (ท้ายสเปค)

1. เกมเปิดและเล่นได้ปกติ ตรวจระบบขึ้น `✔ sim`
2. แท็บอีเว้นต์มีรายการ กรองระดับ/ค้นหาได้ เรียกอีเว้นต์แล้วการ์ดขึ้น
3. ช่วยเลือกแสดงคะแนน + ป้ายบนการ์ด กดอัตโนมัติทำงานเมื่อเปิด
4. เกมไม่กระตุก ปุ่มบนการ์ดกดครั้งเดียวติด

---

## Self-review

- **Spec coverage:** §1 ติดตั้ง shim → Task 3; §2 SIM wrapper + ตาราง mapping → Task 3 + 4 + 5; §3 ทางถอย → Task 3 (`__woxSimError`) + Task 4 (`EV_UNSUPPORTED` + เหตุผล); §4 ตรวจระบบ/ตรวจอัปเดต → Task 2 + 6; LOC ตามสเปค → Task 1 (ใช้ `chunkChain` แทน `appFromBoot`/`bootFromIndex` ซ้ำ); ตรวจว่าเสร็จ → Task 7
- **Type consistency:** `simNames` คืน 6 คีย์ตรงกับ `SIM_KEYS`; `simPatch` ใช้คีย์เดียวกัน; `LOC.simLine` รับ `{state,funcs,events,reason}` ตรงกับ `simInfo()`
- **Review Focus:** ข้อ 1, 6 → Task 3 Step 1 (`try/catch` + fallback import); ข้อ 2 → Task 2 + Task 3 Step 4 + Task 6 Step 2; ข้อ 3 → Task 3 Step 1 (เหตุผลใน `__woxSimError`) + Task 6; ข้อ 4 → Task 4 Step 4; ข้อ 5 → Task 5 Step 1
- **Proportion:** แผนยาวกว่าโค้ดที่เพิ่มเองราว 1.5 เท่า — ลำดับความสำคัญอยู่ที่ regex ของ `simNames` (การตัดสินใจที่ค้นมาแล้ว) และลำดับการแทรก import map
