# Handoff: audit เสร็จแล้ว งานถัดไปคือแก้ 4 ข้อก่อนงาน (ก)

Written: 2026-11-18 01:43 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ใน working directory ก่อน ไฟล์นั้นมีกติกาโปรเจ็ค (ตอบภาษาไทย, `node --check`, bump `@version` + `VERSION`, ปล่อยด้วย `tools/release.mjs`, เรียกผู้ใช้ว่า "นายท่านชาโดว์")

## Goal

นายท่านชาโดว์สั่ง audit โปรเจ็คก่อนไปต่อกับงาน **(ก)** (อีเว้นต์/ช่วยเลือกแบบจำกัดขอบเขต ตาม `docs/superpowers/notes/2026-11-17-events-spike.md` §5)

Audit เสร็จแล้ว งานที่ค้างคือตัดสินใจว่าจะแก้ finding ข้อ 1-4 ก่อนเริ่มงาน (ก) หรือไม่ แล้วจึงเริ่มงาน (ก)

เสร็จเมื่อ: finding ที่ต้องแก้ถูกแก้ (พร้อมเทส), เอกสารตรงกับโค้ด, แล้วงาน (ก) ออกแบบ+เขียนแผน+อนุมัติ+ลงโค้ด+ทดสอบในเกม+ปล่อยเวอร์ชัน

## Where things stand

Audit ทำครบ 8 task ตามแผน `docs/superpowers/plans/2026-11-18-audit.md`, เขียน finding ที่ `docs/superpowers/notes/2026-11-18-audit-findings.md`, commit `bf7f444` บน branch `audit/2026-11-18` (ยังไม่ push, ยังไม่ merge) **ยังไม่มีโค้ดไหนถูกแก้เลย** งาน (ก) ยังไม่เริ่ม ไม่มี design doc ไม่มีแผน

ค้นพบสำคัญระหว่าง audit: **เกมมี build ใหม่ `mwky5ysx`** (เดิม `mwkobenp`)

## Verified facts

- **branch ปัจจุบัน `audit/2026-11-18` ที่ `bf7f444`** แตกจาก `main` `9f94ca5`; `main` บน origin ยังเป็น `9f94ca5` (audit ยังไม่ push)
- **BUILD ปัจจุบัน `mwky5ysx`** `curl -s https://way-of-xian.wox-game.workers.dev/src/build.js` → `export const BUILD = "mwky5ysx";`
- **`/src/sim.js` และ `/src/ui.js` ยัง 404**, `/src/build.js` ยัง 200 (curl, 2026-11-18)
- **`LOC.chunkChain` ทำงานกับ build ใหม่** ผลจริง: `{ boot: "/b/boot-T2NESBG4.js", app: "/b/app-QHENANCN.js", core: ["/b/c-UD2AOKCV.js", "/b/c-PHZSWT5F.js", "/b/c-VVBFTXUG.js"] }`
- **ตารางทั้ง 4 ยังอยู่ใน `bundle/mwky5ysx/b/c-UD2AOKCV.js`** marker ที่ตรวจ: `id:"mortal"`, `lifespan:75`, `id:"novice"`, `#8c918e`, `Common`, `woodSword`, `weapon` — ครบทุกตัว
- **ข้อมูลอีเว้นต์ยังอยู่ใน `app-QHENANCN.js`** `#choice-options` เจอเฉพาะไฟล์นี้; `pending={kind:"major"` 5 จุด (แรก offset 1,376,089); `weight:.55` และ `gap:480` ยังมี
- **ไอเทม build นี้มี tier สองแบบ** `tier:"common"…"legendary"` 341 จุด และ `tier:<ตัวเลข>` 207 จุด (นับใน `c-UD2AOKCV.js`)
- **เทส pass 24 / fail 0 / skip 1** `node --check wox-editor.user.js && node --test "tests/**/*.test.mjs"` บน Node v22.23.5; ข้อที่ skip คือ bundle test ที่ hardcode `mwkobenp` (ดู finding F1)
- **repo สาธารณะไม่เคยมีไฟล์เกมหลุด** `git ls-files` มี 11 ไฟล์โปรเจ็คเท่านั้น; `git log --all --oneline -- src snapshots index.html bundle` ว่าง
- **สคริปต์ที่ปล่อยตรงกับ local** raw `main` → `@version 3.3.1` = `VERSION` ใน `wox-editor.user.js`
- **`SIM` และ `MJ` ไม่มีใคร assign เลย** `grep -n "SIM *=[^=]\|MJ *=[^=]"` เจอเฉพาะบรรทัดประกาศ `wox-editor.user.js:128`; `EVENTS` ถูก assign ที่ `:490` ซึ่งอยู่หลัง `return` ที่ `:483`
- **`TIERS` ถูกเขียนแบบไม่มีเงื่อนไข** `wox-editor.user.js:588` `TIERS = c.tiers;` ขณะที่ `REALMS`/`ITEMS`/`martialRanks` มี guard
- **`renderCore` เรียกใน `.then` โดยไม่มี try/catch** `wox-editor.user.js:607-614`; ถ้า throw บรรทัด `corePromise = null` (`:609`) ไม่ทำงาน

