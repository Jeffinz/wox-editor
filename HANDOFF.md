# Handoff: wox-editor v3.4.9 ปล่อยและตรวจผ่านแล้ว — ยังไม่มีงานถัดไปที่ถูกเลือก

Written: 2026-11-18 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน ไฟล์นั้นคือกติกาของโปรเจกต์: ตอบภาษาไทยสั้น ๆ, เรียกผู้ใช้ว่า "นายท่านชาโดว์", รัน `node --check` ก่อนส่งงาน, bump `@version` + `const VERSION` พร้อมกันแล้วปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7), นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey และรีโหลดหน้าเกมเอง

## Goal

userscript Tampermonkey ไฟล์เดียว (`wox-editor.user.js`) แก้สถานะเกม Way of Xian โหมดเล่นคนเดียว (ไม่แตะอันดับ/ตลาดผู้เล่น) พร้อมแท็บอีเว้นต์และแท็บช่วยเลือกที่ให้คะแนนตัวเลือกบนการ์ดและกดให้อัตโนมัติ

"เสร็จ" ของรอบล่าสุด = finding audit v3.4.7 ทั้ง 5 ข้อ (A1-A5) แก้ ปล่อยเป็น v3.4.9 และตรวจในเกมผ่าน — **ทำครบแล้ว** ไม่มีงานค้างจากรอบนี้

## Where things stand

v3.4.9 อยู่บน `main` (`60b056f`) และ push ขึ้น GitHub แล้ว มี commit เอกสาร 2 ตัวบน `main` ที่ยังไม่ push (`02dfea3`, `5d91077`) เพราะโปรเจกต์นี้ push ผ่าน `tools/release.mjs` ตอนปล่อยเวอร์ชันเท่านั้น งานถัดไปยังไม่ได้เลือก (ดู Next step) ไม่มี branch หรือ worktree ค้าง

## Verified facts

- `git status --porcelain` → ว่าง
- `git rev-parse main` → `5d91077`; `git rev-parse refs/remotes/origin/main` → `60b056f`; `git log refs/remotes/origin/main..main` → 2 commit เอกสาร
- `git worktree list` → worktree เดียว (`main`); `git branch -a` → มีแต่ `main` + remotes
- `node --check wox-editor.user.js` → ผ่าน
- `node --test "tests/**/*.test.mjs"` → `# tests 78`, `# pass 78`, `# fail 0`, `# skipped 0` (รัน 2026-11-18 บน `main` ที่มี `bundle/`)
- `wc -l wox-editor.user.js` → 1310; `@version` บรรทัด 3 = `3.4.9`; `const VERSION` = `'3.4.9'`
- เกมที่เว็บเสิร์ฟ: `curl https://way-of-xian.wox-game.workers.dev/src/build.js` → `export const BUILD = "mwlvws3l";`
- `bundle/` มี 7 build: `mwky5ysx`, `mwlj4t86`, `mwlkbpdo`, `mwll6s9j`, `mwlnu1rf`, `mwlq36t8`, `mwlvws3l` (ใหม่สุด = build ที่เว็บเสิร์ฟ)
- `docs/superpowers/notes/` มี 6 ไฟล์: `2026-11-17-events-spike.md`, `2026-11-18-audit-findings.md`, `2026-11-18-audit-v342.md`, `2026-11-18-audit-v345.md`, `2026-11-18-audit-v346.md`, `2026-11-18-audit-v347.md`
- นายท่านยืนยันด้วยคำพูดว่า v3.4.8 ผ่านในเกม และ v3.4.9 ผ่านบนเว็บ (2026-11-18) — บันทึกไว้ใน `CLAUDE.md` §6 แล้ว

## Guesses, not yet proven

- **A3 ยังไม่เคยถูกกระตุ้นด้วยค่าที่ไม่อยู่ในตารางจริง**: ตัวกันเขียนทับ (`LOC.pickOrKeep`, เงื่อนไข `dirty`) ทำงานเฉพาะเมื่อ `t.realm`/`t.martial.rank` ไม่ตรงกับตัวเลือก — build `mwlvws3l` ไม่เกิดกรณีนี้ การทดสอบที่ผ่านจึงน่าจะเป็นการกดบันทึกปกติ ไม่ได้พิสูจน์สาขานั้น
- A2 (`sim อ่านการ์ดไม่ได้ — …` ใน `#ai_out`) ยังไม่เคยเห็นข้อความจริง ต้องให้ sim พังก่อน
- `aiScan` เรียก `SIM.majorTexts(t)` ทุกครั้งที่สแกน — ยังไม่มีหลักฐานว่าฝั่งเกมมีผลข้างเคียงกับการเรียกซ้ำ (ค้างจาก audit v3.4.6) วิธีพิสูจน์: probe ในเบราว์เซอร์นับจำนวนครั้งที่เรียกและดู state ก่อน/หลัง
- `opt.outcomes` / `opt.band` ของ build ปัจจุบันยังไม่ได้ตรวจ (สาขาในโค้ดยังตายอยู่ถ้าเกมไม่ส่งมา) วิธีพิสูจน์: เก็บ `options` ของอีเว้นต์จริงในเบราว์เซอร์แล้วดูคีย์
- ยังไม่มีหลักฐานว่า v3.4.9 ทำงานถูกบน build ที่ต่างจาก `mwlvws3l` (เกมเปลี่ยน build บ่อย — เคยเปลี่ยนภายในวันเดียว)

