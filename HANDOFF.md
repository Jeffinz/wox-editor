# Handoff: v3.4.0 — คืนแท็บอีเว้นต์/ช่วยเลือกด้วย import map (สเปคอนุมัติแล้ว ยังไม่เริ่มโค้ด)

Written: 2026-11-18 11:17 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน กติกาของโปรเจ็คอยู่ในนั้น: ตอบภาษาไทย, รัน `node --check`, bump `@version` และ `VERSION` พร้อมกัน, ปล่อยด้วย `tools/release.mjs`, เรียกผู้ใช้ว่า "นายท่านชาโดว์" และ**ห้ามแยก subagent** (§7)

## Goal

ทำให้แท็บอีเว้นต์ (รายการ/กรอง/เรียกอีเว้นต์) และแท็บช่วยเลือก (ให้คะแนน, ป้ายบนการ์ด, กดอัตโนมัติ) กลับมาใช้ได้กับเกมแบบ bundle ตอนนี้ทั้งสองแท็บขึ้นแค่ "อีเว้นต์/ช่วยเลือก: ยังไม่รองรับเกมแบบ bundle"

ทางที่นายท่านเลือก: แทนที่ `app-*.js` ของเกมด้วยสำเนาที่เติมบรรทัด `window.__woxSim = {…}` ผ่าน import map ตามสเปค `docs/superpowers/specs/2026-11-18-events-tab-design.md` (อนุมัติ 2026-11-18)

"เสร็จ" = เกณฑ์ท้ายสเปค: เทสใหม่ผ่าน, ทั้งชุด skip 0, `node --check` ผ่าน และนายท่านตรวจในเกมจริงผ่าน Tampermonkey ครบ 4 ข้อ

## Where things stand

สเปคอนุมัติและ commit แล้ว ยังไม่ได้เขียนแผนหรือโค้ด นายท่านสั่งให้ handoff ไว้ก่อน **ยังไม่ให้เริ่มลงมือ** ในเซสชันเดียวกัน งาน audit ปิดไปแล้ว (v3.3.3 บน `main`)

## Verified facts

