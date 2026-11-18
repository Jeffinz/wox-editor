# แก้ finding จาก audit (v3.3.2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: ใช้ superpowers:executing-plans ทำทีละ task ใน session เดียว **ห้ามแยก subagent** (นายท่านสั่ง: เปลือง token — ดู `CLAUDE.md` §7) Steps ใช้ checkbox (`- [ ]`)

**Goal:** แก้ทุก finding ของ audit 2026-11-18 ที่ไม่ชนงาน (ก) แล้วปล่อย `wox-editor.user.js` v3.3.2 ครั้งเดียว

**Architecture:** ตรรกะที่ตัดสินใจ (เลือกตาราง, เรียง/กรองไอเทม, สร้างบรรทัดตรวจระบบ, ค่าเข้าช่อง, ระบุแผงเก่า) ย้ายเข้า `LOC` เป็น pure function ที่ห้าม throw แล้วเทสใน Node; โค้ดฝั่ง DOM เรียกใช้เท่านั้น ส่วนที่ผูก DOM ล้วน ๆ ตรวจในเกมโดยนายท่านหลังปล่อย

**Tech Stack:** userscript ไฟล์เดียว (ES2022, Tampermonkey), `node:test` + `node:assert/strict` (Node v22), `gh` CLI

**Spec:** `docs/superpowers/specs/2026-11-18-audit-fixes-design.md` (อ่านคู่กับ `docs/superpowers/notes/2026-11-18-audit-findings.md` และ `CLAUDE.md`)

## Global Constraints

- ห้ามเพิ่ม dependency, ห้ามสร้าง `package.json`, ห้ามใช้ jsdom
- ห้ามลบโค้ดอีเว้นต์/ช่วยเลือกที่ตาย (`SIM`, `MJ`, `EVENTS`, `buildEvents`, `drawEvents`, `WEIGHTS`…`outScore`, `fxScore`, `aiScan`, `placeBadges`)
- ห้ามลบ listener keydown/keypress/keyup ที่ host (`wox-editor.user.js:703-720` โดยประมาณ)
- ห้ามแทรก DOM เข้าไปในเกม; ห้าม `import()` ไฟล์ `app-*.js`/`boot-*.js` ทั้งในสคริปต์และเทส
- ห้ามลบ `tools/snapshot-diff.mjs` และ `src/`
- ฟังก์ชันใหม่ใน `LOC` ต้อง pure และห้าม throw ทุก input; export เพิ่มใน `return { … }` ท้าย `LOC`
- คอมเมนต์ในโค้ดภาษาไทยตามไฟล์เดิม; ไฟล์ใหม่ขึ้นต้นด้วย `// ABOUTME:` 2 บรรทัด
- **ไม่ bump version ระหว่าง Task 1-8** bump ที่ Task 9 บน `main` เท่านั้น
- verify ทุก task: `node --check wox-editor.user.js && node --test "tests/**/*.test.mjs"` ต้อง fail 0 และ **skip 0** (ต้องมี `bundle/mwky5ysx/` จาก Task 0)
- commit ทุก task แบบ conventional commit + บรรทัด `Co-Authored-By` ตามที่ harness กำหนด; ห้าม `--no-verify`

## Review Focus

1. **retry หลังรอบแรกสำเร็จบางส่วน** — ตารางที่ได้รอบแรกต้องอยู่ต่อแม้รอบสองคืน `null` (เทสใน Task 3)
2. **ไอเทมรูปร่างแปลก** (ไม่มี `slot`, `slot` เป็นตัวเลข, `tier` เป็น `"epic"`, `"3"`, `undefined`, `{}`) — เรียง/กรองไม่ throw และไม่ได้ `NaN` (Task 2)
3. **ล้างช่องแล้วกดบันทึก** ทุกช่องตัวเลข — ไม่เขียน `0` ทับ (Task 5 เทส `numOrKeep`; ปุ่มตรวจในเกม)
4. **chunk หลักโหลดได้บางตัว** — ตรวจระบบต้องไม่ขึ้น `✖` ให้ตารางที่ยังไม่รู้ และ `checkUpdate` ต้องไม่เขียนฐาน manifest (Task 4)
5. **userscript อื่นมีคำว่า "WoX Editor" ในเนื้อหา** — ต้องไม่ถูกลบ (Task 7)