## Ruled out and wrong turns

- ห้ามใช้ `document.write` เขียน import map (เคยทำให้หน้าเกมจอดำทั้งหน้า); `installSim()` ต้องออกทันทีถ้า `readyState !== 'loading'`
- ห้ามแทรก DOM เข้าไปในปุ่มของเกม (เช่นป้ายคะแนน) — observer ทั้งหน้าสแกนซ้ำทุกเฟรม เกมกระตุก คลิกหาย
- `fresh()` ห้ามกลับไปใช้ `root.activeElement`; `dirty` ต้องเป็น `Set` ของคีย์ `LOC.fieldKey` ไม่ใช่ boolean
- ห้ามเอา `bagLocked` กลับมา (ต้นเหตุที่ลิสต์กระเป๋าหยุดรีเฟรช, แก้ใน v3.4.7 R1)
- อย่าแก้ประตูกดอัตโนมัติให้ตัดเงื่อนไข `scored.length === rows.length` ออก: ตัวเลือกที่มี blind ปน **ห้ามกดอัตโนมัติ**
- `act` ของอีเว้นต์ให้ค่าน้ำหนักบวกไม่ได้ (เนมสเปซเปิด): 0 ปกติ, −200 เมื่อคีย์เข้า `/die|death|kill|dead|perish/i`
- คีย์ที่คิดจาก id ของ DOM ไม่ใช่ตัวตนของ DOM: เกมวาดการ์ดซ้ำด้วย id เดิมได้ ต้องเทียบ `LOC.aiNeedsScan` (บทเรียน v3.4.8)
- ช่อง `<select>` ที่ผู้ใช้ไม่แตะห้ามเขียนทับ state (`LOC.pickOrKeep`) — เบราว์เซอร์เมินค่าที่ไม่มีในรายการแล้วโชว์ตัวเลือกแรก
- อเมนด์ commit ที่ push แล้วไม่ได้ (ruleset `protect-main` กัน force-push); อเมนด์ได้เฉพาะ commit ที่ยังไม่ push บน branch
- อย่าอ้างจำนวนเทสจาก `node --test` เปล่า ๆ (มันนับ `tools/test-summary.mjs`) — ใช้ glob `tests/**/*.test.mjs` และดู `# skipped`
- worktree ใหม่ไม่มี `bundle/` (gitignore): รันเทสด้วย `WOX_BUNDLE="C:/Users/PC/Desktop/Wox UI/way-of-xian.wox-game.workers.dev/bundle/mwlvws3l"`
- ข้อความ commit หลายบรรทัดผ่าน PowerShell here-string ทำให้ subject กลายเป็น `@` — ใช้ `git commit -F -` กับ bash heredoc
- bump `@version` + `VERSION` ทำบน `main` หลัง merge เท่านั้น (ถ้า bump ใน branch จะไม่มีอะไรให้ commit แล้ว `release.mjs` throw)
- อย่าใช้ build id ในเอกสารเป็นความจริงถาวร — `curl .../src/build.js` ก่อนทุกครั้ง

## Next step

**ถามนายท่านชาโดว์ว่าจะทำอะไรต่อ** (ยังไม่มีคำตอบ) แล้วทำตามตัวเลือกนี้ตามลำดับความคุ้ม:

1. **audit รอบใหม่ของ v3.4.9** — รอบก่อน ๆ เจอของใหม่ทุกครั้งราว 5 ข้อ: อ่าน `wox-editor.user.js` ทั้ง 1310 บรรทัด, รันเทส, ตรวจ regex/marker กับ build ที่เว็บเสิร์ฟอยู่, เขียนผลลง `docs/superpowers/notes/2026-11-18-audit-v349.md` (รอบนี้ใช้ prefix `A` ไปแล้ว — ถ้าจะเปลี่ยนเป็นชื่อที่บอกเนื้อ เช่น `realm-save-overwrite` นายท่านยังไม่ตัดสิน)
2. **เก็บกวาด `docs/superpowers/notes/`** — audit 3 รอบที่ปิดแล้ว (`v342`, `v345`, `v346`) ซ้ำซ้อนกับตารางของเดิม ต้องได้คำสั่งก่อนลบ
3. **push commit เอกสาร 2 ตัว** (`02dfea3`, `5d91077`) — ปกติจะขึ้นไปพร้อม release รอบหน้า ไม่ต้อง push แยก เว้นแต่นายท่านสั่ง
4. **ปิดคิวที่ตั้งใจไม่แก้**: C10-C14, S1, T4, T6 (ตารางใน `docs/superpowers/notes/2026-11-18-audit-v347.md` §2) — บันทึกใน `CLAUDE.md` §6 พอ ไม่ต้องแก้โค้ด

