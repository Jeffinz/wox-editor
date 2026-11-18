# Handoff: ลงมือแก้ finding ของ audit ตามแผน แล้วปล่อย v3.3.2

Written: 2026-11-18 09:43 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน กติกาของโปรเจ็คอยู่ในนั้น: ตอบภาษาไทย, รัน `node --check`, bump `@version` และ `VERSION` พร้อมกัน, ปล่อยด้วย `tools/release.mjs`, เรียกผู้ใช้ว่า "นายท่านชาโดว์" และ**ห้ามแยก subagent** (§7)

## Goal

นายท่านชาโดว์ต้องการให้แก้ทุก finding ของ audit 2026-11-18 ที่ไม่ชนกับงาน (ก) งาน (ก) คือแท็บอีเว้นต์/ช่วยเลือกแบบใหม่ ทุกการแก้ต้องมีเทส แล้วปล่อย `wox-editor.user.js` เป็น **v3.3.2 ครั้งเดียว**

งานถือว่าเสร็จเมื่อครบทุกข้อนี้:
- Task 0-9 ในแผนติ๊กครบ
- เทสได้ fail 0 / skip 0
- ruleset ของ `main` ใช้งานอยู่
- raw `main` แสดง `@version 3.3.2`
- `HANDOFF.md` ใหม่มีรายการให้นายท่านตรวจในเกม

## Where things stand

ออกแบบเสร็จและนายท่านอนุมัติแล้ว แผนเขียนเสร็จแล้ว แต่**ยังไม่มีโค้ดไหนถูกแก้** ยังไม่มี worktree และยังไม่ได้ตั้ง ruleset งานทั้งหมดอยู่ที่ branch `audit/2026-11-18` ซึ่งยังไม่ได้ push

## Verified facts

- **branch `audit/2026-11-18` อยู่ที่ `cfe47e6`** (`git log --oneline -1`) working tree สะอาด (`git status --short` ว่าง)
- **`main` ในเครื่อง (`16308fb`) นำ `origin/main` (`9f94ca5`) อยู่ 1 commit** ตรวจด้วย `git rev-parse main origin/main` commit ที่นำคือ `16308fb docs: rewrite the handoff for the events work` ซึ่งจะถูก push ไปพร้อมกันตอนรัน `release.mjs` ใน Task 9 ถือว่าปกติ
- **นายท่านอนุมัติ design doc แล้ว** คือ `docs/superpowers/specs/2026-11-18-audit-fixes-design.md` (commit `640064e`)
- **แผนอยู่ที่ `docs/superpowers/plans/2026-11-18-audit-fixes.md`** (commit `cfe47e6`) มี Task 0-9
- **คำตอบของนายท่านที่ล็อกไว้ในแผนแล้ว:**
  - ทดสอบแบบ A: ย้ายตรรกะเป็นฟังก์ชัน pure ใน `LOC` แล้วเทสใน Node ไม่ใช้ jsdom
  - F4 แก้เฉพาะข้อความ ไม่ลบโค้ดตาย
  - S1 ตั้งผ่าน `gh` โดยกฎ**บังคับเจ้าของ repo ด้วย** (`bypass_actors: []`)
  - S5 รองรับเฉพาะสคริปต์ v3.0 ขึ้นไป (ไม่มี v2.x ค้างใน Tampermonkey)
- **ตัวระบุแผงเก่ามีครบทุกรุ่น** ทุก commit ที่แก้ `wox-editor.user.js` ตั้งแต่ `1a5da62` (v3.0.0) ถึง `9f94ca5` (v3.3.1) มี `aria-label="WoX Editor"` อยู่ 1 จุด และ `<b>WoX Editor</b>` อยู่ 1 จุด ตรวจด้วย `git show <c>:wox-editor.user.js | grep -c`
- **บัญชี `gh` มีสิทธิ์ admin บน `Jeffinz/wox-editor`** ตรวจด้วย `gh api repos/Jeffinz/wox-editor --jq .permissions` ได้ `admin: true` repo เป็น public และ default branch คือ `main`
- **`release.mjs` stage เฉพาะไฟล์เหล่านี้:** `wox-editor.user.js`, `tools/release.mjs`, `tests/`, `.gitignore`, `CLAUDE.md`, `AGENTS.md` ถ้าไม่มีอะไรให้ commit จะ throw ก่อนถึงขั้น push แผนจึงให้ bump version บน `main` หลัง merge
- **`bundle/mwky5ysx/` มีอยู่แล้ว** (`ls bundle`) โฟลเดอร์นี้ gitignore อยู่ และ worktree ใหม่จะไม่มีโฟลเดอร์นี้ ต้องรัน `node tools/fetch-bundle.mjs` ใน worktree (Task 0)
- **เทสก่อนแก้ได้ pass 24 / fail 0 / skip 1** (Node v22.23.5) ข้อที่ skip คือ `chunkChain reads the real mwkobenp chain`
- **BUILD ล่าสุดที่ตรวจคือ `mwky5ysx`** ตรวจเมื่อ 2026-11-18 ด้วย `curl -s https://way-of-xian.wox-game.workers.dev/src/build.js`

