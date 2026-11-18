# Audit findings — wox-editor (2026-11-18)

ขอบเขต: อ่านอย่างเดียว ไม่แก้โค้ด BUILD ที่ตรวจ `mwky5ysx` (เดิม `mwkobenp`) branch `audit/2026-11-18` จาก `main` `9f94ca5`

หลักฐานทุกรายการรันซ้ำได้ด้วยคำสั่งที่ระบุ ไม่มีการเดา

## สรุปผู้บริหาร

สคริปต์หลักยังทำงานถูกกับ build ใหม่: `LOC.chunkChain` อ่าน chain ได้ครบและตารางทั้ง 4 ยังอยู่ใน core chunk แต่เจอปัญหาสี่กลุ่มที่ควรแก้ก่อนงาน (ก):

1. เทสชุดเดียวที่ใช้ bundle จริงผูกชื่อไฟล์ build เก่าไว้ จึงข้ามตัวเองและรายงานเขียวทั้งที่ตรวจอะไรไม่ได้
2. ผลลัพธ์บางส่วนจากการโหลดรอบใหม่เขียนทับตารางดีของรอบก่อน (`TIERS = c.tiers` ไม่มีเงื่อนไข)
3. เอกสารสามไฟล์ (AGENTS.md, CLAUDE.md, HANDOFF.md, notes spike) อ้างโลกก่อน bundle และ offset ของ build เก่า
4. UI แท็บอีเว้นต์/ช่วยเลือกตายทั้งแท็บ แต่ยังตอบข้อความที่ทำให้เข้าใจผิดว่า "ไม่พบอีเว้นต์"

ไม่มีช่องโหว่ระดับรันโค้ดจากภายนอก และ repo สาธารณะไม่เคยมีไฟล์เกมหลุดเข้า history

---

## 1. สิ่งที่ยืนยันว่ายังดี (positive evidence)

| เรื่อง | หลักฐาน |
|---|---|
| `/src/build.js` ยังได้ 200 และคืน `BUILD = "mwky5ysx"` | `curl -s -o /dev/null -w "%{http_code}" .../src/build.js` → 200; เนื้อไฟล์ `export const BUILD = "mwky5ysx";` |
| `/src/sim.js`, `/src/ui.js` ยัง 404 เหมือนเดิม | curl → 404 ทั้งคู่ |
| `LOC.chunkChain` ทำงานกับ build ใหม่ | `chain = { boot: "/b/boot-T2NESBG4.js", app: "/b/app-QHENANCN.js", core: ["/b/c-UD2AOKCV.js","/b/c-PHZSWT5F.js","/b/c-VVBFTXUG.js"] }` (temp helper `loc-check.mjs`) |
| ตารางทั้ง 4 ยังอยู่ใน core chunk | `c-UD2AOKCV.js` มี `id:"mortal"`, `lifespan:75`, `id:"novice"`, `#8c918e`, `Common`, `woodSword`, `weapon` ครบ |
| ข้อมูลอีเว้นต์ยังอยู่ใน `app-QHENANCN.js` | `#choice-options` พบเฉพาะไฟล์นี้; `pending={kind:"major"` 5 จุด (offset แรก 1,376,089), `weight:.55` และ `gap:480` ยังมี |
| ไฟล์ที่ track มี 11 ไฟล์ ไม่มีของเกม | `git ls-files` |
| history ไม่เคยมี `src/`, `snapshots/`, `index.html`, `bundle/` | `git log --all --oneline -- src snapshots index.html bundle` → ว่าง |
| สคริปต์ที่ปล่อยตรงกับ local | raw `main` → `@version 3.3.1` = `VERSION` ในไฟล์ |
| `node --check` ผ่าน, เทส pass 24 / fail 0 / skip 1 | รัน 2026-11-18 บน Node v22.23.5 |

## 2. ปัญหาที่ควรแก้ก่อนงาน (ก)

### F1 — เทสที่ใช้ bundle จริงผูก build เก่าไว้ (สูง)

`tests/locate.test.mjs:11` ตั้ง `BUNDLE = ../bundle/mwkobenp/` และ `:174-183` อ่านชื่อไฟล์ตรงตัว `boot-3ENUIJBD.js`, `app-56NJKGMX.js`, `c-577XDD6D.js`