- **เทสผ่าน 46/46 skip 0** กับ build `mwlkbpdo` — `node --test "tests/**/*.test.mjs"` ณ 2026-11-18 ~11:00 สคริปต์ v3.3.3 ไม่พังกับ build ใหม่
- **เกมออก build ใหม่บ่อย**: วันนี้เห็น `mwlj4t86` → `mwlkbpdo` → `mwll6s9j` (`ls bundle/` หลัง `node tools/fetch-bundle.mjs`) build ปัจจุบัน ณ เวลาเขียนคือ `mwll6s9j` app คือ `bundle/mwll6s9j/b/app-QHVRDERS.js`
- **ข้อมูลอีเว้นต์อยู่ใน `app-*.js` เท่านั้น และไฟล์ไม่มี `export{`** — grep `พิธีบรรลุนิติภาวะ`, `weight:.55`, `gap:480`, `choice-options`, `fate-pick` เจอเฉพาะ `app-MA7BSIAL.js` ใน `bundle/mwlkbpdo/b/` (spike §6)
- **ตรวจในเกมจริงข้อ 1-4 ของ spike** (การ์ด major 12 ใบ): `pending.rarity` มีครบ 12/12, ปุ่มที่มี `small.odds[data-stat]` 9/35, entry `kind:"major"` ใน `t.log` มี `rarity` 11/11, `window.wox` (`/?promo`) ไม่มี sim — รายละเอียด spike §6
- **import map + shim ใช้ได้** (จำลองใน Chrome ด้วย `document.write`, build `mwll6s9j`): เกมเล่นได้ปกติ, shim ใช้ ~1.7 วินาที, `__woxSim.events` เป็น `Map` 16,619 อีเว้นต์, `majorTexts`/`statOdds` คืน `fx`/`act`/`chance`/โอกาสจริง, ตั้ง `t.pending` เองแล้วการ์ด "ถ้ำหลังน้ำตก" ขึ้นจริง — spike §7
- **ชื่อ sim ใน 3 build เหมือนกัน**: `majorTexts=Mg`, `majorEvent=Br`, `events=rh`, `rarityFor=br`, `openOptions=Ar`, `statOdds=qPe` ประกาศที่เดียวต่อชื่อ — `node tools/locate-sim.mjs bundle/<BUILD>/b/app-*.js`
- **specifier สัมพัทธ์ใน app มี 3 รูป**: `from"./`, `import"./` (ไม่มี from), `import("./` — regex `/((?:\bfrom|\bimport)\s*\(?\s*)"\.\//g` เขียนได้ 5 จุดใน `app-QHVRDERS.js`; รอบแรกที่พลาด `import"./` ได้ error `Failed to resolve module specifier "./c-3V6Q6CN7.js"`
- **ถ้า app ที่แก้ throw, boot จะ reload หน้าเอง** (เจอจริง เห็น `/src/build.js?fresh=` ใน resource list) ต้องมีทางถอย
- **boot ใช้ `import.meta.url` ที่เดียว** (ฟังก์ชัน reload ตอน build เก่า) และโหลด app ด้วย `import("./app-XXXX.js")` ชื่อตายตัวในไฟล์ boot — `bundle/mwlkbpdo/b/boot-AHR3DRVR.js`
- **หน้าเกมไม่มี CSP** (`fetch('/')` header `content-security-policy` = null) blob URL ใช้ได้
- **สคริปต์มี `@run-at document-start` และ `@grant none` อยู่แล้ว** — `wox-editor.user.js` บรรทัด 7-8
- **ruleset `protect-main` id `27517988`** บล็อก force push และการลบ `main` (ข้อมูลจาก handoff ก่อน ยังไม่เปลี่ยน)

## Guesses, not yet proven

- **Tampermonkey inject ทันก่อน parser เจอ `<script type="module" src="b/boot-…">` ไหม** — ถ้าไม่ทัน import map ไม่มีผล (เกมโหลดปกติ ไม่มี sim) วิธีตัดสิน: Task แรกของแผน ทำ userscript ทดลองเล็กๆ ที่ sync XHR `/` + boot แล้วแทรก import map ติดตั้งใน Tampermonkey จริง ดู `window.__woxSim`
- **sync XHR ตอน `document-start` ทำงานใน Tampermonkey `@grant none`** — น่าจะได้ (page context) ยังไม่ได้ลอง
- **ทางถอย `import('<origin>/b/app-XXXX.js?woxed=raw')` ได้ app ตัวจริง** เพราะ URL ไม่ตรงกับ key ใน import map — ยังไม่ได้ลอง
- **`lifePath` อยู่ใน `events` (`rh`) ไหม** — ไม่รู้ ตรวจด้วย `__woxSim.events.has('lifePath')` ตอนลงมือ
- **ชื่อย่อจะคงที่ต่อไป** — 3 build วันนี้เหมือนกัน แต่ต้องหาจากรูปร่างทุกครั้ง ห้ามพึ่งชื่อ
- **Minor ค้างจากงาน audit**: `dropStalePanels` ใช้ `'woxed' in d.dataset` throw ได้ถ้า body มีลูกที่ไม่ใช่ HTML element (ไม่เกิดในเกมนี้) แก้เป็น `d.dataset?.woxed` ถ้าแตะส่วนนั้น

## Ruled out and wrong turns

