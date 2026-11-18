# Handoff: v3.3.3 — ถอดตัวกรองที่ไม่มีไอเทมจริง เหลือตรวจข้อเดียว

Written: 2026-11-18 10:40 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน กติกาของโปรเจ็คอยู่ในนั้น: ตอบภาษาไทย, รัน `node --check`, bump `@version` และ `VERSION` พร้อมกัน, ปล่อยด้วย `tools/release.mjs`, เรียกผู้ใช้ว่า "นายท่านชาโดว์" และ**ห้ามแยก subagent** (§7)

## Goal

แก้ทุก finding ของ audit 2026-11-18 ที่ไม่ชนกับงาน (ก) (แท็บอีเว้นต์/ช่วยเลือกแบบใหม่) ทุกการแก้มีเทส แล้วปล่อย `wox-editor.user.js` เป็น **v3.3.2 ครั้งเดียว** โดย `main` ต้องมี ruleset ที่บังคับเจ้าของ repo ด้วย

## Where things stand

**เสร็จและปล่อยแล้ว**: Task 0-9 ของแผนทำครบ, merge เข้า `main`, ruleset ทำงานอยู่ และ **นายท่านตรวจ v3.3.2 ในเกมแล้ว ผ่านทุกข้อ ยกเว้นตัวกรองกลุ่ม "ความหายาก" ที่กดแล้วไม่ขึ้นรายการ** — v3.3.3 ถอดกลุ่มนั้นออกแล้ว (`f4d39b1`) เหลือให้นายท่านยืนยันตัวกรองไอเทมชุดใหม่ข้อเดียว งาน (ก) อีเว้นต์/ช่วยเลือกยังไม่เริ่ม

## Verified facts

- **raw `main` เป็น v3.3.3** — `curl -s https://raw.githubusercontent.com/Jeffinz/wox-editor/main/wox-editor.user.js | grep '@version'` ได้ `// @version      3.3.3` (และ `VERSION = '3.3.3'`)
- **commit ที่ปล่อย v3.3.3 คือ `f4d39b1 fix: drop the rarity filter that could never match an item (v3.3.3)`**; v3.3.2 อยู่ที่ `b1e8b66` และ push v3.3.2 ครั้งแรก (`9f94ca5..b1e8b66`) ผ่าน ruleset ปกติ (fast-forward) แปลว่า ruleset ไม่บล็อก push
- **ต้นเหตุที่ตัวกรอง "ความหายาก" ว่าง**: `LOC.IS.items` รับเฉพาะ object ที่มี `woodSword` (`wox-editor.user.js` บรรทัด ~39-46) ไอเทมที่ tier เป็นชื่อ (`{id:"head_common_sunhat",slot:"head",tier:"common",…}`) อยู่ใน **array** `Um` ใน chunk `bundle/mwlj4t86/b/c-QVRR4LBE.js` ซึ่ง `IS.items` ปฏิเสธ (array) แผงจึงไม่เคยมีไอเทมกลุ่มนั้น ช่องกรองที่อ้างถึงจึงว่างทุกตัวเลือก ไม่ใช่แค่ "ธรรมดา/ไม่ธรรมดา"
- **ไอเทมสองชุดแยกช่องกัน** — ชุดที่แผงแสดง (object, tier ตัวเลข 0-5): weapon/pill/talisman ฯลฯ; ชุดเครื่องประดับ (array, tier ชื่อ): aura/eyes/head/mouth/outfit ตรวจด้วย `grep -o 'slot:"[a-z]*",tier:"[a-z]*"' bundle/mwlj4t86/b/c-QVRR4LBE.js`
- **ruleset `protect-main` id `27517988` ทำงานอยู่** — สร้างด้วย `gh api -X POST repos/Jeffinz/wox-editor/rulesets --input <json>` โดย `enforcement: active`, `conditions.ref_name.include: ["refs/heads/main"]`, `rules: [deletion, non_fast_forward]`, `bypass_actors: []` และผลตอบกลับมี `current_user_can_bypass: "never"` (บังคับเจ้าของด้วย)
- **กฎมีผลจริง** — `gh api repos/Jeffinz/wox-editor/rules/branches/main` คืนสองรายการ `deletion` กับ `non_fast_forward` ที่ `ruleset_id: 27517988`; ก่อนสร้าง `branches/main/protection` ตอบ 404 ("Branch not protected") และ `rulesets` คืน `[]`
- **เทสบน `main` หลัง merge** — `node --test "tests/**/*.test.mjs"` ได้ `# pass 46 / # fail 0 / # skipped 0`; โฟลเดอร์ `bundle/` ใน checkout หลักมีแต่ build เก่า `mwky5ysx` เทสเลือกโฟลเดอร์ล่าสุดเองจึงยังผ่าน
- **BUILD ของเกมตอนนี้คือ `mwlj4t86`** (สเปคเขียน `mwky5ysx` เก่า, ตอนทำ v3.3.2 เป็น `mwlh9q9f`) ตรวจด้วย `ls bundle/` หลัง `node tools/fetch-bundle.mjs`
- **ไอเทมใน build `mwlj4t86` มี tier สองแบบปนกันข้ามชุด** — `grep -ho 'tier:"[a-z]*"' bundle/mwlj4t86/b/c-QVRR4LBE.js | sort | uniq -c`: `common` 60, `uncommon` 65, `rare` 63, `epic` 74, `legendary` 78 (ชุดเครื่องประดับ array) และ `tier:<0-5>` อีก 2/58/56/23/38/30 ตัว (ชุดที่แผงแสดง)
- **ตาราง `TIERS` ของเกม (chunk `c-OZIE7UCD.js`) มี 6 ขั้น**: สามัญ `#8c918e`, ขั้นมนุษย์ `#b8693e`, ขั้นปฐพี `#4f9a58`, ขั้นฟ้า `#3f7fc0`, ขั้นสวรรค์ `#8a5ac0`, ขั้นเซียน `#d4a838`
- **ตรวจทั้ง branch เทียบ `main` แล้วแบบ self-review** (16 ไฟล์, +1325/−214) เจอ Important 1 ข้อ (F5) แก้ด้วยเทส RED→GREEN แล้ว, Minor 1 ข้อที่ยังไม่แก้ (ดูหัวข้อ Guesses)

