# ย้ายสคริปต์ไปใช้ bundle ของเกม (BUILD mwkobenp) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ `wox-editor.user.js` กลับมาแสดงขั้นพลัง, ขั้นยุทธ์, ไอเทม และระดับไอเทมได้บนเกมเวอร์ชันที่ bundle แล้ว ตรวจระบบและตรวจอัปเดตต้องบอกสถานะจริง ส่วนอีเว้นต์และช่วยเลือกต้องหาทางก่อน แล้วรอนายท่านตัดสินใจ

**Architecture:** หน้าเกมไม่มี `/src/*.js` แล้ว (ได้ 404) เกมโหลด `b/boot-*.js` → `b/app-*.js` → chunk ร่วม `b/c-*.js` ชื่อไฟล์และชื่อ export เปลี่ยนทุก build สคริปต์จะอ่านชื่อ chunk จากตัวไฟล์ (fetch เป็นข้อความ ไม่รัน) แล้ว `import()` chunk หลักด้วย URL เดียวกับเกม เพื่อได้ instance เดิม จากนั้นหาตารางข้อมูลจาก**รูปร่างของค่า** ไม่ใช้ชื่อ

**Tech Stack:** userscript ไฟล์เดียว (Tampermonkey, ES2022), Node 22 `node:test` สำหรับเทส, `tools/fetch-bundle.mjs` สำหรับดึง bundle มาอ่าน

**Spec:** ไม่มีไฟล์ spec แยก หลักฐานอยู่ในหัวข้อ "สิ่งที่ตรวจพบ" ด้านล่าง กับ evidence ของ REA ที่ `bundle/rea-evidence-mwkobenp.json` (146 MB อยู่ใต้ `bundle/` ซึ่ง ignore ไว้)

## สิ่งที่ตรวจพบ (17 พ.ย. 2026, BUILD `mwkobenp`)

ผลตรวจมาจาก REA (`analyze_javascript_application`, evidence `ev_b19b48c8…`) และ grep บน `bundle/mwkobenp/` REA วิเคราะห์ `c-577XDD6D.js` (5.6 MB) กับ `app-56NJKGMX.js` (5.4 MB) ไม่ได้ เพราะ heap 1024 MiB หมด ข้อเท็จจริงเรื่องสองไฟล์นี้จึงมาจาก grep อย่างเดียว

| เรื่อง | สิ่งที่เห็น |
|---|---|
| `/src/sim.js` ฯลฯ | 404 ทุกแบบ header ยกเว้น `/src/build.js` ที่ยังได้ 200 (`export const BUILD = "mwkobenp"`) |
| index.html | โหลด `<script type="module" src="b/boot-3ENUIJBD.js">` ตัวเดียว |
| boot | `import{…}from"./c-VVBFTXUG.js"` และ `"./c-RCZEDD4B.js"` แบบ static; `import("./app-56NJKGMX.js")` หรือ `import("./wiki-….js")` แบบ dynamic |
| app | `import{… as …}from"./c-577XDD6D.js"` แบบ static; ไม่มี `export` เลย |
| chunk หลัก `c-577XDD6D.js` | `export{…}` 1789 ชื่อ ชื่อถูกย่อ |
| `REALMS` | `bo=[{id:"mortal",lifespan:75,statCap:100,layers:0,…}]` export เป็น `q` |
| `MARTIAL_RANKS` | `Xr` export เป็น `Ca`; ตัวแรก `{id:"novice",th:"ผู้ฝึกยุทธ์",…,years:0,…}` |
| `TIERS` | `Wl` export เป็น `Xe`; ตัวแรก `{th:"สามัญ",en:"Common",color:"#8c918e"}` |
| `ITEMS` | `qe=Object.fromEntries([Vt("woodSword","weapon",0,"ดาบไม้",…),…])` export เป็น `_e` |
| ข้อมูลเข้ารหัส | boot ดึง `d/*.bin` แล้วถอดรหัส AES-GCM ใส่ `u.d` ใน `c-VVBFTXUG.js` (`var u={d:null,blob:null,manifest:null,entry:null};export{u as a}`) key ข้างในใช้ชื่อโมดูลและ export เดิม เช่น `d.wuxia.WUXIA_ITEMS` |
| top-level ของ `c-577` | `throw new Error("wox: the data of wuxia is not loaded …")` ถ้า `u.d` ยังว่าง |
| sim (`majorTexts`, `statOdds`, `rarityFor`, `majorEvent`, `allMajors`, `eventsForAudit`) และ `LIFE_PATH` | อยู่ใน `app-*.js` ทั้งหมด (`"lifePath"`, `"jhStage"`, clamp `.02,.95` เจอเฉพาะใน app) app ไม่มี export จึง import ไม่ได้ |

