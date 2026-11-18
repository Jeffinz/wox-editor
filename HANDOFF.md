# Handoff: v3.4.7 ปล่อยแล้ว — รอตรวจในเกม

Written: 2026-11-18 15:25 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน ไฟล์นั้นคือกติกาของโปรเจกต์: ตอบภาษาไทยสั้น ๆ, เรียกผู้ใช้ว่า "นายท่านชาโดว์", รัน `node --check` ก่อนส่งงาน, bump `@version` + `const VERSION` พร้อมกันแล้วปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7), นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey เอง

## Goal

userscript Tampermonkey ไฟล์เดียว (`wox-editor.user.js`) แก้สถานะเกม Way of Xian โหมดเล่นคนเดียว พร้อมแท็บอีเว้นต์และแท็บช่วยเลือกที่ให้คะแนนตัวเลือกบนการ์ดแล้วกดให้อัตโนมัติ

รอบล่าสุด: กวาด finding ของ audit v3.4.6 **ทั้ง 8 ข้อ (R1-R8)** ตามที่นายท่านเลือก

## Where things stand

- กวาด finding ครบ R1-R8 และปล่อย **v3.4.7** แล้วบน `main` (`814bf54`), push ขึ้น GitHub สำเร็จ
- งานแก้ทำใน worktree/branch `fix/audit-r1-r8` (`6f4b7b1`) แล้ว merge เข้า `main` (`fa4bbc3`) จากนั้น bump + release บน `main` ตามบทเรียน §5 — worktree และ branch ถูกลบแล้ว
- ยังไม่ได้ทดสอบในเกม: รอ นายท่านชาโดว์ อัปเดตสคริปต์ใน Tampermonkey แล้วรีโหลดหน้าเกม

## Verified facts

- `node --check wox-editor.user.js` → ผ่าน
- `node --test "tests/**/*.test.mjs"` (ใน main, มี `bundle/`) → `# tests 76`, `# pass 76`, `# fail 0`, `# skipped 0`
- `node tools/release.mjs --dry-run` → ผ่าน แล้ว release จริง: `✔ version 3.4.7 (ก่อนหน้า 3.4.6)`, push `5e5b250..814bf54 main -> main`
- `wc -l wox-editor.user.js` → 1283 (อัปเดตใน `CLAUDE.md` §2 แล้ว)
- build ที่เกมเสิร์ฟ `mwlq36t8` ยังตรงกับ `bundle/mwlq36t8/`
- จำนวนเทสลดจาก 77 เป็น 76 เพราะลบเทส `isStateField` 2 ตัว (R4) แล้วเพิ่มเทส `tierIdx` ติดลบ 1 ตัว (R7)

## What changed in v3.4.7

| # | ไฟล์ | สาระ |
|---|---|---|
| R1 | `wox-editor.user.js` `fresh()` | ถอด `bagLocked`: กระเป๋าสร้างแถวใหม่ได้แม้มีช่องพิมพ์ค้าง โดยเก็บค่าที่พิมพ์ไว้ (`dirty` คีย์ `b:<id>`) ใส่กลับหลัง `innerHTML` และปลดคีย์ของไอเทมที่หลุดจากกระเป๋า |
| R2 | `renderCore` | คงค่าที่เลือกใน `#h_realm`/`#h_mrank` หลังสร้าง `<option>` ใหม่ |
| R3 | `renderCore` | `esc(r.layers)` |
| R4 | `LOC` + `tests/panel.test.mjs` + `CLAUDE.md:55` | ลบ `LOC.isStateField` ที่ตายแล้ว และเขียนบทเรียน `fresh()` ให้ตรงพฤติกรรม v3.4.6 |
| R5 | `drawEvents` / `simInfo` / `setTimeout` ท้ายไฟล์ | `drawEvents` กลืน throw ผ่าน `renderEventList` (ประกาศแบบ function เพื่อ hoist) ขึ้น `EV_UNSUPPORTED` + เหตุผล; `simInfo` catch `SIM.allMajors()`; `runHealth`/`checkUpdate` มี `.catch` |
| R6 | `fresh()` | `fill('hm', t.money ?? '')` |
| R7 | `LOC.tierIdx` | `Math.max(0, Math.min(5, n))` + เทส |
| R8 | `tools/release.mjs` | ออกถ้าไม่ใช่ branch `main`; ถ้าไม่มีอะไร staged ข้าม commit แล้ว push ต่อ |

