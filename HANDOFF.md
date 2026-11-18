# Handoff: wox-editor v3.4.7 ปล่อยแล้ว, audit v3.4.7 เสร็จ (A1-A5 ยังไม่แก้), เกมอัปเดตเป็น build mwlvws3l

Written: 2026-11-18 16:23 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน ไฟล์นั้นคือกติกาของโปรเจกต์: ตอบภาษาไทยสั้น ๆ, เรียกผู้ใช้ว่า "นายท่านชาโดว์", รัน `node --check` ก่อนส่งงาน, bump `@version` + `const VERSION` พร้อมกันแล้วปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7), นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey และรีโหลดหน้าเกมเอง

## Goal

userscript Tampermonkey ไฟล์เดียว (`wox-editor.user.js`) แก้สถานะเกม Way of Xian โหมดเล่นคนเดียว (ไม่แตะอันดับ/ตลาดผู้เล่น) พร้อมแท็บอีเว้นต์และแท็บช่วยเลือกที่ให้คะแนนตัวเลือกบนการ์ดและกดให้อัตโนมัติ

"เสร็จ" ของรอบล่าสุด = รายงาน audit v3.4.7 พร้อมหลักฐาน — **ครบแล้ว** งานที่ยังไม่เริ่มคือแก้ finding A1/A2 (ยังไม่ได้อนุมัติ)

## Where things stand

v3.4.7 ปล่อยขึ้น `main` และขึ้น GitHub แล้ว (`814bf54`, push ไปแล้ว) นายท่านตรวจ R1 ในเกมผ่าน ปิดรอบนั้นแล้ว

รอบนี้ทำ audit v3.4.7 ทั้งไฟล์: อ่านโค้ด 1283 บรรทัด, รันเทส, ตรวจกับเกมที่เว็บเสิร์ฟ, เจอ finding ใหม่ 5 ข้อ (A1-A5 ระดับต่ำทั้งหมด) และเจอว่าเกมอัปเดตเป็น build `mwlvws3l` แล้ว (ของในเครื่องเดิมคือ `mwlq36t8`) บันทึก audit อยู่ที่ `docs\superpowers\notes\2026-11-18-audit-v347.md` commit `413169a` **บน `main` แต่ยังไม่ push** (`origin/main` ยังอยู่ที่ `d3df117`)

ยังไม่มีใครแก้ A1-A5 และยังไม่มีใครรัน v3.4.7 บน build `mwlvws3l` ในเบราว์เซอร์

## Verified facts

- `node --check wox-editor.user.js` → ผ่าน (รอบ audit นี้)
- `node --test "tests/**/*.test.mjs"` → `# tests 76`, `# pass 76`, `# fail 0`, `# skipped 0` (รันทั้งกับ build `mwlq36t8` และหลังดาวน์โหลด `mwlvws3l` เพราะเทสเลือกโฟลเดอร์ `bundle/` ที่ใหม่สุดเอง)
- `WOX_BUNDLE=mwlvws3l node --test tests/sim.test.mjs` → `# tests 10`, `# pass 10`, `# skipped 0`
- `node tools/release.mjs --dry-run "audit v3.4.7"` → `✔ version 3.4.7 (ก่อนหน้า 3.4.7), syntax และเทสผ่าน` แล้ว `dry-run: ไม่ commit/push`
- `wc -l wox-editor.user.js` → 1283 (ตรงกับ `CLAUDE.md` §2)
- เกมที่เว็บเสิร์ฟตอนนี้: `curl https://way-of-xian.wox-game.workers.dev/src/build.js` → `export const BUILD = "mwlvws3l";` และ index มี `<script type="module" src="b/boot-LAJ5SNEZ.js">`
- build ใหม่ยังเข้ากับสคริปต์ (ตรวจในไฟล์ chunk ของ `bundle\mwlvws3l`): `simNames` หา sim ครบ 6 ตัว; `chunkChain` อ่าน boot/app/core ได้; ตารางตรงกับ `LOC.IS` (`id:"mortal"`, `id:"novice"` + `years:0`, `{th:"สามัญ",en:"Common",color:"#8c918e"}`, ไอเทมสร้างด้วย `Object.fromEntries([Vt("woodSword","weapon",0,"ดาบไม้",…)])`); DOM ที่ใช้ยังเดิม (`#choice-options`, ปุ่มสร้างด้วย `document.createElement("button")` + `h.id=\`choice-${d.id}\``, meta `<meta name="wox-entry" content="wiki">`); ฟิลด์ `capSeen` มีจริงใน app chunk
- `git status --porcelain` → ว่างหลัง commit `413169a`; branch มีแค่ `main`; worktree เดียว
- `git log --oneline -5` → `413169a` (audit note) → `d3df117` (handoff v3.4.7 + in-game check) → `276fbf2` → `e7c6c7b` → `814bf54` (release v3.4.7)
- `bundle/` = 140 MB / 7 build (`mwky5ysx`, `mwlj4t86`, `mwlkbpdo`, `mwll6s9j`, `mwlnu1rf`, `mwlq36t8`, `mwlvws3l`); โฟลเดอร์ `mwlvws3l` เพิ่งถูกสร้างรอบนี้ (gitignore)