## Guesses, not yet proven

- **ป้ายระดับของไอเทม tier สตริงแสดงผลถูกในเกมจริง** — อ่านจาก `LOC.tierOf` (`:76-88`) ซึ่งรองรับสตริงอยู่แล้ว แต่ยังไม่มีใครเห็นในเกม build `mwky5ysx`; พิสูจน์ด้วยการเปิดแท็บกระเป๋าในเกม
- **`t.pending` และคลาส `r-*` ยังมีจริงใน build นี้** — เจอ `pending={kind:"major"` ใน bundle แต่ยังไม่มีใครเปิดการ์ดอีเว้นต์ใน build นี้; พิสูจน์โดยเปิดอีเว้นต์ major แล้วดู `t.pending` ใน console
- **`renderCore` throw เกิดจริงกับไอเทมที่ไม่มี `slot`** — คาดจาก `:593` `a.slot.localeCompare`; ยังไม่เคยเห็น throw ในเกม
- **การ retry หลังล้มแล้วล้าง `TIERS` เคยเกิดกับผู้ใช้จริง** — อนุมานจาก code path เท่านั้น ยังไม่มี log ยืนยัน

## Ruled out and wrong turns

- `tests/locate.test.mjs` เขียนว่า "reads the real mwkobenp chain" — **ห้ามใช้เป็นหลักฐานว่า locator ยังใช้ได้** เพราะมัน skip ตัวเองเมื่อไม่มีโฟลเดอร์ `mwkobenp` (โฟลเดอร์นั้นถูกลบไปแล้ว)
- offset ทุกตัวใน `HANDOFF.md` เวอร์ชันก่อนหน้า, `docs/superpowers/notes/2026-11-17-events-spike.md`, และ `docs/superpowers/plans/2026-11-17-bundle-port.md` **เป็นของ build `mwkobenp` ทั้งหมด** ใช้กับ `mwky5ysx` ไม่ได้ ตัวชี้วัดเชิงโครงสร้างยังใช้ได้ (เช่น `#choice-options`, `weight:.55`, `gap:480`) แต่ offset ไม่ได้
- `AGENTS.md` เป็นเอกสารยุคก่อน bundle (บอกให้ `import('/src/xxx.js')`, สคริปต์ "ประมาณ 500 บรรทัด") — **อย่าเชื่อ** ใช้ `CLAUDE.md` แทน
- helper ที่ใช้ตรวจ chain (`loc-check.mjs`) อยู่ใน temp `C:\Users\PC\AppData\Local\Temp\wox-audit\` และจะหายไป — วิธีทำซ้ำ: อ่าน `bundle/mwky5ysx/index.html`, `b/boot-T2NESBG4.js`, `b/app-QHENANCN.js` เป็นข้อความ แล้วเรียก `LOC.chunkChain(index, boot, app)` ผ่าน `createRequire` (ไม่ต้องรันโค้ดเกม)
- อย่า import `app-*.js` หรือ `boot-*.js` แม้ต่อ query string — จะรันเกมชุดที่สอง
- อย่าดึง `app-*.js` ตอนรันมาไล่ regex เอาตาราง — ค่าที่ต้องการเป็น expression ไม่ใช่ JSON

## Next step

**ตัดสินใจกับนายท่านชาโดว์ก่อน**: แก้ finding F1-F3 + เอกสาร (F8) ก่อนเริ่มงาน (ก) หรือเริ่มงาน (ก) ต่อทันที — audit แนะนำให้แก้ก่อน เพราะ F1 ทำให้เทสตรวจ locator ไม่ได้, F2 ล้างตารางที่ดีอยู่, F3 ทำให้ retry ตายถาวร

ถ้าเลือกแก้ก่อน ลำดับคือ:

1. **F1** `tests/locate.test.mjs` — เลิก hardcode `mwkobenp`/ชื่อไฟล์ อ่าน BUILD จาก `bundle/*/` แบบไดนามิก (หรือรับ env `WOX_BUNDLE`) แล้ว derive ชื่อไฟล์จาก `index.html`/boot/app เอง; รัน `node tools/fetch-bundle.mjs` ก่อนแล้วเทสต้องผ่านโดยไม่ skip
2. **F2** `wox-editor.user.js:588` — ใส่ guard ให้ `TIERS` ไม่ถูกเขียนทับด้วย `null`
3. **F3** `wox-editor.user.js:607-614` — ครอบ `renderCore` ด้วย try/catch และให้ `corePromise` ถูกล้างเมื่อผลไม่ครบแม้ throw
4. **F8** — เขียน `AGENTS.md` ใหม่ให้ตรงระบบ bundle, แก้ `CLAUDE.md` §2 (904 บรรทัด) และ §6 (เพิ่ม v3.3.1)

จากนั้น (หรือถ้าเลือกข้าม) เริ่ม `superpowers:brainstorming` ของงาน (ก) โดยใช้ `docs/superpowers/notes/2026-11-17-events-spike.md` เป็นข้อมูลตั้งต้น **และต้องยืนยันข้อ 1-5 ของ §4 ในเกม build `mwky5ysx` ใหม่** เพราะ offset เก่าใช้ไม่ได้แล้ว

## Waiting on the user

- **ยังไม่ได้ตอบ**: จะแก้ F1-F3 + เอกสารก่อน หรือเริ่มงาน (ก) เลย
- **ยังไม่ได้ตอบ (ค้างจาก handoff ก่อน)**: ใครตรวจข้อที่ต้องยืนยันในเกมจริง — นายท่านเปิดเกมเอง หรือให้ใช้ claude-in-chrome
- **งานที่ต้องทำในเกม**: เปิดเกม build `mwky5ysx` แล้วดูว่า (1) แผงตรวจระบบขึ้น `✔ BUILD mwky5ysx` และ `✔` ครบ 4 ตาราง (2) ป้ายระดับของไอเทม tier สตริงแสดงชื่อระดับ (3) `t.pending` กับคลาส `r-*` ยังมีจริง (4) ไม่มี error ใหม่ใน console หลังโหลด 3-5 วินาที
- **ยังไม่ได้ตัดสินใจ**: Minor ที่ค้างจาก v3.3.1 (retry ทับค่าที่ยังไม่บันทึก, `imported` all-or-nothing, comparator tier สตริง, ป้ายกรองระดับ hardcode) — audit ยืนยันว่ายังอยู่ครบ ดู finding F2/F5 และ R1

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\docs\superpowers\notes\2026-11-18-audit-findings.md`: **ไฟล์สำคัญที่สุดของ session ถัดไป** — finding ครบพร้อมหลักฐานและลำดับการแก้
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\docs\superpowers\plans\2026-11-18-audit.md`: แผน audit ที่ทำเสร็จแล้ว (checkbox ติ๊กครบ)
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\wox-editor.user.js`: สคริปต์หลัก v3.3.1, 904 บรรทัด; `LOC` ต้น IIFE (`:13-123`) มีทางเข้าเทส Node; `loadCore`/`getCore` `:521-617`; แท็บอีเว้นต์/ช่วยเลือกที่ตาย `:441-839`
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\tests\locate.test.mjs`: 25 เทสของ `LOC`; บรรทัด 11 และ 174-183 คือจุดที่ต้องแก้ตาม F1
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\tools\fetch-bundle.mjs`: ดึง JS ของเกมลง `bundle/<BUILD>/` (gitignore) — รันแล้วได้ `bundle/mwky5ysx/` 35 ไฟล์
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\tools\release.mjs`: ปล่อยเวอร์ชัน (check + test + commit + push)
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\docs\superpowers\notes\2026-11-17-events-spike.md`: ผลค้นหาอีเว้นต์ + คำตัดสิน (ก) อยู่ §5 (offset เป็นของ build เก่า)
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\CLAUDE.md`: กติกาโปรเจ็ค — ต้องแก้ §2/§6 ตาม F8
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\AGENTS.md`: ตกรุ่นทั้งไฟล์ ต้องเขียนใหม่ตาม F8
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\src\`: ซอร์สเกม BUILD เก่า `mw3fx19c` อ่านเทียบเท่านั้น
- repo: https://github.com/Jeffinz/wox-editor (public) — `main` มี branch เดียว; `audit/2026-11-18` ยังอยู่แต่ยังไม่ push

## Changes made

- `docs/superpowers/plans/2026-11-18-audit.md`: สร้างใหม่ (แผน audit) — committed `bf7f444`
- `docs/superpowers/notes/2026-11-18-audit-findings.md`: สร้างใหม่ (ผล audit + ลำดับการแก้) — committed `bf7f444`
- `HANDOFF.md` (ไฟล์นี้): เขียนทับเวอร์ชัน 2026-11-18 01:23 — commit ตามหลังไฟล์นี้
- `bundle/mwky5ysx/`: ดึงด้วย `node tools/fetch-bundle.mjs` (35 ไฟล์, gitignore, ไม่ขึ้น repo)
- ไม่มีไฟล์โค้ดถูกแก้; `wox-editor.user.js`, `tests/`, `tools/` ไม่เปลี่ยน
