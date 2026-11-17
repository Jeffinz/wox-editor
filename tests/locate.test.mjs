// ABOUTME: เทสของตัวค้นหาตารางจากรูปร่างค่า (LOC) ที่ใช้หาตารางข้อมูลใน build ที่ bundle แล้ว
// ABOUTME: รันด้วย `node --test "tests/**/*.test.mjs"` โหลด userscript แบบ CommonJS ผ่านทางออกก่อนแตะ DOM
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LOC = require('../wox-editor.user.js');

test('pick finds the one realms export', () => {
  const ns = { q: [{ id: 'mortal', lifespan: 75, layers: 0 }], x: [1, 2] };
  assert.equal(LOC.pick(ns, LOC.IS.realms), ns.q);
});

test('pick returns null when nothing matches', () => {
  const ns = { a: [], b: {} };
  assert.equal(LOC.pick(ns, LOC.IS.realms), null);
});

test('pick returns null when two match', () => {
  const ns = {
    a: [{ id: 'mortal', lifespan: 75, layers: 0 }],
    b: [{ id: 'mortal', lifespan: 90, layers: 0 }],
  };
  assert.equal(LOC.pick(ns, LOC.IS.realms), null);
});

test('pick skips throwing getters', () => {
  const ns = { q: [{ id: 'mortal', lifespan: 75, layers: 0 }] };
  Object.defineProperty(ns, 'z', { get() { throw new Error('x'); }, enumerable: true });
  assert.equal(LOC.pick(ns, LOC.IS.realms), ns.q);
});

test('items matches non-enumerable woodSword', () => {
  const ns = {};
  Object.defineProperty(ns, 'woodSword', {
    value: { id: 'woodSword', slot: 'weapon' },
    enumerable: false,
  });
  assert.equal(LOC.IS.items(ns), true);
});

test('tiers and martialRanks match their first rows', () => {
  const tiers = [{ th: 'สามัญ', en: 'Common', color: '#8c918e' }];
  const ranks = [{ id: 'novice', th: 'ผู้ฝึกยุทธ์', years: 0 }];
  assert.equal(LOC.IS.tiers(tiers), true);
  assert.equal(LOC.IS.martialRanks(ranks), true);
  assert.equal(LOC.IS.tiers(ranks), false);
  assert.equal(LOC.IS.martialRanks(tiers), false);
});
