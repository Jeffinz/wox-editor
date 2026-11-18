# Handoff: รันแผนแก้ audit v3.4.2 (T1, C1, C5, C2, C6) → ปล่อย v3.4.3

Written: 2026-11-18 12:52 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน กติกาอยู่ในนั้น: ตอบภาษาไทยสั้น ๆ, รัน `node --check`, bump `@version` + `VERSION` พร้อมกัน, ปล่อยด้วย `tools/release.mjs`, เรียกผู้ใช้ว่า "นายท่านชาโดว์", **ห้ามแยก subagent** (§7), ใช้ `superpowers:executing-plans` ไม่ใช่ subagent-driven-development

## Goal

นายท่านชาโดว์สั่ง audit โปรเจ็คแล้วให้แก้ T1 → C1 → C2 → C6 ตามลำดับ ต่อมาสั่งให้รวม C5 ด้วย ผมเขียนแผนและตรวจแผนเสร็จแล้ว นายท่านสั่งให้ไปรันแผนใน session ใหม่

งานถือว่า "เสร็จ" เมื่อครบ 3 ข้อ:
- v3.4.3 ปล่อยขึ้น `main` และ raw URL เห็น `@version 3.4.3`
- เทสผ่านด้วย `fail 0, skipped 0`
- นายท่านตรวจในเกมจริงผ่านทุกข้อในแผน Task 5 Step 8

## Where things stand

- audit เสร็จแล้ว ผลอยู่ใน `docs/superpowers/notes/2026-11-18-audit-v342.md`
- แผน 5 task เขียนเสร็จ และตรวจกับโค้ดจริงแล้วหนึ่งรอบ จากนั้นแก้ตามผลตรวจและตามที่นายท่านตัดสินใจ
- **ยังไม่ได้เริ่มรันแผน** ยังไม่ได้แก้โค้ด และยังไม่มี worktree
- ไฟล์ 3 ไฟล์ยังไม่ได้ commit และตั้งใจปล่อยไว้แบบนั้น เพราะแผน Task 1 Step 0 จะ commit ทั้ง 3 ไฟล์เอง

## Verified facts

ทุกข้อรันเมื่อ 2026-11-18 12:52 บน `main` @ `4dd4ecc`

- `git status --short` เห็นแค่ 3 ไฟล์: ` M HANDOFF.md`, `?? docs/superpowers/notes/2026-11-18-audit-v342.md`, `?? docs/superpowers/plans/2026-11-18-audit-fixes-v342.md`
  - Task 1 Step 0 คาดว่าจะเจอแค่ 3 ไฟล์นี้
- `git worktree list` มีแค่ checkout หลัก ไม่มี `.worktrees/audit-v342`
- `git branch` เห็น `main` และ `audit/2026-11-18` (`2a9a3b2`) ซึ่งเป็น branch เก่าที่ค้างอยู่ ไม่เกี่ยวกับงานนี้ ห้ามลบเองโดยไม่ถามนายท่าน
- `@version 3.4.2` อยู่ที่ `wox-editor.user.js:3` และ `const VERSION = '3.4.2'` อยู่ที่ `:245`; `wc -l` ได้ 1142; `node --check` ผ่าน
- `WOX_BUNDLE=bundle/mwlnu1rf node --test "tests/**/*.test.mjs"` ได้ `# tests 58`, `# pass 58`, `# fail 0`, `# skipped 0`
- เลขบรรทัดที่แผนอ้างตรงกับโค้ดตอนนี้ทุกจุด ได้แก่
  - `#hqr` init `:654`
  - `TIERS = tables.tiers` `:790`
  - `fresh` `:832-848` (guard `activeElement` อยู่ที่ `:835` และแถวกระเป๋า `value="${n}"` อยู่ที่ `:845`)
  - ปุ่มบันทึกเรียก `fresh(true)` ที่ `:930`
  - `aiSig` มี 4 จุด: `:989`, `:995`, `:1029`, `:1034` (ตัวเทียบอยู่ที่ `:1027`)
  - `wait` interval `:1140`
  - `release.mjs:32` (รันเทส) และ `:35` (`git add`)
- ตอนนี้ไม่มีโค้ดตัวไหนอ่าน `dirty` หรือ `lastBagSig` จึงประกาศชื่อนี้ใหม่ได้โดยไม่ชน
- ช่องที่ `fresh()` เขียนค่าลงไป ยืนยันด้วย grep `id="h_`/`s_`/`hm` แล้ว:
  - `h_mrank h_mstage h_mforce h_karma h_fame h_realm h_layer h_qi hm s_<stat>` และ `[data-b]`
  - `h_mst` เป็น div
  - `hmb`/`hmr` เป็น id อื่นที่ฟังก์ชัน `isStateField` ต้องไม่นับ
