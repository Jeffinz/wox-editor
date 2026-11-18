# Handoff: wox-editor v3.4.7 ปล่อยและตรวจในเกมแล้ว — รอเลือกงานรอบถัดไป

Written: 2026-11-18 15:50 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน ไฟล์นั้นคือกติกาของโปรเจกต์: ตอบภาษาไทยสั้น ๆ, เรียกผู้ใช้ว่า "นายท่านชาโดว์", รัน `node --check` ก่อนส่งงาน, bump `@version` + `const VERSION` พร้อมกันแล้วปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7), นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey เอง

## Goal

userscript Tampermonkey ไฟล์เดียว (`wox-editor.user.js`) แก้สถานะเกม Way of Xian โหมดเล่นคนเดียว (ไม่แตะอันดับ/ตลาดผู้เล่น) พร้อมแท็บอีเว้นต์และแท็บช่วยเลือกที่ให้คะแนนตัวเลือกบนการ์ดและกดให้อัตโนมัติ

"เสร็จ" ของรอบล่าสุด = กวาด finding audit v3.4.6 ทั้ง 8 ข้อ (R1-R8), ปล่อยเวอร์ชัน, และนายท่านยืนยันในเกม — **ครบแล้ว**

## Where things stand

ทุกอย่างที่ตกลงไว้เสร็จและปิดแล้ว: v3.4.7 ปล่อยขึ้น `main` และ push ขึ้น GitHub, นายท่านอัปเดตสคริปต์ใน Tampermonkey แล้วตรวจ R1 ในเกมผ่าน ไม่มีงานค้าง ไม่มี branch หรือ worktree ค้าง ไม่มีไฟล์ชั่วคราว งานรอบถัดไปยังไม่ได้เลือก

## Verified facts

- `node --check wox-editor.user.js` → ผ่าน (รันก่อน release v3.4.7)
- `node --test "tests/**/*.test.mjs"` (ใน main ซึ่งมี `bundle/`) → `# tests 76`, `# pass 76`, `# fail 0`, `# skipped 0`
- `node tools/release.mjs --dry-run` → `✔ version 3.4.7 (ก่อนหน้า 3.4.6), syntax และเทสผ่าน`; release จริง push `5e5b250..814bf54 main -> main`
- `wc -l wox-editor.user.js` → 1283 (ตรงกับ `CLAUDE.md` §2)
- `git log --oneline` บน `main`: `276fbf2` (docs: record the v3.4.7 in-game check) → `e7c6c7b` (docs: hand off v3.4.7) → `814bf54` (release v3.4.7) → `fa4bbc3` (merge) → `6f4b7b1` (branch commit) → `8762a60` (handoff ก่อนหน้า); `git status --porcelain` ว่างหลัง `276fbf2`
- build ที่เกมเสิร์ฟ `mwlq36t8` (`/src/build.js`) ตรงกับ `bundle/mwlq36t8/`
- นายท่านยืนยันในเกม (2026-11-18): พิมพ์ค้างในช่องจำนวนไอเทมของแท็บกระเป๋าแล้วลิสต์ยังรีเฟรช ค่าที่พิมพ์ไม่หาย (R1 ผ่าน)
- ตัวเลขเทสลดจาก 77 (v3.4.6) เป็น 76 เพราะลบเทส `isStateField` 2 ตัว (R4) และเพิ่มเทส `tierIdx` ติดลบ 1 ตัว (R7)

## Guesses, not yet proven

- R2/R3/R5/R6 ของ v3.4.7 ไม่ได้ถูกกระตุ้นตรง ๆ ในรอบตรวจในเกม: R2 ต้องให้ `renderCore` ทำงานรอบสอง (chunk โหลดล้มบางส่วนแล้วกด "ตรวจอีกครั้ง"), R5 ต้องให้ sim throw, R6 ต้องให้ state มี `money` เป็น `undefined` — อ่านโค้ดแล้วถูก แต่ยังไม่มีหลักฐานจากเบราว์เซอร์
- `aiScan` เรียก `SIM.majorTexts(t)` ทุกครั้งที่สแกน ยังไม่รู้ว่าฝั่งเกมมีผลข้างเคียงกับการเรียกซ้ำหรือไม่ — ต้องจับด้วย probe ในเบราว์เซอร์ก่อนจึงจะสรุปได้ ไม่ใช่ finding
- สาขา `opt.outcomes` / `opt.band` ในสคริปต์ไม่เคยทำงานกับ build `mwlq36t8` (ตรวจ bundle: 0 ครั้ง / 9 ครั้งแต่ไม่มีใน option) — ถ้าเกมรุ่นหน้าส่งมา ต้องดูใหม่