- **อ่านตารางอีเว้นต์จาก chunk `c-*` ที่ import ได้** — ไม่มีข้อมูลอีเว้นต์ (spike §1, ตรวจซ้ำ build `mwlkbpdo`)
- **`import()` app เพื่ออ่าน namespace** — ได้ namespace ว่าง (ไม่มี export) เหตุผลเดิมในแผน bundle-port ที่ว่า "จะรันเกมซ้ำ" ผิดครึ่งหนึ่ง: URL เดียวกันได้โมดูลเดิม แต่ไม่มีอะไรให้อ่านอยู่ดี — ข้อห้ามนี้นายท่านยกเลิกแล้วสำหรับทาง import map
- **แท็บอีเว้นต์แบบ (ก) จำกัดขอบเขต (การ์ดตอนนี้ + บันทึกชีวิต ไม่ให้คะแนน)** — สเปคฉบับแรกเขียนไว้ แล้วถูกแทนด้วยทาง import map; นายท่านอนุมัติว่า**ไม่ต้องทำแท็บ (ก) เป็นทางถอย** ตอนไม่มี sim ให้ขึ้น `EV_UNSUPPORTED` + เหตุผล
- **ให้คะแนนจากคำในข้อความหรือช่วงโอกาสอย่างเดียว** — เป็นการแต่งข้อมูล ห้ามทำ
- **regex statOdds ที่ใช้ `[^;]{0,250}?`** — พลาด เพราะมี `;` ทันทีหลัง `T("small","odds","")` ต้องใช้ `[^]{0,250}?` (แก้แล้วใน `tools/locate-sim.mjs`)
- **จำลองบนหน้า `/b/c-….js` โดยไม่ `history.replaceState(null,'','/')`** — path สัมพัทธ์ของ index.html เพี้ยนเป็น `/b/b/boot-…` 404 (ปัญหาเฉพาะวิธีจำลอง)
- **ลูปคลิกปุ่มการ์ดทันทีที่การ์ดขึ้น** — เกมไม่รับคลิกที่เร็วเกินไป ต้องรอ ~1.5 วินาที; และ `pending` เปลี่ยนก่อน DOM ของการ์ด ต้องเช็กว่า id ปุ่มตรงกับ `pending.options`
- ข้อเดิมจาก handoff ก่อนยังจริง: อย่าเพิ่มตัวกรองให้ระดับที่ไม่มีไอเทม, ไม่ใช้ jsdom/`package.json`, `t.skip` เมื่อไม่มี `bundle/` = เทสเขียวหลอก (ดู skip 0), ห้าม hardcode ชื่อ build ในเทส, ห้าม `git clean -fdx` ใน worktree

## Next step

1. **เขียนแผน v3.4.0** ด้วย `superpowers:writing-plans` จากสเปค `docs/superpowers/specs/2026-11-18-events-tab-design.md` ลงที่ `docs/superpowers/plans/2026-11-18-events-tab.md` — Task 0 ต้องเป็นการพิสูจน์ใน Tampermonkey จริง (userscript ทดลองเล็กๆ ที่แทรก import map ตอน `document-start`) ก่อนแตะ `wox-editor.user.js`; ทุก Task ที่เป็นตรรกะเขียนเป็น `LOC` pure function แบบ TDD; แผนส่งต่อให้ใช้ `superpowers:executing-plans` (ห้าม subagent)
2. ส่งแผนให้นายท่านอนุมัติ
3. สร้าง worktree + branch (เช่น `.worktrees/events-v3.4.0`, `feat/events-v3.4.0`) แล้วทำตามแผน
4. ปล่อยด้วย `node tools/release.mjs "…"` (bump `@version` + `VERSION` เป็น `3.4.0`) แล้วให้นายท่านตรวจในเกม 4 ข้อท้ายสเปค
5. อัปเดต `CLAUDE.md` §3/§6/§8 (สถาปัตยกรรม shim, สถานะ v3.4.0, เมื่อเกมอัปเดตต้องเช็ก `LOC.simNames`) และแก้ Global Constraint ในแผน bundle-port ให้ตรงกับที่ยกเลิกแล้ว

## Waiting on the user

