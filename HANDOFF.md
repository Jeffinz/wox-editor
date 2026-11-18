# Handoff: ปิดงาน v3.3.2 — เหลือแค่ตรวจในเกม

Written: 2026-11-18 10:13 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน กติกาของโปรเจ็คอยู่ในนั้น: ตอบภาษาไทย, รัน `node --check`, bump `@version` และ `VERSION` พร้อมกัน, ปล่อยด้วย `tools/release.mjs`, เรียกผู้ใช้ว่า "นายท่านชาโดว์" และ**ห้ามแยก subagent** (§7)

## Goal

แก้ทุก finding ของ audit 2026-11-18 ที่ไม่ชนกับงาน (ก) (แท็บอีเว้นต์/ช่วยเลือกแบบใหม่) ทุกการแก้มีเทส แล้วปล่อย `wox-editor.user.js` เป็น **v3.3.2 ครั้งเดียว** โดย `main` ต้องมี ruleset ที่บังคับเจ้าของ repo ด้วย

## Where things stand

**เสร็จและปล่อยแล้ว**: Task 0-9 ของแผนทำครบ, merge เข้า `main`, bump เป็น 3.3.2, push ขึ้น GitHub แล้ว (`b1e8b66`), settings ruleset ทำงานอยู่ เทสบน `main` ได้ pass 46 / fail 0 / skip 0 **เหลือข้อเดียวคือ 7 ข้อที่ต้องตรวจในเกมจริง** ซึ่งนายท่านรับไปตรวจเอง (workspace ของแผน `superpowers` ถูกลบพร้อม worktree แล้ว บันทึกมีใน git log กับไฟล์นี้) งาน (ก) อีเว้นต์/ช่วยเลือกยังไม่เริ่ม

## Verified facts

- **raw `main` เป็น v3.3.2** — `curl -s https://raw.githubusercontent.com/Jeffinz/wox-editor/main/wox-editor.user.js | grep '@version'` ได้ `// @version      3.3.2` (และ `VERSION = '3.3.2'`)
- **commit ที่ปล่อยคือ `b1e8b66 fix: apply the 2026-11-18 audit fixes (v3.3.2)`** — push ครั้งนั้นขึ้นต้นด้วย `9f94ca5..b1e8b66  main -> main` แปลว่า ruleset ไม่บล็อก push ปกติ (fast-forward)
- **ruleset `protect-main` id `27517988` ทำงานอยู่** — สร้างด้วย `gh api -X POST repos/Jeffinz/wox-editor/rulesets --input <json>` โดย `enforcement: active`, `conditions.ref_name.include: ["refs/heads/main"]`, `rules: [deletion, non_fast_forward]`, `bypass_actors: []` และผลตอบกลับมี `current_user_can_bypass: "never"` (บังคับเจ้าของด้วย)
- **กฎมีผลจริง** — `gh api repos/Jeffinz/wox-editor/rules/branches/main` คืนสองรายการ `deletion` กับ `non_fast_forward` ที่ `ruleset_id: 27517988`; ก่อนสร้าง `branches/main/protection` ตอบ 404 ("Branch not protected") และ `rulesets` คืน `[]`
- **เทสบน `main` หลัง merge** — `node --test "tests/**/*.test.mjs"` ได้ `# pass 46 / # fail 0 / # skipped 0`; โฟลเดอร์ `bundle/` ใน checkout หลักมีแต่ build เก่า `mwky5ysx` เทสเลือกโฟลเดอร์ล่าสุดเองจึงยังผ่าน
- **BUILD ของเกมตอนนี้คือ `mwlh9q9f`** (ไม่ใช่ `mwky5ysx` ที่สเปคเขียนไว้) ตรวจด้วย `ls bundle/` ใน worktree ที่ดาวน์โหลดมาและ `/src/build.js`
- **ไอเทมใน build `mwlh9q9f` มี tier สองแบบปนกัน** — นับด้วย `grep -ho 'tier:"[a-z]*"' bundle/mwlh9q9f/b/*.js | sort | uniq -c`: `common` 60, `uncommon` 65, `rare` 66, `epic` 77, `legendary` 79 และ `tier:<0-5>` อีก 11/69/68/36/48/40 ตัว
- **ตาราง `TIERS` ของเกม (chunk `c-OZIE7UCD.js`) มี 6 ขั้น**: สามัญ `#8c918e`, ขั้นมนุษย์ `#b8693e`, ขั้นปฐพี `#4f9a58`, ขั้นฟ้า `#3f7fc0`, ขั้นสวรรค์ `#8a5ac0`, ขั้นเซียน `#d4a838`
- **ตรวจทั้ง branch เทียบ `main` แล้วแบบ self-review** (16 ไฟล์, +1325/−214) เจอ Important 1 ข้อ (F5) แก้ด้วยเทส RED→GREEN แล้ว, Minor 1 ข้อที่ยังไม่แก้ (ดูหัวข้อ Guesses)