## Ruled out and wrong turns

- ห้ามใช้ `document.write` เขียน import map (เคยทำให้หน้าเกมจอดำ ทั้งหน้า)
- ห้ามแทรก DOM เข้าไปในปุ่มของเกม (เช่นป้ายคะแนน) — observer ทั้งหน้าจะสแกนซ้ำทุกเฟรม เกมกระตุก คลิกหาย
- `fresh()` ห้ามกลับไปใช้ `root.activeElement` และห้ามกลับไป `dirty` แบบ boolean ตัวเดียว — ต้องเป็น `Set` ของคีย์ `LOC.fieldKey`
- ห้ามเอา `bagLocked` กลับมา: มันคือตัวที่ทำให้ลิสต์กระเป๋าหยุดรีเฟรชทั้งก้อนเมื่อมีช่องเดียวค้าง (บั๊กที่ R1 แก้)
- อย่าแก้ประตูกดอัตโนมัติให้ตัด `scored.length === rows.length` ออก: ตัวเลือกที่มี blind ปน **สคริปต์ห้ามกดอัตโนมัติ**
- `act` ของอีเว้นต์ให้ค่าน้ำหนักบวกไม่ได้ (เป็นเนมสเปซเปิด) — 0 ปกติ, −200 เมื่อคีย์เข้า `/die|death|kill|dead|perish/i`
- อเมนด์ commit ที่ push แล้วไม่ได้ (ruleset `protect-main` กัน force-push); อเมนด์ได้เฉพาะ commit ที่ยังไม่ push บน branch
- อย่าอ้างจำนวนเทสจาก `node --test` เปล่า ๆ: มันเก็บ `tools/test-summary.mjs` เข้าไปนับด้วย ตัวเลขที่ถูกคือ `# tests N` จาก glob `tests/**/*.test.mjs`
- worktree ใหม่ไม่มี `bundle/` (gitignore): รันเทสด้วย `WOX_BUNDLE="C:/Users/PC/Desktop/Wox UI/way-of-xian.wox-game.workers.dev/bundle/mwlq36t8"` ไม่งั้นเทส bundle skip แล้ว `tools/release.mjs` จะไม่ยอมปล่อย (`skippedCount` fail แบบปิด)
- ข้อความ commit หลายบรรทัดผ่าน PowerShell here-string ทำให้ subject กลายเป็น `@`: ส่งผ่าน `printf` หรือแก้ด้วย `git commit --amend -F <ไฟล์>` บน branch ที่ยังไม่ push
- bump `@version` + `VERSION` ทำบน `main` หลัง merge เท่านั้น: ถ้า bump ใน branch ก่อน merge จะไม่มีอะไรให้ commit แล้ว release throw

## Next step

**ก่อนอื่น: ถามนายท่านชาโดว์ว่าจะทำงานอะไรต่อ** — ไม่มีงานค้างที่ตกลงไว้ รายการที่ยังเปิดเรียงตามที่ audit ทิ้งไว้:

1. finding ที่ audit v3.4.6 แนะนำว่า "รับทราบ ไม่ต้องแก้": C10-C14, S1, T4, T6 (T6 = ประตูกดอัตโนมัติอยู่ฝั่ง DOM ทั้งก้อน ไม่มีเทส ซึ่งเป็นที่มาของ R1/R5)
2. เก็บกวาดเอกสาร: `docs/superpowers/notes/` มี audit 3 รอบที่ปิดแล้ว อาจรวมเป็นสรุปเดียว
3. งานใหม่ตามที่นายท่านสั่ง

เมื่อได้งาน: ทำใน worktree/branch ใหม่ (`git worktree add ../<ชื่อ> -b <branch>`), เขียนเทสก่อนแก้สำหรับเรื่องที่ย้ายเข้า `LOC` ได้, `node --check`, `node --test "tests/**/*.test.mjs"` ต้อง `skipped 0`, merge เข้า `main`, bump `@version` + `VERSION`, แล้ว `node tools/release.mjs "ข้อความ (vX.Y.Z)"` **บน `main`** (เครื่องมือบังคับ branch `main` แล้วและกู้ต่อได้ถ้า push ล้ม)

