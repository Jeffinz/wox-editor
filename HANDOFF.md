# Handoff: audit v3.4.6 เขียนเสร็จ — รอเลือก finding ที่จะกวาด

Written: 2026-11-18 15:07 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน ไฟล์นั้นคือกติกาของโปรเจกต์: ตอบภาษาไทยสั้น ๆ, เรียกผู้ใช้ว่า "นายท่านชาโดว์", รัน `node --check` ก่อนส่งงาน, bump `@version` + `const VERSION` พร้อมกันแล้วปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7), นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey เอง

## Goal

userscript Tampermonkey ไฟล์เดียว (`wox-editor.user.js`) แก้สถานะเกม Way of Xian โหมดเล่นคนเดียว พร้อมแท็บอีเว้นต์และแท็บช่วยเลือกที่ให้คะแนนตัวเลือกบนการ์ดแล้วกดให้อัตโนมัติ รอบนี้คือ **audit ใหม่ของ v3.4.6** (อ่านโค้ดอย่างเดียว เขียน note) ไม่ใช่การแก้โค้ด

"เสร็จ" ของรอบนี้ = note ที่ `docs/superpowers/notes/2026-11-18-audit-v346.md` มี finding เรียงตามลำดับความสำคัญ และนายท่านได้เห็นรายการแล้วเพื่อเลือกว่าจะกวาดข้อไหน

## Where things stand

ผลตรวจ v3.4.6 เขียนและ commit แล้ว (`168b109`) ไม่มีการแก้โค้ด ไม่ bump version ตัวสคริปต์ยังเป็น v3.4.6 ตามที่ปล่อยไว้ (`ec84b3f`) และตรวจในเกมแล้วผ่าน ไม่มีงานค้างที่ตกลงไว้ รอแค่นายท่านเลือกว่าจะกวาด finding ชุดใหม่ข้อไหน (ดู Next step)

## Verified facts

- `node --check wox-editor.user.js` → ผ่าน (รัน 15:07)
- `node --test "tests/**/*.test.mjs"` → `# tests 77`, `# pass 77`, `# fail 0`, `# skipped 0` (รัน 15:07)
- `wc -l wox-editor.user.js` → 1251 ตรงกับ `CLAUDE.md` §2
- `git status --porcelain` ว่างหลัง commit `168b109`; อยู่บน `main`
- build ที่เกมเสิร์ฟ `mwlq36t8` (`/src/build.js`), ตรงกับ `bundle/mwlq36t8/`
- finding ทั้งหมดมีบรรทัดอ้างอิงที่ตรวจแล้วในไฟล์ note — อย่าคัดลอกตัวเลขบรรทัดจาก handoff นี้ ให้เปิด note

## Guesses, not yet proven

- `aiScan` (`wox-editor.user.js` ~`:1124`) เรียก `SIM.majorTexts(t)` ทุกครั้งที่สแกน ยังไม่รู้ว่าฝั่งเกมมีผลข้างเคียงกับการเรียกซ้ำหรือไม่ — ต้องมีเบราว์เซอร์จับด้วย `wox-probe` แบบเดิมถึงจะสรุปได้ ยังไม่นับเป็น finding
- สาขา `opt.outcomes` / `opt.band` ในสคริปต์ไม่เคยทำงานกับ build `mwlq36t8` (ตรวจ bundle: 0 ครั้ง / 9 ครั้งแต่ไม่มีใน option) — ถ้าเกมรุ่นหน้าส่งมา ต้องดูใหม่

## Ruled out and wrong turns

- ห้ามใช้ `document.write` เขียน import map (เคยทำให้หน้าเกมจอดำ)
- ห้ามแทรก DOM เข้าไปในปุ่มของเกม (ป้ายคะแนน) — เคยทำให้ observer สแกนซ้ำทุกเฟรม เกมกระตุก คลิกหาย
- `fresh()` ห้ามกลับไปใช้ `root.activeElement` และห้ามกลับไป `dirty` แบบ boolean ตัวเดียว
- อย่าแก้ประตูกดอัตโนมัติให้ตัด `scored.length === rows.length` ออก: ตัวเลือกที่มี blind ปน **สคริปต์ห้ามกดอัตโนมัติ**
- `act` ให้ค่าน้ำหนักบวกไม่ได้ (เป็นเนมสเปซเปิด) — 0 ปกติ, −200 เมื่อคีย์เข้า `/die|death|kill|dead|perish/i`
- อเมนด์ commit ที่ปล่อยแล้วไม่ได้ (ruleset `protect-main` กัน force-push)
- อย่าอ้างจำนวนเทสจาก `node --test` เปล่า ๆ: มันเก็บ `tools/test-summary.mjs` เข้าไปนับด้วย ตัวเลขที่ถูกคือ `# tests N` จาก glob `tests/**/*.test.mjs`
- release ต้องทำบน `main` หลัง merge เท่านั้น (รายละเอียดและเหตุผลอยู่ใน `CLAUDE.md` §5)

## Next step