---

### Task 0: เตรียม worktree และ bundle

**Files:** ไม่มีไฟล์โค้ด

- [ ] **Step 1:** ใช้ `superpowers:using-git-worktrees` สร้าง worktree branch `fix/audit-v3.3.2` แตกจาก `audit/2026-11-18` (HEAD ต้องมี commit `docs: design the audit fixes for v3.3.2`)
- [ ] **Step 2:** ใน worktree รัน `node tools/fetch-bundle.mjs` → ต้องได้ `bundle/mwky5ysx/` ที่มี `index.html` (โฟลเดอร์ถูก gitignore; ถ้า BUILD เปลี่ยนไปแล้ว ใช้ชื่อใหม่และจดลง journal)
- [ ] **Step 3:** รัน verify → คาดว่า pass 24 / fail 0 / **skip 1** (ข้อ skip คือ `chunkChain reads the real mwkobenp chain` — Task 1 แก้)

### Task 1: F1/T2 — เทส bundle อ่าน build ปัจจุบัน

**Files:**
- Modify: `tests/locate.test.mjs:9-12` (ค่าคงที่ `BUNDLE`/`haveBundle`), `:174-183` (เทส mwkobenp)

**Interfaces:**
- Consumes: `LOC.chunkChain(indexHtml, bootText, appText) -> { boot, app, core }` (มีอยู่แล้ว)
- Produces: helper ในไฟล์เทส `bundleDir() -> URL | null`

- [ ] **Step 1: เขียน `bundleDir()`** ใน `tests/locate.test.mjs`: ถ้ามี env `WOX_BUNDLE` → ถ้าเป็น path ที่มีอยู่ใช้ path นั้น ไม่งั้นถือเป็นชื่อ BUILD ใต้ `bundle/`; ไม่มี env → โฟลเดอร์ใต้ `bundle/` ที่มี `index.html` และ mtime ล่าสุด; ไม่เจอ → `null` (ใช้ `readdirSync`/`statSync` จาก `node:fs`)
- [ ] **Step 2: แทนเทส mwkobenp ด้วย**

```js
test('chunkChain reads the downloaded bundle chain', (t) => {
  const dir = bundleDir();
  if (!dir) return t.skip('ไม่มี bundle/: รัน node tools/fetch-bundle.mjs ก่อน');
  const read = (p) => readFileSync(new URL(p.replace(/^\//, ''), dir), 'utf8');
  const index = read('index.html');
  const boot = LOC.chunkChain(index, '', '').boot;
  assert.match(boot, /^\/b\/boot-[\w-]+\.js$/);
  const app = LOC.chunkChain(index, read(boot), '').app;
  assert.match(app, /^\/b\/app-[\w-]+\.js$/);
  const c = LOC.chunkChain(index, read(boot), read(app));
  assert.ok(c.core.length > 0, 'core ต้องไม่ว่าง');
  for (const p of c.core) assert.ok(existsSync(new URL(p.slice(1), dir)), p + ' ต้องมีไฟล์');
});

test('core chunks of the downloaded bundle hold all four tables', (t) => {
  // assert ด้วย marker ข้อความเท่านั้น ห้าม import chunk
  // marker: 'id:"mortal"' (realms), 'id:"novice"' (martialRanks), '#8c918e' (tiers), 'woodSword' (items)
  // ทุก marker ต้องเจอในไฟล์ core อย่างน้อยหนึ่งไฟล์
});
```

ลบค่าคงที่ `BUNDLE`/`haveBundle` เดิมถ้าไม่มีที่ใช้แล้ว
- [ ] **Step 3:** verify → pass, **skip 0**
- [ ] **Step 4:** ลองไม่มี bundle: `WOX_BUNDLE=nope node --test "tests/**/*.test.mjs"` → สองเทสนี้ skip พร้อมข้อความ fetch (ไม่ fail ไม่ throw)
- [ ] **Step 5:** commit `test: read the downloaded bundle instead of a fixed build`

### Task 2: F5 — เรียงและกรองไอเทมที่เดียว

**Files:**
- Modify: `wox-editor.user.js` ส่วน `LOC` (`tierIdx` `:91-95`, return `:122`), `drawItems` (`:456-468`), `renderCore` บรรทัดเรียง (`:592-593`)
- Create: `tests/items.test.mjs`

