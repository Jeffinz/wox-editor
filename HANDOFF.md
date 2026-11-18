# Handoff: v3.4.3 ปล่อยแล้ว — รอนายท่านชาโดว์ตรวจในเกม

Written: 2026-11-18 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ก่อน กติกาอยู่ในนั้น: ตอบภาษาไทยสั้น ๆ, รัน `node --check`, bump `@version` + `VERSION` พร้อมกัน, ปล่อยด้วย `tools/release.mjs`, **ห้ามแยก subagent** (§7)

## Goal

ปิด finding audit 2026-11-18 ห้าข้อ (T1, C1, C5, C2, C6) แล้วปล่อย v3.4.3 — ผล audit อยู่ที่ `docs/superpowers/notes/2026-11-18-audit-v342.md`, แผนที่รันอยู่ที่ `docs/superpowers/plans/2026-11-18-audit-fixes-v342.md`

งานถือว่า "เสร็จ" เมื่อ:
- v3.4.3 ขึ้น `main` แล้ว raw URL เห็น `@version 3.4.3`
- เทส `fail 0, skipped 0` ✅ (67/67)
- นายท่านตรวจในเกมจริงผ่านทุกข้อใน §"รอตรวจในเกม" ✅ ← เหลือข้อนี้

## Where things stand

- branch `fix/audit-v342` merge เข้า `main` แบบ ff แล้ว, worktree `.worktrees/audit-v342` ถูกลบแล้ว
- ยังไม่ได้ทดสอบ v3.4.3 ในเกมจริง

## Changes made (v3.4.2 → v3.4.3)

| finding | สิ่งที่แก้ | ไฟล์ |
|---|---|---|
| T1 | `release.mjs` อ่านบรรทัด `# skipped` แล้วไม่ปล่อยถ้าไม่ใช่ 0 (fail ปิดเมื่อไม่พบบรรทัดสรุป) | `tools/test-summary.mjs` ใหม่, `tools/release.mjs`, `tests/release.test.mjs` ใหม่ |
| C1 | แผงรีเฟรชเองทุก 2 วินาที; ข้ามรอบเมื่อ `dirty` (ผู้ใช้พิมพ์ในช่องที่ `LOC.isStateField` รับแล้วยังไม่บันทึก); เลิกใช้ `root.activeElement` | `wox-editor.user.js` |
| C5 | จำนวนในกระเป๋า `value="${esc(n)}"` | `wox-editor.user.js` |
| C2 | ช่วยเลือกจำคีย์ที่รวมสถานะ sim (`LOC.aiKey`) — ไม่สแกนซ้ำการ์ดที่ sim ไม่รู้จัก, สแกนใหม่เมื่อ sim เพิ่งมา | `wox-editor.user.js` |
| C6 | ตัวกรอง `#hqr` อ่านชื่อขั้นจาก `TIERS` (`LOC.tierLabels`) คงค่าเดิมที่เลือกไว้ | `wox-editor.user.js` |

เทส 67/67 skip 0 (58 เดิม + `tests/release.test.mjs` 6 + `isStateField` 1 + `aiKey` 1 + `tierLabels` 1)

## ข้อจำกัดที่ยอมรับ

- แก้ค่าในช่องแล้ว **ไม่กดบันทึก** แผงจะหยุดรีเฟรชจนกว่าจะกดบันทึกปุ่มใดก็ได้ (`fresh(true)` ล้าง `dirty`)

## รอตรวจในเกม (build `mwlnu1rf`)

1. เปิดแผง เล่นในเกม 1 เดือน: เงิน/ค่าพลังในแผงต้องขยับตามเกมเองภายใน ~2 วินาที
2. พิมพ์ตัวเลขในช่องจำนวนในกระเป๋า (และช่องเงิน) แล้วคลิกออกไปที่เกม รอ 3-4 วินาที: ค่าต้องไม่ถูกล้าง; กด "ตั้ง" แล้วแผงต้องกลับมารีเฟรชตามเกม
2b. คลิกช่องค้นหาไอเทมค้างไว้ แล้วเล่นในเกม 1 เดือน: เงินในแผงยังต้องขยับตามเกม
3. แท็บกระเป๋า: ชื่อในตัวกรอง "ระดับความหายาก" ต้องตรงกับป้ายในรายการไอเทม
4. แท็บช่วยเลือก: การ์ดอีเว้นต์ปกติยังขึ้นคะแนนและกดอัตโนมัติได้; ไม่มีอาการกระตุกตอนเปิดการ์ด
5. แผงตรวจระบบ: `✔ sim`, `✔` ตารางครบ 4, `✔ BUILD mwlnu1rf`

นายท่านต้องอัปเดตสคริปต์ใน Tampermonkey (หรือรอ auto-update) แล้วรีโหลดหน้าเกมเอง

## Finding ที่ยังไม่แก้ (คิวใน audit note)

- C3, C4, C7-C14 (โค้ด) — D1 แก้แล้วในรอบนี้ (เลขบรรทัด CLAUDE.md §2), D2 แก้แล้ว (ระบุว่าเป็น snapshot เก่า)
- S1 `@updateURL` ชี้ `main`: ใคร push `main` ได้ก็ส่งโค้ดถึงผู้ใช้ทุกคน — ruleset `protect-main` id `27517988` กันได้แค่ force-push/ลบ
- T2 ตรรกะให้คะแนนช่วยเลือก (`WEIGHTS`, `fxScore`, `outScore`) ยังอยู่นอก `LOC` จึงไม่มีเทส — เป็นชิ้นถัดไปถ้าจะให้คะแนน `act`
- T3/T5 ไม่มีเทสกันคีย์ sim สามที่ (C9) และกัน `STATE_OPTIONAL` (C7) หลุดจากกัน

## หมายเหตุเครื่องมือ

- เทส: `WOX_BUNDLE="C:/Users/PC/Desktop/Wox UI/way-of-xian.wox-game.workers.dev/bundle/mwlnu1rf" node --test "tests/**/*.test.mjs"` — ถ้าไม่ตั้ง จะ skip 5 ตัว และตอนนี้ `release.mjs` จะไม่ยอมปล่อย
- branch เก่า `audit/2026-11-18` (merged ครบแล้ว) นายท่านสั่งให้ลบ **หลัง** v3.4.3 ตรวจผ่าน — ยังไม่ได้ลบ

## Files and places

- `…\wox-editor.user.js`: v3.4.3, 1171 บรรทัด
- `…\tools\test-summary.mjs`: `skippedCount` (คืน `-1` เมื่อไม่พบบรรทัดสรุป)
- `…\tests\`: 67 เทส
- `…\docs\superpowers\notes\2026-11-18-audit-v342.md`: ผล audit เต็ม
- `…\bundle\mwlnu1rf\`: build ปัจจุบัน (gitignore)