## Guesses, not yet proven

- **การลบแผงซ้ำในเกมจริง**: `dropStalePanels` อาศัย `aria-label="WoX Editor"` ของ `.w#w` ซึ่งมีครบทุกรุ่น v3.0.0-3.3.1 (ตรวจด้วย `git show <commit>:wox-editor.user.js | grep` มาก่อนแล้ว) แต่ยังไม่มีใครเห็นมันลบแผงเก่าจริงในเบราว์เซอร์ — ข้อ 6 ของรายการตรวจในเกมจะพิสูจน์
- **`<optgroup label="ความหายาก">` ในช่องกรอง `#hqr`** แสดงผลถูกในเบราว์เซอร์ของเกม (เทสใน Node ตรวจได้แค่ `tierMatches`) — ข้อ 2 ของรายการตรวจในเกมจะพิสูจน์
- **Minor ที่ยังไม่แก้**: `dropStalePanels` สร้าง `ours` ด้วย `'woxed' in d.dataset` ถ้า `body` มีลูกที่เป็น non-HTML element (เช่น MathML) จะ throw ตอน init ทั้งแผง เกมนี้ไม่มีทางเกิด เพราะ UI เกมเป็น Shadow DOM/canvas; ถ้าจะปิดช่องนี้คือเปลี่ยนเป็น `d.dataset?.woxed` แล้วเพิ่มเทสไม่ได้ (ผูก DOM) — ตัดสินใจตอนแตะไฟล์นั้นครั้งหน้า

## Ruled out and wrong turns

- **BUILD `mwky5ysx` ในสเปค/แผนเป็นของเก่า** — build จริงตอนลงมือคือ `mwlh9q9f`; marker ในเทส (`id:"mortal"`, `id:"novice"`, `#8c918e`, `woodSword`) ยังใช้ได้ทั้งสอง build แต่ห้าม hardcode ชื่อ build ในเทส (v3.3.2 ทำแล้ว: เลือกโฟลเดอร์ล่าสุดหรือ `WOX_BUNDLE`)
- **map ระดับสตริงเป็น index 0-4 ของ `RAR_ORDER` (ทางที่ v3.3.2 commit แรกทำ) ใช้ไม่ได้** — ตัวกรอง `#hqr` มีแต่ชื่อขั้นของเกม (ขั้นมนุษย์ ฯลฯ) ผู้ใช้จึงกรองตามป้ายที่ไอเทมแสดง (`[ตำนาน]`) ไม่ได้เลย ตอนทบทวนทั้ง branch จึงเปลี่ยนเป็น: สตริงระดับ → ขั้นของเกมที่**สีเดียวกัน** (`RAR_TO_TIER`: common 0, uncommon 2, rare 3, epic 4, legendary 5) และเพิ่มตัวกรองกลุ่มที่สองค่า `r:<ชื่อ>` (`drawItems` ใช้ `LOC.tierMatches` แยกไอเทมระดับชื่อออกจากไอเทมขั้นตัวเลข)
- **ใช้ jsdom / `package.json` / dependency ใหม่** — นายท่านเลือกทาง A: ย้ายตรรกะเข้า `LOC` เป็น pure function แล้วเทสใน Node เท่านั้น
- **แยก subagent ตรวจ/รีวิว/ค้นหา** — CLAUDE.md §7 ห้าม (เปลือง token); การรีวิวทั้ง branch ทำเองใน session
- **`t.skip` เมื่อไม่มี `bundle/`** — เป็นเทสเขียวหลอก ต้องรัน `node tools/fetch-bundle.mjs` ก่อนและดู **skip 0** ไม่ใช่ fail 0
- **ห้ามใช้ `git clean -fdx` ใน worktree ระหว่างทำงาน** — มันลบ workspace ของแผน (`.superpowers/sdd/`) ที่ gitignore อยู่

## Next step

1. **นายท่านตรวจ 7 ข้อในเกม** หลังอัปเดตสคริปต์ใน Tampermonkey (กดอัปเดตแล้วรีโหลดหน้าเกมเอง) — รายการอยู่ในหัวข้อ "Waiting on the user" ด้านล่าง
2. ถ้าข้อไหนไม่ผ่าน: เก็บ console error และ Network tab (ไฟล์ `b/*.js` ที่โหลด) มาให้ครบก่อนแก้ อย่าเดา
3. ผ่านครบแล้ว: ปิดงาน audit ได้ เหลือแต่งาน (ก) แท็บอีเว้นต์/ช่วยเลือก (`SIM`/`MJ`/`EVENTS` ยังเป็นโค้ดตายที่ตั้งใจเก็บไว้ ดู `docs/superpowers/notes/2026-11-17-events-spike.md`)

## Waiting on the user

7 ข้อที่ต้องตรวจในเกม (นายท่านรับไปตรวจเอง):

