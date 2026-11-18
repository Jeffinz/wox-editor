# สเปค: แท็บอีเว้นต์และช่วยเลือกสำหรับเกมแบบ bundle — v3.4.0

วันที่ 2026-11-18 · ที่มา: `docs/superpowers/notes/2026-11-17-events-spike.md` §6-7 · นายท่านชาโดว์เลือกทาง "แก้ app ด้วย import map" และยกเลิกข้อห้าม import `app-*.js` ของแผน bundle-port แล้ว

## ปัญหา

เกมแบบ bundle เก็บ sim (ตารางอีเว้นต์, ข้อความ, โอกาส, ความหายาก) เป็นตัวแปรภายในโมดูล `app-*.js` ไม่มี export และไม่แขวนไว้บน `window` แท็บอีเว้นต์กับช่วยเลือกจึงขึ้นแค่ `EV_UNSUPPORTED` ตั้งแต่ v3.3.0

## ทางแก้

แทนที่ `app-*.js` ตัวเดียวที่เกมโหลด ด้วยสำเนาที่เติมบรรทัดเปิด sim ไว้ท้ายไฟล์ ใช้ import map จึงไม่ต้องแตะ boot หรือ chunk อื่น spike §7 พิสูจน์ใน Chrome แล้ว (จำลองด้วย `document.write`)

### 1. ติดตั้ง shim (ตอน `document-start`)

1. ทำเฉพาะหน้าเกม (ไม่ใช่ wiki) และเฉพาะเมื่อ `document.documentElement` ยังไม่มี `<script type="module">` ของ boot ทำงาน
2. sync XHR `location.origin + '/'` หาชื่อ `b/boot-*.js` แล้ว sync XHR boot หาชื่อ `app-*.js` จาก `import("./app-XXXX.js")` (สองไฟล์เล็ก 16 KB / 10 KB) — ถ้าขั้นไหนไม่ได้ ไม่ติดตั้ง เกมโหลดตามปกติ
3. สร้าง shim (blob) แล้วแทรก `<script type="importmap">{"imports":{"<origin>/b/app-XXXX.js":"<shim>"}}</script>` ไว้หน้าสุดของ `document.documentElement`
4. shim:
   - `fetch` ข้อความ app
   - `LOC.simNames(src)` หาชื่อ 6 ตัวจากรูปร่าง (ตาราง spike §7) ได้ไม่ครบ → ไม่แก้
   - `LOC.absolutize(src, base)` เขียน specifier สัมพัทธ์ `from"./` `import"./` `import("./` เป็น URL เต็ม
   - `LOC.simPatch(names)` สร้างบรรทัด `;window.__woxSim={…};` ต่อท้าย
   - `import()` blob ที่แก้แล้ว
   - **ทางถอย**: หาชื่อไม่ครบ หรือ import blob throw → `import('<origin>/b/app-XXXX.js?woxed=raw')` (URL ไม่ตรงกับที่ map ไว้ จึงได้ app ตัวจริง) และตั้ง `window.__woxSimError = '<เหตุผล>'` เกมต้องเล่นได้เสมอ
5. สคริปต์รอ `window.__woxSim` (poll ทุก 500 ms นานสุด 60 วินาทีหลังได้ state) แล้วตั้ง `SIM`

### 2. `SIM` ที่สคริปต์ใช้

ห่อ `__woxSim` เป็นชุดฟังก์ชันชื่อเดิมที่โค้ดเดิมเรียก เพื่อให้แท็บอีเว้นต์/ช่วยเลือกเดิมทำงานโดยแก้น้อยที่สุด:

| เดิม | ใหม่ |
|---|---|
| `SIM.majorEvent(id)` | `majorEvent(id)` |
| `SIM.majorTexts(t)` | `majorTexts(t)` |
| `SIM.statOdds(t, chance, ev)` | `statOdds(t, chance, ev, opt)` (เพิ่ม `opt` ตามที่เกมเรียก) |
| `SIM.rarityFor(ev)` | `rarityFor(ev)` |
| `SIM.allMajors()` | `[...events.values()]` |
| `SIM.eventsForAudit()` | ไม่มี → ตัดตัวกรอง "สาย" (`#hevg`, `GROUPS`, `GROUP_OF`) ออก เพราะไม่มีข้อมูลกลุ่ม |
| เรียกอีเว้นต์: `options: ev.options.map(o => o.id)` | `options: openOptions(t, ev)` (ตัวเลือกที่เปิดได้จริงตามเงื่อนไขของเกม) |