**Interfaces:**
- Produces:
  - `LOC.RAR_ORDER = ['common','uncommon','rare','epic','legendary']` (ย้ายจากฝั่ง DOM `:447`; ฝั่ง DOM อ้าง `LOC.RAR_ORDER`)
  - `LOC.tierIdx(tier) -> number | null` — ตัวเลข/สตริงตัวเลข → `min(5, n)` เหมือนเดิม; สตริงใน `RAR_ORDER` → index 0-4; อื่น ๆ → `null`
  - `LOC.itemOrder(a, b) -> number` — tier สูงก่อน, `null` ท้าย, แล้ว `String(a?.slot ?? '').localeCompare(String(b?.slot ?? ''))`
  - `LOC.tierMatches(item, filter: string) -> boolean` — `'all'` → true; `tierIdx === null` → true; ไม่งั้น `String(tierIdx) === filter`

- [ ] **Step 1: เขียนเทสที่ fail** ใน `tests/items.test.mjs` (ABOUTME 2 บรรทัด, โหลด `LOC` ด้วย `createRequire` แบบ `locate.test.mjs`)

```js
test('tierIdx maps rarity strings to 0-4', () => {
  assert.equal(LOC.tierIdx('common'), 0);
  assert.equal(LOC.tierIdx('legendary'), 4);
  assert.equal(LOC.tierIdx('3'), 3);
  assert.equal(LOC.tierIdx(9), 5);
  assert.equal(LOC.tierIdx('weird'), null);
  assert.equal(LOC.tierIdx(undefined), 0); // คงพฤติกรรมเดิม: ไม่มี tier = สามัญ
});
test('itemOrder sorts high tier first, unknown last, then slot', () => {
  const xs = [{ tier: 'common', slot: 'b' }, { tier: 'weird', slot: 'a' }, { tier: 'epic', slot: 'z' }, { tier: 2, slot: 'a' }];
  assert.deepEqual(xs.sort(LOC.itemOrder).map((x) => x.tier), ['epic', 2, 'common', 'weird']);
});
test('itemOrder never throws on missing or odd slot', () => {
  assert.doesNotThrow(() => [{ tier: 1 }, { tier: 1, slot: 3 }, {}, null].sort(LOC.itemOrder));
  assert.equal(Number.isNaN(LOC.itemOrder({ tier: 'epic' }, { tier: 'common' })), false);
});
test('tierMatches', () => {
  assert.equal(LOC.tierMatches({ tier: 'rare' }, '2'), true);
  assert.equal(LOC.tierMatches({ tier: 'rare' }, '3'), false);
  assert.equal(LOC.tierMatches({ tier: 'weird' }, '3'), true);
  assert.equal(LOC.tierMatches({ tier: 5 }, 'all'), true);
});
```

- [ ] **Step 2:** รันเทส → FAIL (`LOC.itemOrder is not a function` ฯลฯ)
- [ ] **Step 3:** เขียน `RAR_ORDER`, ขยาย `tierIdx`, เพิ่ม `itemOrder`, `tierMatches` ใน `LOC`; `drawItems` ใช้ `.filter((i) => LOC.tierMatches(i, r) && <ค้นหาเดิม>).sort(LOC.itemOrder)`; `renderCore` ใช้ `.sort(LOC.itemOrder)`; ลบ `tierIdx` wrapper ฝั่ง DOM ถ้าไม่มีที่ใช้แล้ว
- [ ] **Step 4:** ตรวจว่า map ตรง index ไม่ขัดกับป้าย: ป้ายมาจาก `LOC.tierOf` (ชื่อ `RAR_LBL`) ส่วนตัวกรองใช้ชื่อ `TIER_LBL` — เช่น `uncommon` (ป้าย "ไม่ธรรมดา") อยู่ใต้ตัวกรอง "ขั้นมนุษย์" ถ้าตัดสินว่าสับสนเกินไป ทางที่ spec อนุญาตคือเพิ่มตัวเลือกกรองระดับสตริงแยก (ค่า `r:<key>`) — จดการตัดสินใจลง `journal/2026-11-18.md` ทั้งสองทาง
- [ ] **Step 5:** verify → pass, skip 0
- [ ] **Step 6:** commit `fix: sort and filter string-tier items in one place`