## Guesses, not yet proven

- **A1 (finding หลัก)**: ป้ายแนะนำ/กดอัตโนมัติตายเงียบเมื่อเกมวาดการ์ดเดิมซ้ำ. กลไกพิสูจน์จากโค้ดแล้วทั้งสองฝั่ง (`wox-editor.user.js:1149-1151` คีย์ไม่เปลี่ยนเมื่อ id ปุ่มเดิม, `:1126` ข้ามปุ่มที่หลุด DOM, ฝั่งเกม `WV(e)` ล้าง `#choice-options` แล้วสร้างปุ่มใหม่ และถูกเรียกซ้ำด้วย `pending` ตัวเดิมในเส้นทาง `watchdog: a decision put again` กับหลังขายของ `...after:()=>{j8e(I),Qt(),WV(I.pending)}`). ยังไม่รู้ว่าผู้ใช้ชนเส้นทางนี้บ่อยแค่ไหน — ต้องดูในเกม
- ยังไม่มีหลักฐานว่า v3.4.7 ทำงานถูกบน build `mwlvws3l` ตอนเกมรันจริง: ที่ตรวจได้คือ regex/marker ในไฟล์ chunk ไม่ใช่พฤติกรรมในเบราว์เซอร์
- `aiScan` เรียก `SIM.majorTexts(t)` ทุกครั้งที่สแกน — ยังไม่รู้ว่าฝั่งเกมมีผลข้างเคียงกับการเรียกซ้ำ (ค้างจาก audit v3.4.6; ต้องจับด้วย probe ในเบราว์เซอร์)
- `opt.outcomes` / `opt.band` ของ build `mwlvws3l` ไม่ได้ตรวจรอบนี้ (สาขาในโค้ดยังตายอยู่ถ้าเกมไม่ส่งมา)

## Ruled out and wrong turns

- ห้ามใช้ `document.write` เขียน import map (เคยทำให้หน้าเกมจอดำ ทั้งหน้า)
- ห้ามแทรก DOM เข้าไปในปุ่มของเกม (เช่นป้ายคะแนน) — observer ทั้งหน้าจะสแกนซ้ำทุกเฟรม เกมกระตุก คลิกหาย
- `fresh()` ห้ามกลับไปใช้ `root.activeElement` และห้ามกลับไป `dirty` แบบ boolean ตัวเดียว — ต้องเป็น `Set` ของคีย์ `LOC.fieldKey`
- ห้ามเอา `bagLocked` กลับมา: มันคือตัวที่ทำให้ลิสต์กระเป๋าหยุดรีเฟรชทั้งก้อนเมื่อมีช่องเดียวค้าง (บั๊กที่ R1 ใน v3.4.7 แก้)
- อย่าแก้ประตูกดอัตโนมัติให้ตัด `scored.length === rows.length` ออก: ตัวเลือกที่มี blind ปน **สคริปต์ห้ามกดอัตโนมัติ**
- `act` ของอีเว้นต์ให้ค่าน้ำหนักบวกไม่ได้ (เป็นเนมสเปซเปิด) — 0 ปกติ, −200 เมื่อคีย์เข้า `/die|death|kill|dead|perish/i`
- อเมนด์ commit ที่ push แล้วไม่ได้ (ruleset `protect-main` กัน force-push); อเมนด์ได้เฉพาะ commit ที่ยังไม่ push บน branch
- อย่าอ้างจำนวนเทสจาก `node --test` เปล่า ๆ: มันเก็บ `tools/test-summary.mjs` เข้าไปนับด้วย ตัวเลขที่ถูกคือ `# tests N` จาก glob `tests/**/*.test.mjs`
- worktree ใหม่ไม่มี `bundle/` (gitignore): รันเทสด้วย `WOX_BUNDLE="C:/Users/PC/Desktop/Wox UI/way-of-xian.wox-game.workers.dev/bundle/mwlvws3l"` ไม่งั้นเทส bundle skip แล้ว `tools/release.mjs` จะไม่ยอมปล่อย (`skippedCount` fail แบบปิด)
- ข้อความ commit หลายบรรทัดผ่าน PowerShell here-string ทำให้ subject กลายเป็น `@`: ส่งผ่าน `printf` หรือแก้ด้วย `git commit --amend -F <ไฟล์>` บน branch ที่ยังไม่ push
- bump `@version` + `VERSION` ทำบน `main` หลัง merge เท่านั้น: ถ้า bump ใน branch ก่อน merge จะไม่มีอะไรให้ commit แล้ว release throw
- อย่าใช้ build id ในเอกสารเป็นความจริงถาวร: เกมเปลี่ยน build บ่อย (`mwlq36t8` → `mwlvws3l` ภายในวันเดียว) ให้รัน `curl .../src/build.js` ตรวจก่อนเสมอ