## Global Constraints

- สคริปต์ยังเป็นไฟล์เดียว `wox-editor.user.js` ห้ามแยกไฟล์ เพราะ Tampermonkey ติดตั้งจาก raw URL ไฟล์เดียว
- ห้ามถอดรหัส `d/*.bin` นอกเกม ห้ามคัดลอก key จาก `c-RCZEDD4B.js` และห้ามเก็บข้อมูลที่ถอดแล้วลง repo เจ้าของเกมตั้งใจปิดส่วนนี้ เราอ่านได้เฉพาะค่าที่อยู่ในหน่วยความจำของหน้าเกมตอนรัน
- ห้าม `import()` URL ที่เกมยังไม่ได้โหลด และห้าม import `app-*.js` หรือ `boot-*.js` เพราะจะรันเกมซ้ำอีกชุด
- URL ที่ import ต้องตรงกับที่เกมใช้ทุกตัวอักษร: `new URL('./c-XXXX.js', location.origin + '/b/')` โดยไม่ต่อ query string
- ห้ามแตะอันดับหรือตลาดผู้เล่น (ขอบเขตเดิมของโปรเจกต์)
- ค่าคงที่ `TIER_LBL`, `RAR_LBL` ยังเป็นสำเนาในสคริปต์เหมือนเดิม
- ทุกครั้งที่แก้สคริปต์: `node --check wox-editor.user.js`, bump `@version` + `VERSION` เป็น `3.3.0` พร้อมกัน แล้วปล่อยด้วย `node tools/release.mjs "…"`
- ไฟล์ใหม่ที่เขียนเองขึ้นต้นด้วย `// ABOUTME:` 2 บรรทัด
- ทำงานบน branch `wip/bundle-fetch` ใน worktree `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch` (มี commit `07979af` ที่เพิ่ม `tools/fetch-bundle.mjs` แล้ว)

## Review Focus

1. **สคริปต์ import chunk หลักก่อนเกมโหลดข้อมูลเสร็จ:** `c-577` จะ throw ตอนรัน top-level แล้ว module ค้างในสถานะ error ถาวร ทำให้**เกมพังด้วย** ต้องรอให้ `t` (state) ถูกจับได้ก่อน import ทุกครั้ง → เทสใน Task 2
2. **เกม build ใหม่แล้วรูปร่างค่าเปลี่ยน:** ถ้าหาไม่เจอ ต้องได้ `null` และแผงต้องบอกว่า "หาไม่เจอ" ห้าม throw หรือเลือกผิดตัวแบบเงียบ → เทสใน Task 1 (namespace ที่ไม่มีค่าตรง และที่มีค่าตรงสองตัว)
3. **ไอเทมที่ `tier` เป็นสตริง** (bundle มี `tier:"legendary"` ในของสวมใส่บางชุด) `itemRar` ต้องไม่ throw และแสดงระดับตามชื่อสตริงนั้น → เทสใน Task 3
4. **chunk ที่ไม่ใช่ chunk หลัก export ค่าแปลกๆ** เช่น getter ที่ throw `export{r as default}` ของ story pack ตัวค้นหาต้องข้าม export ที่อ่านแล้ว throw → เทสใน Task 1
5. **ผู้เล่นเปิดหน้า wiki** (`<meta name="wox-entry" content="wiki">`) boot จะโหลด `wiki-*.js` แทน app สคริปต์ต้องไม่พังและไม่ import อะไร → เทสใน Task 2

---

### Task 1: ตัวค้นหาตารางจากรูปร่างค่า (pure) + โครงเทส

**Files:**
- Modify: `wox-editor.user.js` (เพิ่มบล็อก `LOC` ต้น IIFE ก่อนบรรทัด `const VERSION`)
- Create: `tests/locate.test.mjs`
- Modify: `tools/release.mjs` (รัน `node --test tests/` ต่อจาก `node --check`)

**Interfaces:**
- Produces: `LOC.pick(ns: object, test: (v) => boolean): any | null` คืนค่า export เดียวที่ผ่าน `test`; ไม่มีหรือมีมากกว่า 1 → `null`; export ที่อ่านแล้ว throw ให้ข้าม
- Produces: `LOC.IS = { realms, martialRanks, tiers, items }` เป็นฟังก์ชัน `(v) => boolean` ตามเกณฑ์นี้:
  - `realms`: Array ที่ `[0].id === "mortal"` และ `typeof [0].lifespan === "number"`
  - `martialRanks`: Array ที่ `[0].id === "novice"` และ `"years" in [0]`
  - `tiers`: Array ที่ `[0].color === "#8c918e"` และ `[0].en === "Common"`
  - `items`: object (ไม่ใช่ Array) ที่ `Object.getOwnPropertyDescriptor(v, "woodSword")?.value?.slot === "weapon"`
