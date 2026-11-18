# Handoff: v3.4.6 ปล่อยแล้ว — รอตรวจในเกม

Written: 2026-11-18 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน ไฟล์นั้นคือกติกาของโปรเจกต์: ตอบภาษาไทยสั้น ๆ, เรียกผู้ใช้ว่า "นายท่านชาโดว์", รัน `node --check` ก่อนส่งงาน, bump `@version` + `const VERSION` พร้อมกันแล้วปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7), นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey เอง

## Goal

userscript Tampermonkey ไฟล์เดียว (`wox-editor.user.js`) แก้สถานะเกม Way of Xian โหมดเล่นคนเดียว พร้อมแท็บอีเว้นต์และแท็บช่วยเลือกที่ให้คะแนนตัวเลือกบนการ์ดแล้วกดให้อัตโนมัติ รอบนี้คือการ **กวาด finding ของ audit v3.4.5 ตามลำดับที่ note เสนอ** (นายท่านเลือก "กวาดทั้งรอบ") ไม่ใช่การ audit ใหม่

## Where things stand

v3.4.6 อยู่บน `main` @ `ec84b3f` push ขึ้น origin แล้ว tree สะอาด งานที่ปิดในรอบนี้: N1, N2, N3, N4, C3, C4, C7, C8, C9, T3, T5 **นายท่านตรวจในเกมแล้ว ผ่าน** finding ที่เหลือยังเปิดและคณะ audit แนะนำว่าไม่ต้องแก้: C10-C14, S1, T4, T6

## Verified facts

- `node --check wox-editor.user.js` ผ่าน
- `node --test "tests/**/*.test.mjs"` → `# tests 77`, `# pass 77`, `# fail 0`, `# skipped 0` (ก่อนรอบนี้ 72; เพิ่ม 5 ตัว: `fieldKey` 2, `stateLines` 2, `simNames/simPatch` 1)
- `node tools/release.mjs --dry-run` ผ่านก่อนปล่อยจริง และ `git log --oneline -1` = `ec84b3f`
- build ที่เกมเสิร์ฟตอนตรวจรอบนี้คือ `mwlq36t8` (ตรงกับ `bundle/mwlq36t8/`) — เทส bundle จึงรันกับ build สด
- `wox-editor.user.js` ยาว 1251 บรรทัด (`wc -l`) หลังแก้
- commit ของ release **ไม่มี** trailer `Co-Authored-By` เพราะ `tools/release.mjs` ใช้แค่ argument แรกเป็นข้อความ commit — ต้องส่งเป็นสตริงเดียวที่มีขึ้นบรรทัดใหม่ ไม่ใช่ `-m` ตัวที่สอง

## สิ่งที่เปลี่ยน (map กลับไปที่ note)

- N1 — `LOC.fieldKey` ใหม่ (`hm`/`h_*`/`s_*`/`b:<ไอเทม>`), `dirty` เป็น `Set`, `fresh()` ใช้ `fill()` ข้ามเฉพาะช่องค้าง + ไม่สร้างแถวกระเป๋าใหม่เมื่อมีช่องกระเป๋าค้าง (`bagLocked`), ปุ่มบันทึกล้างเฉพาะคีย์ที่เขียนจริง (`saved`), `fresh(true)` ไม่ล้าง `dirty` แล้ว
- N2 — `canClick` ตัวเดียวตัดสิน แล้ว `if (!canClick) { clearTimeout(aiTimer); aiPend = null; }`
- N3 — `OPTIONAL_TEXT.pending` ตรวจ `{kind, id}` และขึ้น `– pending: รูปร่างไม่ตรง`
- N4 — `rarDot` ผ่าน `esc`
- C3 — `simReady.then` มี try/catch สองก้อน (drawEvents / aiScan)
- C4 — ปุ่ม `#hevb` ครอบ try/catch + toast
- C7/T5 — `stateLines` วนจาก `LOC.STATE_OPTIONAL`, เทสกันหลุด
- C8 — `EV_UNSUPPORTED` = `'อีเว้นต์/ช่วยเลือก: sim ของเกมยังใช้ไม่ได้'` (เทส `tests/core.test.mjs` อัปเดตตาม)
- C9/T3 — `simPatch` ประกาศ `const keys` ในตัวเอง, เทส `tests/sim.test.mjs` เทียบทั้ง `simNames`/`simPatch` กับ `SIM_KEYS`

## Guesses, not yet proven

- N1: พิสูจน์ในเกมแล้ว (พิมพ์ช่องเงินค้าง → ช่องอื่น/กระเป๋ายังรีเฟรช, กด "ตรวจอีกครั้ง" → ค่าที่พิมพ์ไม่ถูกทับ) — ผ่าน
- N2: ต้องมีเงื่อนไขแคบ (เปลี่ยน preset/`ai_delay` ในจังหวะที่คะแนนออกมาเท่ากัน) — ยังไม่มีเทสหน่วย เพราะประตูอยู่ฝั่ง DOM ทั้งก้อน (T6); ตรวจในเกมแล้วไม่เจออาการ