### Task 3: F2/F3/R2 — โหลดตารางซ้ำได้โดยไม่เสียของเดิม

**Files:**
- Modify: `wox-editor.user.js` `LOC`, `loadCore` (`:521-581`), `renderCore` (`:584-600`), `startCore` (`:605-617`)
- Create: `tests/core.test.mjs`

**Interfaces:**
- Produces: `LOC.keepTables(prev, next) -> { realms, martialRanks, tiers, items }` — ต่อคีย์: `next?.[k] ?? prev?.[k] ?? null`; `prev`/`next` เป็น `null` ได้

- [ ] **Step 1: เทสที่ fail** ใน `tests/core.test.mjs`

```js
test('keepTables keeps a table the new round lost', () => {
  const a = { realms: [1], martialRanks: [2], tiers: [3], items: { x: 1 } };
  assert.deepEqual(LOC.keepTables(a, { realms: null, martialRanks: null, tiers: null, items: null }), a);
});
test('keepTables takes new values', () => {
  const out = LOC.keepTables({ tiers: [1] }, { tiers: [9] });
  assert.deepEqual(out.tiers, [9]);
  assert.equal(out.realms, null);
});
test('keepTables accepts null on both sides', () => {
  assert.deepEqual(LOC.keepTables(null, null), { realms: null, martialRanks: null, tiers: null, items: null });
});
```

- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียน `keepTables`; ฝั่ง DOM เก็บ `let tables = null` ระดับหน้า; `renderCore(c)` เริ่มด้วย `tables = LOC.keepTables(tables, c)` แล้วอ่านทั้ง 4 ตารางจาก `tables` (`TIERS = tables.tiers` ไม่ใช่ `c.tiers`)
- [ ] **Step 4: F3** — `startCore` ใน onFulfilled: ตัดสินใจ `const done = LOC.coreLoaded(c)` ก่อน; เรียก `renderCore(c)` ใน `try { … } catch (e) { console.error('[WoX Editor]', e); }`; ล้าง `corePromise` (เมื่อ `corePromise === p`) ถ้า `!done` **หรือ** throw. แก้คอมเมนต์ `:603` ให้ตรง (บั๊กวาดแผงยังโผล่ใน console ผ่าน `console.error`)
- [ ] **Step 5: R2** — `let chainCache = null` ระดับหน้า; ใน `loadCore` ถ้า `chainCache` มีค่าให้ข้าม fetch `/`, boot, app; หลังได้ chain ที่ `app && core.length > 0` ให้ตั้ง `chainCache = chain`. คอมเมนต์: ชื่อ chunk ไม่เปลี่ยนตลอดอายุหน้า และ import ซ้ำใช้ module cache
- [ ] **Step 6:** verify → pass, skip 0
- [ ] **Step 7:** commit `fix: keep loaded tables and allow retry after a render error`

### Task 4: R1/R3/F7 — ตรวจระบบบอกความจริง

**Files:**
- Modify: `wox-editor.user.js` `LOC`, `loadCore` (เพิ่ม `failed`, `reason`), `runHealth` (`:846-867`), `TABLES`/`STATE_KEYS` (`:844-845` ย้ายเข้า `LOC`), `checkUpdate` (อ่าน `LOC.TABLES`)
- Create: `tests/health.test.mjs`

**Interfaces:**
- Consumes: `LOC.coreLoaded(c)` (เดิม — ห้ามเปลี่ยนความหมาย)
- Produces:
  - ผล `loadCore` เพิ่ม `failed: string[]` (path chunk ที่ import ไม่ได้) และ `reason: '' | 'no-state'`
  - `LOC.TABLES = [['REALMS','realms'],['MARTIAL_RANKS','martialRanks'],['TIERS','tiers'],['ITEMS','items']]`
  - `LOC.STATE_REQUIRED = ['money','stats','ageMonths','karma','fame','bag','realm','layer','qi']`
  - `LOC.STATE_OPTIONAL = ['martial','pending']`
  - `LOC.tableLines(c) -> string[]` (ไม่รวมบรรทัด BUILD ซึ่ง `runHealth` ทำเอง)
  - `LOC.stateLines(t, statKeys: string[]) -> string[]`

