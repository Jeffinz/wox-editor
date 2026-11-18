// ABOUTME: เทสตัวอ่านสรุปผลของ node --test ที่ tools/release.mjs ใช้กันไม่ให้ปล่อยเวอร์ชันตอนเทส skip
// ABOUTME: รันด้วย `node --test "tests/**/*.test.mjs"`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skippedCount } from '../tools/test-summary.mjs';

test('skippedCount: ไม่มี skip คืน 0', () => {
  assert.equal(skippedCount('# tests 58\n# pass 58\n# skipped 0\n'), 0);
});

test('skippedCount: อ่านจำนวนที่ skip ได้', () => {
  assert.equal(skippedCount('# pass 53\n# skipped 5\n# todo 0\n'), 5);
});

test('skippedCount: ไม่มีบรรทัดสรุปเลยต้องไม่ผ่าน (คืน -1)', () => {
  assert.equal(skippedCount('ok 1 - something\nok 2 - more'), -1);
  assert.equal(skippedCount(''), -1);
  assert.equal(skippedCount(undefined), -1);
});

test('skippedCount: ไม่นับบรรทัดของ subtest ที่ขึ้นต้นด้วย # Subtest', () => {
  assert.equal(skippedCount('# Subtest: x\n# skipped 2\n'), 2);
});

test('skippedCount: ใช้บรรทัดสรุปตัวสุดท้าย (summary อยู่ท้าย output)', () => {
  assert.equal(skippedCount('# skipped 0\nok 1 - log\n# skipped 3\n'), 3);
});

test('skippedCount: บรรทัดที่เยื้อง (ของ subtest) ไม่นับ', () => {
  assert.equal(skippedCount('    # skipped 9\n# skipped 0\n'), 0);
});