- Produces: ทางเข้าเทส: บรรทัดแรกในบล็อกหลังสร้าง `LOC` คือ `if (typeof document === 'undefined') { module.exports = LOC; return; }` (Node โหลดไฟล์ `.js` นี้แบบ CommonJS เพราะ repo ไม่มี `package.json`)

- [ ] **Step 1: เขียนเทสที่ fail** ใน `tests/locate.test.mjs` โหลดด้วย `createRequire(import.meta.url)('../wox-editor.user.js')`
  - `pick finds the one realms export`: ns = `{ q: [{id:"mortal",lifespan:75,layers:0}], x: [1,2] }` → `pick(ns, IS.realms)` เท่ากับ `ns.q`
  - `pick returns null when nothing matches`: ns = `{ a: [] , b: {} }` → `null`
  - `pick returns null when two match`: ns มี realms สองตัว → `null`
  - `pick skips throwing getters`: ns สร้างด้วย `Object.defineProperty(…, 'z', { get(){ throw new Error('x') }, enumerable:true })` บวก realms หนึ่งตัว → ได้ realms
  - `items matches non-enumerable woodSword`: object ที่ `woodSword` ตั้งด้วย `defineProperty` แบบ `enumerable:false` → `IS.items` เป็น `true`
  - `tiers and martialRanks match their first rows` ใช้ค่าแถวแรกจากตาราง "สิ่งที่ตรวจพบ"
- [ ] **Step 2: รัน** `node --test tests/` ผลที่ต้องได้: FAIL (`LOC` ยังไม่มี หรือ require แล้วเจอ `document is not defined`)
- [ ] **Step 3: เขียน `LOC.pick` กับ `LOC.IS`** ตาม Interfaces วนด้วย `Object.keys(ns)` เพราะ namespace ของ ES module เป็น enumerable ทุกตัว
- [ ] **Step 4: รัน** `node --test tests/` และ `node --check wox-editor.user.js` ต้องผ่านทั้งหมด
- [ ] **Step 5: แก้ `tools/release.mjs`** ให้รัน `run('node', ['--test', 'tests/'])` ต่อจาก `node --check` แล้วลอง `node tools/release.mjs --dry-run` ต้องจบที่ `dry-run: ไม่ commit/push`
- [ ] **Step 6: Commit** `test: add shape-based export locator for bundled game`

### Task 2: หา chunk หลักจากไฟล์ของเกม แล้ว import ให้ปลอดภัย

**Files:**
- Modify: `wox-editor.user.js` (เพิ่มใน `LOC` และแทนบล็อก `import('/src/data.js')`…`import('/src/items.js')` ที่ประมาณบรรทัด 389-404)
- Test: `tests/locate.test.mjs`

**Interfaces:**
- Consumes: `LOC.pick`, `LOC.IS` (Task 1)
- Produces: `LOC.chunkChain(indexHtml: string, bootText: string, appText: string): { boot: string, app: string|null, core: string[] }` เป็น pure: อ่าน `<script … src="b/boot-….js">` จาก index, หา `import("./app-….js")` จาก boot, หา `from"./c-….js"` ใน app คืน path แบบ `/b/xxx.js` ถ้าเป็นหน้า wiki หรือหาไม่เจอ → `app: null, core: []`
- Produces: `loadCore(): Promise<{ build, core: string[], realms, martialRanks, tiers, items }>` (ใน IIFE ไม่ใช่ pure) ขั้นตอนตามลำดับ: (1) รอจน `t` มีค่า, (2) `fetch` index/boot/app แบบ `cache:'no-store'` เป็นข้อความ, (3) `chunkChain`, (4) `import()` เฉพาะ path ใน `core`, (5) `pick` ทั้ง 4 ตาราง ค่าที่หาไม่เจอเป็น `null`
- Produces: ตัวแปรเดิม `REALMS`, `ITEMS` และ `<select>` `h_realm`, `h_mrank` ถูกเติมจากผล `loadCore()` แทน `/src/*.js` พร้อมตัวแปรใหม่ `TIERS` (ใช้ใน Task 3)

