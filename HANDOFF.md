# Handoff: wox-editor v3.4.9 ปล่อยแล้ว (A1-A5 ปิดครบ), รอตรวจ A3/A4 ในเกม

Written: 2026-11-18 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน ไฟล์นั้นคือกติกาของโปรเจกต์: ตอบภาษาไทยสั้น ๆ, เรียกผู้ใช้ว่า "นายท่านชาโดว์", รัน `node --check` ก่อนส่งงาน, bump `@version` + `const VERSION` พร้อมกันแล้วปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7), นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey และรีโหลดหน้าเกมเอง

## Goal

userscript Tampermonkey ไฟล์เดียว (`wox-editor.user.js`) แก้สถานะเกม Way of Xian โหมดเล่นคนเดียว (ไม่แตะอันดับ/ตลาดผู้เล่น) พร้อมแท็บอีเว้นต์และแท็บช่วยเลือกที่ให้คะแนนตัวเลือกบนการ์ดและกดให้อัตโนมัติ

"เสร็จ" ของรอบล่าสุด = finding audit v3.4.7 (A1-A5) ปิดครบและปล่อยเป็น v3.4.9 — **ครบแล้ว** สิ่งที่ค้างคือผลตรวจในเกมของนายท่าน

## Where things stand

v3.4.9 ปล่อยขึ้น `main` และ push แล้ว (`60b056f`); push พา commit เอกสารที่ค้าง (`533bd1a` บันทึกผลตรวจ v3.4.8) ขึ้นไปด้วย

- **v3.4.8** (ตรวจในเกมผ่านแล้ว): A1 `LOC.aiNeedsScan` เทียบตัวปุ่มจริง + ตัวจับเวลากดผูก `aiBest`; A2 try/catch รอบ `SIM.majorEvent`/`ev.options` พร้อมข้อความใน `#ai_out`
- **v3.4.9**: A3 `LOC.pickOrKeep` — `#h_realm`/`#h_mrank` เขียนลง state เฉพาะเมื่อผู้ใช้เลือกเอง (คีย์ใน `dirty`) ไม่งั้นคงค่าเดิม + ขึ้น "…ที่แสดงไม่อยู่ในตาราง คงค่าเดิมไว้"; A4 `#hadd` ปลดคีย์ `b:<id>`; A5 เว้นวรรค `CSS_ESC`, `aiScan()` ไม่ส่งอาร์กิวเมนต์เกิน, ตัวจับเวลาถูกล้างเมื่อ `majorEvent` คืน undefined

นโยบาย A3 ที่เลือก: **คงค่าเดิม** (ไม่ปิดปุ่ม) — ตรงกับแนว `numOrKeep` และไม่เขียนทับค่าเกมด้วยค่าที่ช่องเลือกแสดงแทน

## Verified facts

- `node --check wox-editor.user.js` → ผ่าน
- `node --test "tests/**/*.test.mjs"` → `# tests 78`, `# pass 78`, `# fail 0`, `# skipped 0` (worktree ใช้ `WOX_BUNDLE=.../bundle/mwlvws3l`, main มี `bundle/` เอง)
- เทสใหม่รอบนี้: `pickOrKeep` 1 ตัวใน `tests/core.test.mjs` (รวม 78)
- `node tools/release.mjs --dry-run "fix: A3-A5 ..."` → `✔ version 3.4.9 (ก่อนหน้า 3.4.8), syntax และเทสผ่าน`
- `wc -l wox-editor.user.js` → 1310 (อัปเดต `CLAUDE.md` §2)
- `git worktree list` → worktree เดียว `main`; branch `fix/a3-a5-v349` ลบหลัง merge (`-d` ผ่าน)
- `HANDOFF.md` ฉบับนี้ยังไม่ commit ตอนเขียน

## Guesses, not yet proven

- **A3/A4 ยังไม่เคยถูกกระตุ้นในเกม**: A3 ต้องมีค่า `realm`/`rank` ที่ไม่อยู่ในตารางก่อน (build ปัจจุบันไม่เกิด) A4 ต้องพิมพ์จำนวนค้างไว้ในช่องของไอเทมที่กำลังจะเพิ่ม
- A2 (`sim อ่านการ์ดไม่ได้ — …`) ยังไม่เคยเห็นข้อความจริง ต้องให้ sim พังก่อน
- v3.4.9 ยังไม่มีใครรันบน build ที่เว็บเสิร์ฟ (ตรวจล่าสุด `mwlvws3l` ตอน v3.4.8)
- `aiScan` เรียก `SIM.majorTexts(t)` ทุกครั้งที่สแกน — ยังไม่มีหลักฐานเรื่องผลข้างเคียง (ค้างจาก audit v3.4.6)
- `opt.outcomes` / `opt.band` ของ build ปัจจุบันยังไม่ได้ตรวจ (สาขายังตายอยู่ถ้าเกมไม่ส่งมา)

## Ruled out and wrong turns

