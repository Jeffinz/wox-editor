// ABOUTME: เทสของการเรียง/กรองไอเทมตามระดับ (tier) ที่ย้ายเข้ามาอยู่ใน LOC ตัวเดียว
// ABOUTME: ครอบไอเทมรูปร่างแปลก (tier สตริง, ไม่มี slot) เพื่อให้รายการไม่ throw และไม่ติด NaN
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LOC = require('../wox-editor.user.js');

test('tierIdx maps rarity strings to the game step with the same badge color', () => {
  assert.equal(LOC.tierIdx('common'), 0);
  assert.equal(LOC.tierIdx('uncommon'), 2);
  assert.equal(LOC.tierIdx('rare'), 3);
  assert.equal(LOC.tierIdx('epic'), 4);
  assert.equal(LOC.tierIdx('legendary'), 5);
  assert.equal(LOC.tierIdx('3'), 3);
  assert.equal(LOC.tierIdx(9), 5);
  assert.equal(LOC.tierIdx('weird'), null);
  assert.equal(LOC.tierIdx(undefined), 0); // คงพฤติกรรมเดิม: ไม่มี tier = สามัญ
});

test('itemOrder sorts high tier first, unknown last, then slot', () => {
  const xs = [{ tier: 'common', slot: 'b' }, { tier: 'weird', slot: 'a' }, { tier: 'epic', slot: 'z' }, { tier: 2, slot: 'a' }];
  assert.deepEqual(xs.sort(LOC.itemOrder).map((x) => x.tier), ['epic', 2, 'common', 'weird']);
});

test('itemOrder never throws on missing or odd slot', () => {
  assert.doesNotThrow(() => [{ tier: 1 }, { tier: 1, slot: 3 }, {}, null].sort(LOC.itemOrder));
  assert.equal(Number.isNaN(LOC.itemOrder({ tier: 'epic' }, { tier: 'common' })), false);
});

test('tierMatches: ไอเทมระดับชื่อกรองด้วย "r:" และไม่ปนกับตัวกรองขั้นของเกม', () => {
  assert.equal(LOC.tierMatches({ tier: 'epic' }, 'r:epic'), true);
  assert.equal(LOC.tierMatches({ tier: 'epic' }, 'r:rare'), false);
  assert.equal(LOC.tierMatches({ tier: 'epic' }, '4'), false); // ป้าย "หายากมาก" ต้องไม่ไปโผล่ใน "ขั้นสวรรค์"
  assert.equal(LOC.tierMatches({ tier: 4 }, 'r:epic'), false); // ไอเทมขั้น 4 ต้องไม่ไปโผล่ในตัวกรองระดับชื่อ
  assert.equal(LOC.tierMatches({ tier: 4 }, '4'), true);
  assert.equal(LOC.tierMatches({ tier: '3' }, '3'), true);
  assert.equal(LOC.tierMatches({ tier: 'weird' }, '3'), true); // รู้ระดับไม่ได้: เห็นทุกตัวกรอง
  assert.equal(LOC.tierMatches({ tier: 'weird' }, 'r:epic'), true);
  assert.equal(LOC.tierMatches({ tier: 5 }, 'all'), true);
});