ข้อความที่ต้องตรงตัว:

| กรณี | บรรทัด |
|---|---|
| `c?.reason === 'no-state'` | `– รอข้อมูลเกมเกิน 2 นาที เล่นในเกมสัก 1 เดือนแล้วกดตรวจอีกครั้ง` |
| `core` ว่าง/ไม่มี `c` | `– ยังไม่ได้อ่าน chunk หลัก` |
| เจอตาราง | `✔ <LABEL> (<where หรือ 'chunk หลัก'>)` |
| ไม่เจอ + `coreLoaded` | `✖ <LABEL>: หาไม่เจอใน chunk หลัก` |
| ไม่เจอ + โหลดบางส่วน | `– <LABEL>: ยังไม่แน่ใจ (chunk <ชื่อไฟล์ใน failed คั่นด้วย ", "> โหลดไม่ได้)` |
| `!t` | `– ยังไม่มีข้อมูลตัวละคร (เล่นในเกม 1 เดือนก่อน แล้วกดตรวจอีกครั้ง)` |
| required ขาด / ครบ | `✖ state ไม่มีฟิลด์: <a, b>` / `✔ state ครบ` |
| stats ขาด | `✖ stats ไม่มีค่า: <a, b>` (เดิม) |
| `martial` มี/ไม่มี | `✔ martial` / `– martial: ไม่มี (ตัวละครไม่ได้อยู่สายยุทธ์)` |
| `pending` มี/ไม่มี | `✔ pending: <kind> <id>` / `– pending: ไม่มีอีเว้นต์ค้าง` |

- [ ] **Step 1: เทสที่ fail** ใน `tests/health.test.mjs` — หนึ่งเทสต่อแถวของตาราง; กรณีบางส่วน:

```js
test('tableLines: partial import shows found tables and unsure ones', () => {
  const c = { core: ['/b/c-a.js', '/b/c-b.js'], imported: false, failed: ['/b/c-b.js'], where: { realms: 'c-a.js' },
    realms: [1], martialRanks: null, tiers: null, items: null };
  const lines = LOC.tableLines(c);
  assert.equal(lines[0], '✔ REALMS (c-a.js)');
  assert.equal(lines[1], '– MARTIAL_RANKS: ยังไม่แน่ใจ (chunk c-b.js โหลดไม่ได้)');
  assert.ok(!lines.some((l) => l.startsWith('✖')));
});
```

และ `stateLines({ ...ครบ required, stats: {body:1,mind:1,will:1,charm:1,luck:1} }, ['body','mind','will','charm','luck'])` ต้องมี `'✔ state ครบ'`, `'– martial: ไม่มี (ตัวละครไม่ได้อยู่สายยุทธ์)'`, `'– pending: ไม่มีอีเว้นต์ค้าง'`
- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียนใน `LOC`; `loadCore` เติม `failed` ใน catch ของ import และ `reason = 'no-state'` เมื่อ `waitState` คืน false; `runHealth` = head + บรรทัด BUILD (เดิม) + `LOC.tableLines(c)` + บรรทัดอีเว้นต์ + `LOC.stateLines(t, STATS.map(([k]) => k))`; `checkUpdate` ใช้ `LOC.TABLES` และยังกันการเขียนฐานด้วย `LOC.coreLoaded` เหมือนเดิม
- [ ] **Step 4:** verify → pass, skip 0
- [ ] **Step 5:** commit `fix: report partial loads, state timeout and optional fields in the health panel`

### Task 5: F6 — ช่องว่างไม่เขียนทับค่าเดิม

**Files:**
- Modify: `wox-editor.user.js` `LOC`, `setStat` (`:638-641`), click handler (`:655-697`)
- Modify: `tests/core.test.mjs`

**Interfaces:**
- Consumes: `LOC.numOr(x) -> number | null` (เดิม)
- Produces: `LOC.numOrKeep(x, prev) -> number` = `numOr(x) ?? (Number.isFinite(prev) ? prev : 0)`

- [ ] **Step 1: เทสที่ fail**