## Waiting on the user

- **คำถามเดียวที่ค้าง:** จะทำอะไรต่อ (ดู Next step) — ยังไม่ได้ถาม
- นายท่านเป็นคนอัปเดตสคริปต์ใน Tampermonkey และยืนยันผลในเกม (ตาม §7 ของ CLAUDE.md) หลังปล่อยเวอร์ชันใหม่

## Files and places

ทุก path อยู่ใต้ root `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\`:

- `wox-editor.user.js` — สคริปต์หลัก v3.4.7, 1283 บรรทัด; `LOC` = namespace ของ pure function ที่มีเทส, ส่วนที่เหลือเป็นโค้ด DOM ใน IIFE เดียวกัน
- `CLAUDE.md` — กติกาโปรเจกต์, บทเรียน §5 (ล่าสุดมี R1/R5/R7/R8), สถานะ §6 (มี v3.4.7 + ผลตรวจในเกม), วิธีรับมือเกมอัปเดต §8
- `AGENTS.md` — ทางเข้าแบบสั้น ชี้กลับมาที่ `CLAUDE.md`
- `docs\superpowers\notes\2026-11-18-audit-v346.md` — audit รอบล่าสุด (R1-R8 ปิดแล้ว + ของเดิม C10-C14/S1/T4/T6 ที่ยังเปิด)
- `docs\superpowers\notes\2026-11-18-audit-v345.md`, `docs\superpowers\notes\2026-11-18-audit-v342.md` — audit รอบก่อน (ปิดแล้ว)
- `docs\superpowers\plans\2026-11-18-audit-fixes-v342.md` — แผนที่รันแล้ว (T1, C1, C2, C5, C6)
- `tests\` — 76 เทสใน 8 ไฟล์: `core`, `health`, `items`, `locate`, `panel`, `release`, `scoring`, `sim`; `sim.test.mjs` ต้องมี `bundle/`
- `tools\release.mjs` — version sync + `node --check` + เทส + `skipped 0` + บังคับ branch `main` แล้ว commit + push (ข้าม commit ถ้าไม่มีอะไร staged)
- `tools\test-summary.mjs` — อ่านบรรทัด `# skipped` ของ `node --test` ให้ release
- `tools\fetch-bundle.mjs` — ดึง build ปัจจุบันลง `bundle\<BUILD>\` (gitignore)
- `tools\snapshot-diff.mjs`, `tools\locate-sim.mjs` — เครื่องมือวิเคราะห์ **ห้ามลบ** แม้เกมแบบ bundle จะทำให้ใช้ไม่ได้แล้ว (รอนายท่านสั่ง)
- `bundle\mwlq36t8\` — build ที่ตรงกับของสด (gitignore); มี build เก่าอีก 5 โฟลเดอร์ (`mwky5ysx`, `mwlj4t86`, `mwlkbpdo`, `mwll6s9j`, `mwlnu1rf`)
- `journal\2026-11-18.md` — บันทึกของวันนี้ (gitignore)
- `repo สาธารณะ` — https://github.com/Jeffinz/wox-editor (ขึ้นเฉพาะสคริปต์/เครื่องมือ/เอกสาร; `.gitignore` กัน `src/`, `snapshots/`, `index.html`, `bundle/`)

## Changes made

- `wox-editor.user.js` — R1-R7 + bump 3.4.7 → commit `6f4b7b1` (branch, merge เป็น `fa4bbc3`) + `814bf54` (release บน `main`, push แล้ว)
- `tools/release.mjs` — R8 → อยู่ใน commit เดียวกัน (`6f4b7b1`/`fa4bbc3`/`814bf54`)
- `tests/items.test.mjs` (+1 เทส `tierIdx` ติดลบ), `tests/panel.test.mjs` (−2 เทส `isStateField`) → commit เดียวกัน
- `CLAUDE.md` — บทเรียนใหม่ 3 บรรทัด + สถานะ v3.4.7 + จำนวนบรรทัด §2 + ผลตรวจในเกม → `814bf54`, `276fbf2`
- `HANDOFF.md` — เขียนทับด้วยฉบับนี้ (commit ถัดไป)
- ไม่มีไฟล์ชั่วคราวค้าง, worktree `../wox-audit-r1r8` ถูกลบแล้ว, branch `fix/audit-r1-r8` ถูกลบแล้ว