- หลังดึง build ใหม่ (`bundle/mwky5ysx/`) โฟลเดอร์เก่าไม่มี เทสจึง `t.skip` เงียบ ๆ (`haveBundle === false`)
- ผลคือชุดเทสเขียวทั้งที่ไม่มีอะไรตรวจ locator กับ build จริงเลย
- ถ้ามีคนดึง `mwkobenp` กลับมา เทสจะ fail เพราะ `chunkChain` คืนชื่อไฟล์ของ build นั้นตามที่อ่านจากไฟล์ (ถูกต้องตามดีไซน์) — เทสเขียนผิด ไม่ใช่โค้ดผิด

ข้อเสนอ: อ่าน BUILD จาก `bundle/*/` แบบไดนามิก (หาโฟลเดอร์ล่าสุดหรือรับ env `WOX_BUNDLE`) และ derive ชื่อไฟล์จาก `index.html`/boot/app เอง ไม่ hardcode

### F2 — ผลลัพธ์บางส่วนเขียนทับตารางที่อ่านได้แล้ว (กลาง-สูง)

`wox-editor.user.js:588` ตั้ง `TIERS = c.tiers;` ไม่มีเงื่อนไข ขณะที่ `REALMS`, `ITEMS`, `martialRanks` มี guard

- `startCore` ล้าง `corePromise` เมื่อ `coreLoaded(c)` เป็น false (`:609`) จึงมีการลองใหม่ได้
- รอบที่สองที่ล้มกลางทางคืน `tiers: null` → `renderCore` เขียนทับ `TIERS` ที่เคยใช้ได้ → ป้ายระดับทุกไอเทมถอยไปใช้ `TIER_LBL` ค่าคงที่ในสคริปต์
- ตรงกับ Minor ที่ HANDOFF §"Waiting on the user" ระบุไว้ แต่ยังไม่ถูกแก้

### F3 — `renderCore` throw ทำให้ retry ตายถาวร (กลาง)

`:607-614` เรียก `renderCore(c)` ใน `.then(onFulfilled)` โดยไม่มี try/catch ถ้า throw:

- เกิด unhandled rejection เงียบใน console
- บรรทัดถัดไป (`corePromise = null`) ไม่ถูกทำงาน → `corePromise` ค้างเป็น promise ที่ resolve แล้วแต่ผลไม่ครบ → `getCore()` คืนตัวเดิมตลอด กด "ตรวจอีกครั้ง" ไม่มีผล

จุดที่ throw ได้จริง: `:593` `a.slot.localeCompare(b.slot)` ถ้าไอเทมตัวใดไม่มี `slot` เป็นสตริง; `:633-634` ถ้า `bag` มีค่าที่ interpolate แล้วพัง

### F4 — แท็บอีเว้นต์และช่วยเลือกตายทั้งแท็บ แต่ตอบข้อความผิด (กลาง)

`SIM`, `MJ` ไม่มีใคร assign ทั้งไฟล์ (`grep -n "SIM *=[^=]"` เจอแค่บรรทัดประกาศ `:128`; `MJ` เจอศูนย์) `EVENTS` ถูก assign เฉพาะใน `buildEvents` ที่ return ก่อนถึงบรรทัดนั้น (`:483`)

ผลที่ผู้ใช้เห็น:
- พิมพ์ในช่องค้นหาอีเว้นต์ (`#hevq`, ผูกที่ `:505`) เรียก `drawEvents` → ล้าง `#hevn` เป็น "ไม่พบอีเว้นต์ที่ตรงกับคำค้น" ทับข้อความ "ยังไม่รองรับ" ที่ `renderCore` เพิ่งตั้งไว้ (`:597`)
- กดปุ่ม "เรียกอีเว้นต์นี้" ได้ toast "เลือกอีเว้นต์จากรายการก่อน" (`:692`)
- แท็บช่วยเลือกไม่มีทางให้คะแนนได้เลย (`:789` return ก่อนทุกอย่าง) แต่ยังมี checkbox/ตัวเลขที่บันทึกลง localStorage

