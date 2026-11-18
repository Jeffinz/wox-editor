# Handoff: v3.4.1 ปล่อยบน main แล้ว — รอตรวจในเกมจริง 4 ข้อ

> **ปิดแล้ว 2026-11-18:** v3.4.1 ไม่ผ่านข้อ 1-3 บน build `mwlnu1rf` (`simNames` นับ `sh` ใน `xe.fish=`) แก้ใน v3.4.2 (`a230e64`) นายท่านตรวจในเกมแล้ว ผ่านครบ 4 ข้อ เนื้อหาด้านล่างเป็นบันทึกเก่า ยังค้างแค่การตัดสินว่าจะลบ `origin/feat/events-v3.4.0` ไหม

Written: 2026-11-18 12:12 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน กติกาอยู่ในนั้น: ตอบภาษาไทย, รัน `node --check`, bump `@version` + `VERSION` พร้อมกัน, ปล่อยด้วย `tools/release.mjs`, เรียกผู้ใช้ว่า "นายท่านชาโดว์", **ห้ามแยก subagent** (§7)

## Goal

คืนแท็บอีเว้นต์ (รายการ/กรอง/เรียกอีเว้นต์) และแท็บช่วยเลือก (ให้คะแนน/ป้ายบนการ์ด/กดอัตโนมัติ) ให้เกมแบบ bundle ทางที่เลือก: import map แทนที่ `b/app-*.js` ด้วยสำเนาที่เติม `window.__woxSim={…}` (สเปค `docs/superpowers/specs/2026-11-18-events-tab-design.md`)

"เสร็จ" = เทสทั้งชุดผ่าน skip 0, `node --check` ผ่าน, และนายท่านตรวจในเกมจริงผ่าน Tampermonkey ครบ 4 ข้อ (ท้ายสเปค): (1) เกมเล่นปกติ + ตรวจระบบขึ้น `✔ sim` (2) แท็บอีเว้นต์มีรายการ กรอง/ค้นหาได้ เรียกแล้วการ์ดขึ้น (3) ช่วยเลือกมีคะแนน+ป้าย, กดอัตโนมัติทำงาน (4) เกมไม่กระตุก ปุ่มการ์ดกดครั้งเดียวติด

## Where things stand

โค้ดครบทั้ง 7 task ของแผน `docs/superpowers/plans/2026-11-18-events-tab.md` ปล่อยเป็น v3.4.0 (`df419bc`) แล้วตามด้วย v3.4.1 (`a3a18e7`) ซึ่งแก้ 2 finding จาก self-review เอกสารอัปเดตแล้ว (`CLAUDE.md` §3/§6/§8, แผน bundle-port) merge เข้า `main` แบบ fast-forward แล้ว push (`3341e41`) worktree `.worktrees/events-v3.4.0` กับ branch `feat/events-v3.4.0` ลบแล้ว เหลือแค่การตรวจในเกมจริงของนายท่าน

## Verified facts

- **เทสผ่าน 57/57 skip 0** ทั้งบน branch และบน `main` หลัง merge — `node --test "tests/**/*.test.mjs"` (ไฟล์ใหม่ `tests/sim.test.mjs` 8 เทส)
- **`node --check wox-editor.user.js` เงียบ** และ `tools/release.mjs` ผ่านการตรวจ `@version`=`VERSION`=3.4.1
- **`main` = `origin/main` = `3341e41`** — `git log --oneline -1 origin/main`
- **build ล่าสุดที่ดึงไว้ `mwll6s9j`** app คือ `bundle/mwll6s9j/b/app-QHVRDERS.js`, boot `bundle/mwll6s9j/b/boot-3ABEXIAE.js` — `node tools/fetch-bundle.mjs`
- **`LOC.simNames` หา sim ครบ 6 ตัวใน build นี้**: `majorTexts=Mg`, `majorEvent=Br`, `events=rh`, `rarityFor=br`, `openOptions=Ar`, `statOdds=qPe` — เทส `simNames หา sim ครบ 6 ตัวใน build จริง` ผ่าน
- **app + patch ผ่าน `node --check`** (เทส `absolutize กับ app จริงแล้ว node --check ผ่าน`) specifier สัมพัทธ์ 5 จุดถูกเขียนเป็น URL เต็ม
- **อีเว้นต์มี `th`/`en` เป็น `{title,text}`** — เห็นใน object literal ของ `gr("hiddenCave",…)` ใน `app-QHVRDERS.js` จึง `e.th?.text` ของ `showEv` ใช้ได้
- **import map ต้องเป็น DOM node และแทรกที่ `document-start`** — probe v0.0.2 ในเกมจริงทำงาน (`document.write` ทำหน้าเกมจอดำ ดูหัวข้อ Ruled out)
- **sim มาถึงหลัง `load`** (boot เรียก import แบบไม่ await) — probe เห็น shim รันที่ ~1590ms ขณะ `load` 1514ms จึง poll ใน `simReady`

