# Handoff: งานถัดไปคือทำอีเว้นต์/ช่วยเลือกแบบ (ก) ให้สคริปต์

Written: 2026-11-18 01:23 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ใน working directory ก่อน ไฟล์นั้นมีกติกาโปรเจกต์ (ตอบภาษาไทย, `node --check`, bump `@version` + `VERSION`, ปล่อยด้วย `tools/release.mjs`, เรียกผู้ใช้ว่า "นายท่านชาโดว์")

## Goal

สคริปต์ `wox-editor.user.js` ถูกย้ายไปใช้เกมแบบ bundle แล้วและปล่อย v3.3.1 เรียบร้อย งานที่เหลือคือนายท่านเลือกทาง **(ก) แบบจำกัดขอบเขต** สำหรับอีเว้นต์และช่วยเลือก:

- แท็บอีเว้นต์: แสดงการ์ดอีเว้นต์ที่เปิดอยู่ + บันทึกชีวิตนี้ (`t.log`)
- แท็บช่วยเลือก: เปลี่ยนเป็นใบข้อมูล (ข้อความตัวเลือก, stat ที่ทดสอบ, คำบอกช่วงโอกาสจาก DOM, ความหายาก) + ปุ่ม "ให้เกมเลือกเอง" ที่ผู้ใช้กดเอง ไม่มี auto-click และ **ไม่ให้คะแนน** เพราะ `fx`/`act` ไม่มีใน bundle
- ลบโค้ดตาย `SIM`/`MJ` ที่อ้างถึงอย่างเดียวไม่มีใคร assign

เสร็จเมื่อ: งานนี้ออกแบบ+เขียนแผน+อนุมัติ ลงโค้ด, เทสผ่าน, นายท่านทดสอบในเกมจริง, แล้วปล่อยเวอร์ชัน

## Where things stand

Task 1-5 ของแผน `docs/superpowers/plans/2026-11-17-bundle-port.md` เสร็จครบ, final review ผ่านหลัง fix wave, นายท่านทดสอบในเกมจริงผ่าน, ปล่อย `3.3.1` ขึ้น `main` แล้ว, worktree กับ branch งานถูกลบทั้งในเครื่องและบน origin งาน (ก) ยังไม่เริ่ม: ไม่มี design doc ไม่มีแผน ไม่มีโค้ด

## Verified facts

- **เกมไม่เสิร์ฟ `/src/*.js` แล้ว** ยกเว้น `/src/build.js` ที่ยังได้ 200 เป็น `export const BUILD = "mwkobenp";` (ตรวจด้วย `curl` 2026-11-17)
- **สคริปต์ v3.3.1 บน `main` ปล่อยแล้ว** commit `9f94ca5`; `curl -s https://raw.githubusercontent.com/Jeffinz/wox-editor/main/wox-editor.user.js | head -3` ให้ `@version 3.3.1`
- **เนื้อหา 3.3.1 = 3.3.0 ที่ทดสอบ** ต่างแค่เลขเวอร์ชัน เพราะ `tools/release.mjs` (บรรทัด 25-28) ไม่ให้ commit เลขเดิมซ้ำ
- **เทสผ่าน 24, ข้าม 1** `node --check wox-editor.user.js && node --test "tests/**/*.test.mjs"` (รันบน main 2026-11-18, Node v22.23.5) → `pass 24, fail 0, skipped 1`; ข้อที่ข้ามคือเทส `chunkChain` กับ chain จริง ซึ่งข้ามเองเมื่อไม่มี `bundle/` (ถ้าอยากให้รันครบต้อง `node tools/fetch-bundle.mjs` ก่อน)
- **origin เหลือ `main` เดียว** `git ls-remote --heads origin` → `refs/heads/main` `9f94ca5`; branch `wip/bundle-fetch` ถูกลบทั้ง local และ remote; worktree `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch` ถูกลบแล้ว (`ls "C:\Users\PC\Desktop\Wox UI"` เหลือโฟลเดอร์เดียว)
- **สคริปต์โหลด chunk ร่วมได้จริงในเกม** นายท่านยืนยัน 2026-11-18: แผงตรวจระบบ `✔` ครบ 4 ตาราง, dropdown ขั้นพลัง/ขั้นยุทธ์มีค่า, กระเป๋ามีไอเทมพร้อมป้ายระดับ, ไม่มี error ใหม่
- **ข้อมูลอีเว้นต์/rarity อยู่ใน `app-*.js` เท่านั้น** รายละเอียดและ byte offset อยู่ใน `docs/superpowers/notes/2026-11-17-events-spike.md` (ตรวจด้วย `grep -b` บน `bundle/mwkobenp/b/app-56NJKGMX.js` เมื่อ 2026-11-17/18; ไฟล์ bundle ถูกลบไปพร้อม worktree — ต้องดึงใหม่)
- **`t.pending` เก็บ id ไม่เก็บข้อความ/โอกาส** `openOptions` (`wr`, app 3,221,219) จบด้วย `.map(o=>o.id)`; `rarity` มีบนบางเส้นทาง (2,134,196 / 2,181,138 / 2,192,959) ไม่มีบน 2,161,404 / 2,163,785 / 1,229,835
- **การ์ด DOM ให้ข้อมูลที่ต้องการ** `small.odds[data-stat]` (ตัวสร้าง `Uet` app 5,371,173, เรียกที่ 5,385,936 เฉพาะ `d.chance?.stat && e.id!=="campaignTurn"`), `#choice.r-<rarity>` + `.rarity-badge` เฉพาะ rarity ที่ไม่ใช่ common (5,384,498 / 5,384,548), ปุ่ม `.fate-pick` ของเกมเอง (5,387,336) สุ่มแล้วคลิกให้
- **`t.log` ไม่มี `fx`** entry คือ `{age,month,kind,th,en,anim,…}` (app 1,458,871), UI อ่าน `h.rarity` (5,032,414)
- **`c-577XDD6D.js` ไม่มี sim แต่มี helper ใกล้เคียง** `function cOe` (116,301, แตะ `e.pending` ราว 116,350), ตารางป้ายระดับ `bre=[["ธรรมดา","common"],…]` (686,449) — ไม่มี weight/gap และไม่อยู่ใน export block ห้ามใช้แทน `RARITY`
- **`window.wox` มีเฉพาะหลังโหลดด้วย `?promo`** (app 5,400,328) และมีแค่ UI helpers ไม่มี sim/อีเว้นต์; global อื่น (`__estate`, `__sceneCuts`, `__sfxSpy`, `__answerSurvives`) เป็น diagnostics ไม่มีข้อมูลอีเว้นต์
- **REA ใช้กับ chunk ใหญ่ได้ถ้าเพิ่ม heap** ตั้ง `javascript.max_heap_mb` = 8192 และ `javascript.analysis_timeout_ms` = 900000 ผ่าน `update_analysis_settings`; `app-56NJKGMX.js` วิเคราะห์จบ 1.3M AST nodes, `c-577XDD6D.js` จบ 1.59M nodes; ผลยัง partial เพราะเพดาน `max_semantic_nodes_per_file`/`unknowns` (30000) ไม่ใช่ heap
- **เพดาน retained representation ของ investigation ~1.05 GB ต่อหนึ่ง investigation** เต็มแล้วต้อง `export_evidence_bundle` แล้ว `reset_investigation` ก่อนวิเคราะห์ไฟล์ใหญ่ตัวถัดไป (error จะบอก `retained representation allowance is exhausted`)