โค้ดตายที่วัดได้: `WEIGHTS` ถึง `outScore` (`:723-749`), `fxScore`, `RAR_ORDER`/`evKey`/`evRar`/`evTitle` (ถูกใช้เฉพาะเส้นทางตาย), `GROUPS`/`GROUP_OF`/`buildEvents`/`drawEvents`, `placeBadges`/`aiBadges` ทำงานแต่ไม่มีข้อมูล

### F5 — ตัวกรองระดับไอเทมไม่ทำงานกับไอเทม tier สตริง (กลาง)

- bundle build นี้มี `tier:"common"`…`"legendary"` 341 จุด และ `tier:<number>` 207 จุด
- `LOC.tierIdx` (`:91-95`) คืน `null` ให้สตริงที่ไม่ใช่ตัวเลข
- ตัวกรอง `:460` แสดงไอเทม `null` ทุกตัวในทุกตัวกรอง และตัวเรียง `:463` จัดให้อยู่ท้าย
- `:593` เรียงด้วย `(a.tier ?? 0) - (b.tier ?? 0)` ตรง ๆ → `"epic" - "common"` เป็น `NaN` → comparator เป็นกลาง ลำดับจริงจึงเรียงตาม `slot` อย่างเดียว ทั้งที่คอมเมนต์บนบรรทัดบอกว่าเรียงตามระดับด้วย

### F6 — นโยบายตรวจค่าเข้าช่องไม่สม่ำเสมอ (กลาง)

`LOC.numOr` ถูกใช้กับขั้นพลัง/ชั้น/ปราณ/สายยุทธ์ (`:663-676`) แต่เงิน กรรม ชื่อเสียง และค่าพลังใช้ `+value || 0` (`:658`, `:668`, `:678-679`) → ล้างช่องแล้วกดบันทึก เขียน `0` ทับค่าเดิม ซึ่งขัดกับคอมเมนต์ของ `numOr` เอง (`:96` "เพื่อไม่ให้เขียน 0 ทับค่าเดิม")

พร้อมกันนั้น `setStat` (`:639`) เขียน `t.stats[k] = v` โดยไม่กัน `t.stats` เป็น undefined — ถ้า state ไม่มี `stats` ปุ่มจะ throw ใน click handler

### F7 — ตรวจระบบไม่ครอบฟิลด์ที่แผงเขียน (กลาง)

`STATE_KEYS` (`:845`) ไม่มี `martial` และ `pending` แต่แผงเขียน `t.martial.rank/stage/force` (`:665-667`) และเขียน `t.pending` (`:694`)

ผล: แผงขึ้น "✔ state ครบ" ได้ทั้งที่ `martial` หาย ซึ่งเป็นเงื่อนไขที่ทำให้ปุ่ม "บันทึกสายยุทธ์" ตอบ "ตัวละครนี้ไม่ได้อยู่สายยุทธ์" ผิด

### F8 — เอกสารตกรุ่นสามไฟล์ (สูงต่อ session ถัดไป)

| ไฟล์ | อ้าง | จริง |
|---|---|---|
| `AGENTS.md` ทั้งไฟล์ | import `/src/xxx.js`, "ประมาณ 500 บรรทัด", `sim.js:2814`, โครง `majors.js`/`rarity.js` | เกม bundle ไม่มี `/src/*.js`; สคริปต์ 904 บรรทัด; อีเว้นต์อยู่ใน `app-*.js` |
| `CLAUDE.md` §2 | "ประมาณ 500 บรรทัด" | 904 |
| `CLAUDE.md` §6 | สิ้นสุดที่ v3.3.0 "ยังไม่ได้ทดสอบในเกมจริง" | v3.3.1 ปล่อยแล้วและทดสอบผ่าน (HANDOFF) |
| `HANDOFF.md` "Verified facts" | offset 2,134,196 / 2,181,138 / app 3,221,219 / c-577 5.6 MB | build ใหม่ `mwky5ysx`: app 4.6 MB, core 4.7 MB, ชื่อไฟล์และ offset เปลี่ยนหมด |
| `docs/superpowers/notes/2026-11-17-events-spike.md` | offset ทั้งตาราง, ชื่อ chunk | ใช้กับ `mwkobenp` เท่านั้น; ตัวชี้วัดยังอยู่ (`#choice-options`, `weight:.55`, `gap:480`) แต่ offset ไม่ใช้ได้ |

