# Handoff: audit v3.4.5 เสร็จ — ยังไม่ได้เลือกว่าจะแก้ finding ตัวไหน

Written: 2026-11-18 14:18 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\CLAUDE.md` ก่อน ไฟล์นั้นคือกติกาของโปรเจกต์: ตอบภาษาไทยสั้น ๆ, เรียกผู้ใช้ว่า "นายท่านชาโดว์", รัน `node --check` ก่อนส่งงาน, bump `@version` + `const VERSION` พร้อมกันแล้วปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7), นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey เอง

## Goal

userscript Tampermonkey ไฟล์เดียว (`wox-editor.user.js`) สำหรับแก้สถานะเกม Way of Xian โหมดเล่นคนเดียว พร้อมแท็บอีเว้นต์และแท็บช่วยเลือกที่ให้คะแนนตัวเลือกบนการ์ดแล้วกดให้อัตโนมัติ ฟีเจอร์ที่ขอไว้ทำครบและตรวจในเกมแล้ว รอบนี้เป็นงาน **audit** (อ่านโค้ด หา finding เขียน note) ไม่แก้อะไร "เสร็จ" ของรอบถัดไป = เลือก finding แล้วปิดให้จบพร้อมเทสและ release

## Where things stand

v3.4.5 อยู่บน `main` และใช้งานได้ audit รอบใหม่ของ v3.4.5 เขียนเสร็จที่ `docs\superpowers\notes\2026-11-18-audit-v345.md` (ยังไม่ commit) ยังไม่ได้แตะโค้ดสคริปต์เลย tree สะอาดยกเว้น note ไฟล์ใหม่ 1 ไฟล์ งานที่ยังไม่เริ่มคือการแก้ finding: N1-N4 (ของใหม่) และ C3, C4, C7-C14, S1, T3, T5 (ค้างจาก audit v3.4.2)

## Verified facts

- ตรวจซ้ำแล้วใน session 14:18: `git diff --stat a4974fb -- wox-editor.user.js tests tools` ว่าง (โค้ดไม่เปลี่ยนหลัง audit), เทส 72/72 skipped 0, build สดยังเป็น `mwlq36t8`, บรรทัดที่อ้างของ N1/N2/C3/C4 ยังตรง
- `main` @ `a4974fb` (`git log --oneline -1`), `git status --porcelain` เหลือแค่ `?? docs/superpowers/notes/2026-11-18-audit-v345.md`
- `node --check wox-editor.user.js` ผ่าน
- `node --test "tests/**/*.test.mjs"` → `# tests 72`, `# pass 72`, `# fail 0`, `# skipped 0`
- `node --test` แบบไม่ใส่ path ได้ `tests 73` เพราะ Node เก็บ `tools/test-summary.mjs` เข้าไปรันด้วย (glob `**/test-*`) — ไม่ใช่เทสจริง จำนวนที่นับคือ 72
- build ที่เกมเสิร์ฟ: `curl -s https://way-of-xian.wox-game.workers.dev/src/build.js` → `export const BUILD = "mwlq36t8";` และ `bundle\mwlq36t8\` ในเครื่องคือ build เดียวกัน จึงเป็นการรันเทสกับ build สด
- `wox-editor.user.js` ยาว 1192 บรรทัด (`wc -l`)
- `git branch -a` มีแต่ `main`; ไม่มี worktree ค้าง
- finding ที่ยืนยันในโค้ดปัจจุบัน (เลขบรรทัดของ v3.4.5): `dirty` ตั้งที่ `:888` และเป็น guard ที่ `:892` โดยไม่มีทางถูกล้างนอกจาก `fresh(true)` ที่ `:853`/`:992`; `simReady.then(() => { drawEvents(); aiScan(); })` ที่ `:882` ไม่มี try/catch; ปุ่มเรียกอีเว้นต์ `:984-990` เรียก `SIM.openOptions`/`SIM.rarityFor` ไม่มี try; timer กดอัตโนมัติ `:1112-1120` ไม่ clear เมื่อ `best` เป็น null
- `pending: {}` ผ่าน `LOC.stateLines` ได้บรรทัด `✔ pending: undefined undefined` (รันด้วย `node -e` แล้ว)
- `LOC.tierIdx(-1)` คืน `-1`, `LOC.tierIdx('EPIC')` คืน `null` (ค่าตัวพิมพ์ใหญ่ไม่ตรงกับ `RAR_ORDER`)

## Guesses, not yet proven

- สาเหตุที่แผงค้าง: สมมติฐานว่า N1 (`dirty` ค้าง) ทำให้ `fresh()` หยุดทุกรอบ น่าจะเป็นอาการที่ผู้ใช้จะเจอจริงเมื่อพิมพ์ค้างแล้วไม่กดบันทึก — ยังไม่มีรายงานจากนายท่าน สิ่งที่จะพิสูจน์: เปิดเกม พิมพ์เลขในช่องเงิน ไม่กดบันทึก คลิกเข้าเกม แล้วดูว่าเงินในแผงยังเปลี่ยนตามเกมไหม
- N2 ต้องมีเงื่อนไขแคบ (เปลี่ยน preset/`ai_delay` ในจังหวะที่คะแนนออกมาเท่ากันภายใน `cfg.delay`) จึงยังไม่มีหลักฐานว่าเกิดในเกมจริง — พิสูจน์ได้ด้วยเทสหน่วยถ้าย้ายประตูตัดสินเข้า `LOC`

## Ruled out and wrong turns

- ห้ามใช้ `document.write` เขียน import map (เคยทำให้หน้าเกมจอดำ) — ต้องแทรก `<script type="importmap">` เป็น DOM node ที่ `document-start`
- ห้ามแทรก DOM เข้าไปในปุ่มของเกม (ป้ายคะแนน) — เคยทำให้ observer สแกนซ้ำทุกเฟรม เกมกระตุก คลิกหาย
- `fresh()` ห้ามกลับไปใช้ `root.activeElement` ตัดสินว่าจะข้ามรอบไหม — เคยทำให้ค่าที่พิมพ์ถูกทับ และ focus ค้างที่ช่องค้นหาทำให้แผงหยุดรีเฟรช ใช้ `dirty` + `LOC.isStateField` แทน (แต่ `dirty` แบบ boolean ที่ใช้อยู่ก็มีปัญหา N1 — ต้องแก้ให้ละเอียดขึ้น ไม่ใช่ถอยกลับไปใช้ activeElement)
- ให้ `act` น้ำหนักบวกไม่ได้: `act` เป็นเนมสเปซเปิด (`{rel:10}`, `{kill:!0}`, `{marry:...}`, `{sectHere:3}`, `{shadowWound:32,shadowRob:!0}`, `{deathChance:...}`) ไม่มีตัวประเมินกลางให้ดูเครื่องหมาย จึงให้ 0 และหัก 200 เฉพาะคีย์เข้า `/die|death|kill|dead|perish/i`
- อย่าแก้ประตูกดอัตโนมัติให้ตัด `scored.length === rows.length` ออก: นายท่านสั่งชัด (2026-11-18) ว่าเคสที่ตัวเลือกหนึ่งประเมินได้ อีกตัว blind **สคริปต์ห้ามกดอัตโนมัติ** ให้ผู้เล่นกดเอง (ฉบับก่อนเขียนว่า "ให้กดเองได้" ความหมายเดียวกัน: "กดเอง" = ผู้เล่นกด)
- อเมนด์ commit ที่ปล่อยแล้วไม่ได้ เพราะ ruleset `protect-main` กัน force-push — commit message ของ release ส่งหลายบรรทัดผ่านอาร์กิวเมนต์ `tools/release.mjs "..."` เพื่อใส่ `Co-Authored-By`
- อย่าอ้างจำนวนเทส 72 ว่าเป็น "จำนวนบรรทัด `ok`": `node --test` เปล่า ๆ ได้ 73 เพราะรัน `tools/test-summary.mjs` เป็นไฟล์เทสด้วย

## Next step

ขั้นแรก: ถามนายท่านว่าตกลงทำ N1 + N2 เป็น v3.4.6 ไหม (เสนอไว้แล้ว ยังไม่ตอบ) ถ้าตกลง เริ่ม N1 ด้วยเทสก่อน (TDD) ลำดับทั้งหมด:

1. N1 — `dirty` ค้าง (กลาง) แก้ฝั่ง DOM: `dirty` เป็น `Set` ของ id, `fresh()` เขียนเฉพาะช่องที่ไม่อยู่ในชุด, ล้างเมื่อ `focusout` และค่าเท่ากับ state เดิม
2. N2 — เพิ่ม `else { clearTimeout(aiTimer); aiPend = null; }` ต่อจาก `:1113`
3. C3 + C4 — ครอบ try/catch ที่ `:882` และ `:984-990` ให้ความล้มเหลวมี toast
4. C9 + T3 + C7 + T5 — ย้ายรายการคีย์ sim เข้า `simPatch`/`stateLines` ให้มาจากที่เดียว แล้วเพิ่มเทสกันหลุด
5. N3 + C8 + N4 — ข้อความ `pending` รูปร่างผิด, ข้อความ `EV_UNSUPPORTED`, `esc` ค่าสี

ก่อนปล่อยทุกครั้ง: `node --check wox-editor.user.js`, `node --test "tests/**/*.test.mjs"` ต้องได้ `skipped 0`, bump `@version` + `VERSION`, แล้ว `node tools/release.mjs "ข้อความ (vX.Y.Z)"` **บน `main` เท่านั้น** — ถ้าทำใน branch ก่อน merge จะ bump ซ้ำไม่ได้เพราะไม่มีอะไรให้ commit

## Waiting on the user

- ยังไม่ตอบข้อเสนอ: ทำ N1 + N2 รวมเป็น v3.4.6
- นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey และรีโหลดหน้าเกมเองเมื่อมีเวอร์ชันใหม่ และเป็นคนยืนยันผลในเกม (ตาม §7 ของ CLAUDE.md)

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\wox-editor.user.js` — สคริปต์หลัก v3.4.5, 1192 บรรทัด; `LOC` คือ namespace ของ pure function ที่มีเทส (โหลดแบบ CommonJS ได้เมื่อไม่มี `document`)
- `...\CLAUDE.md` — กติกาโปรเจกต์, บทเรียน §5, สถานะเวอร์ชัน §6, วิธีรับมือเกมอัปเดต §8
- `...\AGENTS.md` — ทางเข้าแบบสั้น ชี้กลับมาที่ `CLAUDE.md`
- `...\HANDOFF.md` — ไฟล์นี้
- `...\tests\` — 72 เทส; `scoring.test.mjs` คือของ v3.4.4-3.4.5, `sim.test.mjs` ต้องมี `bundle/`
- `...\tools\release.mjs` — ตรวจ version sync + `node --check` + เทส + `skipped 0` แล้ว commit + push
- `...\tools\test-summary.mjs` — อ่านบรรทัด `# skipped` ให้ release
- `...\tools\fetch-bundle.mjs` — ดึง build ปัจจุบันลง `bundle\<BUILD>\` (gitignore)
- `...\tools\snapshot-diff.mjs`, `...\tools\locate-sim.mjs` — เครื่องมือช่วยวิเคราะห์ ห้ามลบ
- `...\bundle\mwlq36t8\` — build ที่ตรงกับของสด (gitignore)
- `...\docs\superpowers\notes\2026-11-18-audit-v345.md` — **audit รอบล่าสุด N1-N4, C3-C14, S1, T3-T6** (ยังไม่ commit)
- `...\docs\superpowers\notes\2026-11-18-audit-v342.md` — audit รอบก่อน (C1-C14, T1-T5, S1) บริบทของ finding ที่ยังเปิด
- `...\docs\superpowers\plans\2026-11-18-audit-fixes-v342.md` — แผนที่รันแล้ว (T1, C1, C2, C5, C6)
- `...\journal\2026-11-18.md` — บันทึกบทเรียนของวัน (gitignore)

## Changes made

- `docs\superpowers\notes\2026-11-18-audit-v345.md` — ไฟล์ใหม่ finding ของ v3.4.5 — **ยังไม่ commit**
- `HANDOFF.md` — เขียนใหม่ทับฉบับก่อน
- ทั้งสองไฟล์ commit แล้วใน commit `docs: record the v3.4.5 audit and hand off`
- ไม่มีการแก้ `wox-editor.user.js`, tests หรือ tools ในรอบนี้