1. แผง "ตรวจระบบ": ขึ้น `✔ BUILD mwlh9q9f` + `✔` ตารางทั้ง 4 พร้อมชื่อ chunk และบรรทัด `martial`/`pending` ตรงกับตัวละครจริง (ตัวละครไม่มีสายยุทธ์/ไม่มีอีเว้นต์ค้างต้องขึ้น `–` ไม่ใช่ `✖`)
2. กระเป๋า: ตัวกรองมีสองกลุ่ม (ขั้นของเกม 6 ตัว กับ "ความหายาก" 5 ตัว) และไอเทม `[ตำนาน]` กรองด้วย "ตำนาน" ได้ รายการเรียงสูงไปต่ำ
3. ล้างช่องเงิน/กรรม/ชื่อเสียง/ค่าพลัง แล้วกดบันทึก: ค่าในเกมไม่เปลี่ยนเป็น 0 และขึ้น toast "ใส่ตัวเลขก่อน"
4. แท็บอีเว้นต์: ขึ้น "อีเว้นต์/ช่วยเลือก: ยังไม่รองรับเกมแบบ bundle" ไม่ใช่ "ไม่พบอีเว้นต์ที่ตรงกับคำค้น" และปุ่ม "เรียกอีเว้นต์นี้" ขึ้นข้อความเดียวกัน
5. console ไม่มี error ใหม่หลังโหลด 3-5 วินาที และกด "ตรวจอีกครั้ง" แล้ว Network ไม่ดึง `/`, boot, app ซ้ำ (มีแต่ core chunk จาก module cache)
6. ถ้ามีแผงจากสคริปต์รุ่นเก่าค้างอยู่ มันถูกลบ (ของเราเองไม่ถูกลบ)
7. ช่องตัวเลขทุกช่องยังพิมพ์ได้ รวมช่องเลือก (select) ที่โฟกัสอยู่ไม่ถูกทับค่าตอนสถานะเกมเปลี่ยน

การปิด/เปิด ruleset ชั่วคราว (ถ้าจำเป็นต้อง force push ด้วยเหตุผลบางอย่าง — **ต้องขออนุญาตนายท่านก่อนทุกครั้ง**):

```
gh api -X DELETE repos/Jeffinz/wox-editor/rulesets/27517988        # ปิด
# เปิดใหม่: สร้างซ้ำด้วย JSON เดียวกัน (name protect-main, target branch,
# enforcement active, refs/heads/main, rules deletion + non_fast_forward, bypass_actors [])
```

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\wox-editor.user.js` — สคริปต์หลัก v3.3.2 (1028 บรรทัด; `wc -l` เมื่อแก้)
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
- `...\bundle\mwky5ysx\` — build เก่าที่มีใน checkout หลัก; build ปัจจุบัน `mwlh9q9f` อยู่ใน worktree เดิมและถูกลบไปแล้ว ต้อง `node tools/fetch-bundle.mjs` ใหม่ถ้าต้องใช้

## Changes made

บน `main` (push แล้วทั้งหมด):

- `wox-editor.user.js` — v3.3.2: `LOC` เพิ่ม `RAR_TO_TIER`/`rarKey`/`itemOrder`/`tierMatches`/`numOrKeep`/`keepTables`/`isStalePanel`/`EV_UNSUPPORTED`/`TABLES`/`STATE_REQUIRED`/`STATE_OPTIONAL`/`tableLines`/`stateLines`; ตัวกรอง `#hqr` สองกลุ่ม; hook `JSON.stringify` มี try/catch; `loadCore` เก็บ `failed`/`reason` และ cache chain; `renderCore` รวมตารางข้ามรอบ; `startCore` กัน `renderCore` throw; ช่องว่างไม่เขียน 0; `fresh()` ไม่ทับ INPUT/SELECT/TEXTAREA; `placeBadges` ผ่าน rAF; observer เริ่มเฉพาะเมื่อมี `SIM`; `dropStalePanels` ลบเฉพาะแผงของเรา; host มี `data-woxed`; ตรวจระบบแยก "ยังไม่แน่ใจ" จาก "หาไม่เจอ"
- `tests/locate.test.mjs`, `tests/items.test.mjs`, `tests/core.test.mjs`, `tests/health.test.mjs`, `tests/panel.test.mjs` — เทสใหม่/แก้ไข (46 เทส)
- `CLAUDE.md`, `AGENTS.md` — แก้ให้ตรงกับสถานะและสถาปัตยกรรมใหม่
- `docs/superpowers/**` — audit findings, design spec, plan, หัวโน้ตของ spike/bundle-port
- `HANDOFF.md` — ไฟล์นี้ (เขียนทับของเดิม)
- ลบ worktree `.worktrees/fix-audit-v3.3.2` และ branch `fix/audit-v3.3.2` แล้ว (merge ด้วย `--no-ff` เข้า `main`)