## 3. Security

| # | เรื่อง | ระดับ | หลักฐาน / ข้อเสนอ |
|---|---|---|---|
| S1 | `@updateURL`/`@downloadURL` ชี้ `raw.githubusercontent.com/.../main/...` | กลาง | ใครมีสิทธิ์ push `main` ส่งโค้ดถึงผู้ใช้ทุกคนได้ทันที และสคริปต์รันด้วย `@grant none` ในบริบทหน้าเต็ม ข้อเสนอ: เปิด branch protection ที่บังคับ review; ถ้าต้องการเข้มกว่าเดิมใช้ tag/commit URL |
| S2 | ไม่มี `eval`, `new Function`, `document.write`, ไม่โหลดสคริปต์ภายนอก | ข้อมูล | grep ทั้งไฟล์ |
| S3 | `innerHTML` 9 จุด ทุก interpolation ผ่าน `esc` และอยู่ใน attribute แบบ double quote | ข้อมูล | `esc` (`:138`) ไม่ escape `'` แต่ไม่มี attribute เดี่ยวให้หลุด |
| S4 | `rarDot` ใส่สีจากตารางเกมลง `style` attribute ตรง ๆ (`:445`, `:634`) | ต่ำ | ทำได้แค่ทำให้สีเพี้ยน ไม่รันสคริปต์ |
| S5 | `dropStalePanels` ลบ element ที่ shadow root มีคำว่า "WoX Editor" (`:373-377`) | ต่ำ | อาจลบแผงของ userscript อื่นที่ใช้ชื่อคล้ายกัน |
| S6 | hook `JSON.stringify` ทั้งหน้า (`:132-135`) | ต่ำ | ถ้าเกมส่ง Proxy ที่ `has` trap throw จะทำให้เกมพัง; ครอบ try/catch ได้ |
| S7 | repo สาธารณะไม่เคยมีไฟล์เกม | ข้อมูล | `git ls-files`, `git log --all -- src snapshots index.html bundle` |

## 4. Robustness / Performance

| # | เรื่อง | ระดับ | หลักฐาน |
|---|---|---|---|
| R1 | `imported` เป็น all-or-nothing: chunk ใดล้ม 1 ตัว → ตรวจระบบ/ตรวจอัปเดตขึ้น "ยังไม่ได้อ่าน chunk หลัก" ทั้งที่ตารางบางตัวอ่านได้ | กลาง | `:549` ตั้งก่อน loop, `:556` ตั้ง false เมื่อมีตัวล้ม |
| R2 | retry ดาวน์โหลด index + boot + app ใหม่ทั้งก้อนด้วย `cache: 'no-store'` (app 4.6 MB + core 4.7 MB) | กลาง (ต้นทุนเครือข่าย) | `:530`, `:539-545` |
| R3 | `waitState` รอ 2 นาทีแล้วยอมแพ้เงียบ ๆ UI ยังขึ้น "รอข้อมูลเกม · เล่นในเกม 1 เดือน" ไม่บอกว่าหมดเวลา | ต่ำ | `:512-519`, `:645` |
| R4 | `fresh()` กันการเขียนทับเฉพาะเมื่อ focus อยู่ที่ `INPUT` ไม่รวม `SELECT` | ต่ำ | `:624` |
| R5 | `placeBadges` ผูกกับ `scroll` แบบ capture ไม่มี throttle; ตอนนี้ไม่มีป้ายจึงแค่ `querySelectorAll` ทุก event | ต่ำ | `:779`, `:765-778` |
| R6 | `aiObs` เฝ้า `document.body` แบบ `subtree` แต่ return ทันทีเมื่อไม่มี `SIM` | ต่ำ | `:831-840` |
| R7 | `setInterval` 1 วินาทีตลอดอายุหน้า เขียน `textContent` ทุก tick แม้ค่าไม่เปลี่ยน | ต่ำ | `:643-646` |
| R8 | `dropStalePanels` วน `document.body.children` (live collection) ขณะ `remove()` | ต่ำ | `:373-377` |

ไม่มีตัวเลข profiling; ข้อ R5-R8 เป็นการอ่าน code path ไม่ใช่การวัด