เมื่อเริ่มงานโค้ด: `git worktree add ../<ชื่อ> -b <branch>` จาก `main`, เขียนเทสก่อนสำหรับตรรกะที่ย้ายเข้า `LOC` ได้, `node --check`, `node --test "tests/**/*.test.mjs"` ต้อง `skipped 0`, merge เข้า `main` (`--no-ff`), bump `@version` + `VERSION` บน `main`, แล้ว `node tools/release.mjs "ข้อความ (vX.Y.Z)"` บน `main`, ปิดท้ายด้วย `git worktree remove` + `git branch -d`

## Waiting on the user

- **คำถามค้าง:** จะทำอะไรต่อจาก Next step (ยังไม่ได้ถามใน session ที่เขียนไฟล์นี้)
- นายท่านเป็นคนอัปเดตสคริปต์ใน Tampermonkey และยืนยันผลในเกมเอง (ตาม `CLAUDE.md` §7) — v3.4.9 ตรวจแล้ว
- commit เอกสาร `02dfea3`, `5d91077` ยังไม่ push — รอขึ้นพร้อม release รอบหน้า หรือรอคำสั่ง

## Files and places

ทุก path อยู่ใต้ root `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\`:

- `wox-editor.user.js` — สคริปต์หลัก v3.4.9, 1310 บรรทัด; `LOC` = pure function ที่มีเทส, ที่เหลือเป็นโค้ด DOM ใน IIFE เดียวกัน
- `CLAUDE.md` — กติกาโปรเจกต์, บทเรียน §5, สถานะ §6, วิธีรับมือเกมอัปเดต §8
- `AGENTS.md` — ทางเข้าแบบสั้น ชี้กลับมาที่ `CLAUDE.md`
- `HANDOFF.md` — ไฟล์นี้
- `docs\superpowers\notes\2026-11-18-audit-v347.md` — audit ล่าสุด (A1-A5 ปิดครบแล้ว); §2 มีตารางของเดิมที่ตั้งใจไม่แก้
- `docs\superpowers\notes\2026-11-18-audit-v346.md`, `-v345.md`, `-v342.md` — audit รอบเก่า ปิดแล้ว
- `tests\` — 78 เทสใน 8 ไฟล์: `core`, `health`, `items`, `locate`, `panel`, `release`, `scoring`, `sim`; `sim.test.mjs` และ `locate.test.mjs` ต้องมี `bundle/`
- `tools\release.mjs` — version sync + `node --check` + เทส + `skipped 0` + บังคับ branch `main` + commit + push
- `tools\test-summary.mjs` — อ่านบรรทัด `# skipped` ของ `node --test` ให้ release
- `tools\fetch-bundle.mjs` — ดึง build ปัจจุบันลง `bundle\<BUILD>\` (gitignore)
- `tools\snapshot-diff.mjs`, `tools\locate-sim.mjs` — เครื่องมือวิเคราะห์ **ห้ามลบ** แม้ใช้กับเกมแบบ bundle ไม่ได้แล้ว (รอนายท่านสั่ง)
- `bundle\` — 140 MB / 7 build (gitignore); `mwlvws3l` ตรงกับของสด
- `journal\2026-11-18.md` — บันทึกของวันนี้ (gitignore)
- repo สาธารณะ — https://github.com/Jeffinz/wox-editor (ขึ้นเฉพาะสคริปต์/เครื่องมือ/เอกสาร)

## Changes made

- `wox-editor.user.js` — v3.4.8 (A1 `LOC.aiNeedsScan`, A2 try/catch `majorEvent`) และ v3.4.9 (A3 `LOC.pickOrKeep`, A4 `saved.add('b:'+id)` ใน `#hadd`, A5 nit 3 จุด) + bump `@version`/`VERSION` → commit branch `2d84b96`, `ead8302`; merge `0f2d4b6`, `a9850c1`; release `348bcc8`, `60b056f` — **commit แล้วและ push แล้ว**
- `tests/panel.test.mjs` — เทส `aiNeedsScan` (v3.4.8) — commit แล้ว push แล้ว
- `tests/core.test.mjs` — เทส `pickOrKeep` (v3.4.9) — commit แล้ว push แล้ว
- `CLAUDE.md` — §2 จำนวนบรรทัด/เวอร์ชัน, §5 บทเรียน 4 ข้อ (A1-A4), §6 สถานะ v3.4.8/v3.4.9 + ผลตรวจ — commit แล้ว **ยังไม่ push**
- `HANDOFF.md` — เขียนทับด้วยฉบับนี้ (ยังไม่ commit)
- `journal/2026-11-18.md` — บันทึกรอบ v3.4.8/v3.4.9 (gitignore ไม่ commit)
- ไม่มีไฟล์ชั่วคราวค้าง, ไม่มี branch/worktree ค้าง, `bundle/mwlvws3l` ถูกดาวน์โหลดไว้แล้ว