## Guesses, not yet proven

- **การลบแผงซ้ำในเกมจริง**: `dropStalePanels` อาศัย `aria-label="WoX Editor"` ของ `.w#w` ซึ่งมีครบทุกรุ่น v3.0.0-3.3.1 (ตรวจด้วย `git show <commit>:wox-editor.user.js | grep` มาก่อนแล้ว) แต่ยังไม่มีใครเห็นมันลบแผงเก่าจริงในเบราว์เซอร์ — ข้อ 6 ของรายการตรวจในเกมจะพิสูจน์
- **`<optgroup label="ความหายาก">` ถูกถอดออกใน v3.3.3** — นายท่านทดสอบในเกมแล้วว่ากด "ธรรมดา/ไม่ธรรมดา" ไม่ขึ้นรายการ เพราะไอเทมกลุ่มนั้นไม่อยู่ในตารางที่แผงแสดง (ดู Verified facts) ตอนนี้ `#hqr` มีชุดเดียวคือขั้นของเกม 6 ตัว
- **Minor ที่ยังไม่แก้**: `dropStalePanels` สร้าง `ours` ด้วย `'woxed' in d.dataset` ถ้า `body` มีลูกที่เป็น non-HTML element (เช่น MathML) จะ throw ตอน init ทั้งแผง เกมนี้ไม่มีทางเกิด เพราะ UI เกมเป็น Shadow DOM/canvas; ถ้าจะปิดช่องนี้คือเปลี่ยนเป็น `d.dataset?.woxed` แล้วเพิ่มเทสไม่ได้ (ผูก DOM) — ตัดสินใจตอนแตะไฟล์นั้นครั้งหน้า

## Ruled out and wrong turns

- **BUILD `mwky5ysx` ในสเปค/แผนเป็นของเก่า** — build จริงตอนลงมือคือ `mwlh9q9f`; marker ในเทส (`id:"mortal"`, `id:"novice"`, `#8c918e`, `woodSword`) ยังใช้ได้ทั้งสอง build แต่ห้าม hardcode ชื่อ build ในเทส (v3.3.2 ทำแล้ว: เลือกโฟลเดอร์ล่าสุดหรือ `WOX_BUNDLE`)
- **อย่าเพิ่มตัวเลือกกรองให้ระดับที่ไม่มีไอเทมในตารางที่แผงอ่าน** — v3.3.2 เพิ่มกลุ่ม "ความหายาก" (`r:<ชื่อ>`) โดยคิดว่ามีไอเทมระดับชื่อในรายการ แต่ความจริงมันอยู่อีก array ที่ `IS.items` ไม่รับ ตัวเลือกจึงว่างทุกตัว v3.3.3 ถอดออกแล้ว; ส่วน map สตริง → ขั้นสีเดียวกัน (`RAR_TO_TIER`) ยังอยู่ใน `LOC.tierIdx` เผื่อ build หน้าเอาระดับชื่อเข้ามาในตารางหลัก
- **ใช้ jsdom / `package.json` / dependency ใหม่** — นายท่านเลือกทาง A: ย้ายตรรกะเข้า `LOC` เป็น pure function แล้วเทสใน Node เท่านั้น
- **แยก subagent ตรวจ/รีวิว/ค้นหา** — CLAUDE.md §7 ห้าม (เปลือง token); การรีวิวทั้ง branch ทำเองใน session
- **`t.skip` เมื่อไม่มี `bundle/`** — เป็นเทสเขียวหลอก ต้องรัน `node tools/fetch-bundle.mjs` ก่อนและดู **skip 0** ไม่ใช่ fail 0
- **ห้ามใช้ `git clean -fdx` ใน worktree ระหว่างทำงาน** — มันลบ workspace ของแผน (`.superpowers/sdd/`) ที่ gitignore อยู่

