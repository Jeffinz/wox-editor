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

test('tierIdx clamps below at 0 so a negative tier cannot outrank legendary', () => {
  assert.equal(LOC.tierIdx(-1), 0);
  assert.equal(LOC.tierIdx(-5), 0);
  // ไอเทม tier ติดลบต้องไม่ถูกเรียงขึ้นเหนือขั้นสูงสุด และต้องไม่หลุดตัวกรองทั้งหมด
  const xs = [{ tier: -1, slot: 'b' }, { tier: 5, slot: 'a' }];
  assert.deepEqual(xs.sort(LOC.itemOrder).map((x) => x.tier), [5, -1]);
  assert.equal(LOC.tierMatches({ tier: -1 }, '0'), true);
});

test('itemOrder sorts high tier first, unknown last, then slot', () => {
  const xs = [{ tier: 'common', slot: 'b' }, { tier: 'weird', slot: 'a' }, { tier: 'epic', slot: 'z' }, { tier: 2, slot: 'a' }];
  assert.deepEqual(xs.sort(LOC.itemOrder).map((x) => x.tier), ['epic', 2, 'common', 'weird']);
});

test('itemOrder never throws on missing or odd slot', () => {
  assert.doesNotThrow(() => [{ tier: 1 }, { tier: 1, slot: 3 }, {}, null].sort(LOC.itemOrder));
  assert.equal(Number.isNaN(LOC.itemOrder({ tier: 'epic' }, { tier: 'common' })), false);
});

test('tierMatches: ไอเทมระดับชื่อกรองด้วยขั้นของเกมที่มีสีเดียวกัน', () => {
  assert.equal(LOC.tierMatches({ tier: 'epic' }, '4'), true); // ม่วง = ขั้นสวรรค์
  assert.equal(LOC.tierMatches({ tier: 'legendary' }, '4'), false);
  assert.equal(LOC.tierMatches({ tier: 'legendary' }, '5'), true);
  assert.equal(LOC.tierMatches({ tier: 4 }, '4'), true);
  assert.equal(LOC.tierMatches({ tier: 4 }, '5'), false);
  assert.equal(LOC.tierMatches({ tier: '3' }, '3'), true);
  assert.equal(LOC.tierMatches({ tier: 'weird' }, '3'), true); // รู้ระดับไม่ได้: เห็นทุกตัวกรอง
  assert.equal(LOC.tierMatches({ tier: 'weird' }, 'all'), true);
  assert.equal(LOC.tierMatches({ tier: 5 }, 'all'), true);
});

test('tierLabels: ใช้ชื่อขั้นของเกมเมื่อมี และถอยไปใช้ค่าคงที่เมื่อไม่มี', () => {
  assert.deepEqual(LOC.tierLabels(null), LOC.TIER_LBL.map(([n]) => n));
  assert.deepEqual(LOC.tierLabels([]), LOC.TIER_LBL.map(([n]) => n));
  const game = [{ th: 'สามัญ' }, { th: 'ขั้นมนุษย์' }, { th: 'ขั้นปฐพี' }];
  assert.deepEqual(LOC.tierLabels(game), ['สามัญ', 'ขั้นมนุษย์', 'ขั้นปฐพี']);
  assert.deepEqual(LOC.tierLabels([{ th: 'ก' }, { color: '#000' }, { th: 'ค' }]), ['ก', LOC.TIER_LBL[1][0], 'ค']);
});
