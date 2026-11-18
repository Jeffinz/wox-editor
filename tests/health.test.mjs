// ABOUTME: เทสของบรรทัดในแผง "ตรวจระบบ" ที่แยกเป็น pure function ใน LOC
// ABOUTME: ครอบกรณีโหลด chunk ไม่ครบ รอ state หมดเวลา และฟิลด์ที่ไม่บังคับ (martial/pending)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LOC = require('../wox-editor.user.js');

const NO_STATE = '– รอข้อมูลเกมเกิน 2 นาที เล่นในเกมสัก 1 เดือนแล้วกดตรวจอีกครั้ง';
const NO_CORE = '– ยังไม่ได้อ่าน chunk หลัก';
const STATS = ['body', 'mind', 'will', 'charm', 'luck'];

test('tableLines: no state yet', () => {
  assert.deepEqual(LOC.tableLines({ reason: 'no-state' }), [NO_STATE]);
});

test('tableLines: core not read', () => {
  assert.deepEqual(LOC.tableLines(null), [NO_CORE]);
  assert.deepEqual(LOC.tableLines({ core: [], imported: false }), [NO_CORE]);
});

test('tableLines: everything loaded', () => {
  const c = {
    core: ['/b/c-a.js'], imported: true, failed: [],
    where: { realms: 'c-a.js', martialRanks: 'c-a.js', tiers: 'c-a.js', items: 'c-a.js' },
    realms: [1], martialRanks: [1], tiers: [1], items: { x: 1 },
  };
  assert.deepEqual(LOC.tableLines(c), [
    '✔ REALMS (c-a.js)',
    '✔ MARTIAL_RANKS (c-a.js)',
    '✔ TIERS (c-a.js)',
    '✔ ITEMS (c-a.js)',
  ]);
});

test('tableLines: loaded but a table is missing', () => {
  const c = { core: ['/b/c-a.js'], imported: true, failed: [], where: {}, realms: [1], martialRanks: null, tiers: null, items: null };
  const lines = LOC.tableLines(c);
  assert.equal(lines[0], '✔ REALMS (chunk หลัก)');
  assert.equal(lines[1], '✖ MARTIAL_RANKS: หาไม่เจอใน chunk หลัก');
});

test('tableLines: partial import shows found tables and unsure ones', () => {
  const c = {
    core: ['/b/c-a.js', '/b/c-b.js'], imported: false, failed: ['/b/c-b.js'], where: { realms: 'c-a.js' },
    realms: [1], martialRanks: null, tiers: null, items: null,
  };
  const lines = LOC.tableLines(c);
  assert.equal(lines[0], '✔ REALMS (c-a.js)');
  assert.equal(lines[1], '– MARTIAL_RANKS: ยังไม่แน่ใจ (chunk c-b.js โหลดไม่ได้)');
  assert.ok(!lines.some((l) => l.startsWith('✖')));
});

const FULL = { money: 1, stats: { body: 1, mind: 1, will: 1, charm: 1, luck: 1 }, ageMonths: 1, karma: 0, fame: 0, bag: {}, realm: 0, layer: 0, qi: 0 };

test('stateLines: no character yet', () => {
  assert.deepEqual(LOC.stateLines(null, STATS), ['– ยังไม่มีข้อมูลตัวละคร (เล่นในเกม 1 เดือนก่อน แล้วกดตรวจอีกครั้ง)']);
});

test('stateLines: required fields present, optional fields absent', () => {
  assert.deepEqual(LOC.stateLines(FULL, STATS), [
    '✔ state ครบ',
    '– martial: ไม่มี (ตัวละครไม่ได้อยู่สายยุทธ์)',
    '– pending: ไม่มีอีเว้นต์ค้าง',
  ]);
});

test('stateLines: required and stats fields missing', () => {
  const t = { ...FULL, money: undefined, stats: { body: 1 } };
  assert.deepEqual(LOC.stateLines(t, STATS), [
    '✖ state ไม่มีฟิลด์: money',
    '✖ stats ไม่มีค่า: mind, will, charm, luck',
    '– martial: ไม่มี (ตัวละครไม่ได้อยู่สายยุทธ์)',
    '– pending: ไม่มีอีเว้นต์ค้าง',
  ]);
});

test('stateLines: optional fields present', () => {
  const t = { ...FULL, martial: { rank: 0, stage: 1, force: 2 }, pending: { kind: 'major', id: 'ev1', options: [], rarity: 'common' } };
  const lines = LOC.stateLines(t, STATS);
  assert.deepEqual(lines, ['✔ state ครบ', '✔ martial', '✔ pending: major ev1']);
});

test('health tables live in LOC so the DOM code cannot drift', () => {
  assert.deepEqual(LOC.TABLES, [['REALMS', 'realms'], ['MARTIAL_RANKS', 'martialRanks'], ['TIERS', 'tiers'], ['ITEMS', 'items']]);
  assert.deepEqual(LOC.STATE_REQUIRED, ['money', 'stats', 'ageMonths', 'karma', 'fame', 'bag', 'realm', 'layer', 'qi']);
  assert.deepEqual(LOC.STATE_OPTIONAL, ['martial', 'pending']);
});