## Next step

1. **นายท่านอัปเดตสคริปต์ใน Tampermonkey เป็น v3.3.3 แล้วรีโหลดหน้าเกม** ตรวจข้อเดียว: ตัวกรองระดับในแท็บกระเป๋าไม่มีกลุ่ม "ความหายาก" แล้ว, เลือกขั้นของเกมแล้วรายการกรองถูก, เรียงสูงไปต่ำ
2. ถ้าข้อนี้ผ่าน: ปิดงาน audit ได้ เหลือแต่งาน (ก) แท็บอีเว้นต์/ช่วยเลือก (`SIM`/`MJ`/`EVENTS` ยังเป็นโค้ดตายที่ตั้งใจเก็บไว้ ดู `docs/superpowers/notes/2026-11-17-events-spike.md`)
3. ถ้ายังไม่ผ่าน: เก็บ console error และสิ่งที่เลือกมาให้ครบก่อนแก้ อย่าเดา

## Waiting on the user

ตรวจ v3.3.2 ในเกมแล้ว (2026-11-18) ผล: ข้อ 1, 3, 4, 5, 6, 7 ผ่าน — **ข้อ 2 ไม่ผ่านเพราะตัวกรองกลุ่มความหายากว่าง** v3.3.3 แก้แล้ว เหลือยืนยันข้อ 2 ใหม่:

2. กระเป๋า: ตัวกรองระดับมีชุดเดียว 6 ตัว (สามัญ … ขั้นเซียน ไม่มีกลุ่ม "ความหายาก"), เลือกแล้วรายการกรองถูก และเรียงสูงไปต่ำ

รายละเอียดเดิมของ 7 ข้อ (สำหรับอ้างอิง ถ้าต้องตรวจซ้ำหลังเกมอัปเดต):

1. แผง "ตรวจระบบ": ขึ้น `✔ BUILD` ของ build ปัจจุบัน (ตอนนี้ `mwlj4t86`) + `✔` ตารางทั้ง 4 พร้อมชื่อ chunk และบรรทัด `martial`/`pending` ตรงกับตัวละครจริง (ไม่มีสายยุทธ์/ไม่มีอีเว้นต์ค้างต้องขึ้น `–` ไม่ใช่ `✖`)
2. ล้างช่องเงิน/กรรม/ชื่อเสียง/ค่าพลัง แล้วกดบันทึก: ค่าในเกมไม่เปลี่ยนเป็น 0 และขึ้น toast "ใส่ตัวเลขก่อน"
3. แท็บอีเว้นต์: ขึ้น "อีเว้นต์/ช่วยเลือก: ยังไม่รองรับเกมแบบ bundle" ไม่ใช่ "ไม่พบอีเว้นต์ที่ตรงกับคำค้น" และปุ่ม "เรียกอีเว้นต์นี้" ขึ้นข้อความเดียวกัน
4. console ไม่มี error ใหม่หลังโหลด 3-5 วินาที และกด "ตรวจอีกครั้ง" แล้ว Network ไม่ดึง `/`, boot, app ซ้ำ (มีแต่ core chunk จาก module cache)
5. ถ้ามีแผงจากสคริปต์รุ่นเก่าค้างอยู่ มันถูกลบ (ของเราเองไม่ถูกลบ)
6. ช่องตัวเลขทุกช่องยังพิมพ์ได้ รวมช่องเลือก (select) ที่โฟกัสอยู่ไม่ถูกทับค่าตอนสถานะเกมเปลี่ยน

การปิด/เปิด ruleset ชั่วคราว (ถ้าจำเป็นต้อง force push ด้วยเหตุผลบางอย่าง — **ต้องขออนุญาตนายท่านก่อนทุกครั้ง**):