## Guesses, not yet proven

- **ทั้งชุดทำงานในเกมจริงผ่าน Tampermonkey** — พิสูจน์แค่กลไก import map กับ probe ไม่ใช่สคริปต์ v3.4.1 ทั้งไฟล์ วิธีตัดสิน: นายท่านอัปเดตสคริปต์แล้วเล่นจริง 4 ข้อ
- **`SIM.openOptions(t, ev)` คืน id ที่เกมรับตอนตั้ง `t.pending`** — spike §7 ทำมือแล้วการ์ดขึ้น แต่ยังไม่ยืนยันว่า `openOptions` แทน `ev.options.map(o=>o.id)` ได้ทุกอีเว้นต์
- **`statOdds` รับอาร์กิวเมนต์ที่ 4 (`opt`) แล้วให้ตัวเลขต่างจากเดิม** — ส่งไปตามสเปค ยังไม่มีหลักฐานว่าเกมใช้ `opt` ในผลลัพธ์
- **`showEv` แสดงข้อความจริง** — อนุมานจาก `th:{title,text}` ที่เห็นใน build นี้ ยังไม่เห็นบนจอ
- **จำนวนอีเว้นต์ที่ `simInfo` รายงาน** — `SIM.allMajors().length` ควรใกล้ 16,619 (spike §7) แต่ส่วนหนึ่งไม่มี `options` จึงถูกกรองออกจาก `EVENTS`

## Ruled out and wrong turns

- **`document.write` เขียน import map** — ล้างเอกสาร หน้าเกมจอดำ (probe v0.0.1) ต้อง `document.head.insertBefore(map, firstChild)`
- **ตัดสินผลที่ event `load`** — boot เรียก import แบบไม่ await ทำให้ probe v0.0.2 รายงาน FAIL ผิด; ต้อง poll `window.__woxSim`/`__woxSimError`
- **`simNames` อ้าง `SIM_KEYS` นอกฟังก์ชัน** — shim ฝังด้วย `toString()` แล้ว `SIM_KEYS is not defined`; รายชื่อคีย์ต้องอยู่ในฟังก์ชันเอง (ทั้ง `simNames` และ `simPatch`)
- **นับ "ประกาศ" ด้วย `(?:function |[,; ]|var |let |const )X(?:\(|=)`** — นับ call site ปน (`br` ได้ 13) ใช้ `(?:function\s+X\s*\(|X\s*=[^=>])` แทน
- **regex statOdds ที่ไม่มีวงเล็บจับกลุ่ม** — capture เป็น `undefined`; ต้องหุ้ม `(` + id + `)` รอบตัวที่สามของ chain `${a(b(c(`
- **แท็บอีเว้นต์แบบ (ก) จำกัดขอบเขต** — นายท่านไม่เอา ทางถอยคือ `EV_UNSUPPORTED` + เหตุผลจาก `simError`
- **อ่านตารางอีเว้นต์จาก chunk `c-*`** — ไม่มีข้อมูลอีเว้นต์ (spike §1)
- ข้อเดิมที่ยังจริง: ไม่ใช้ jsdom/`package.json`, `t.skip` เมื่อไม่มี `bundle/` = เทสเขียวหลอก ต้องดู **skip 0**, ห้าม hardcode ชื่อ build ในเทส, ห้าม `git clean -fdx` ใน worktree, ห้ามลบ `tools/snapshot-diff.mjs` หรือโฟลเดอร์ `src/` ในเครื่อง

## Next step

1. **นายท่าน**: อัปเดตสคริปต์ใน Tampermonkey (หรือติดตั้งจาก `https://raw.githubusercontent.com/Jeffinz/wox-editor/main/wox-editor.user.js`) แล้วรีโหลดหน้าเกม ตรวจ 4 ข้อท้ายสเปค
2. ถ้าข้อไหนไม่ผ่าน: `window.__woxSimError` ใน console บอกเหตุผลของ sim; แผง "ตรวจระบบ" ขึ้น `✔ sim (6 ฟังก์ชัน, อีเว้นต์ N)` หรือ `✖ sim: <เหตุผล>`
3. ปิดงาน: อัปเดต `CLAUDE.md` §6 ว่า "นายท่านตรวจในเกมแล้ว ผ่าน" (หรือบันทึกข้อที่ต้องแก้) — ตอนนี้ §6 ยังเขียนว่า **ยังไม่ได้ทดสอบในเกมจริง**