- [ ] **Step 1: เขียนเทสที่ fail ด้วยไฟล์จริง** `chunkChain reads the real mwkobenp chain`: อ่าน `bundle/mwkobenp/index.html`, `b/boot-3ENUIJBD.js`, `b/app-56NJKGMX.js` ด้วย `readFileSync` (ถ้าไม่มีโฟลเดอร์ให้ `t.skip('run node tools/fetch-bundle.mjs first')`) ต้องได้ `boot === '/b/boot-3ENUIJBD.js'`, `app === '/b/app-56NJKGMX.js'`, `core` มี `'/b/c-577XDD6D.js'`
- [ ] **Step 2: เขียนเทสที่ fail สำหรับ wiki** `chunkChain returns no core for wiki entry`: boot text ที่มีแต่ `import("./wiki-X.js")` → `app: null, core: []`
- [ ] **Step 3: รัน** `node --test tests/` ผลที่ต้องได้: FAIL 2 เทสใหม่
- [ ] **Step 4: เขียน `LOC.chunkChain`** แล้วรันเทสให้ผ่าน
- [ ] **Step 5: เขียน `loadCore()`** และแทนบล็อก import เดิม ข้อความ error ในแผงคงเดิม เช่น `'โหลดรายการไอเทมไม่ได้ ลองรีโหลดหน้าเกม'` และ `.catch` ต้องไม่ทำให้เกมหยุด
- [ ] **Step 6: รัน** `node --check wox-editor.user.js && node --test tests/` ต้องผ่าน
- [ ] **Step 7: Commit** `feat: load realms, martial ranks and items from the game bundle`

### Task 3: ระดับไอเทมจาก `TIERS` ของเกม + รองรับ tier แบบสตริง

**Files:**
- Modify: `wox-editor.user.js` (`itemRar` บรรทัด 332; ย้าย `TIER_LBL` บรรทัด 329 และ `RAR_LBL` บรรทัด 330 เข้าไปในบล็อก `LOC` เพื่อให้เทสเรียกได้ โค้ดเดิมอ้างผ่าน `LOC.TIER_LBL`/`LOC.RAR_LBL` หรือประกาศ const ชื่อเดิมชี้ไปที่ค่าเดียวกัน)
- Test: `tests/locate.test.mjs`

**Interfaces:**
- Consumes: `TIERS` จาก `loadCore()` (Task 2)
- Produces: `LOC.tierOf(item, tiers: Array|null): [th: string, color: string]` (รูปแบบ tuple เดียวกับ `TIER_LBL`/`RAR_LBL` ที่มีอยู่) เมื่อ `tier` เป็นตัวเลขให้ใช้ `[tiers[tier].th, tiers[tier].color]` ถ้ามี ไม่มีก็ใช้ `TIER_LBL[min(5, tier)]` เมื่อเป็นสตริงให้ใช้ `RAR_LBL[tier]` ถ้าไม่เจอให้ใช้ `TIER_LBL[0]` ห้าม throw `itemRar(i)` เปลี่ยนเป็น `LOC.tierOf(i, TIERS)`

- [ ] **Step 1: เขียนเทสที่ fail** สามข้อ: `tier 0` → `[0]` เป็น `"สามัญ"`; `tier "legendary"` → เท่ากับ `RAR_LBL.legendary`; `tier undefined` → เท่ากับ `TIER_LBL[0]`
- [ ] **Step 2: รัน** `node --test tests/` ผลที่ต้องได้: FAIL
- [ ] **Step 3: เขียน `LOC.tierOf`** แล้วให้ `itemRar` เรียกใช้ จากนั้นรันเทสให้ผ่าน
- [ ] **Step 4: Commit** `fix: show item tier for string and numeric tiers`

### Task 4: ตรวจระบบและตรวจอัปเดตแบบ bundle

**Files:**
- Modify: `wox-editor.user.js` (`NEEDS`, `runHealth`, `WATCH`, `exportsOfSrc`, `checkUpdate` ประมาณบรรทัด 619-690)
- Modify: `CLAUDE.md` หัวข้อ 3, 6 และ 8 (ให้ตรงกับระบบใหม่ และบอกว่า `tools/snapshot-diff.mjs` กับ `src/` ในเครื่องใช้กับเกมเวอร์ชันนี้ไม่ได้แล้ว **ห้ามลบสองตัวนี้** รอนายท่านสั่งก่อน)