```
gh api -X DELETE repos/Jeffinz/wox-editor/rulesets/27517988        # ปิด
# เปิดใหม่: สร้างซ้ำด้วย JSON เดียวกัน (name protect-main, target branch,
# enforcement active, refs/heads/main, rules deletion + non_fast_forward, bypass_actors [])
```

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\wox-editor.user.js` — สคริปต์หลัก v3.3.3 (1023 บรรทัด; `wc -l` เมื่อแก้)
- `...\CLAUDE.md` — แหล่งความจริงของโปรเจ็ค (§5 บทเรียน, §7 กติกา, §8 เมื่อเกมอัปเดต)
- `...\AGENTS.md` — ทางเข้าสั้นๆ ชี้ไป `CLAUDE.md`
- `...\tests\` — เทส Node (`locate`, `items`, `core`, `health`, `panel`); รัน `node --test "tests/**/*.test.mjs"`
- `...\tools\release.mjs` — ปล่อยเวอร์ชัน (ตรวจ version/syntax/เทส → commit → push `main`)
- `...\tools\fetch-bundle.mjs` — ดึง JS ของเกมลง `bundle/<BUILD>/` ให้เทสที่ต้องอ่านไฟล์จริง
- `...\tools\snapshot-diff.mjs` และ `...\src\` — **ห้ามลบ** แม้ใช้กับเกมแบบ bundle ไม่ได้แล้ว (CLAUDE.md §8)
- `...\docs\superpowers\specs\2026-11-18-audit-fixes-design.md` — สเปคของงาน v3.3.2 (7 ข้อตรวจในเกมอยู่ท้ายไฟล์)
- `...\docs\superpowers\plans\2026-11-18-audit-fixes.md` — แผน Task 0-9 ที่ทำครบแล้ว
- `...\docs\superpowers\notes\2026-11-18-audit-findings.md` — finding ของ audit
- `...\docs\superpowers\notes\2026-11-17-events-spike.md` — แนวทางงาน (ก) อีเว้นต์/ช่วยเลือก
- `...\journal\2026-11-18.md` — บันทึกงานวันนี้ (gitignore, อยู่ใน checkout หลักเท่านั้น)
- `...\bundle\mwlj4t86\` — build ปัจจุบันที่ใช้ตรวจข้อ bug ตัวกรอง (`mwlj4t86/b/c-QVRR4LBE.js` มี array เครื่องประดับ `Um`); `bundle\mwky5ysx\` เป็น build เก่าและ `mwlh9q9f` ถูกลบไปกับ worktree แล้ว ถ้า build เปลี่ยนให้ `node tools/fetch-bundle.mjs` ใหม่

## Changes made

บน `main` (push แล้วทั้งหมด):

- `wox-editor.user.js` — v3.3.2 (`b1e8b66`): `LOC` เพิ่ม `RAR_ORDER`/`RAR_TO_TIER`/`rarKey`/`tierIdx`/`itemOrder`/`tierMatches`/`numOrKeep`/`keepTables`/`isStalePanel`/`EV_UNSUPPORTED`/`TABLES`/`STATE_REQUIRED`/`STATE_OPTIONAL`/`tableLines`/`stateLines`; hook `JSON.stringify` มี try/catch; `loadCore` เก็บ `failed`/`reason` และ cache chain; `renderCore` รวมตารางข้ามรอบ; `startCore` กัน `renderCore` throw; ช่องว่างไม่เขียน 0; `fresh()` ไม่ทับ INPUT/SELECT/TEXTAREA; `placeBadges` ผ่าน rAF; observer เริ่มเฉพาะเมื่อมี `SIM`; `dropStalePanels` ลบเฉพาะแผงของเรา; host มี `data-woxed`; ตรวจระบบแยก "ยังไม่แน่ใจ" จาก "หาไม่เจอ"
- `wox-editor.user.js` — v3.3.3 (`f4d39b1`): ถอดตัวกรองกลุ่ม "ความหายาก" ออกจาก `#hqr` เพราะไม่มีไอเทมในตารางที่แผงแสดงเลย; `#hqr` เหลือตัวเลือกขั้นของเกมจาก `TIER_LBL` (index 0-5); `tierMatches` เทียบ index ตรง ๆ ผ่าน `tierIdx`; เทส `items`/`locate` แก้ตาม (46 เทสผ่าน, skip 0)
- `tests/locate.test.mjs`, `tests/items.test.mjs`, `tests/core.test.mjs`, `tests/health.test.mjs`, `tests/panel.test.mjs` — เทสใหม่/แก้ไข (46 เทส)
- `CLAUDE.md`, `AGENTS.md` — แก้ให้ตรงกับสถานะและสถาปัตยกรรมใหม่
- `docs/superpowers/**` — audit findings, design spec, plan, หัวโน้ตของ spike/bundle-port
- `HANDOFF.md` — ไฟล์นี้ (เขียนทับของเดิม)
- ลบ worktree `.worktrees/fix-audit-v3.3.2` และ branch `fix/audit-v3.3.2` แล้ว (merge ด้วย `--no-ff` เข้า `main`)