## Guesses, not yet proven

- **`pending.rarity` มีจริงบนการ์ดที่เห็นในเกม** — ตรวจได้จาก bundle ว่าโค้ดมีบางเส้นทางที่ใส่ ถ้าอยากรู้จริงเปิดอีเว้นต์ major แล้วดู `t.pending` ใน console
- **ปุ่มส่วนใหญ่มี `.odds`** — โค้ดเรียกเฉพาะปุ่มที่มี `chance.stat`; ยังไม่รู้สัดส่วนจริงในเกม ต้องไล่ดูการ์ด 2-3 ครั้ง
- **`#choice-options` ยังใช้ id/คลาสเดิมหลังเกมอัปเดตครั้งหน้า** — ยังไม่มีใครเจอ build ใหม่ วิธีพิสูจน์คือรัน `node tools/fetch-bundle.mjs` แล้วเทียบ `docs/superpowers/notes/2026-11-17-events-spike.md`
- **การ import chunk ให้ instance เดียวกับเกม** — ผลทดสอบในเกมชี้ว่าถูก (ตารางขึ้นครบ) แต่ไม่มีใครพิสูจน์เชิงโครงสร้าง

## Ruled out and wrong turns

- อย่า import `app-*.js` หรือ `boot-*.js` แม้ต่อ query string — จะรันเกมชุดที่สอง
- อย่าถอดรหัส `d/*.bin` นอกเกม หรือใช้ key จาก `c-RCZEDD4B.js`; เนื้ออีเว้นต์ build `mwkobenp` อยู่ใน `app-*.js` ไม่ได้อยู่ใน bin
- อย่าดึง `app-*.js` ตอนรันมาไล่ regex เอาตาราง — ค่าที่ต้องการเป็น expression ไม่ใช่ JSON ต้อง parser+evaluator และขัดกติกาอ่านเฉพาะค่าที่อยู่ในหน่วยความจำหน้าเกม
- `window.wox` (`?promo`) ไม่พอ — ไม่มี sim/อีเว้นต์/ข้อความตัวเลือก
- อย่าใช้ตาราง `bre` ใน `c-577` แทน `RARITY` — ไม่มีน้ำหนัก/ช่วง และคำไม่ตรง (epic = "ล้ำค่า" ไม่ใช่ "หายากมาก")
- อย่ารัน REA `analyze_javascript_application` ซ้ำด้วยค่าเดิมหลัง investigation เต็ม — จะได้ `resource_constraint` ทุกครั้ง
- `src/` ในเครื่องเป็น BUILD เก่า `mw3fx19c` ใช้เทียบได้ แต่ไม่ตรงเกมจริง; `tools/snapshot-diff.mjs` ใช้กับเกมเวอร์ชันนี้ไม่ได้แล้ว แต่ **ห้ามลบ** จนนายท่านสั่ง
- `HANDOFF.md` เวอร์ชันก่อนหน้า (2026-11-17) ถูกแทนที่ด้วยไฟล์นี้ อย่าอ้างเนื้อหาเก่า
- SDD workspace (ledger + review packages) ถูกลบไปพร้อม worktree เพราะอยู่ใน `.superpowers/` ที่ git-ignore — ruling ทั้งหมดสรุปอยู่ในไฟล์นี้ ถ้าต้องการรายละเอียดให้ดู transcript ของ session 2026-11-17/18