- ห้ามใช้ `document.write` เขียน import map (เคยทำให้หน้าเกมจอดำ)
- ห้ามแทรก DOM เข้าไปในปุ่มของเกม — observer ทั้งหน้าสแกนซ้ำทุกเฟรม เกมกระตุก คลิกหาย
- `fresh()` ห้ามกลับไป `root.activeElement`; `dirty` ต้องเป็น `Set` ของ `LOC.fieldKey`
- ห้ามเอา `bagLocked` กลับมา (ต้นเหตุ R1)
- อย่าแก้ประตูกดอัตโนมัติให้ตัด `scored.length === rows.length` ออก
- `act` ให้ค่าน้ำหนักบวกไม่ได้: 0 ปกติ, −200 เมื่อคีย์เข้า `/die|death|kill|dead|perish/i`
- อเมนด์ commit ที่ push แล้วไม่ได้ (ruleset `protect-main`); อเมนด์ได้เฉพาะ commit ที่ยังไม่ push บน branch
- อย่าอ้างจำนวนเทสจาก `node --test` เปล่า ๆ (มันนับ `tools/test-summary.mjs`) — ใช้ glob `tests/**/*.test.mjs`
- worktree ใหม่ไม่มี `bundle/`: ใช้ `WOX_BUNDLE="C:/Users/PC/Desktop/Wox UI/way-of-xian.wox-game.workers.dev/bundle/mwlvws3l"`
- ข้อความ commit หลายบรรทัด: ใช้ `git commit -F -` กับ bash heredoc (PowerShell here-string ทำ subject กลายเป็น `@`)
- bump `@version` + `VERSION` ทำบน `main` หลัง merge เท่านั้น
- อย่าใช้ build id ในเอกสารเป็นความจริงถาวร — `curl .../src/build.js` ก่อนเสมอ

## Next step

**ก่อนอื่น: ถามนายท่านชาโดว์ว่าจะทำอะไรต่อ** ตัวเลือกที่มีหลักฐานรองรับ:

1. **รอผลตรวจในเกมของ v3.4.9** — A4 กระตุ้นง่ายสุด: พิมพ์จำนวนค้างในช่องไอเทมที่ยังไม่อยู่ในกระเป๋า แล้วกดเพิ่ม → ช่องต้องไม่โชว์เลขเก่า; A3 ต้องลอง build ที่ตารางเปลี่ยนหรือแก้ค่า `realm` ให้เกินตารางก่อน
2. **ปิดรอบ audit v3.4.7** — ของที่เหลือ C10-C14, S1, T4, T6 ถูกจัดเป็น "รับทราบ ไม่ต้องแก้" แล้ว ไม่มีอะไรต้องทำนอกจากบันทึกใน `CLAUDE.md` §6
3. **เก็บกวาดเอกสาร** — `docs/superpowers/notes/` มี audit 3 รอบที่ปิดแล้ว (v342, v345, v346) ซ้ำซ้อนกับตารางของเดิม ต้องได้คำสั่งก่อน
4. **audit รอบใหม่ของ v3.4.9** ถ้านายท่านอยากกวาดอีกรอบ (รอบก่อน ๆ เจอของใหม่ทุกครั้ง ~5 ข้อ)

## Waiting on the user

- ยังไม่มีคำถามค้างที่ต้องตอบก่อนเริ่มงาน — A3 ถูกตัดสินเป็น "คงค่าเดิม" แล้วในรอบนี้
- นายท่านเป็นคนอัปเดตสคริปต์ใน Tampermonkey แล้วยืนยันผลในเกม (ตาม §7) — v3.4.9 ยังไม่ถูกตรวจในเกม

## Files and places

ทุก path อยู่ใต้ root `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\`:

- `wox-editor.user.js` — สคริปต์หลัก v3.4.9, 1310 บรรทัด; `LOC` = pure function ที่มีเทส, ที่เหลือเป็นโค้ด DOM ใน IIFE เดียวกัน
- `CLAUDE.md` — กติกา (§5 บทเรียนเพิ่ม A3/A4, §6 สถานะ v3.4.9, §2 จำนวนบรรทัด)
- `HANDOFF.md` — ไฟล์นี้
- `docs\superpowers\notes\2026-11-18-audit-v347.md` — audit ล่าสุด (A1-A5 ปิดครบแล้วใน v3.4.8/v3.4.9)
- `tests\core.test.mjs` (เพิ่ม `pickOrKeep`), `tests\panel.test.mjs` (เพิ่ม `aiNeedsScan`) — 78 เทสใน 8 ไฟล์
- `tools\release.mjs`, `tools\test-summary.mjs`, `tools\fetch-bundle.mjs`
- `tools\snapshot-diff.mjs`, `tools\locate-sim.mjs` — **ห้ามลบ** (รอนายท่านสั่ง)
- `bundle\` — 140 MB / 7 build (gitignore); ใหม่สุด `mwlvws3l`
- repo สาธารณะ — https://github.com/Jeffinz/wox-editor

## Changes made

- `wox-editor.user.js` — A3 (`LOC.pickOrKeep` + ใช้กับ `#h_mrank`/`#h_realm`), A4 (`saved.add('b:' + id)` ใน `#hadd`), A5 (nit 3 จุด) + `@version`/`VERSION` = 3.4.9 → commit `ead8302` (branch) → merge `a9850c1` → release `60b056f` บน `main`
- `tests/core.test.mjs` — เทส `pickOrKeep` 1 ตัว
- `CLAUDE.md` — §2 จำนวนบรรทัด/เวอร์ชัน, §5 บทเรียน 2 ข้อใหม่, §6 สถานะ v3.4.9
- `HANDOFF.md` — เขียนทับด้วยฉบับนี้ (ยังไม่ commit)
- ไม่มีไฟล์ชั่วคราวค้าง, ไม่มี branch/worktree ค้าง