**ก่อนอื่น: ถามนายท่านชาโดว์ว่าจะกวาด finding ข้อไหน** (อย่าเริ่มแก้โค้ดเอง) รายการจาก audit v3.4.6 เรียงตามที่ note เสนอ:

1. **R1 (กลาง)** — กระเป๋าทั้งลิสต์หยุดรีเฟรชเมื่อมีช่องกระเป๋าค้าง (`bagLocked`), ไอเทมใหม่ไม่ขึ้น เรื่องเดียวที่ผู้ใช้เจอได้จริง
2. **R5 (ต่ำ)** — `drawEvents` ที่ `showTab`/`#hevq`/`#hevr` และ `runHealth` ใน `setTimeout` ยังไม่มี try/catch
3. **R2, R3, R6, R7 (ต่ำ)** — คงค่า select ใน `renderCore`, `esc(r.layers)`, `fill('hm', t.money ?? '')`, จำกัด `tierIdx` ด้านล่าง
4. **R4 (ต่ำ)** — ลบ `isStateField` ที่ตายแล้ว + แก้ `CLAUDE.md:55` ที่บรรยายพฤติกรรม v3.4.3
5. **R8 (ต่ำ, เครื่องมือ)** — `tools/release.mjs` ตรวจ branch `main` + กู้หลัง push ล้ม
6. C10–C14, S1, T4, T6 — audit แนะนำว่า "รับทราบ ไม่ต้องแก้"

หลังได้คำตอบ: แก้ตามลำดับ, เขียนเทสก่อนแก้ (TDD) สำหรับข้อที่ย้ายเข้า `LOC` ได้, `node --check`, `node --test "tests/**/*.test.mjs"` ต้องได้ `skipped 0`, bump `@version` + `VERSION`, แล้ว `node tools/release.mjs "ข้อความ (vX.Y.Z)"` **บน `main`** — ข้อความ commit หลายบรรทัดต้องส่งเป็นสตริงเดียว

## Waiting on the user

- **คำถามเดียวที่ค้าง:** จะกวาด finding ข้อไหนของ audit v3.4.6 (ดู Next step)
- นายท่านเป็นคนอัปเดตสคริปต์ใน Tampermonkey และยืนยันผลในเกม (ตาม §7 ของ CLAUDE.md) หลังปล่อยเวอร์ชันใหม่

## Files and places

ทุก path อยู่ใต้ root `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\`:

- `wox-editor.user.js` — สคริปต์หลัก v3.4.6, 1251 บรรทัด; `LOC` คือ namespace ของ pure function ที่มีเทส
- `docs\superpowers\notes\2026-11-18-audit-v346.md` — **finding รอบล่าสุด (R1-R8 + ของเดิม C10-C14/S1/T4/T6 + เอกสาร R4)** จุดเริ่มของ session หน้า
- `docs\superpowers\notes\2026-11-18-audit-v345.md` — audit รอบก่อน (N1-N4, C3-C14, S1, T3-T6; ปิดแล้วเกือบหมด)
- `docs\superpowers\notes\2026-11-18-audit-v342.md` — audit ก่อนหน้านั้น
- `docs\superpowers\plans\2026-11-18-audit-fixes-v342.md` — แผนที่รันแล้ว (T1, C1, C2, C5, C6)
- `CLAUDE.md` — กติกาโปรเจกต์, บทเรียน §5, สถานะ §6, วิธีรับมือเกมอัปเดต §8 (**บรรทัด 55 ล้าสมัย — ดู R4**)
- `AGENTS.md` — ทางเข้าแบบสั้น ชี้กลับมาที่ `CLAUDE.md`
- `tests\` — 77 เทสใน 8 ไฟล์ (`core`, `health`, `items`, `locate`, `panel`, `release`, `scoring`, `sim`); `sim.test.mjs` ต้องมี `bundle/`
- `tools\release.mjs` — version sync + `node --check` + เทส + `skipped 0` แล้ว commit + push (ยังไม่ตรวจ branch — R8)
- `tools\test-summary.mjs` — อ่านบรรทัด `# skipped` ให้ release
- `tools\fetch-bundle.mjs` — ดึง build ปัจจุบันลง `bundle\<BUILD>\` (gitignore)
- `tools\snapshot-diff.mjs`, `tools\locate-sim.mjs` — เครื่องมือวิเคราะห์ **ห้ามลบ**
- `bundle\mwlq36t8\` — build ที่ตรงกับของสด (gitignore); มี build เก่าอีก 5 โฟลเดอร์
- `journal\2026-11-18.md` — บันทึกของวัน (gitignore)

## Changes made

- `docs/superpowers/notes/2026-11-18-audit-v346.md` — สร้างใหม่, commit `168b109`
- `HANDOFF.md` — เขียนทับไฟล์เดิม (handoff ของ v3.4.6 รอบก่อน), commit นี้
- ไม่มีการแตะ `wox-editor.user.js`, `tests/`, `tools/`, `CLAUDE.md`; ไม่มี bump version
- ไม่มีไฟล์ชั่วคราวค้าง