```js
test('numOrKeep keeps the old value for empty or bad input', () => {
  assert.equal(LOC.numOrKeep('', 7), 7);
  assert.equal(LOC.numOrKeep('abc', 7), 7);
  assert.equal(LOC.numOrKeep('0', 7), 0);
  assert.equal(LOC.numOrKeep('12', 7), 12);
  assert.equal(LOC.numOrKeep('', undefined), 0);
});
```

- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียน `numOrKeep`; แก้ปุ่มตามตาราง (toast ข้อผิดพลาดใช้ `toast('ใส่ตัวเลขก่อน', true)` แล้ว `return` ก่อน `fresh`)

| ปุ่ม | ช่องว่าง/ไม่ใช่ตัวเลข |
|---|---|
| `hmb` เงิน, `data-n` กรรม/ชื่อเสียง, `data-s` ค่าพลังเดี่ยว | toast + ไม่เขียน |
| `hsa` บันทึกค่าพลังทั้งหมด | ข้ามช่องที่ว่าง เขียนเฉพาะที่มีค่า; ทุกช่องว่าง → toast |
| `hmr` stage/force, `hrl` layer/qi | `LOC.numOrKeep(value, ค่าเดิมใน t)` |
| `bset` จำนวนในกระเป๋า | ว่าง → toast; `0` → ลบไอเทม (เดิม); ลบติดลบ → `Math.max(0, n)` |
| `hadd` เพิ่มไอเทม | ว่าง → toast `ใส่จำนวนที่มากกว่า 0` (เดิม) |

`setStat`: `(t.stats ??= {})[k] = v`
- [ ] **Step 4:** verify → pass, skip 0
- [ ] **Step 5:** commit `fix: leave game values alone when a number field is empty`

### Task 6: F4/R4/R5/R6/R7 — UI เล็ก ๆ ที่ผูก DOM

**Files:**
- Modify: `wox-editor.user.js` `LOC` (ค่าคงที่), `drawEvents` (`:490-503`), ปุ่ม `hevb` (`:690-695`), `renderCore` (`:597`), `runHealth` บรรทัดอีเว้นต์ (`:866`), `fresh` (`:624`), `placeBadges` + listener (`:765-780`), `aiObs.observe` (`:841`), status `setInterval` (`:643-646`)
- Modify: `tests/core.test.mjs`

**Interfaces:**
- Produces: `LOC.EV_UNSUPPORTED = 'อีเว้นต์/ช่วยเลือก: ยังไม่รองรับเกมแบบ bundle'`

- [ ] **Step 1: เทส** `assert.equal(LOC.EV_UNSUPPORTED, 'อีเว้นต์/ช่วยเลือก: ยังไม่รองรับเกมแบบ bundle')` → FAIL → เพิ่มค่าคงที่ → PASS
- [ ] **Step 2: F4** — `drawEvents`: ถ้า `!SIM && !EVENTS.length` ตั้ง `$('hevn').textContent = LOC.EV_UNSUPPORTED` แล้ว return; ปุ่ม `hevb` ถ้า `!SIM && !EVENTS.length` → `toast(LOC.EV_UNSUPPORTED, true)`; `renderCore` และ `runHealth` ใช้ค่าคงที่เดียวกัน (บรรทัดใน `runHealth` นำหน้าด้วย `– `)
- [ ] **Step 3: R4** — `fresh`: `!['INPUT', 'SELECT', 'TEXTAREA'].includes(root.activeElement?.tagName)`
- [ ] **Step 4: R5** — แยก `const queueBadges = () => { …rAF ครั้งเดียวต่อเฟรม… }` ผูกกับ `scroll`/`resize` แทน `placeBadges`; `placeBadges` return ทันทีเมื่อ `!aiBadges.length && !root.querySelector('.aibadge')`
- [ ] **Step 5: R6** — `if (SIM) aiObs.observe(document.body, { childList: true, subtree: true });` พร้อมคอมเมนต์ว่างาน (ก) ต้องเริ่ม observer เมื่อมีแหล่งข้อมูลอีเว้นต์
- [ ] **Step 6: R7** — status interval เก็บค่าก่อนหน้า (`let lastOn = null`) เขียน `classList`/`textContent` เฉพาะเมื่อ `!!t !== lastOn`
- [ ] **Step 7:** verify → pass, skip 0
- [ ] **Step 8:** commit `fix: stop the events tab from claiming no matches and skip idle UI work`