**Interfaces:**
- Consumes: `loadCore()` (Task 2)
- Produces: `runHealth` แสดงหนึ่งบรรทัดต่อตาราง: `✔ REALMS (c-577XDD6D.js)` หรือ `✖ REALMS: หาไม่เจอใน chunk หลัก` บวกบรรทัด BUILD จาก `/src/build.js` (ไฟล์นี้ยังได้ 200) ส่วน sim แสดง `– อีเว้นต์/ช่วยเลือก: ยังไม่รองรับเกมแบบ bundle (ดู Task 5)`
- Produces: `checkUpdate` เก็บ `{ build, chain: { boot, app, core }, found: { realms: bool, … } }` ใน `woxed.manifest` แจ้งเมื่อ `build` เปลี่ยน หรือเมื่อตารางที่เคยเจอหายไป ห้าม hash ไฟล์ chunk เพราะชื่อไฟล์มี hash อยู่แล้ว

- [ ] **Step 1: เขียนเทสที่ fail** สำหรับ pure `LOC.diffManifest(prev, cur): { changed: boolean, lost: string[] }`: prev ที่เป็น `null` → `changed:false, lost:[]`; build ต่างกัน → `changed:true`; `found.items` จาก true เป็น false → `lost` มี `"items"`; manifest รูปแบบเก่า (มี `files`) → ถือว่าไม่มีฐาน
- [ ] **Step 2: รัน** `node --test tests/` ผลที่ต้องได้: FAIL
- [ ] **Step 3: เขียน `LOC.diffManifest`** แล้วแก้ `runHealth`/`checkUpdate` ให้ใช้ ลบ `exportsOfSrc` กับ `hashOf` ถ้าไม่มีใครใช้แล้ว
- [ ] **Step 4: รัน** `node --check wox-editor.user.js && node --test tests/` ต้องผ่าน
- [ ] **Step 5: แก้ CLAUDE.md** ตามรายการ Files
- [ ] **Step 6: bump `@version` และ `VERSION` เป็น `3.3.0`** แล้วรัน `node tools/release.mjs --dry-run` ต้องผ่าน
- [ ] **Step 7: Commit** `feat: health and update checks for the bundled game (v3.3.0)`
- [ ] **Step 8: ทดสอบในเกมจริง (end-to-end)** ให้นายท่านติดตั้งจาก branch นี้ หรือใช้ claude-in-chrome ถ้านายท่านอนุญาต แล้วเช็กตามนี้: เกมเล่นได้ปกติ, แผงตรวจระบบขึ้น `✔` ครบ 4 ตาราง, เลือกขั้นพลัง/ขั้นยุทธ์ได้, แท็บกระเป๋ามีรายการไอเทมพร้อมป้ายระดับ, console ไม่มี error ใหม่ ห้าม release จริงก่อนผ่านข้อนี้

### Task 5: Spike อีเว้นต์และช่วยเลือก (หาข้อมูลอย่างเดียว ไม่แก้โค้ด)

ฟังก์ชัน sim อยู่ใน `app-*.js` ซึ่งไม่มี export จึงทำแบบ Task 2 ไม่ได้ งานนี้จบที่เอกสารผลการค้นหา แล้ว**หยุดรอนายท่านตัดสินใจ**

**Files:**
- Create: `docs/superpowers/notes/2026-11-17-events-spike.md`

- [ ] **Step 1: เช็กว่า chunk หลักมี sim ส่วนไหนบ้าง** เช่น ข้อมูลอีเว้นต์ ตารางความหายาก (`RARITY`) และค่าที่ `rarityFor` ใช้ ให้ใช้ grep ข้อความเฉพาะจาก `src/sim.js` กับ `src/rarity.js` เก่า แล้วจับคู่กับรายการ `export{…}` ของ `c-577`
- [ ] **Step 2: เช็กว่า state มีอะไรให้ใช้** เช่น `t.pending` มีข้อความหรือโอกาสของตัวเลือกติดมาหรือไม่ และการ์ดอีเว้นต์ใน DOM (`#choice-options`) แสดงโอกาสหรือไม่
- [ ] **Step 3: เขียนทางเลือกพร้อมความเสี่ยง** อย่างน้อยครอบคลุม (ก) ใช้เท่าที่ได้จาก chunk หลักกับ state, (ข) ตัดแท็บอีเว้นต์และช่วยเลือกออก, (ค) ทางอื่นที่เจอ ทางที่ต้องรันโค้ดของ app ซ้ำ หรือต้องถอดรหัส blob นอกเกม ให้บันทึกว่า "ไม่เข้าเงื่อนไข" ตาม Global Constraints
- [ ] **Step 4: Commit** `docs: record events/assistant options for the bundled game` แล้วหยุดรอนายท่าน
