# Handoff: wox-editor v3.4.8 ปล่อยแล้วและผ่านในเกม (A1/A2 ปิด), เหลือ A3/A4/A5

Written: 2026-11-18 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน ไฟล์นั้นคือกติกาของโปรเจกต์: ตอบภาษาไทยสั้น ๆ, เรียกผู้ใช้ว่า "นายท่านชาโดว์", รัน `node --check` ก่อนส่งงาน, bump `@version` + `const VERSION` พร้อมกันแล้วปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7), นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey และรีโหลดหน้าเกมเอง

## Goal

userscript Tampermonkey ไฟล์เดียว (`wox-editor.user.js`) แก้สถานะเกม Way of Xian โหมดเล่นคนเดียว (ไม่แตะอันดับ/ตลาดผู้เล่น) พร้อมแท็บอีเว้นต์และแท็บช่วยเลือกที่ให้คะแนนตัวเลือกบนการ์ดและกดให้อัตโนมัติ

"เสร็จ" ของรอบล่าสุด = v3.4.8 ขึ้น `main` + GitHub แล้ว — **ครบแล้ว** สิ่งที่ค้างคือผลตรวจในเกมของนายท่าน และ finding A3/A4/A5 ที่ยังไม่แก้

## Where things stand

v3.4.8 ปล่อยขึ้น `main` และ push ไป GitHub แล้ว (`348bcc8`; push นี้พา commit เอกสารที่ค้างอยู่ก่อนหน้า — `413169a` audit note, `ab055dd` handoff — ขึ้นไปด้วย) diff ของรอบนี้ 49 เพิ่ม 15 ลบ ใน `wox-editor.user.js` + `tests/panel.test.mjs`

สิ่งที่แก้:
- **A1** เกมวาดการ์ดเดิมซ้ำด้วย id เดิม (`WV(e)` ล้าง `#choice-options` แล้วสร้างปุ่มใหม่: watchdog, หลังขายของ) ทำให้คีย์ไม่เปลี่ยน ป้ายชี้ปุ่มที่หลุด DOM และตัวจับเวลากดยิงแล้วเจอปุ่มเก่า ตอนนี้เพิ่ม `LOC.aiNeedsScan(key, prevKey, btns, prevBtns)` เทียบ **ตัวปุ่มจริง** และตัวจับเวลาตั้งกับ `aiBest` (ปุ่มของรอบนั้น) ไม่ใช่ `best.b` ของรอบก่อน
- **A2** `SIM.majorEvent`/`ev.options` อยู่ใน try ของ `aiScan` เอง ความล้มเหลวขึ้น `sim อ่านการ์ดไม่ได้ — <เหตุผล>` ใน `#ai_out` (เดิม throw ถูกผู้เรียกทั้งสองกลืน → แท็บช่วยเลือกว่างเปล่า)

## Verified facts

- `node --check wox-editor.user.js` → ผ่าน
- `node --test "tests/**/*.test.mjs"` → `# tests 77`, `# pass 77`, `# fail 0`, `# skipped 0` (ทั้งใน branch ผ่าน `WOX_BUNDLE=.../bundle/mwlvws3l` และบน `main` ที่มี `bundle/`)
- `node tools/release.mjs --dry-run "fix: A1/A2 ..."` → `✔ version 3.4.8 (ก่อนหน้า 3.4.7), syntax และเทสผ่าน`
- `wc -l wox-editor.user.js` → 1299 (อัปเดตใน `CLAUDE.md` §2 แล้ว)
- เกมที่เว็บเสิร์ฟตอนปล่อย: `curl .../src/build.js` → `BUILD = "mwlvws3l"` (ยังไม่เปลี่ยน)
- `git worktree list` → เหลือ worktree เดียว `main`; branch `fix/a1-a2-v348` ถูกลบหลัง merge (`git branch -d` ผ่าน = merge ครบ)
- `HANDOFF.md` ฉบับนี้ยังไม่ commit ตอนเขียน