## Guesses, not yet proven

- R1 ยังไม่เคยรันในเกม: ต้องยืนยันว่า (ก) พิมพ์ค้างช่องกระเป๋าแล้วได้ไอเทมใหม่ในเกม ลิสต์ยังอัปเดตและค่าที่พิมพ์ไม่หาย (ข) ค่าที่พิมพ์แล้วกด "ตั้ง" ยังบันทึกถูก
- behavior ที่ยังคงอยู่โดยตั้งใจ: ถ้าเกมเปลี่ยนกระเป๋าระหว่างที่พิมพ์ช่องนั้น แถวจะถูกสร้างใหม่ (ค่าไม่หาย แต่ focus หลุด) — เลือกทางนี้เพราะถูกกว่าการอัปเดตทีละแถว
- `aiScan` เรียก `SIM.majorTexts(t)` ทุกครั้งที่สแกน ยังไม่รู้ว่าฝั่งเกมมีผลข้างเคียงกับการเรียกซ้ำหรือไม่ ต้องมีเบราว์เซอร์ยืนยัน — ไม่ใช่ finding จนกว่าจะมีหลักฐาน

## Ruled out and wrong turns

- ห้ามใช้ `document.write` เขียน import map (เคยทำให้หน้าเกมจอดำ)
- ห้ามแทรก DOM เข้าไปในปุ่มของเกม (ป้ายคะแนน) — เคยทำให้ observer สแกนซ้ำทุกเฟรม เกมกระตุก คลิกหาย
- `fresh()` ห้ามกลับไปใช้ `root.activeElement` และห้ามกลับไป `dirty` แบบ boolean ตัวเดียว
- ห้ามเอา `bagLocked` กลับมา: มันคือตัวที่ทำให้ทั้งลิสต์หยุดรีเฟรช (R1)
- อย่าแก้ประตูกดอัตโนมัติให้ตัด `scored.length === rows.length` ออก: ตัวเลือกที่มี blind ปน **สคริปต์ห้ามกดอัตโนมัติ**
- `act` ให้ค่าน้ำหนักบวกไม่ได้ (เป็นเนมสเปซเปิด) — 0 ปกติ, −200 เมื่อคีย์เข้า `/die|death|kill|dead|perish/i`
- อเมนด์ commit ที่ปล่อยแล้วไม่ได้ (ruleset `protect-main` กัน force-push); อเมนด์ได้เฉพาะ commit ที่ยังไม่ push บน branch
- อย่าอ้างจำนวนเทสจาก `node --test` เปล่า ๆ: มันเก็บ `tools/test-summary.mjs` เข้าไปนับด้วย ตัวเลขที่ถูกคือ `# tests N` จาก glob `tests/**/*.test.mjs`
- worktree ใหม่ไม่มี `bundle/` (gitignore): รันเทสด้วย `WOX_BUNDLE="C:/Users/PC/Desktop/Wox UI/way-of-xian.wox-game.workers.dev/bundle/mwlq36t8"` ไม่งั้นเทส bundle skip แล้ว release จะไม่ยอมปล่อย
- ข้อความ commit หลายบรรทัดใน PowerShell here-string ทำให้บรรทัดแรกกลายเป็น `@` — ใช้ `git commit --amend -F ไฟล์` แก้ (branch ที่ยังไม่ push) หรือส่งผ่าน `printf`

## Next step

