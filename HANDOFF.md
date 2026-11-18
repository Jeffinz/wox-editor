# Handoff: งาน audit ปิดแล้ว — เหลืองาน (ก) แท็บอีเว้นต์/ช่วยเลือก

Written: 2026-11-18 10:43 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน กติกาของโปรเจ็คอยู่ในนั้น: ตอบภาษาไทย, รัน `node --check`, bump `@version` และ `VERSION` พร้อมกัน, ปล่อยด้วย `tools/release.mjs`, เรียกผู้ใช้ว่า "นายท่านชาโดว์" และ**ห้ามแยก subagent** (§7)

## Goal

สองงานในคิว:

1. ~~แก้ทุก finding ของ audit 2026-11-18 ที่ไม่ชนกับงาน (ก)~~ — **เสร็จแล้ว** ปล่อยเป็น v3.3.2 และ v3.3.3 และนายท่านตรวจในเกมครบทุกข้อ
2. **งาน (ก)**: ทำให้แท็บอีเว้นต์กับตัวช่วยเลือกใช้ได้กับเกมแบบ bundle (ตอนนี้ขึ้น "ยังไม่รองรับเกมแบบ bundle") — ยังไม่เริ่ม

"เสร็จ" ของงาน (ก) = ทาบทับอีเว้นต์จากตารางของเกมได้, ช่วยเลือกให้คะแนนตัวเลือกได้, และนายท่านตรวจในเกมจริงแล้วผ่าน

## Where things stand

งาน audit ปิดครบทุกข้อ ไม่มีข้อค้าง: v3.3.3 อยู่บน `main` (raw เป็น 3.3.3), นายท่านอัปเดตใน Tampermonkey แล้วและตรวจในเกมแล้วว่าตัวกรองไอเทมชุดใหม่ผ่าน งาน (ก) ยังไม่เริ่ม — ไม่มีโค้ดหรือแผนของงาน (ก) เขียนไว้เลยนอกจากโน้ต spike และโค้ดตายที่ตั้งใจเก็บไว้ (`SIM`/`MJ`/`EVENTS` ในสคริปต์)

## Verified facts

- **raw `main` เป็น v3.3.3** — `curl -s https://raw.githubusercontent.com/Jeffinz/wox-editor/main/wox-editor.user.js | grep '@version'` ได้ `// @version      3.3.3` (และ `VERSION = '3.3.3'`)
- **commit ล่าสุดบน `main`** (ตอนเขียน): `83fe04c docs: close the audit, item filter verified in game`; ก่อนหน้าคือ `cbb428f` (handoff v3.3.3), `f4d39b1` (ปล่อย v3.3.3), `b1e8b66` (ปล่อย v3.3.2)
- **เทสผ่าน 46/46 skip 0** — `node --test "tests/**/*.test.mjs"` บน `main` หลัง commit `83fe04c`; รันซ้ำ ณ 2026-11-18 10:43 ได้ `# pass 46 / # fail 0 / # skipped 0`
- **ต้นเหตุที่ตัวกรอง "ความหายาก" ว่าง**: `LOC.IS.items` รับเฉพาะ object ที่มี `woodSword` (`wox-editor.user.js` บรรทัด ~39-46) ไอเทมที่ tier เป็นชื่อ (`{id:"head_common_sunhat",slot:"head",tier:"common",…}`) อยู่ใน **array** `Um` ใน chunk `bundle/mwlj4t86/b/c-QVRR4LBE.js` ซึ่ง `IS.items` ปฏิเสธ (array) แผงจึงไม่เคยมีไอเทมกลุ่มนั้น — v3.3.3 ถอดตัวกรองกลุ่มนั้นออกแล้ว
- **ไอเทมสองชุดแยกช่องกัน** — ชุดที่แผงแสดง (object, tier ตัวเลข 0-5): weapon/pill/talisman ฯลฯ; ชุดเครื่องประดับ (array, tier ชื่อ): aura/eyes/head/mouth/outfit ตรวจด้วย `grep -o 'slot:"[a-z]*",tier:"[a-z]*"' bundle/mwlj4t86/b/c-QVRR4LBE.js`
- **BUILD ของเกมตอนนี้คือ `mwlj4t86`** — ตรวจด้วย `ls bundle/` หลัง `node tools/fetch-bundle.mjs`; `bundle/mwky5ysx/` เป็น build เก่าที่ยังอยู่ใน checkout หลัก
- **ตาราง `TIERS` ของเกม (chunk `c-OZIE7UCD.js`) มี 6 ขั้น**: สามัญ `#8c918e`, ขั้นมนุษย์ `#b8693e`, ขั้นปฐพี `#4f9a58`, ขั้นฟ้า `#3f7fc0`, ขั้นสวรรค์ `#8a5ac0`, ขั้นเซียน `#d4a838`; `#hqr` ในสคริปต์สร้างตัวเลือกจาก `TIER_LBL` index 0-5
- **ruleset `protect-main` id `27517988` ทำงานอยู่** — `enforcement: active`, `conditions.ref_name.include: ["refs/heads/main"]`, `rules: [deletion, non_fast_forward]`, `bypass_actors: []`, ผลตอบกลับมี `current_user_can_bypass: "never"` (บังคับเจ้าของด้วย); `gh api repos/Jeffinz/wox-editor/rules/branches/main` คืนสองรายการที่ `ruleset_id: 27517988`
- **push ปกติผ่าน ruleset** — push v3.3.2 (`9f94ca5..b1e8b66`) และทุก push ต่อมาเป็น fast-forward ผ่านหมด ruleset บล็อกเฉพาะ force push และการลบ branch
- **นายท่านตรวจในเกมแล้ว 2026-11-18** — v3.3.2 ผ่านข้อ 1, 3, 4, 5, 6, 7 (ข้อ 2 คือตัวกรอง); v3.3.3 ผ่านข้อ 2 ที่เหลือ
- **ตรวจทั้ง branch ของ v3.3.2 เทียบ `main` แล้วแบบ self-review** (16 ไฟล์, +1325/−214) เจอ Important 1 ข้อ (F5) แก้ด้วยเทส RED→GREEN แล้ว, Minor 1 ข้อที่ยังไม่แก้ (ดูหัวข้อ Guesses)