## Guesses, not yet proven

- **A1 ผ่านในเกมแล้ว** (นายท่านยืนยัน 2026-11-18 บน build `mwlvws3l`) แต่ยังไม่มีบันทึกว่าเกิดจากเส้นทางไหน (watchdog / ขายของระหว่างการ์ดค้าง) และไม่ได้ยืนยันว่ากดอัตโนมัติยิงจริงระหว่างการวาดซ้ำ หรือแค่ป้ายกลับมา
- **A2 ยังไม่เคยเห็นข้อความ error จริง** — ต้องให้ sim พังจึงจะเห็น (`__woxSimError`) ปกติข้อความนี้ไม่ขึ้น
- v3.4.8 ไม่ได้ถูกตรวจแบบเจาะจง build: build ที่ใช้ตรวจคือ `mwlvws3l` ตามที่เกมเสิร์ฟตอนนั้น
- `aiScan` เรียก `SIM.majorTexts(t)` ทุกครั้งที่สแกน — ยังไม่รู้ว่าฝั่งเกมมีผลข้างเคียงกับการเรียกซ้ำ (ค้างจาก audit v3.4.6; ต้องจับด้วย probe)
- `opt.outcomes` / `opt.band` ของ build `mwlvws3l` ยังไม่ได้ตรวจ (สาขายังตายอยู่ถ้าเกมไม่ส่งมา)

## Ruled out and wrong turns

- ห้ามใช้ `document.write` เขียน import map (เคยทำให้หน้าเกมจอดำ)
- ห้ามแทรก DOM เข้าไปในปุ่มของเกม — observer ทั้งหน้าสแกนซ้ำทุกเฟรม เกมกระตุก คลิกหาย
- `fresh()` ห้ามกลับไป `root.activeElement` และ `dirty` ต้องเป็น `Set` ของ `LOC.fieldKey`
- ห้ามเอา `bagLocked` กลับมา (ต้นเหตุ R1)
- อย่าแก้ประตูกดอัตโนมัติให้ตัด `scored.length === rows.length` ออก
- `act` ให้ค่าน้ำหนักบวกไม่ได้: 0 ปกติ, −200 เมื่อคีย์เข้า `/die|death|kill|dead|perish/i`
- อเมนด์ commit ที่ push แล้วไม่ได้ (ruleset `protect-main`); อเมนด์ได้เฉพาะ commit ที่ยังไม่ push บน branch
- อย่าอ้างจำนวนเทสจาก `node --test` เปล่า ๆ (มันนับ `tools/test-summary.mjs`) — ใช้ glob `tests/**/*.test.mjs`
- worktree ใหม่ไม่มี `bundle/`: รันด้วย `WOX_BUNDLE="C:/Users/PC/Desktop/Wox UI/way-of-xian.wox-game.workers.dev/bundle/mwlvws3l"`
- ข้อความ commit หลายบรรทัดผ่าน PowerShell here-string ทำให้ subject กลายเป็น `@` — ใช้ `git commit -F -` ผ่าน bash heredoc (รอบนี้ใช้แล้วได้ผล)
- bump `@version` + `VERSION` ทำบน `main` หลัง merge เท่านั้น
- อย่าใช้ build id ในเอกสารเป็นความจริงถาวร — `curl .../src/build.js` ก่อนเสมอ

## Next step

**ก่อนอื่น: ถามนายท่านชาโดว์ว่าจะทำอะไรต่อ** ตัวเลือกที่มีหลักฐานรองรับ:

1. **รอผลตรวจในเกม** ของ v3.4.8 บน build `mwlvws3l` — ข้อที่ควรลอง: การ์ดที่เกมวาดซ้ำ (ขายของระหว่างการ์ดค้าง / watchdog) ป้ายต้องกลับมาและกดอัตโนมัติต้องทำงาน
2. **A4** `wox-editor.user.js` `:hadd` ไม่ `saved.add('b:' + id)` (~1 บรรทัด, ไม่มีอะไรให้ตัดสินใจ)
3. **A5** nit สี่จุด (`:929` `:String(s)` ตกเว้นวรรค, `:1111` `aiScan(true)` ส่งอาร์กิวเมนต์เกิน, `:1160` ไม่ล้าง `aiTimer`/`aiPend` เมื่อ `majorEvent` คืน undefined)
4. **A3** ปุ่มบันทึกเขียน index 0 ทับเมื่อ `rank`/`realm` ไม่อยู่ในรายการ — **ต้องให้นายท่านเลือกก่อน** ว่าจะ "คงค่าเดิม" หรือ "ปิดปุ่มบันทึก"
5. เก็บกวาดเอกสาร (`docs/superpowers/notes/` มี audit 3 รอบที่ปิดแล้ว) — ต้องได้คำสั่งก่อน

รายละเอียดเต็ม: `docs\superpowers\notes\2026-11-18-audit-v347.md` §5

## Waiting on the user

- **คำถามที่ค้าง:** จะทำ A4+A5 ต่อเลยไหม และ A3 จะเอาแบบไหน ("คงค่าเดิม" หรือ "ปิดปุ่มบันทึก")
- นายท่านเป็นคนอัปเดตสคริปต์ใน Tampermonkey และยืนยันผลในเกม (ตาม §7) — **v3.4.8 ผ่านในเกมแล้ว 2026-11-18**

## Files and places

ทุก path อยู่ใต้ root `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\`:

- `wox-editor.user.js` — สคริปต์หลัก v3.4.8, 1299 บรรทัด; `LOC` = pure function ที่มีเทส, ที่เหลือเป็นโค้ด DOM ใน IIFE เดียวกัน
- `CLAUDE.md` — กติกา (§5 บทเรียนเพิ่ม A1/A2 แล้ว, §6 สถานะ v3.4.8, §2 จำนวนบรรทัดใหม่)
- `HANDOFF.md` — ไฟล์นี้
- `docs\superpowers\notes\2026-11-18-audit-v347.md` — audit ล่าสุด (A1-A5; A1/A2 ปิดใน v3.4.8, A3/A4/A5 เปิด)
- `tests\panel.test.mjs` — เพิ่มเทส `aiNeedsScan` (77 เทสใน 8 ไฟล์, skip 0)
- `tools\release.mjs`, `tools\test-summary.mjs`, `tools\fetch-bundle.mjs` — เครื่องมือปล่อย/นับ skip/ดึง bundle
- `tools\snapshot-diff.mjs`, `tools\locate-sim.mjs` — **ห้ามลบ** (รอนายท่านสั่ง)
- `bundle\mwlvws3l\` — build ที่ตรงกับของสด; รวม `bundle/` 140 MB / 7 build (gitignore)
- `journal\2026-11-18.md` — บันทึกวันนี้ (gitignore)
- repo สาธารณะ — https://github.com/Jeffinz/wox-editor

## Changes made

- `wox-editor.user.js` — A1 (`LOC.aiNeedsScan`, `aiBtns`, `aiBest`, ตัวจับเวลาผูกปุ่มของรอบนั้น) + A2 (try/catch รอบ `majorEvent`/`ev.options`) + `@version`/`VERSION` = 3.4.8 → commit `2d84b96` (branch) → merge `0f2d4b6` → release `348bcc8` บน `main`
- `tests/panel.test.mjs` — เทส `aiNeedsScan` 1 ตัว
- `CLAUDE.md` — §2 จำนวนบรรทัด, §2 เวอร์ชัน, §5 บทเรียน 2 ข้อใหม่, §6 สถานะ v3.4.8
- `HANDOFF.md` — เขียนทับด้วยฉบับนี้ (ยังไม่ commit)
- ไม่มีไฟล์ชั่วคราวค้าง, ไม่มี branch/worktree ค้าง