## Guesses, not yet proven

- **การจับ tier สตริงเข้ากับ index 0-4 ของตัวกรองอาจทำให้ผู้ใช้สับสน** ตัวอย่างคือ `uncommon` แสดงป้าย "ไม่ธรรมดา" แต่ไปอยู่ใต้ตัวกรอง "ขั้นมนุษย์" แผน Task 2 Step 4 ให้ผู้ลงมือตัดสิน ข้อนี้จะรู้แน่ก็ต่อเมื่อนายท่านเปิดแท็บกระเป๋าในเกม
- **payload ของ ruleset** ที่คาดไว้คือ `target: "branch"`, `enforcement: "active"`, `conditions.ref_name.include: ["refs/heads/main"]`, rules `non_fast_forward` + `deletion`, `bypass_actors: []` ทั้งหมดนี้มาจากความจำ ยังไม่ได้ตรวจกับเอกสาร GitHub ต้องตรวจก่อนรัน (Task 9 Step 3)
- **ruleset ที่ไม่มี bypass ไม่น่าบล็อก push ปกติจาก `release.mjs`** เพราะไม่มีกฎ review หรือ status check จะรู้แน่ตอนรัน Task 9 Step 8
- ข้อที่ยังค้างจาก handoff ก่อนและยังไม่มีใครตรวจในเกม build `mwky5ysx`:
  - ป้ายระดับของไอเทม tier สตริงแสดงถูกหรือไม่
  - `t.pending` และคลาส `r-*` ยังมีจริงหรือไม่
  - `renderCore` throw จริงกับไอเทมที่ไม่มี `slot` หรือไม่

## Ruled out and wrong turns

- **ห้ามแยก subagent** session นี้ส่ง subagent ไปตรวจ design doc หนึ่งครั้ง และนายท่านบอกว่าเปลือง token ตอนนี้กติกานี้อยู่ใน `CLAUDE.md` §7 แล้ว การรีวิวโค้ดก่อน merge ต้องทำเองใน session เดียวกัน
- **อย่าตั้ง branch protection แบบไม่บังคับ admin** repo นี้เป็นของบัญชีส่วนตัว และเจ้าของเป็นคนเดียวที่ push ถ้าไม่บังคับ admin กฎจะไม่กันใครเลย
- **อย่ารวม bump version ไว้ใน branch ก่อน merge** ถ้าทำแบบนั้น `release.mjs` จะไม่มีอะไรให้ commit แล้ว throw ก่อน push
- **อย่าเชื่อ `AGENTS.md`** ไฟล์นี้เขียนก่อนยุค bundle เนื้อหาบางส่วนของ `CLAUDE.md` §2/§4/§6 ก็ตกรุ่นแล้ว (เช่น "ประมาณ 500 บรรทัด" ทั้งที่จริง 904 และ `sim.js:2814`) Task 8 จะแก้
- **offset ทุกตัวใน `docs/superpowers/notes/2026-11-17-events-spike.md` และ `docs/superpowers/plans/2026-11-17-bundle-port.md` เป็นของ build `mwkobenp`** ใช้กับ `mwky5ysx` ไม่ได้
- **อย่า `import()` ไฟล์ `app-*.js` หรือ `boot-*.js`** ทั้งในสคริปต์และในเทส เพราะจะรันเกมชุดที่สอง

## Next step