**ก่อนอื่น: ถาม นายท่านชาโดว์ ว่าตรวจในเกมแล้วเป็นอย่างไร** โดยเฉพาะ R1:
1. เปิดเกม (build `mwlq36t8`) เปิดแผง พิมพ์เลขในช่องจำนวนไอเทมแถวใดแถวหนึ่ง **แต่ไม่กด "ตั้ง"**
2. ในเกม ได้/เสียไอเทม หรือจำนวนเปลี่ยน → ลิสต์กระเป๋าต้องอัปเดต และค่าที่พิมพ์ค้างไว้ต้องยังอยู่
3. กด "ตั้ง" แถวที่พิมพ์ค้าง → ค่าต้องถูกบันทึกและช่องหลุดจาก `dirty` (รีเฟรชตามปกติ)
4. ถ้า sim พัง ให้แท็บอีเว้นต์ขึ้น `EV_UNSUPPORTED` + เหตุผล ไม่ใช่เงียบ

ถ้าผ่าน: ปิดคิว audit v3.4.6 ทั้งชุด, เขียน journal, แล้วรอบหน้าคือ finding ของ audit v3.4.6 ส่วนที่เหลือซึ่ง **ตั้งใจไม่แก้** (C10-C14, S1, T4, T6)
ถ้าไม่ผ่าน: เปิด audit note `docs/superpowers/notes/2026-11-18-audit-v346.md` ดู R1 แล้วแก้ที่ `fresh()` — bump v3.4.8

## Waiting on the user

- ผลตรวจในเกมของ v3.4.7 (โดยเฉพาะ R1)
- นายท่านเป็นคนอัปเดตสคริปต์ใน Tampermonkey และยืนยันผลในเกม (ตาม §7 ของ CLAUDE.md)

## Files and places

ทุก path อยู่ใต้ root `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\`:

- `wox-editor.user.js` — สคริปต์หลัก v3.4.7, 1283 บรรทัด; `LOC` คือ namespace ของ pure function ที่มีเทส
- `docs\superpowers\notes\2026-11-18-audit-v346.md` — finding รอบล่าสุด (R1-R8 + ของเดิม C10-C14/S1/T4/T6) เปิดเมื่อต้องดูรายละเอียดข้อที่ไม่ผ่าน
- `docs\superpowers\notes\2026-11-18-audit-v345.md`, `2026-11-18-audit-v342.md` — audit รอบก่อน (ปิดแล้ว)
- `docs\superpowers\plans\2026-11-18-audit-fixes-v342.md` — แผนที่รันแล้ว (T1, C1, C2, C5, C6)
- `CLAUDE.md` — กติกาโปรเจกต์, บทเรียน §5, สถานะ §6 (มี v3.4.7 แล้ว), วิธีรับมือเกมอัปเดต §8
- `AGENTS.md` — ทางเข้าแบบสั้น ชี้กลับมาที่ `CLAUDE.md`
- `tests\` — 76 เทสใน 8 ไฟล์ (`core`, `health`, `items`, `locate`, `panel`, `release`, `scoring`, `sim`); `sim.test.mjs` ต้องมี `bundle/`
- `tools\release.mjs` — version sync + `node --check` + เทส + `skipped 0` + บังคับ branch `main` แล้ว commit + push
- `tools\test-summary.mjs` — อ่านบรรทัด `# skipped` ให้ release
- `tools\fetch-bundle.mjs` — ดึง build ปัจจุบันลง `bundle\<BUILD>\` (gitignore)
- `tools\snapshot-diff.mjs`, `tools\locate-sim.mjs` — เครื่องมือวิเคราะห์ **ห้ามลบ**
- `bundle\mwlq36t8\` — build ที่ตรงกับของสด (gitignore); มี build เก่าอีก 5 โฟลเดอร์
- `journal\2026-11-18.md` — บันทึกของวัน (gitignore)

## Changes made

- `wox-editor.user.js` — R1-R7 + bump 3.4.7
- `tools/release.mjs` — R8
- `tests/items.test.mjs` (+1 เทส), `tests/panel.test.mjs` (−2 เทส `isStateField`)
- `CLAUDE.md` — บทเรียนใหม่ 3 บรรทัด, สถานะ v3.4.7, จำนวนบรรทัด §2
- `HANDOFF.md` — เขียนทับ (handoff ของ audit v3.4.6 รอบก่อน)
- commits: `6f4b7b1` (branch) → `fa4bbc3` (merge) → `814bf54` (release, pushed)
- ไม่มีไฟล์ชั่วคราวค้าง, worktree ถูกลบแล้ว