## 5. เทส

| # | เรื่อง | หลักฐาน |
|---|---|---|
| T1 | 25 เทส ครอบเฉพาะ `LOC` (pure) ไม่มีเทสของ `esc`, `norm`, ตัวอ่าน DOM, click handler, `renderCore` | `tests/locate.test.mjs` |
| T2 | เทสจริงข้อเดียวตกรุ่น (F1) | `:11`, `:174-183` |
| T3 | ไม่มีเทสกัน F2 (ผลบางส่วนห้ามทับตารางเดิม) และ F3 (throw ต้องไม่ทำให้ retry ตาย) | ไม่มีชื่อเทสที่เกี่ยวข้อง |
| T4 | ไม่มีเทสของ F6 (นโยบายค่าเข้าช่อง) หรือ F5 (tier สตริงในตัวกรอง) | — |

## 6. ต้องให้นายท่านตรวจในเกม

1. เปิดเกมด้วย build `mwky5ysx` แล้วดูแผงตรวจระบบ: ต้องขึ้น `✔` ครบ 4 ตาราง และ `✔ BUILD mwky5ysx`
2. เปิดกระเป๋า: ป้ายระดับของไอเทมชุด tier สตริงควรแสดงชื่อระดับ แต่ตัวกรอง `#hqr` จะกรองไอเทมเหล่านี้ไม่ได้ (F5)
3. ตรวจว่า `t.pending` และคลาส `r-*` ยังมีจริงใน build นี้ ก่อนเริ่มงาน (ก) — offset ใน spike ใช้ไม่ได้แล้ว ต้องยืนยันด้วยตา
4. ยืนยันว่าไม่มี error ใหม่ใน console หลังโหลด 3-5 วินาที

## 7. ข้อเสนอลำดับการแก้

**ควรแก้ก่อนเริ่มงาน (ก):**

1. F1 — ทำเทส bundle อ่าน build ปัจจุบันแบบไดนามิก (คืนความสามารถตรวจจริง)
2. F2 — ใส่เงื่อนไข `TIERS` และให้ `renderCore` ไม่ downgrade ตารางที่มีอยู่แล้ว
3. F3 — ครอบ `renderCore` ด้วย try/catch และปล่อย `corePromise` ให้ลองใหม่ได้
4. F8 — อัปเดต `AGENTS.md`, `CLAUDE.md` §2/§6, และทำเครื่องหมาย offset ใน HANDOFF/spike ว่าเป็นของ `mwkobenp`

**แก้รวมในงาน (ก):**

5. F4 — ลบโค้ดตาย `SIM`/`MJ`/`EVENTS` และข้อความที่ทำให้เข้าใจผิด แล้วแทนด้วยแท็บอีเว้นต์/ใบข้อมูลใหม่
6. F7 — เพิ่ม `martial`, `pending` (และคีย์ที่จะใช้ในงาน (ก)) ใน `STATE_KEYS` พร้อมตรวจ `#choice-options`
7. F5, F6 — รวมค่านโยบายตัวกรอง/ตรวจค่าเข้าเป็นที่เดียว

**ทีหลัง:**

8. R2 (แคช chunk ระหว่าง retry), R3 (บอกผู้ใช้ว่ารอหมดเวลา), R5-R7 (throttle/เลิกผูกเมื่อไม่มีข้อมูล)
9. S1 — เปิด branch protection ที่ `main`
10. S5 — ทำ `dropStalePanels` ให้แคบลง (ตรวจ element id/attribute ของเราเอง)

## 8. คำสั่งที่ใช้ตรวจ (รันซ้ำได้)

```
node --check wox-editor.user.js
node --test "tests/**/*.test.mjs"
node tools/fetch-bundle.mjs
curl -s https://way-of-xian.wox-game.workers.dev/src/build.js
curl -s -o /dev/null -w "%{http_code}\n" https://way-of-xian.wox-game.workers.dev/src/sim.js
git ls-files
git log --all --oneline -- src snapshots index.html bundle
grep -n "SIM *=[^=]\|MJ *=[^=]" wox-editor.user.js
grep -lc '#choice-options' bundle/mwky5ysx/b/*.js
```
