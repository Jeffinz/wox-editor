// ABOUTME: เทสของตัวค้นหาตารางจากรูปร่างค่า (LOC) ที่ใช้หาตารางข้อมูลใน build ที่ bundle แล้ว
// ABOUTME: รันด้วย `node --test "tests/**/*.test.mjs"` โหลด userscript แบบ CommonJS ผ่านทางออกก่อนแตะ DOM
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const LOC = require('../wox-editor.user.js');
// ไฟล์เกมที่ดาวน์โหลดมา (bundle/) ไม่ได้อยู่ใน repo; ถ้าไม่มีให้ข้ามเทสที่ใช้ไฟล์จริง
const BUNDLE = new URL('../bundle/mwkobenp/', import.meta.url);
const haveBundle = existsSync(new URL('index.html', BUNDLE));

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

test('tierOf อ่าน tier ตัวเลขจากตาราง TIERS ของเกม', () => {
  // ค่าต่างจาก TIER_LBL[0] โดยตั้งใจ: ถ้า tierOf ไม่สนใจ tiers เทสนี้ต้อง fail
  const tiers = [{ th: 'ทดสอบ', en: 'Test', color: '#123456' }];
  assert.deepEqual(LOC.tierOf({ tier: 0 }, tiers), ['ทดสอบ', '#123456']);
  assert.deepEqual(LOC.tierOf({ tier: 3 }, null), LOC.TIER_LBL[3]);
});

test('tierOf อ่าน tier แบบสตริงจาก RAR_LBL', () => {
  assert.deepEqual(LOC.tierOf({ tier: 'legendary' }, null), LOC.RAR_LBL.legendary);
  assert.deepEqual(LOC.tierOf({ tier: 'weird' }, null), LOC.TIER_LBL[0]);
});

test('tierOf คืนป้ายแรกเมื่อไม่มี tier', () => {
  assert.deepEqual(LOC.tierOf({}, null), LOC.TIER_LBL[0]);
  assert.deepEqual(LOC.tierOf(undefined, null), LOC.TIER_LBL[0]);
});

test('chunkChain reads the real mwkobenp chain', (t) => {
  if (!haveBundle) return t.skip('run node tools/fetch-bundle.mjs first');
  const index = readFileSync(new URL('index.html', BUNDLE), 'utf8');
  const boot = readFileSync(new URL('b/boot-3ENUIJBD.js', BUNDLE), 'utf8');
  const app = readFileSync(new URL('b/app-56NJKGMX.js', BUNDLE), 'utf8');
  const c = LOC.chunkChain(index, boot, app);
  assert.equal(c.boot, '/b/boot-3ENUIJBD.js');
  assert.equal(c.app, '/b/app-56NJKGMX.js');
  assert.ok(c.core.includes('/b/c-577XDD6D.js'), 'core ต้องมี chunk หลักของ app');
});

test('chunkChain returns no core for wiki entry', () => {
  const index = '<script type="module" src="b/boot-x.js"></script>';
  const boot = 'const m = await import("./wiki-X.js");';
  const c = LOC.chunkChain(index, boot, '');
  assert.equal(c.app, null);
  assert.deepEqual(c.core, []);
});
