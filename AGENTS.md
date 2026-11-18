# AGENTS.md

ไฟล์นี้เป็นทางเข้าเท่านั้น **แหล่งความจริงของโปรเจ็คคือ `CLAUDE.md`** อ่านไฟล์นั้นก่อนลงมือ

## เป้าหมายโปรเจ็ค
- userscript Tampermonkey `wox-editor.user.js` แก้สถานะเกม Way of Xian (โหมดเล่นคนเดียว ไม่แตะอันดับหรือตลาดผู้เล่น)
- ตอบเป็นภาษาไทย เน้นสั้น เรียกผู้ใช้ว่า "นายท่านชาโดว์"

## อ่านต่อ
- `CLAUDE.md` §1-§8: ที่ตั้งไฟล์, วิธีที่สคริปต์อ่านข้อมูลจากเกมแบบ bundle, โครงสร้างข้อมูลเกม, บทเรียน, สถานะปัจจุบัน, กติกาการทำงาน (รวมกฎห้ามแยก subagent), วิธีรับมือเมื่อเกมอัปเดต
- `tools/release.mjs "ข้อความ"`: ปล่อยเวอร์ชัน (ตรวจ `@version` = `VERSION`, `node --check`, commit, push `main`; ลอง `--dry-run` ก่อน)
- `tools/fetch-bundle.mjs`: ดึง JS ของเกมปัจจุบันลง `bundle/<BUILD>/` สำหรับเทสที่อ่านไฟล์จริง
- เทส: `node --test "tests/**/*.test.mjs"` ต้องได้ skip 0 (ถ้า skip ให้รัน fetch-bundle ก่อน)

repo สาธารณะ: https://github.com/Jeffinz/wox-editor