## Ruled out and wrong turns

- ห้ามใช้ `document.write` เขียน import map (เคยทำให้หน้าเกมจอดำ)
- ห้ามแทรก DOM เข้าไปในปุ่มของเกม (ป้ายคะแนน) — เคยทำให้ observer สแกนซ้ำทุกเฟรม เกมกระตุก คลิกหาย
- `fresh()` ห้ามกลับไปใช้ `root.activeElement` และห้ามกลับไป `dirty` แบบ boolean ตัวเดียว
- อย่าแก้ประตูกดอัตโนมัติให้ตัด `scored.length === rows.length` ออก: นายท่านสั่งชัดว่าตัวเลือกที่มี blind ปน **สคริปต์ห้ามกดอัตโนมัติ**
- ให้ `act` น้ำหนักบวกไม่ได้ (`act` เป็นเนมสเปซเปิด) — 0 ปกติ, −200 เมื่อคีย์เข้า `/die|death|kill|dead|perish/i`
- อเมนด์ commit ที่ปล่อยแล้วไม่ได้ (ruleset `protect-main` กัน force-push)
- อย่าอ้างจำนวนเทสว่าเป็น "จำนวนบรรทัด `ok`": `node --test` เปล่า ๆ นับ `tools/test-summary.mjs` เป็นไฟล์เทสด้วย ตัวเลขที่นับคือ `# tests N` จาก glob `tests/**/*.test.mjs`

## Next step

รอบกวาด finding ของ audit v3.4.5 ปิดแล้ว ไม่มีงานค้างที่ตกลงไว้ ถ้าจะทำต่อ เลือกได้:

1. finding ที่เหลือ (C10-C14, S1, T4, T6) — audit แนะนำว่า "รับทราบ ไม่ต้องแก้" ยกเว้น C11 ที่ควรเขียนเตือนใน `CLAUDE.md` §8 เผื่อเกมย้าย path
2. audit รอบใหม่ของ v3.4.6 (อ่านโค้ดอย่างเดียว เขียน note) ถ้าอยากได้ finding ชุดถัดไปก่อนแตะโค้ด

ก่อนปล่อยทุกครั้ง: `node --check wox-editor.user.js`, `node --test "tests/**/*.test.mjs"` ต้องได้ `skipped 0`, bump `@version` + `VERSION`, แล้ว `node tools/release.mjs "ข้อความ (vX.Y.Z)"` **บน `main` เท่านั้น** — ข้อความ commit ที่มี trailer ต้องส่งเป็นสตริงเดียวหลายบรรทัด ไม่ใช่ `-m` ตัวที่สอง

## Waiting on the user

- ไม่มีคำถามค้าง — v3.4.6 ตรวจในเกมแล้ว ผ่าน
- นายท่านเป็นคนอัปเดตสคริปต์ใน Tampermonkey และยืนยันผลในเกม (ตาม §7 ของ CLAUDE.md)

## Files and places

- `...\wox-editor.user.js` — สคริปต์หลัก v3.4.6, 1251 บรรทัด; `LOC` คือ namespace ของ pure function ที่มีเทส (โหลดแบบ CommonJS ได้เมื่อไม่มี `document`)
- `...\CLAUDE.md` — กติกา, บทเรียน §5 (เพิ่ม 6 ข้อของ v3.4.6), สถานะ §6, วิธีรับมือเกมอัปเดต §8
- `...\tests\` — 77 เทส; `panel.test.mjs` มี `fieldKey`, `health.test.mjs` มี `pending`/`STATE_OPTIONAL`, `sim.test.mjs` มีเทสรายชื่อคีย์, `sim.test.mjs` ต้องมี `bundle/`
- `...\tools\release.mjs` / `test-summary.mjs` / `fetch-bundle.mjs` — release + กัน skip + ดึง bundle; `tools/snapshot-diff.mjs`, `locate-sim.mjs` ห้ามลบ
- `...\docs\superpowers\notes\2026-11-18-audit-v345.md` — finding รอบล่าสุด (commit แล้ว)
- `...\docs\superpowers\notes\2026-11-18-audit-v342.md` — audit ก่อนหน้า
- `...\bundle\mwlq36t8\` — build ที่ตรงกับของสด (gitignore)
- `...\journal\2026-11-18.md` — บันทึกบทเรียนของวัน (gitignore)

## Changes made

- `wox-editor.user.js` — N1, N2, N3, N4, C3, C4, C7, C8, C9 + bump 3.4.6
- `tests/panel.test.mjs`, `tests/health.test.mjs`, `tests/sim.test.mjs` — เทสใหม่ 4 ตัว; `tests/core.test.mjs` — ข้อความ `EV_UNSUPPORTED`
- `CLAUDE.md` — §2 จำนวนบรรทัด, §5 บทเรียน 6 ข้อ, §6 บรรทัด v3.4.6
- ทั้งหมดอยู่ใน commit `ec84b3f` (push ขึ้น origin แล้ว); `HANDOFF.md` ไฟล์นี้ยังไม่ commit