## Next step

**ก่อนอื่น: ถามนายท่านชาโดว์ว่าจะทำอะไรต่อ** — ผมเสนอไว้ท้ายรอบ audit ว่า "แก้ A1+A2 เป็น v3.4.8 ไหม" และยังไม่ได้คำตอบ

รายการที่เปิดเรียงตามที่ audit v3.4.7 แนะนำ (รายละเอียดเต็มอยู่ใน `docs\superpowers\notes\2026-11-18-audit-v347.md` §5):

1. **A1** `wox-editor.user.js:1149-1151` + `:1126` — ป้ายหาย/กดอัตโนมัติเงียบเมื่อเกมวาดการ์ดเดิมซ้ำ. แก้ ~3 บรรทัด: ให้คีย์สแกนผูกกับตัวปุ่มจริง (เช่นเก็บ `aiBtns = btns` แล้วสแกนใหม่เมื่อ `btns.length !== aiBtns.length || btns.some((b,i)=>b!==aiBtns[i])`) หรือไม่ก็บังคับ `aiKeyPrev = ''` เมื่อเจอป้ายที่หลุดจาก DOM
2. **A2** `:1158` + `:1162` — `SIM.majorEvent` / `ev.options` อยู่นอก try และผู้เรียก (`:923`, `:1209`) กลืน throw: sim พังแล้วแท็บช่วยเลือกว่างเปล่า. แก้ ~5 บรรทัด: ครอบแล้วเขียนเหตุผลลง `#ai_out`
3. **A4** `:1049` — `#hadd` ไม่ `saved.add('b:' + id)` ทำให้แถวโชว์เลขที่พิมพ์ค้าง
4. **A5** nit: `:929` `:String(s)` ตกเว้นวรรค, `:1111` `aiScan(true)` ส่งอาร์กิวเมนต์เกิน, `:1160` ไม่ล้าง `aiTimer`/`aiPend`
5. **A3** `:1010`, `:1025` — ปุ่มบันทึกเขียน index 0 ทับเมื่อ `rank`/`realm` ของ state ไม่อยู่ในรายการ; ต้องให้นายท่านเลือกก่อนว่าจะ "คงค่าเดิม" หรือ "ปิดปุ่ม"
6. อัปเดตเอกสาร: `HANDOFF.md:24,78` และ `CLAUDE.md` ที่ยังเขียน build `mwlq36t8`
7. C10-C14, S1, T4, T6 — audit ทุกรอบบอก "รับทราบ ไม่ต้องแก้" (T6 = ประตูกดอัตโนมัติอยู่ฝั่ง DOM ทั้งก้อน ไม่มีเทส ซึ่งเป็นที่มาของ A1/A2)

เมื่อได้งาน: ทำใน worktree/branch ใหม่ (`git worktree add ../<ชื่อ> -b <branch>`), เขียนเทสก่อนแก้สำหรับเรื่องที่ย้ายเข้า `LOC` ได้, `node --check`, `node --test "tests/**/*.test.mjs"` ต้อง `skipped 0`, merge เข้า `main`, bump `@version` + `VERSION`, แล้ว `node tools/release.mjs "ข้อความ (vX.Y.Z)"` **บน `main`** (เครื่องมือบังคับ branch `main` แล้วและกู้ต่อได้ถ้า push ล้ม)

## Waiting on the user

