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
  assert.equal(LOC.EV_UNSUPPORTED, 'อีเว้นต์/ช่วยเลือก: ยังไม่รองรับเกมแบบ bundle');
});

test('numOrKeep keeps the old value for empty or bad input', () => {
  assert.equal(LOC.numOrKeep('', 7), 7);
  assert.equal(LOC.numOrKeep('abc', 7), 7);
  assert.equal(LOC.numOrKeep('0', 7), 0);
  assert.equal(LOC.numOrKeep('12', 7), 12);
  assert.equal(LOC.numOrKeep('', undefined), 0);
});
