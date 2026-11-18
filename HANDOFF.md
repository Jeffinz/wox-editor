# Handoff: wox-editor v3.4.5 ปล่อยแล้ว — คิว T2 ปิด เหลือ finding audit ที่ยังไม่แก้

Written: 2026-11-18 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\CLAUDE.md` ก่อน ไฟล์นั้นคือกติกาของโปรเจกต์: ตอบภาษาไทยสั้น ๆ, รัน `node --check` ก่อนส่งงาน, bump `@version` + `const VERSION` พร้อมกันแล้วปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7), ผู้เล่นต้องอัปเดตสคริปต์ใน Tampermonkey เอง

## Goal

userscript Tampermonkey ไฟล์เดียว (`wox-editor.user.js`) สำหรับแก้สถานะเกม Way of Xian โหมดเล่นคนเดียว และมีแท็บช่วยเลือกที่ให้คะแนนตัวเลือกบนการ์ดอีเว้นต์แล้วกดให้อัตโนมัติ นายท่านชาโดว์ต้องการให้อีเว้นต์ที่ตัวเลือกมีผลเป็น `act` (ไม่ใช่ `fx` ตัวเลข) ก็ถูกประเมินและกดอัตโนมัติได้ — **งานนี้เสร็จและตรวจบนเว็บแล้ว** "เสร็จ" ของรอบถัดไป = ปิด finding ที่เหลือใน audit note หรือทำสิ่งที่สั่งใหม่

## Where things stand

ทุกอย่าง merge เข้า `main` แล้ว ไม่มี branch หรือ worktree ค้าง tree สะอาด v3.4.4 (ให้คะแนน `act`) และ v3.4.5 (ไม่กดเมื่อคะแนนเท่ากันหมด) ปล่อยแล้วและนายท่านตรวจบนเว็บผ่าน งานที่ยังไม่เริ่มคือ finding C3, C4, C7-C14, S1, T3, T5 ใน `docs\superpowers\notes\2026-11-18-audit-v342.md`

## Verified facts

- `@version 3.4.5` ทั้งในไฟล์ (`wox-editor.user.js:3`) และ raw URL `https://raw.githubusercontent.com/Jeffinz/wox-editor/main/wox-editor.user.js` (ตรวจด้วย `curl -s ... | grep -m1 "@version"`)
- เทสผ่าน 72/72 `fail 0 skipped 0` ทั้ง build `mwlnu1rf` และ build ปัจจุบัน `mwlq36t8`: `WOX_BUNDLE="C:/Users/PC/Desktop/Wox UI/way-of-xian.wox-game.workers.dev/bundle/mwlq36t8" node --test "tests/**/*.test.mjs"`
- เกมเว็บเสิร์ฟ build `mwlq36t8` แล้ว (`curl -s https://way-of-xian.wox-game.workers.dev/src/build.js` → `export const BUILD = "mwlq36t8";`); `tools/fetch-bundle.mjs` ดึงลง `bundle\mwlq36t8\` ได้
- commit ล่าสุด: `3153b95` (docs) ← `f87864e` (v3.4.5) ← `41faba2` (v3.4.4) ← `a0a6eb7` (docs)
- `git branch -a` มีแต่ `main`; `git worktree list` มีแต่โฟลเดอร์หลัก
- `wox-editor.user.js` ยาว 1192 บรรทัด

## Guesses, not yet proven

- นายท่านตรวจ v3.4.5 "บนเว็บ" อาจเป็น build `mwlnu1rf` หรือ `mwlq36t8` — ไม่ได้ถาม สิ่งที่พิสูจน์ได้คือเทสผ่านทั้งสอง build; ถ้าเจอ sim หายในเกม ให้ดู `window.__woxSimError` แล้วแก้ `LOC.simNames` ตามรูปร่างโค้ดใหม่
- `LOC.tierIdx` ตัดขั้นที่ 5 แต่ `LOC.tierLabels` อาจคืนตัวเลือกเกิน 5 ได้ถ้า `TIERS` ของเกมยาวกว่านั้น — ยังไม่เจอของจริงที่ยาวกว่า 5

## Ruled out and wrong turns

- ห้ามใช้ `document.write` เขียน import map (เคยทำให้หน้าเกมจอดำ) — ต้องแทรก `<script type="importmap">` เป็น DOM node ที่ `document-start`
- ห้ามแทรก DOM เข้าไปในปุ่มของเกม (ป้ายคะแนน) — เคยทำให้ observer สแกนซ้ำทุกเฟรม เกมกระตุก คลิกหาย
- `fresh()` ห้ามกลับไปใช้ `root.activeElement` ตัดสินว่าจะข้ามรอบไหม — เคยทำให้ค่าที่พิมพ์ถูกทับ และ focus ค้างที่ช่องค้นหาทำให้แผงหยุดรีเฟรชถาวร ใช้ `dirty` + `LOC.isStateField` แทน
- ให้ `act` น้ำหนักบวกไม่ได้: `act` เป็นเนมสเปซเปิด (`{rel:10}`, `{kill:!0}`, `{marry:...}`, `{sectHere:3}`, `{shadowWound:32,shadowRob:!0}`, `{deathChance:...}`) ไม่มีตัวประเมินกลางให้ดูเครื่องหมาย จึงให้ 0 และหัก 200 เฉพาะคีย์เข้า `/die|death|kill|dead|perish/i` เท่านั้น
- อย่าแก้ประตูกดอัตโนมัติให้ตัด `scored.length === rows.length` ออก: นายท่านสั่งชัด (2026-11-18) ว่าเคสที่ตัวเลือกหนึ่งประเมินได้ อีกตัว blind ให้กดเองได้
- อเมนด์ commit ที่ปล่อยแล้วไม่ได้ เพราะ ruleset `protect-main` กัน force-push — commit message ของ release ส่งหลายบรรทัดผ่านอาร์กิวเมนต์ `tools/release.mjs "..."` เพื่อใส่ `Co-Authored-By`

## Next step

รอคำสั่งว่าจะทำ finding ตัวไหนต่อ (แนะนำ C7/C9 ซึ่งเป็นการกันไม่ให้คีย์ sim สามที่และ `STATE_OPTIONAL` หลุดจากกัน — เสี่ยงน้อย ได้เทสเพิ่ม) เปิดอ่าน `docs\superpowers\notes\2026-11-18-audit-v342.md` แล้วทำใน session หลัก ห้ามแยก subagent ก่อนปล่อยทุกครั้ง: `node --check wox-editor.user.js`, เทสด้วย `WOX_BUNDLE` ชี้ build ล่าสุด ต้องได้ `skipped 0`, bump version แล้ว `node tools/release.mjs "...(vX.Y.Z)"` บน `main`

## Waiting on the user

- ยังไม่ได้เลือกว่าจะปิด finding ตัวไหนต่อ
- นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey และรีโหลดหน้าเกมเองเมื่อมีเวอร์ชันใหม่

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\wox-editor.user.js` — สคริปต์หลัก v3.4.5, 1192 บรรทัด; `LOC` คือ namespace ของ pure function ที่มีเทส (โหลดด้วย CommonJS ได้เมื่อ `document` ไม่มี)
- `...\CLAUDE.md` — กติกาโปรเจกต์, บทเรียนใน §5, สถานะเวอร์ชันใน §6; repo สาขา docs
- `...\HANDOFF.md` — ไฟล์นี้
- `...\tests\` — 72 เทส (`scoring.test.mjs` 5 ตัวคือของ v3.4.4-3.4.5)
- `...\tools\release.mjs` — ตรวจ version sync, `node --check`, เทส, `skipped 0` แล้ว commit + push
- `...\tools\test-summary.mjs` — อ่านบรรทัด `# skipped`
- `...\tools\fetch-bundle.mjs` — ดึง build ปัจจุบันลง `bundle\<BUILD>\`
- `...\bundle\mwlq36t8\` — build ล่าสุด (gitignore)
- `...\docs\superpowers\notes\2026-11-18-audit-v342.md` — finding C1-C14, T1-T5, S1 คิวที่เหลือ
- `...\docs\superpowers\plans\2026-11-18-audit-fixes-v342.md` — แผนที่รันแล้ว (T1, C1, C2, C5, C6)
- `...\journal\2026-11-18.md` — บันทึกบทเรียนของวัน (gitignore)

## Changes made

- `wox-editor.user.js` — v3.4.4: `LOC.fxScore`/`outScore`/`hasResult`, ให้คะแนน `act`; v3.4.5: `LOC.allTie` + ไม่กดเมื่อคะแนนเท่ากันหมด — commit `41faba2`, `f87864e`
- `tests\scoring.test.mjs` — ใหม่ 5 เทส — commit `41faba2`
- `CLAUDE.md` — §2 เลขบรรทัด, §5 บทเรียน act/tie-break, §6 สถานะ v3.4.4-3.4.5 — commit `41faba2`, `f87864e`, `3153b95`
- `HANDOFF.md` — เขียนใหม่ — commit `3153b95` (ฉบับนี้ยังไม่ commit ตอนเขียน)
- `journal\2026-11-18.md` — ต่อท้าย (gitignore)