เริ่ม **Task 0** ของ `docs/superpowers/plans/2026-11-18-audit-fixes.md` ด้วย `superpowers:executing-plans` ขั้นตอนคือ:
1. สร้าง worktree branch `fix/audit-v3.3.2` แตกจาก `audit/2026-11-18`
2. รัน `node tools/fetch-bundle.mjs` ใน worktree
3. รันคำสั่งนี้แล้วต้องได้ pass 24 / skip 1

```
node --check wox-editor.user.js && node --test "tests/**/*.test.mjs"
```

จากนั้นทำ Task 1 ถึง Task 8 ตามลำดับ commit ทุก task และหลังแต่ละ task เทสต้องได้ skip 0 สุดท้ายคือ Task 9: รีวิว inline → ตั้ง ruleset S1 → merge `--no-ff` เข้า `main` → bump เป็น `3.3.2` → `release.mjs --dry-run` → `release.mjs` → เขียน handoff ใหม่ที่มี id ของ ruleset และรายการตรวจในเกม 7 ข้อ

## Waiting on the user

- **หลังปล่อย v3.3.2:** นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey รีโหลดเกม แล้วตรวจ 7 ข้อตาม spec หัวข้อ "ตรวจในเกม" (`docs/superpowers/specs/2026-11-18-audit-fixes-design.md`)
- **ยังไม่ได้ตอบ (ค้างจาก handoff ก่อน):** ใครเป็นคนตรวจในเกม นายท่านเปิดเองหรือให้ใช้ claude-in-chrome ถ้ายังไม่มีคำตอบ ให้ถือว่านายท่านตรวจเอง
- **ถ้า push ถูกปฏิเสธหลังตั้ง ruleset:** หยุด อย่าปิดกฎเอง แล้วรายงานนายท่าน

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\docs\superpowers\plans\2026-11-18-audit-fixes.md`: แผนที่ต้องทำ เป็นไฟล์สำคัญที่สุด
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\docs\superpowers\specs\2026-11-18-audit-fixes-design.md`: design ที่อนุมัติแล้ว มีเหตุผลของแต่ละ finding และรายการตรวจในเกม
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\docs\superpowers\notes\2026-11-18-audit-findings.md`: finding F1-F8, S1-S7, R1-R8, T1-T4 พร้อมหลักฐานและเลขบรรทัด (เลขบรรทัดเป็นของ v3.3.1)
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\wox-editor.user.js`: สคริปต์ v3.3.1 ยาว 904 บรรทัด `LOC` อยู่ที่ `:13-123` และทางออกสำหรับเทสอยู่ที่ `:125`
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\tests\locate.test.mjs`: เทสเดิม 25 ข้อ Task 1 จะแก้ `:9-12` และ `:174-183`
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\tools\fetch-bundle.mjs`: ดึง JS ของเกมลง `bundle/<BUILD>/`
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\tools\release.mjs`: ปล่อยเวอร์ชัน (check, commit, push `main`)
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\bundle\mwky5ysx\`: bundle ของเกม (gitignore)
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\CLAUDE.md`: กติกาโปรเจ็ค §7 มีกฎห้ามแยก subagent ส่วน §2/§3/§5/§6 รอแก้ใน Task 8
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\journal\2026-11-18.md`: journal ของวันนี้
- repo: https://github.com/Jeffinz/wox-editor (public)

## Changes made

- `docs/superpowers/specs/2026-11-18-audit-fixes-design.md`: สร้างใหม่ committed ที่ `640064e`
- `CLAUDE.md` §7: เพิ่มกฎห้ามแยก subagent committed ที่ `640064e`
- `docs/superpowers/plans/2026-11-18-audit-fixes.md`: สร้างใหม่ committed ที่ `cfe47e6`
- `HANDOFF.md` (ไฟล์นี้): เขียนทับเวอร์ชัน 01:43 committed บน `audit/2026-11-18`
- `journal/2026-11-18.md`: เพิ่มหัวข้อ design/แผน (โฟลเดอร์ `journal/` ถูก gitignore ไม่ขึ้น repo)
- นอก repo: memory `no-subagents.md` ใน `C:\Users\PC\.claude\projects\C--Users-PC-Desktop-Wox-UI-way-of-xian-wox-game-workers-dev\memory\`
- ไม่มีไฟล์โค้ดถูกแก้ ทั้ง `wox-editor.user.js`, `tests/` และ `tools/` ไม่เปลี่ยน