`MJ` (`LIFE_PATH`) ตัดออก ถ้า `lifePath` ไม่อยู่ใน `events` ก็ไม่แสดง (ตรวจตอนลงมือ)

### 3. ทางถอยในแผง (เมื่อไม่มี `SIM`)

แท็บอีเว้นต์ขึ้น `EV_UNSUPPORTED` + เหตุผลจาก `__woxSimError` เหมือนเดิม ไม่ทำแท็บการ์ดแบบ (ก) ในงานนี้ — ถ้าภายหลังตัวหาชื่อพังบ่อย ค่อยทำแยก

### 4. ตรวจระบบ / ตรวจอัปเดต

- แผงตรวจระบบเพิ่มบรรทัด sim: `✔ sim (6 ฟังก์ชัน, อีเว้นต์ N)` / `✖ sim: <เหตุผล>` / `– sim: ยังรอ` แทนบรรทัด `EV_UNSUPPORTED`
- `woxed.manifest.found` เพิ่ม `sim` ให้ `LOC.diffManifest` แจ้งเมื่อ build ใหม่ทำให้หา sim ไม่เจอ

## ตรรกะใน `LOC` (pure, ห้าม throw, มีเทส)

- `simNames(src)` → `{majorTexts, majorEvent, events, rarityFor, openOptions, statOdds}` หรือ `null` ถ้าไม่ครบ หรือชื่อไหนประกาศ ≠ 1 ครั้ง; เทสกับไฟล์จริงใน `bundle/` (เลือก build ล่าสุด, skip 0)
- `absolutize(src, base)` → `{src, n}`; เทสทั้ง 3 รูป และไม่แตะ `"./` ที่ไม่ใช่ specifier
- `simPatch(names)` → สตริงบรรทัดต่อท้าย
- `appFromBoot(bootSrc)`, `bootFromIndex(html)` → ชื่อไฟล์หรือ `null`
- เทส integration: `absolutize` + `simPatch` กับ app จริงแล้ว `node --check` ผ่าน (ไฟล์เป็น ES module)

## นอกขอบเขต

แท็บการ์ดแบบ (ก), การ์ดชนิดอื่นที่ไม่ใช่ `major`, ปรับสูตรคะแนนช่วยเลือก (ใช้สูตรเดิม), แตะอันดับ/ตลาด

## ความเสี่ยง

- ตัวหาชื่อพังเมื่อโค้ดรอบๆ เปลี่ยน → ทางถอยทำให้เกมเล่นได้ แต่อีเว้นต์/ช่วยเลือกหาย จนกว่าจะแก้ regex
- sync XHR ตอนเปิดหน้า +2 request เล็ก, shim +~1.7 วินาทีตอนเปิดเกม
- Tampermonkey อาจ inject หลัง parser เจอ boot แล้ว → import map ไม่มีผล (เกมโหลดปกติ ไม่มี sim) Task แรกต้องพิสูจน์ใน Tampermonkey จริงก่อนเขียนส่วนอื่น

## ตรวจว่าเสร็จ

- เทสใหม่ผ่าน, ทั้งชุด skip 0, `node --check` ผ่าน
- ในเกมจริงผ่าน Tampermonkey (นายท่านตรวจ):
  1. เกมเปิดและเล่นได้ปกติ ตรวจระบบขึ้น `✔ sim`
  2. แท็บอีเว้นต์มีรายการ กรองระดับ/ค้นหาได้ เรียกอีเว้นต์แล้วการ์ดขึ้น
  3. ช่วยเลือกแสดงคะแนน + ป้ายบนการ์ด, กดอัตโนมัติทำงานเมื่อเปิด
  4. เกมไม่กระตุก ปุ่มบนการ์ดกดครั้งเดียวติด
