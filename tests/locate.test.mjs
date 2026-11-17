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

test('items อ่าน woodSword ที่เป็น getter ได้ และไม่ throw เมื่อ getter พัง', () => {
  const ns = {};
  Object.defineProperty(ns, 'woodSword', { get: () => ({ id: 'woodSword', slot: 'weapon' }), enumerable: true });
  assert.equal(LOC.IS.items(ns), true);
  const bad = {};
  Object.defineProperty(bad, 'woodSword', { get() { throw new Error('x'); }, enumerable: true });
  assert.equal(LOC.IS.items(bad), false);
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

test('tierOf อ่าน tier ที่เป็นสตริงตัวเลขเหมือนตัวเลข', () => {
  assert.deepEqual(LOC.tierOf({ tier: '3' }, null), LOC.TIER_LBL[3]);
  assert.deepEqual(LOC.tierOf({ tier: '0' }, [{ th: 'ทดสอบ', en: 'Test', color: '#123456' }]), ['ทดสอบ', '#123456']);
});

test('tierIdx: ตัวเลขคงเดิม, สตริงตัวเลขนับเป็นตัวเลข, ระดับที่จับคู่ไม่ได้ได้ null', () => {
  assert.equal(LOC.tierIdx(0), 0);
  assert.equal(LOC.tierIdx(9), 5);
  assert.equal(LOC.tierIdx('3'), 3);
  assert.equal(LOC.tierIdx(undefined), 0);
  assert.equal(LOC.tierIdx(null), 0);
  assert.equal(LOC.tierIdx('legendary'), null);
});

test('numOr: ค่าว่างหรือไม่ใช่จำนวนจริงคืน null', () => {
  assert.equal(LOC.numOr('12'), 12);
  assert.equal(LOC.numOr(3), 3);
  assert.equal(LOC.numOr('0'), 0);
  assert.equal(LOC.numOr(''), null);
  assert.equal(LOC.numOr(null), null);
  assert.equal(LOC.numOr(undefined), null);
  assert.equal(LOC.numOr('abc'), null);
  assert.equal(LOC.numOr(NaN), null);
  assert.equal(LOC.numOr(Infinity), null);
});

test('tierOf คืนป้ายแรกเมื่อไม่มี tier', () => {
  assert.deepEqual(LOC.tierOf({}, null), LOC.TIER_LBL[0]);
  assert.deepEqual(LOC.tierOf(undefined, null), LOC.TIER_LBL[0]);
});

test('coreLoaded: นับว่าอ่านแล้วเมื่อ import chunk สำเร็จทุกตัว', () => {
  assert.equal(LOC.coreLoaded({ core: ['/b/c-a.js'], imported: true }), true);
  assert.equal(LOC.coreLoaded({ core: [], imported: true }), false);
  // import ล้ม = ยังไม่ได้อ่าน ห้ามให้ตรวจระบบ/ตรวจอัปเดตลงว่าตารางหาย
  assert.equal(LOC.coreLoaded({ core: ['/b/c-a.js'], imported: false }), false);
  assert.equal(LOC.coreLoaded({ core: ['/b/c-a.js'] }), false);
  assert.equal(LOC.coreLoaded(null), false);
  assert.equal(LOC.coreLoaded({}), false);
});

test('chunkUrl ใช้ path ของ chunk เอง ไม่ hardcode โฟลเดอร์ /b/', () => {
  assert.equal(LOC.chunkUrl('/b/c-a.js', 'https://game.test'), 'https://game.test/b/c-a.js');
  assert.equal(LOC.chunkUrl('/assets/js/c-b.js', 'https://game.test'), 'https://game.test/assets/js/c-b.js');
});

// manifest ที่ checkUpdate เก็บ: { build, chain: { boot, app, core }, found: { realms, martialRanks, tiers, items } }
const MAN = (build, found) => ({ build, chain: { boot: '/b/boot-a.js', app: '/b/app-a.js', core: ['/b/c-a.js'] }, found });

test('diffManifest: prev เป็น null ถือว่าไม่มีฐาน', () => {
  assert.deepEqual(LOC.diffManifest(null, MAN('b', { items: false })), { changed: false, lost: [] });
});

test('diffManifest: build ต่างกัน → changed', () => {
  const prev = MAN('a', { realms: true, martialRanks: true, tiers: true, items: true });
  const cur = MAN('b', { realms: true, martialRanks: true, tiers: true, items: true });
  assert.deepEqual(LOC.diffManifest(prev, cur), { changed: true, lost: [] });
});

test('diffManifest: build เดิมและตารางครบ → ไม่เปลี่ยน', () => {
  const prev = MAN('a', { realms: true, items: true });
  const cur = MAN('a', { realms: true, items: true });
  assert.deepEqual(LOC.diffManifest(prev, cur), { changed: false, lost: [] });
});

test('diffManifest: found.items จาก true เป็น false → lost มี items', () => {
  const prev = MAN('a', { realms: true, martialRanks: true, tiers: true, items: true });
  const cur = MAN('a', { realms: true, martialRanks: true, tiers: true, items: false });
  assert.deepEqual(LOC.diffManifest(prev, cur), { changed: false, lost: ['items'] });
});

test('diffManifest: ตารางที่ไม่เคยเจอหายไปไม่นับเป็น lost', () => {
  const prev = MAN('a', { realms: true, tiers: false });
  const cur = MAN('a', { realms: true, tiers: false });
  assert.deepEqual(LOC.diffManifest(prev, cur), { changed: false, lost: [] });
});

test('diffManifest: manifest รูปแบบเก่า (มี files) ถือว่าไม่มีฐาน', () => {
  const prev = { build: 'a', files: { 'sim.js': 'deadbeef' }, exports: {} };
  const cur = MAN('b', { realms: true, items: false });
  assert.deepEqual(LOC.diffManifest(prev, cur), { changed: false, lost: [] });
});

test('diffManifest: ค่าที่ parse ได้แต่ไม่ใช่ object ถือว่าไม่มีฐาน', () => {
  const cur = MAN('b', { realms: true });
  assert.deepEqual(LOC.diffManifest('abc', cur), { changed: false, lost: [] });
  assert.deepEqual(LOC.diffManifest([], cur), { changed: false, lost: [] });
});

test('usableManifest: รับเฉพาะ object ธรรมดาที่ไม่ใช่รูปแบบเก่า', () => {
  assert.equal(LOC.usableManifest(MAN('a', { realms: true })), true);
  assert.equal(LOC.usableManifest(null), false);
  assert.equal(LOC.usableManifest('abc'), false);
  assert.equal(LOC.usableManifest([]), false);
  assert.equal(LOC.usableManifest({ build: 'a', files: {} }), false);
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