## Waiting on the user

- ตรวจในเกมจริง 4 ข้อ (ทำได้เฉพาะนายท่าน — Chrome ที่ Claude ใช้ไม่มี Tampermonkey)
- ตัดสินว่าจะลบ branch `origin/feat/events-v3.4.0` บน GitHub ทิ้งไหม (local ลบแล้ว งานอยู่บน `main` ครบ)

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\wox-editor.user.js` — สคริปต์หลัก v3.4.1, 1141 บรรทัด; `LOC` IIFE ต้นไฟล์มี `simNames`/`absolutize`/`simPatch`/`importMapJson`/`simLine`; `installSim()` อยู่หลังบรรทัด `let t = null, … SIM = null, EVENTS = []`
- `...\tests\sim.test.mjs` — 8 เทสของ LOC sim helpers (regex, absolutize, patch, `node --check` ของ app จริง)
- `...\tests\health.test.mjs` — เพิ่ม 3 เทสของ `LOC.simLine`
- `...\docs\superpowers\plans\2026-11-18-events-tab.md` — แผน 7 task ที่ทำเสร็จแล้ว
- `...\docs\superpowers\specs\2026-11-18-events-tab-design.md` — สเปค (เกณฑ์ตรวจ 4 ข้ออยู่ท้าย)
- `...\docs\superpowers\notes\2026-11-17-events-spike.md` — §6 ผลตรวจในเกม, §7 spike import map + ตารางรูปร่างชื่อ sim
- `...\docs\superpowers\plans\2026-11-17-bundle-port.md` — Global Constraint ข้อห้าม import `app-*.js` ถูกยกเลิกแล้ว (มีหมายเหตุ)
- `...\tools\locate-sim.mjs` — หาชื่อ sim จากรูปร่าง (regex ต้นแบบของ `LOC.simNames`)
- `...\tools\fetch-bundle.mjs` — ดึง JS เกมลง `bundle/<BUILD>/` (รันก่อนเทส)
- `...\tools\release.mjs` — ปล่อยเวอร์ชัน (ตรวจ `@version`=`VERSION`, `node --check`, เทส, commit, push)
- `...\bundle\mwll6s9j\b\app-QHVRDERS.js` — build ล่าสุดที่ดึงไว้ (gitignore)
- `...\CLAUDE.md` — แหล่งความจริงของโปรเจ็ค
- `...\HANDOFF.md` — ไฟล์นี้

## Changes made

- `wox-editor.user.js` — import map shim, `makeSim`/`simReady`, แท็บอีเว้นต์จาก sim (ถอด `#hevg`/`GROUPS`/`GROUP_OF`, ลบ `MJ`), ช่วยเลือกส่ง `opt` + `observer` ตั้งแต่ออก, ตรวจระบบ/ตรวจอัปเดตรายงาน sim — commit `df419bc` (3.4.0) และ `a3a18e7` (3.4.1) push แล้ว
- `tests/sim.test.mjs` — ไฟล์ใหม่ commit `43fa028`; `tests/health.test.mjs` — เพิ่ม 3 เทส commit `dd981c4`
- `CLAUDE.md` — §3 สถาปัตยกรรม shim, §6 สถานะ 3.4.0/3.4.1, §8 `found.sim` — commits `746edc2` และ `3341e41`
- `docs/superpowers/plans/2026-11-17-bundle-port.md` — ยกเลิกข้อห้าม import `app-*.js` commit `746edc2`
- `docs/superpowers/plans/2026-11-18-events-tab.md` — แผน commit `be9823a`
- `wox-probe.user.js` — throwaway ของ Task 0 ลบทิ้งแล้ว (ไม่เคย commit)
- `.worktrees/events-v3.4.0` + branch `feat/events-v3.4.0` — ลบแล้ว; workspace `.superpowers/sdd/2026-11-18-events-tab/` หายไปพร้อม worktree
- `bundle/mwll6s9j/` — ดึงใหม่ด้วย `tools/fetch-bundle.mjs` (gitignore)