- `git log --graph` เป็นเส้นตรง รอบก่อนเอา branch เข้า `main` แล้วจึง bump และรัน `release.mjs` บน `main`
  - `journal/2026-11-18.md` จดไว้ว่า "release.mjs จะ throw ถ้า bump อยู่ใน branch ก่อน merge"
- `git config --get push.autoSetupRemote` ไม่มีค่า จึงสั่ง `git push` เปล่า ๆ จาก branch ใหม่ไม่ได้
- ข้อเท็จจริงที่ยกมาจาก session audit (ยังไม่ได้รันซ้ำ):
  - `WOX_BUNDLE=nope` ทำให้ได้ `pass 53, skipped 5` แต่ exit 0 นี่คือหลักฐานของ T1
  - summary ของ `node --test` ออกทาง stdout ในรูปแบบ TAP เมื่อส่งผ่าน pipe
  - build ปัจจุบันคือ `mwlnu1rf` และแถว 2 ของ `TIERS` ใน `bundle/mwlnu1rf/b/c-KKS5VPJ2.js` คือ `#b8693e` ขณะที่ `TIER_LBL[1]` คือ `#c9c9c0`

## Guesses, not yet proven

- **event `input` จากช่องใน shadow root ถึง listener `root.addEventListener('input', …)` ทุกช่อง** รวมแถวกระเป๋าที่ `innerHTML` สร้างใหม่
  - เหตุผล: listener อยู่ที่ root ตัวเดียว และ `input` bubble อยู่แล้ว
  - วิธีพิสูจน์: นายท่านตรวจข้อ 2 ใน Task 5 Step 8
- **T1 guard ทำงานเมื่อรันจาก worktree** เพราะ `execFileSync` ส่ง `WOX_BUNDLE` ต่อให้ `node --test`
  - วิธีพิสูจน์: Task 1 Step 6
- **C2 จำคีย์แล้วไม่พลาดอีเว้นต์ที่ sim เติมทีหลัง:** คีย์รวม `!!SIM` แต่ไม่รวมกรณีที่ Map ของ events ถูกเติมทีหลังโดย `SIM` ยังเป็นตัวเดิม
  - ถ้าเจออาการ "ช่วยเลือกไม่ขึ้นหลังโหลดชุดเรื่องราว" ให้กลับมาดูจุดนี้
- **C6 จำนวนขั้นใน `TIERS`:** ถ้าเกมเพิ่มขั้นที่ 7 ตัวกรองจะมีตัวเลือกเพิ่มตาม แต่ `LOC.tierIdx` (`:104`) ตัดค่าที่ `Math.min(5, n)` ตอนนี้ยังไม่มีหลักฐานว่าเกมจะเพิ่มขั้น

## Ruled out and wrong turns

- **แผนเดิมให้ bump และรัน release บน branch `fix/audit-v342` ซึ่งผิด**
  - push จะล้มเพราะ branch ยังไม่มี upstream และถ้า push ผ่านก็ไม่ขึ้น `main` ที่ raw URL ชี้
  - ถ้า bump แล้ว merge ก่อนรัน release จะเหลือไฟล์ที่ไม่มีอะไรให้ commit แล้ว `release.mjs` จะ throw
  - แก้แล้ว: ตอนนี้ Task 5 ทำตามลำดับ merge → bump บน `main` → release
- **C1 แบบ `root.activeElement` ตกไปแล้ว**
  - ค่าที่พิมพ์แล้วคลิกออกไปที่เกมจะถูกรอบรีเฟรชทับ
  - ถ้า focus ค้างที่ช่องค้นหา `#hq` หรือ checkbox `ai_mark` แผงจะไม่รีเฟรชเลย
  - นายท่านเลือก dirty flag แทน (`LOC.isStateField`)
- **`skippedCount` แบบเอาบรรทัดแรกตกไปแล้ว** เพราะ summary อยู่ท้าย output ตอนนี้แผนใช้บรรทัดสุดท้าย และไม่นับบรรทัดที่เยื้อง
- **เดาว่า `node --test` เขียน summary ลง stderr ผิด** จริงแล้วออก stdout
- ข้อเดิมที่ยังจริง:
  - ห้ามใช้ `document.write` เขียน import map
  - `simNames`/`simPatch` ห้ามอ้างตัวแปรนอกฟังก์ชันตัวเอง
  - ไม่ใช้ jsdom และไม่มี `package.json`
  - ห้าม hardcode ชื่อ build ในเทส
  - ห้ามลบ `tools/snapshot-diff.mjs` หรือโฟลเดอร์ `src/`
  - worktree ไม่มี `bundle/` จึงต้องรันเทสด้วย `WOX_BUNDLE` แบบ path เต็ม

## Next step