### Task 7: S5/R8/S6 — ลบเฉพาะแผงของเราเอง และ hook ที่ไม่ทำเกมพัง

**Files:**
- Modify: `wox-editor.user.js` `LOC`, hook `JSON.stringify` (`:131-135`), สร้าง host (`:256`), `dropStalePanels` (`:373-377`)
- Create: `tests/panel.test.mjs`

ข้อเท็จจริงที่ตรวจแล้ว (2026-11-18): ทุก commit ที่แก้สคริปต์ตั้งแต่ v3.0.0 `1a5da62` ถึง v3.3.1 `9f94ca5` มี `aria-label="WoX Editor"` บน `<div class="w" id="w">` ใน shadow root (นับด้วย `git show <c>:wox-editor.user.js | grep -c`) และไม่มี v2.x ค้างใน Tampermonkey (นายท่านยืนยัน)

**Interfaces:**
- Produces: `LOC.isStalePanel(info) -> boolean`, `info = { tag: string, hasShadow: boolean, ours: boolean, label: string | null }` — true เมื่อ `tag === 'DIV' && hasShadow && !ours && label === 'WoX Editor'`

- [ ] **Step 1: เทสที่ fail**

```js
const P = (o) => ({ tag: 'DIV', hasShadow: true, ours: false, label: 'WoX Editor', ...o });
test('isStalePanel matches old editor panels only', () => {
  assert.equal(LOC.isStalePanel(P({})), true);
  assert.equal(LOC.isStalePanel(P({ ours: true })), false);
  assert.equal(LOC.isStalePanel(P({ label: null })), false); // userscript อื่นที่แค่มีคำนี้ในเนื้อหา
  assert.equal(LOC.isStalePanel(P({ tag: 'SECTION' })), false);
  assert.equal(LOC.isStalePanel(P({ hasShadow: false })), false);
  assert.equal(LOC.isStalePanel(null), false);
});
```

- [ ] **Step 2:** รัน → FAIL
- [ ] **Step 3:** เขียน `isStalePanel`; host ตั้ง `host.dataset.woxed = VERSION`; `dropStalePanels` วน `Array.from(document.body.children)` และสร้าง `info` จาก `d.tagName`, `!!d.shadowRoot`, `d === host || 'woxed' in d.dataset`, `d.shadowRoot?.querySelector('#w')?.getAttribute('aria-label') ?? null`
- [ ] **Step 4: S6** — hook: `let hit = false; try { hit = <เงื่อนไขเดิม>; } catch { hit = false; } if (hit) t = o; return orig.call(this, o, r, s);`
- [ ] **Step 5:** verify → pass, skip 0
- [ ] **Step 6:** commit `fix: remove only old editor panels and guard the state hook`

### Task 8: F8 — เอกสารตรงกับโค้ด

**Files:**
- Modify: `AGENTS.md`, `CLAUDE.md` (§2, §3, §5, §6), `docs/superpowers/notes/2026-11-17-events-spike.md` (หัวไฟล์), `docs/superpowers/plans/2026-11-17-bundle-port.md` (หัวไฟล์)

- [ ] **Step 1:** `AGENTS.md` — เขียนใหม่ให้ตรงระบบ bundle หรือย่อเหลือชี้ไป `CLAUDE.md` (แนะนำย่อ: แหล่งเดียว) ต้องไม่มี `import('/src/…')`, "ประมาณ 500 บรรทัด", `sim.js:<บรรทัด>`
- [ ] **Step 2:** `CLAUDE.md` §2 จำนวนบรรทัดตาม `wc -l wox-editor.user.js`; §3 เพิ่มฟังก์ชันใหม่ใน `LOC` (`keepTables`, `itemOrder`, `tierMatches`, `tableLines`, `stateLines`, `numOrKeep`, `isStalePanel`, `EV_UNSUPPORTED`) และ `data-woxed`; §5 เพิ่มบทเรียน: เทสที่ skip ตัวเองเมื่อไม่มีไฟล์ = เขียวหลอก (ต้องรัน fetch ก่อนและดู skip 0), ช่องว่างห้ามเขียน 0; §6 เพิ่ม v3.3.1 (ผู้ใช้ทดสอบผ่าน) และ v3.3.2 (ยังไม่ทดสอบในเกม)
- [ ] **Step 3:** หัวไฟล์ spike และ bundle-port: บรรทัด `> หมายเหตุ 2026-11-18: offset และชื่อ chunk ในไฟล์นี้เป็นของ build mwkobenp ใช้กับ mwky5ysx ไม่ได้ ตัวชี้วัดเชิงโครงสร้าง (#choice-options, weight:.55, gap:480) ยังใช้ได้` ไม่แก้เนื้อหาเดิม
- [ ] **Step 4:** `grep -n "500 บรรทัด\|/src/sim.js\|import('/src" AGENTS.md CLAUDE.md` → ไม่เจอที่อ้างเป็นปัจจุบัน
- [ ] **Step 5:** commit `docs: match the agent docs to the bundled game`