## Guesses, not yet proven

- **งาน (ก) ทำได้หรือไม่**: เกมแบบ bundle ไม่ได้กำหนด `SIM` ให้สคริปต์เห็น (นั่นคือเหตุที่แท็บอีเว้นต์ขึ้น `EV_UNSUPPORTED`) จะทำได้ก็ต่อเมื่อตารางอีเว้นต์ (`majorTexts`/`allMajors`-เทียบเท่า) อยู่ใน chunk ร่วมที่สคริปต์ `import()` ได้แล้ว คำถามที่ยังไม่มีคำตอบ: chunk ร่วมตัวไหนถือตารางอีเว้นต์ และรูปร่างของมันเป็นอย่างไร — วิธีตัดสิน: `node tools/fetch-bundle.mjs` แล้ว grep ชื่อฟังก์ชัน/คีย์อีเว้นต์ใน `bundle/mwlj4t86/b/*.js` ก่อน แล้วจึงอ่าน `docs/superpowers/notes/2026-11-17-events-spike.md` ประกอบ
- **Minor ที่ยังไม่แก้**: `dropStalePanels` สร้าง `ours` ด้วย `'woxed' in d.dataset` ถ้า `body` มีลูกที่เป็น non-HTML element (เช่น MathML) จะ throw ตอน init ทั้งแผง เกมนี้ไม่มีทางเกิด เพราะ UI เกมเป็น Shadow DOM/canvas; ถ้าจะปิดช่องนี้คือเปลี่ยนเป็น `d.dataset?.woxed` — ตัดสินใจตอนแตะไฟล์นั้นครั้งหน้า
- **การลบแผงซ้ำ**: `dropStalePanels` อาศัย `aria-label="WoX Editor"` ของ `.w#w` ซึ่งมีครบทุกรุ่น v3.0.0-3.3.1 นายท่านรายงานว่าข้อ 5 ผ่าน จึงถือว่าใช้ได้ แต่ยังไม่มีใครตรวจด้วยตาว่ามันลบแผงเก่าจริงหรือแค่ไม่มีแผงเก่าให้ลบ

## Ruled out and wrong turns