1. เปิด skill `superpowers:executing-plans` แล้วทำตาม `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\docs\superpowers\plans\2026-11-18-audit-fixes-v342.md` โดยเริ่มที่ Task 1 Step 0
   - Step 0 รัน `git status --short` ต้องเห็นแค่ 3 ไฟล์
   - จากนั้น commit 3 ไฟล์นั้นบน `main` ด้วยข้อความ `docs: add the v3.4.2 audit notes and fix plan`
   - แล้วสร้าง worktree: `git worktree add .worktrees/audit-v342 -b fix/audit-v342 main`
2. ทำ Task 1-4 ใน worktree ทีละ step ตามแบบ TDD และ commit ทุก task
3. ทำ Task 5 Step 1-3 (`CLAUDE.md` + `HANDOFF.md`) ใน worktree
4. ทำ Task 5 Step 4-7 ใน checkout หลัก: `merge --ff-only` → bump เป็น 3.4.3 โดยไม่ commit → dry-run → release → ลบ worktree และ branch → commit handoff
   - ถ้า ff ไม่ผ่าน ให้หยุดแล้วถามนายท่าน
5. ส่ง Task 5 Step 8 ให้นายท่านตรวจในเกม

## Waiting on the user

- นายท่านอนุมัติแผนและวิธีรันแบบ native แล้ว (สั่งว่า "เราจะไปรันแผนในเซสซั่นใหม่") session ใหม่ไม่ต้องถามซ้ำ
- หลังปล่อย v3.4.3 นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey รีโหลดหน้าเกม แล้วตรวจตามแผน Task 5 Step 8 บน build `mwlnu1rf`
  - แผงรีเฟรชตามเกมเอง
  - พิมพ์แล้วคลิกออก ค่าไม่ถูกล้าง
  - focus ค้างที่ช่องค้นหาแล้ว แผงยังรีเฟรช
  - ชื่อในตัวกรองตรงกับป้าย
  - การ์ดช่วยเลือกยังทำงาน
  - ตรวจระบบขึ้น ✔ ครบ

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\docs\superpowers\plans\2026-11-18-audit-fixes-v342.md`: แผนที่จะรัน มี 5 task (Task 2 = C1 + C5 แบบ dirty flag, Task 5 = merge → bump → release) ยังไม่ได้ commit
- `…\docs\superpowers\notes\2026-11-18-audit-v342.md`: ผล audit แยกเป็น C1-C14, T1-T5, D1-D4, S1 ข้อที่ไม่อยู่ในแผนเก็บคิวไว้ที่นี่ ยังไม่ได้ commit
- `…\wox-editor.user.js`: สคริปต์หลัก v3.4.2 ยาว 1142 บรรทัด
- `…\tools\release.mjs`: ตัวปล่อยเวอร์ชัน Task 1 จะแก้ `:32` และ `:35`
- `…\tests\`: ตอนนี้มีเทส 58 ตัว หลังทำแผนเสร็จควรเป็น 67 (เพิ่ม `tests/release.test.mjs` 6 ตัว และเพิ่มใน `panel`/`items` อีก 3 ตัว)
- `…\bundle\mwlnu1rf\`: build ปัจจุบันของเกม (อยู่ใน gitignore) ใช้กับ `WOX_BUNDLE="C:/Users/PC/Desktop/Wox UI/way-of-xian.wox-game.workers.dev/bundle/mwlnu1rf"`
- `…\journal\2026-11-18.md`: journal ของวันนี้ มีบทเรียนเรื่องลำดับ merge/release และเหตุผลที่เลือก dirty flag
- `…\CLAUDE.md`: แหล่งความจริงของโปรเจ็ค Task 5 Step 1 จะแก้ §2/§5/§6

## Changes made

session นี้ไม่ได้แก้โค้ดและไม่ได้ commit อะไร (HEAD ยังเป็น `4dd4ecc`)

- `docs/superpowers/plans/2026-11-18-audit-fixes-v342.md`: แก้ตามผลตรวจแผน ได้แก่
  - เพิ่ม Step 0 ให้ commit เอกสาร
  - เปลี่ยน C1 เป็น dirty flag และเขียน `fresh()` ลงแผนทั้งก้อน
  - รวม C5 เข้ามา
  - `skippedCount` ใช้บรรทัดสุดท้าย และเพิ่ม `tools/test-summary.mjs` ใน `git add` ของ release
  - แก้ลำดับขั้นของ Task 5
  - แก้เลข step และจำนวนเทสที่คาด
  - ยังเป็นไฟล์ untracked
- `HANDOFF.md`: เขียนทับด้วยไฟล์นี้ ยังไม่ได้ commit
- `journal/2026-11-18.md`: เพิ่มบันทึกเรื่องการตรวจแผน (journal ไม่ขึ้นใน `git status`)