### Task 9: S1 + ปล่อย v3.3.2

**ขั้นนี้แตะ GitHub จริงและ push `main` — ทำตามลำดับเท่านั้น**

- [ ] **Step 1:** verify ใน worktree ครั้งสุดท้าย → pass, fail 0, skip 0; รัน `superpowers:requesting-code-review` **แบบ inline** (ไม่แยก subagent) ทั้ง branch เทียบ `main` แก้สิ่งที่เจอ
- [ ] **Step 2: S1 อ่านสถานะเดิม** — `gh api repos/Jeffinz/wox-editor/rulesets` และ `gh api repos/Jeffinz/wox-editor/branches/main/protection` (404 = ไม่มี) จดผลลง journal
- [ ] **Step 3: S1 ตั้งกฎ** — ตรวจกับเอกสาร GitHub REST "Create a repository ruleset" ก่อน (ห้ามเดา field) แล้วสร้าง ruleset ที่ใช้กับ `refs/heads/main`, `enforcement: "active"`, rules `non_fast_forward` + `deletion`, **`bypass_actors: []`** (บังคับเจ้าของด้วย — นายท่านเลือก) ไม่มีกฎ review/status check; จด `id` ที่ได้
- [ ] **Step 4: S1 ยืนยัน** — `gh api repos/Jeffinz/wox-editor/rules/branches/main` ต้องเห็นสองกฎ
- [ ] **Step 5:** ใน checkout หลัก: `git switch main` → `git merge --no-ff fix/audit-v3.3.2` (ไม่ push) → ถ้า conflict หยุดและรายงาน
- [ ] **Step 6:** bump `@version` และ `VERSION` เป็น `3.3.2` ใน `wox-editor.user.js` บน `main`
- [ ] **Step 7:** `node tools/release.mjs --dry-run "fix: apply the 2026-11-18 audit fixes (v3.3.2)"` → ผ่าน
- [ ] **Step 8:** `node tools/release.mjs "fix: apply the 2026-11-18 audit fixes (v3.3.2)"` → push สำเร็จ (นี่คือหลักฐานว่า S1 ไม่บล็อก push ปกติ); ถ้า push ถูกปฏิเสธ หยุด อย่าปิดกฎเอง รายงานนายท่าน
- [ ] **Step 9:** `curl -s https://raw.githubusercontent.com/Jeffinz/wox-editor/main/wox-editor.user.js | grep "@version"` → `3.3.2` (raw อาจ cache สักครู่)
- [ ] **Step 10:** ไม่ต้อง push branch `audit/2026-11-18` หรือ `fix/audit-v3.3.2` (merge เข้า `main` แล้ว); ลบ worktree ตาม `superpowers:finishing-a-development-branch`
- [ ] **Step 11:** เขียน `HANDOFF.md` ด้วยสกิล `handoff` ให้มี: id ของ ruleset, คำสั่งปิด (`gh api -X DELETE repos/Jeffinz/wox-editor/rulesets/<id>`) และเปิดกลับ, รายการตรวจในเกม 7 ข้อจาก spec §"ตรวจในเกม", และสิ่งที่ยังไม่ทำ (F4 โค้ดตาย → งาน (ก)); commit `docs: hand off v3.3.2 for in-game checks` แล้ว push `main` ด้วย `git push` ธรรมดา (ไม่ใช่ force)
- [ ] **Step 12:** journal `journal/2026-11-18.md`: สิ่งที่ทำ, การตัดสินใจ F5, ผล S1
