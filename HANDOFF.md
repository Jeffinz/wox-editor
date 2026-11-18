# Handoff: v3.4.5 ตรวจบนเว็บแล้ว — คิว T2 ปิด

Written: 2026-11-18 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน กติกาอยู่ในนั้น: ตอบภาษาไทยสั้น ๆ, รัน `node --check`, bump `@version` + `VERSION` พร้อมกัน, ปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7)

## Where things stand

- ปล่อยแล้วบน `main`: v3.4.3 `bfc2796`, v3.4.4 `41faba2`, v3.4.5 `f87864e`; raw URL เห็น `@version 3.4.5`
- เทส 72/72 skip 0 — `WOX_BUNDLE="C:/Users/PC/Desktop/Wox UI/way-of-xian.wox-game.workers.dev/bundle/mwlnu1rf" node --test "tests/**/*.test.mjs"` (ไม่ตั้ง env จะ skip 5 ตัว และ `release.mjs` จะไม่ปล่อย)
- นายท่านตรวจบนเว็บแล้ว v3.4.4 + v3.4.5 ผ่าน: อีเว้นต์ที่ตัวเลือกมีแต่ `act` ขึ้นคะแนนและกดอัตโนมัติได้, อีเว้นต์ที่ทุกตัวเลือกคะแนนเท่ากันไม่กดและขึ้นข้อความบอก

## สิ่งที่เปลี่ยนใน v3.4.4–v3.4.5

| เวอร์ชัน | สิ่งที่ทำ |
|---|---|
| v3.4.4 (T2) | `fxScore`/`outScore` ย้ายเข้า `LOC` (รับ `statKeys` เป็นพารามิเตอร์เพราะ `STATS` อยู่นอก IIFE); `act` ได้ 0 หรือ −200 เมื่อเข้า `/die|death|kill|dead|perish/i`; `LOC.hasResult` ให้ตัวเลือกที่มี `fx` หรือ `act` นับว่าประเมินได้ |
| v3.4.5 | `LOC.allTie`: คะแนนเท่ากันหมด (2 ตัวขึ้นไป) → `best = null`, ไม่ติดดาว, ไม่กดอัตโนมัติ, ขึ้น "คะแนนเท่ากันทั้งหมด — ไม่กดอัตโนมัติ" |

เทสใหม่: `tests/scoring.test.mjs` (5 ตัว)

## พฤติกรรมที่ตั้งใจไว้ (อย่าแก้โดยไม่ถาม)

- อีเว้นต์ที่ตัวเลือกหนึ่งประเมินได้ อีกตัว blind: ขึ้น `★ แนะนำ` ให้ตัวที่ประเมินได้ แต่ **ไม่กด** เพราะประตูต้องการ `scored.length === rows.length` — นายท่านสั่งว่ากดเองได้ (2026-11-18)
- คะแนนเท่ากันหมด: ไม่กด
- `act` ไม่มีน้ำหนักบวก เพราะรูปขึ้นกับแต่ละอีเว้นต์ ไม่มีตัวประเมินกลางให้ดูเครื่องหมาย

## Finding ที่ยังไม่แก้ (คิวใน `docs/superpowers/notes/2026-11-18-audit-v342.md`)

- C3, C4, C7-C14, S1 (`@updateURL` ชี้ `main`), T3/T5 (ไม่มีเทสกันคีย์ sim สามที่ และ `STATE_OPTIONAL`)
- T2 ปิดแล้ว

## หมายเหตุเครื่องมือ

- `node --test` พิมพ์สรุปที่ stdout; `release.mjs` อ่าน `# skipped` ผ่าน `tools/test-summary.mjs` แล้วไม่ปล่อยถ้าไม่ใช่ 0
- bump + release ทำบน `main` เท่านั้น (`protect-main` กัน force-push จึงอเมนด์ commit ที่ปล่อยแล้วไม่ได้)
- commit message ของ release ส่งผ่านอาร์กิวเมนต์ได้หลายบรรทัด ใช้ใส่ `Co-Authored-By`