## Next step

เริ่มด้วย `superpowers:brainstorming` สำหรับงาน (ก) โดยใช้ `docs/superpowers/notes/2026-11-17-events-spike.md` เป็นข้อมูลตั้งต้น; ก่อนออกแบบให้ตัดสินใจว่าจะตรวจ 5 ข้อใน §4 ของเอกสารก่อนหรือไม่ (ข้อ 1-2 ล้ม = กลับไปถามนายท่านว่าจะเปลี่ยนเป็น (ข) หรือไม่) จากนั้น `superpowers:writing-plans`, รออนุมัติ, แล้วลงโค้ดแบบ TDD ตามกติกาโปรเจกต์

ลำดับถัดไป: ถ้าเกมมี build ใหม่ ให้ `node tools/fetch-bundle.mjs` ดึง bundle ใหม่ก่อน แล้วเทียบ offset ในเอกสาร spike

## Waiting on the user

- นายท่านยังไม่ได้ตัดสินใจว่าใครตรวจ 5 ข้อในเกมจริง (นายท่านทำเอง หรืออนุญาตให้ใช้ claude-in-chrome)
- ยังไม่ได้ถามว่าจะแก้ Minor ที่พักไว้ของ v3.3.1 ไหม: retry หลังโหลดล้มทับค่าที่ยังไม่บันทึก, `imported` แบบ all-or-nothing ทำให้แผงขึ้น "ยังไม่ได้อ่าน chunk หลัก" ตลอดถ้า chunk ใดล้มถาวร, comparator ที่ `wox-editor.user.js` ยัง `NaN` กับ tier สตริง (ตัวคัดแยกหลัก), ป้ายกรองระดับ (`#hqr`) ยัง hardcode ชื่อระดับ

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\wox-editor.user.js`: สคริปต์หลัก v3.3.1 ไฟล์เดียว `LOC` (pure, มีทางเข้าเทส Node) อยู่ต้น IIFE; `loadCore`/`getCore` ประมาณบรรทัด 500-620; แท็บอีเว้นต์/ช่วยเลือกที่ตายอยู่ประมาณ 760-840
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\docs\superpowers\notes\2026-11-17-events-spike.md`: ผลค้นหาอีเว้นต์/ช่วยเลือก + คำตัดสิน (ก) อยู่ §5 — **ไฟล์สำคัญที่สุดของงานถัดไป**
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\docs\superpowers\plans\2026-11-17-bundle-port.md`: แผน Task 1-5 ที่ทำเสร็จแล้ว (อ้างอิงประวัติ ไม่ต้องทำซ้ำ)
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\tests\locate.test.mjs`: เทส 25 ข้อของ `LOC` (pure, ไม่มี mock)
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\tools\release.mjs`: ปล่อยเวอร์ชัน (check + test + commit + push)
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\tools\fetch-bundle.mjs`: ดึง JS ของเกมลง `bundle/<BUILD>/` (git-ignore) — รันใหม่ได้ทุกเมื่อ
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\CLAUDE.md`: กติกาโปรเจกต์ (แก้ล่าสุดให้ตรงระบบ bundle แล้ว)
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\src\`: ซอร์สเกม BUILD เก่า `mw3fx19c` อ่านเทียบเท่านั้น
- repo: https://github.com/Jeffinz/wox-editor (public) — ปัจจุบันมี branch `main` เดียว

## Changes made

- `wox-editor.user.js`: ย้ายไประบบ bundle (Task 1-4) + fix wave — commit `b55d6f8`, merge เข้า main `69e92bf`, ปล่อย `9f94ca5` (pushed)
- `tests/locate.test.mjs`: สร้างใหม่ 25 เทส — committed
- `tools/release.mjs`: เพิ่มขั้นรันเทส + staging `tests/` — committed
- `CLAUDE.md`: อัปเดต §3/§6/§8 ตามระบบ bundle — committed
- `docs/superpowers/notes/2026-11-17-events-spike.md`: สร้างใหม่ + คำตัดสิน (ก) §5 — committed (`6577af2`)
- `HANDOFF.md` (ไฟล์นี้): เขียนทับเวอร์ชัน 2026-11-17 — commit ตามหลังไฟล์นี้
- ลบแล้ว: worktree `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch` (รวม `.superpowers/` ledger และ `bundle/mwkobenp/` ที่ดึงมา), branch `wip/bundle-fetch` ทั้ง local และ remote