- นายท่านสั่ง handoff และ**ยังไม่ให้เริ่มลงมือ** — เริ่มเซสชันหน้าเมื่อนายท่านสั่ง
- อนุมัติแผน (หลังเขียนในขั้นที่ 1)
- ติดตั้งสคริปต์ทดลองของ Task 0 ใน Tampermonkey และสคริปต์ v3.4.0 แล้วตรวจในเกม — ทำได้เฉพาะนายท่าน (Chrome ที่ Claude in Chrome ใช้ไม่มี Tampermonkey/สคริปต์ของเรา)
- 4 commit บน `main` ยังไม่ push: `6fec663`, `47a45e3`, `631126a` และ commit ของ handoff นี้ (เป็น docs ล้วน push ได้ตอนปล่อยรอบหน้า)

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\wox-editor.user.js` — สคริปต์หลัก v3.3.3 (1023 บรรทัด) ส่วนที่จะแก้: `let … SIM = null, MJ = null, EVENTS = []` (บรรทัด ~199), แท็บอีเว้นต์ (~407-419, ~530-586), ปุ่มเรียกอีเว้นต์ (~810-816), ช่วยเลือก (~843-971), ตรวจระบบ (~977-992)
- `...\docs\superpowers\specs\2026-11-18-events-tab-design.md` — สเปค v3.4.0 ที่อนุมัติแล้ว
- `...\docs\superpowers\notes\2026-11-17-events-spike.md` — §6 ผลตรวจในเกม, §7 spike import map (วิธี, ตารางชื่อ, สิ่งที่ยังไม่พิสูจน์)
- `...\docs\superpowers\plans\2026-11-17-bundle-port.md` — มี Global Constraints ที่ต้องแก้ข้อ "ห้าม import `app-*.js`"
- `...\tools\locate-sim.mjs` — เครื่องมือ spike หาชื่อ sim จากรูปร่าง (regex ต้นแบบของ `LOC.simNames`) ใช้: `node tools/locate-sim.mjs bundle/<BUILD>/b/app-*.js`
- `...\tools\fetch-bundle.mjs` — ดึง JS ของเกมลง `bundle/<BUILD>/` (รันก่อนเทสทุกครั้ง)
- `...\tools\release.mjs` — ปล่อยเวอร์ชัน
- `...\tests\` — เทส Node (`node --test "tests/**/*.test.mjs"`)
- `...\bundle\mwll6s9j\b\app-QHVRDERS.js`, `...\bundle\mwll6s9j\b\boot-3ABEXIAE.js` — build ปัจจุบัน (gitignore)
- `...\CLAUDE.md` — แหล่งความจริงของโปรเจ็ค
- `...\journal\2026-11-18.md` — บันทึกประจำวัน (gitignore)

## Changes made

- `docs/superpowers/notes/2026-11-17-events-spike.md` — เพิ่ม §6 (ตรวจในเกม) commit `6fec663` และ §7 (spike import map) commit `47a45e3`
- `docs/superpowers/specs/2026-11-18-events-tab-design.md` — ไฟล์ใหม่ สเปค v3.4.0 commit `631126a`
- `tools/locate-sim.mjs` — ไฟล์ใหม่ (ย้ายจาก scratchpad) commit พร้อม handoff นี้
- `HANDOFF.md` — ไฟล์นี้ commit พร้อมกัน
- `bundle/mwlkbpdo/`, `bundle/mwll6s9j/` — ดึงใหม่ (gitignore ไม่ commit)
- เซฟเกมใน Chrome ที่ Claude in Chrome ใช้ (ไม่ใช่ของนายท่านที่เล่นจริง): ชีวิตทดลองช่อง 1 เล่นต่อถึงอายุ ~9 ปี เปลี่ยนเป็นผู้ฝึกตน และถูกตั้ง `pending` เป็น `hiddenCave` — นายท่านอนุญาตแล้ว
- `wox-editor.user.js` — ไม่ได้แตะ