- **อย่าเพิ่มตัวเลือกกรองให้ระดับที่ไม่มีไอเทมในตารางที่แผงอ่าน** — v3.3.2 เพิ่มกลุ่ม "ความหายาก" (`r:<ชื่อ>`) โดยคิดว่ามีไอเทมระดับชื่อในรายการ แต่ความจริงมันอยู่อีก array ที่ `IS.items` ไม่รับ ตัวเลือกจึงว่างทุกตัว v3.3.3 ถอดออกแล้ว; ส่วน map สตริง → ขั้นสีเดียวกัน (`RAR_TO_TIER`) ยังอยู่ใน `LOC.tierIdx` เผื่อ build หน้าเอาระดับชื่อเข้ามาในตารางหลัก
- **ใช้ jsdom / `package.json` / dependency ใหม่** — นายท่านเลือกทาง A: ย้ายตรรกะเข้า `LOC` เป็น pure function แล้วเทสใน Node เท่านั้น
- **แยก subagent ตรวจ/รีวิว/ค้นหา** — CLAUDE.md §7 ห้าม (เปลือง token); การรีวิวทำเองใน session
- **`t.skip` เมื่อไม่มี `bundle/`** — เป็นเทสเขียวหลอก ต้องรัน `node tools/fetch-bundle.mjs` ก่อนและดู **skip 0** ไม่ใช่ fail 0
- **ห้าม hardcode ชื่อ build ในเทส** — เทสเลือกโฟลเดอร์ล่าสุดหรือ `WOX_BUNDLE` (marker ในเทสใช้ได้ทุก build)
- **ห้ามใช้ `git clean -fdx` ใน worktree ระหว่างทำงาน** — มันลบ workspace ของแผน (`.superpowers/sdd/`) ที่ gitignore อยู่

## Next step

1. **อ่าน `docs/superpowers/notes/2026-11-17-events-spike.md`** ให้จบ — มันคือแนวทางงาน (ก) ที่เขียนไว้ก่อน audit
2. รัน `node tools/fetch-bundle.mjs` แล้วค้นใน `bundle/mwlj4t86/b/` ว่าตารางอีเว้นต์อยู่ chunk ไหนและมีรูปร่างอย่างไร (เริ่มจากชื่อ `majorTexts`, `outcomeOf`, `statOdds`, `options`, `rarity`) — ยังไม่มีคำตอบนี้ อย่าเดา
3. ถ้าเจอและอ่านได้: เขียนสเปคงาน (ก) สั้นๆ ก่อนแตะโค้ด เพราะแตะ `LOC.IS`/`TABLES`/แท็บอีเว้นต์พร้อมกันหลายจุด
4. ถ้าไม่เจอใน chunk ร่วม: รายงานนายท่านว่าต้องคง `EV_UNSUPPORTED` ไว้ และเสนอทางเลือก (เช่น ดักข้อมูลอีเว้นต์จาก state ตอนการ์ดขึ้น แทนการ import ตาราง)

## Waiting on the user

