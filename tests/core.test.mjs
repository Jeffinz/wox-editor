// ABOUTME: เทสของตรรกะโหลดตารางเกมซ้ำ (keepTables) ที่กันตารางที่อ่านได้แล้วหายไปตอน retry
// ABOUTME: และของค่าที่แผงใช้ตัดสินใจว่าอ่านครบหรือยัง เพื่อให้กด "ตรวจอีกครั้ง" ทำงานถูก
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LOC = require('../wox-editor.user.js');

test('keepTables keeps a table the new round lost', () => {
  const a = { realms: [1], martialRanks: [2], tiers: [3], items: { x: 1 } };
  assert.deepEqual(LOC.keepTables(a, { realms: null, martialRanks: null, tiers: null, items: null }), a);
});

test('keepTables takes new values', () => {
  const out = LOC.keepTables({ tiers: [1] }, { tiers: [9] });
  assert.deepEqual(out.tiers, [9]);
  assert.equal(out.realms, null);
});

test('keepTables accepts null on both sides', () => {
  assert.deepEqual(LOC.keepTables(null, null), { realms: null, martialRanks: null, tiers: null, items: null });
});

test('EV_UNSUPPORTED is one message for every place that says it', () => {
  // เกมแบบ bundle รองรับแล้ว (v3.4.0): ข้อความนี้ใช้ตอน sim ใช้ไม่ได้เท่านั้น จึงไม่พูดว่า "ยังไม่รองรับ"
  assert.equal(LOC.EV_UNSUPPORTED, 'อีเว้นต์/ช่วยเลือก: sim ของเกมยังใช้ไม่ได้');
});

test('numOrKeep keeps the old value for empty or bad input', () => {
  assert.equal(LOC.numOrKeep('', 7), 7);
  assert.equal(LOC.numOrKeep('abc', 7), 7);
  assert.equal(LOC.numOrKeep('0', 7), 0);
  assert.equal(LOC.numOrKeep('12', 7), 12);
  assert.equal(LOC.numOrKeep('', undefined), 0);
});

test('bagCount: จำนวนในกระเป๋าต้องเป็นจำนวนเต็มไม่ติดลบ (B6)', () => {
  assert.equal(LOC.bagCount('3'), 3);
  assert.equal(LOC.bagCount('2.9'), 2); // เศษทศนิยมปัดลง: กระเป๋านับเป็นชิ้น
  assert.equal(LOC.bagCount('-4'), 0); // 0 = ลบไอเทม
  assert.equal(LOC.bagCount(''), null); // ว่าง = ไม่เขียนทับค่าเดิม
  assert.equal(LOC.bagCount('abc'), null);
  assert.equal(LOC.bagCount(7), 7);
});

test('pickOrKeep: ช่องเลือกที่ผู้ใช้ไม่ได้แตะและแสดงค่าคนละตัวกับ state ต้องคงค่าเดิม (A3)', () => {
  // เบราว์เซอร์เมินค่าที่ไม่มีในรายการแล้วโชว์ตัวเลือกแรก: ค่าที่อ่านได้จึงไม่ใช่ค่าของ state
  assert.equal(LOC.pickOrKeep(0, 4, false), 4);
  assert.equal(LOC.pickOrKeep(0, 4, true), 0); // ผู้ใช้เลือกเอง = เชื่อผู้ใช้
  assert.equal(LOC.pickOrKeep(4, 4, false), 4); // ตรงกัน = เขียนได้ตามปกติ
  assert.equal(LOC.pickOrKeep('4', 4, false), 4); // ค่าจาก <select> เป็นสตริง
  assert.equal(LOC.pickOrKeep(null, 4, false), 4);
  assert.equal(LOC.pickOrKeep(undefined, 0, false), 0);
  assert.equal(LOC.pickOrKeep(null, undefined, false), undefined);
});