- **คำถามที่ค้าง:** จะทำอะไรต่อ — แก้ A1+A2 เป็น v3.4.8 ตามที่เสนอ หรือเก็บกวาดเอกสาร หรืออย่างอื่น (ยังไม่ได้ตอบ)
- **commit `413169a` ยังไม่ push** — ต้องถามก่อน push (ปกติโปรเจกต์นี้ push ผ่าน `tools/release.mjs` ตอนปล่อยเวอร์ชันเท่านั้น)
- นายท่านเป็นคนอัปเดตสคริปต์ใน Tampermonkey และยืนยันผลในเกม (ตาม §7 ของ CLAUDE.md) หลังปล่อยเวอร์ชันใหม่
- ก่อนตรวจรอบหน้า ควรแจ้งนายท่านว่าเกมขึ้น build `mwlvws3l` แล้ว (สคริปต์ยังใช้ได้ตามที่ตรวจในไฟล์ chunk แต่ยังไม่มีใครลองในเกม)

## Files and places

ทุก path อยู่ใต้ root `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\`:

- `wox-editor.user.js` — สคริปต์หลัก v3.4.7, 1283 บรรทัด; `LOC` = namespace ของ pure function ที่มีเทส, ส่วนที่เหลือเป็นโค้ด DOM ใน IIFE เดียวกัน
- `CLAUDE.md` — กติกาโปรเจกต์, บทเรียน §5, สถานะ §6, วิธีรับมือเกมอัปเดต §8
- `AGENTS.md` — ทางเข้าแบบสั้น ชี้กลับมาที่ `CLAUDE.md`
- `HANDOFF.md` — ไฟล์นี้
- `docs\superpowers\notes\2026-11-18-audit-v347.md` — **audit รอบล่าสุด**: finding A1-A5, ตารางของเดิม C10-C14/S1/T4/T6, สถานะเอกสาร, ลำดับที่เสนอ
- `docs\superpowers\notes\2026-11-18-audit-v346.md` — audit รอบก่อน (R1-R8 ปิดใน v3.4.7 แล้ว)
- `docs\superpowers\notes\2026-11-18-audit-v345.md`, `2026-11-18-audit-v342.md` — audit รอบเก่า (ปิดแล้ว)
- `docs\superpowers\plans\2026-11-18-audit-fixes-v342.md` — แผนที่รันแล้ว (T1, C1, C2, C5, C6)
- `tests\` — 76 เทสใน 8 ไฟล์: `core`, `health`, `items`, `locate`, `panel`, `release`, `scoring`, `sim`; `sim.test.mjs` และ `locate.test.mjs` ต้องมี `bundle/`
- `tools\release.mjs` — version sync + `node --check` + เทส + `skipped 0` + บังคับ branch `main` + commit + push
- `tools\test-summary.mjs` — อ่านบรรทัด `# skipped` ของ `node --test` ให้ release
- `tools\fetch-bundle.mjs` — ดึง build ปัจจุบันลง `bundle\<BUILD>\` (gitignore); รอบนี้สร้าง `bundle\mwlvws3l`
- `tools\snapshot-diff.mjs`, `tools\locate-sim.mjs` — เครื่องมือวิเคราะห์ **ห้ามลบ** แม้เกมแบบ bundle จะทำให้ใช้ไม่ได้แล้ว (รอนายท่านสั่ง)
- `bundle\mwlvws3l\` — build ที่ตรงกับของสดตอนนี้; `bundle\mwlq36t8\` คือ build ก่อนหน้า; รวม 140 MB / 7 build
- `journal\2026-11-18.md` — บันทึกของวันนี้ (gitignore)
- repo สาธารณะ — https://github.com/Jeffinz/wox-editor (ขึ้นเฉพาะสคริปต์/เครื่องมือ/เอกสาร; `.gitignore` กัน `src/`, `snapshots/`, `index.html`, `bundle/`)

## Changes made

- `docs\superpowers\notes\2026-11-18-audit-v347.md` — สร้างใหม่ (audit รอบนี้) → commit `413169a` **บน `main`, ยังไม่ push**
- `bundle\mwlvws3l\` — ดาวน์โหลดด้วย `node tools/fetch-bundle.mjs` (ไม่ถูก track, ไม่ต้อง commit)
- `HANDOFF.md` — เขียนทับด้วยฉบับนี้ (ยังไม่ commit)
- ไม่มีการแก้โค้ด, ไม่มีการ bump version, ไม่มีไฟล์ชั่วคราวค้าง, ไม่มี branch หรือ worktree ค้าง