ไม่มีข้อค้าง งาน audit ปิดครบทุกข้อแล้ว (ตรวจในเกม 2026-11-18)

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\wox-editor.user.js` — สคริปต์หลัก v3.3.3 (1023 บรรทัด; `wc -l` เมื่อแก้)
- `...\CLAUDE.md` — แหล่งความจริงของโปรเจ็ค (§3 สถาปัตยกรรม, §5 บทเรียน, §7 กติกา, §8 เมื่อเกมอัปเดต)
- `...\AGENTS.md` — ทางเข้าสั้นๆ ชี้ไป `CLAUDE.md`
- `...\tests\` — เทส Node (`locate`, `items`, `core`, `health`, `panel`); รัน `node --test "tests/**/*.test.mjs"`
- `...\tools\release.mjs` — ปล่อยเวอร์ชัน (ตรวจ version/syntax/เทส → commit → push `main`)
- `...\tools\fetch-bundle.mjs` — ดึง JS ของเกมลง `bundle/<BUILD>/` ให้เทสที่ต้องอ่านไฟล์จริง
- `...\tools\snapshot-diff.mjs` และ `...\src\` — **ห้ามลบ** แม้ใช้กับเกมแบบ bundle ไม่ได้แล้ว (CLAUDE.md §8)
- `...\docs\superpowers\notes\2026-11-17-events-spike.md` — แนวทางงาน (ก) อ่านก่อนเริ่ม
- `...\docs\superpowers\specs\2026-11-18-audit-fixes-design.md` — สเปคของงาน audit (7 ข้อตรวจในเกมอยู่ท้ายไฟล์)
- `...\docs\superpowers\plans\2026-11-18-audit-fixes.md` — แผน Task 0-9 ที่ทำครบแล้ว
- `...\docs\superpowers\notes\2026-11-18-audit-findings.md` — finding ของ audit
- `...\journal\2026-11-18.md` — บันทึกงานวันนี้ (gitignore, อยู่ใน checkout หลักเท่านั้น)
- `...\bundle\mwlj4t86\` — build ปัจจุบัน (`mwlj4t86/b/c-QVRR4LBE.js` มีทั้ง object ไอเทมและ array เครื่องประดับ `Um`); `bundle\mwky5ysx\` เป็น build เก่า ถ้า build เปลี่ยนให้ `node tools/fetch-bundle.mjs` ใหม่

การปิด/เปิด ruleset ชั่วคราว (ถ้าจำเป็นต้อง force push ด้วยเหตุผลบางอย่าง — **ต้องขออนุญาตนายท่านก่อนทุกครั้ง**):

```
gh api -X DELETE repos/Jeffinz/wox-editor/rulesets/27517988        # ปิด
# เปิดใหม่: สร้างซ้ำด้วย JSON เดียวกัน (name protect-main, target branch,
# enforcement active, refs/heads/main, rules deletion + non_fast_forward, bypass_actors [])
```

## Changes made

บน `main` (push แล้วทั้งหมด):

- `wox-editor.user.js` — v3.3.2 (`b1e8b66`): `LOC` เพิ่ม `RAR_ORDER`/`RAR_TO_TIER`/`rarKey`/`tierIdx`/`itemOrder`/`tierMatches`/`numOrKeep`/`keepTables`/`isStalePanel`/`EV_UNSUPPORTED`/`TABLES`/`STATE_REQUIRED`/`STATE_OPTIONAL`/`tableLines`/`stateLines`; hook `JSON.stringify` มี try/catch; `loadCore` เก็บ `failed`/`reason` และ cache chain; `renderCore` รวมตารางข้ามรอบ; `startCore` กัน `renderCore` throw; ช่องว่างไม่เขียน 0; `fresh()` ไม่ทับ INPUT/SELECT/TEXTAREA; `placeBadges` ผ่าน rAF; observer เริ่มเฉพาะเมื่อมี `SIM`; `dropStalePanels` ลบเฉพาะแผงของเรา; host มี `data-woxed`; ตรวจระบบแยก "ยังไม่แน่ใจ" จาก "หาไม่เจอ"
- `wox-editor.user.js` — v3.3.3 (`f4d39b1`): ถอดตัวกรองกลุ่ม "ความหายาก" ออกจาก `#hqr` เพราะไม่มีไอเทมในตารางที่แผงแสดงเลย; `#hqr` เหลือตัวเลือกขั้นของเกมจาก `TIER_LBL` (index 0-5); `tierMatches` เทียบ index ตรง ๆ ผ่าน `tierIdx`; เทส `items`/`locate` แก้ตาม (46 เทสผ่าน, skip 0)
- `tests/locate.test.mjs`, `tests/items.test.mjs`, `tests/core.test.mjs`, `tests/health.test.mjs`, `tests/panel.test.mjs` — เทสใหม่/แก้ไข (46 เทส)
- `CLAUDE.md`, `AGENTS.md` — แก้ให้ตรงกับสถานะและสถาปัตยกรรมใหม่ (v3.3.3 ผ่านการตรวจในเกมแล้ว)
- `docs/superpowers/**` — audit findings, design spec, plan, หัวโน้ตของ spike/bundle-port
- `HANDOFF.md` — ไฟล์นี้ เขียนใหม่สองรอบ: `cbb428f` (handoff v3.3.3) และรอบปิดงาน audit
- ลบ worktree `.worktrees/fix-audit-v3.3.2` และ branch `fix/audit-v3.3.2` แล้ว (merge ด้วย `--no-ff` เข้า `main`)
