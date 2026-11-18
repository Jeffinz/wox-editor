// ABOUTME: เทสตรรกะให้คะแนนตัวเลือกของการ์ดอีเว้นต์ (fx + act) ที่ย้ายเข้า LOC
// ABOUTME: กันการ์ดที่ตัวเลือกมีแต่ act ไม่ถูกมองว่า "ประเมินไม่ได้" จนกดอัตโนมัติไม่ทำงาน
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LOC = require('../wox-editor.user.js');

const W = { stat: 1, health: 0.8, money: 1, karma: 0.8, fame: 0.8, qi: 0.6, merit: 0.5, other: 0.2, risk: 1 };
const KEYS = new Set(['body', 'mind', 'will', 'charm', 'luck']);

test('fxScore: ค่าพลังตรงตาม W.stat และเงินเป็นบวกเมื่อได้เงิน', () => {
  assert.equal(LOC.fxScore({ body: 3 }, W, KEYS), 3);
  assert.ok(LOC.fxScore({ money: 100 }, W, KEYS) > 0);
  assert.ok(LOC.fxScore({ money: -100 }, W, KEYS) < 0);
  assert.equal(LOC.fxScore(null, W, KEYS), 0);
});

test('outScore: act ที่เป็นอันตรายติดลบหนัก แม้ไม่มี fx', () => {
  assert.ok(LOC.outScore({ act: { kill: true } }, W, KEYS) <= -200);
  assert.ok(LOC.outScore({ ok: { act: { deathChance: 0.3 } } }, W, KEYS) === 0); // ยังไม่ใช่รูปของ outcome
  assert.ok(LOC.outScore({ act: { deathChance: 0.3 } }, W, KEYS) <= -200);
});

test('outScore: act ที่ไม่ใช่อันตรายให้ 0 และไม่ throw', () => {
  assert.equal(LOC.outScore({ act: { marry: 'npc' } }, W, KEYS), 0);
  assert.equal(LOC.outScore({}, W, KEYS), 0);
  assert.equal(LOC.outScore(null, W, KEYS), 0);
});

test('hasResult: fx หรือ act อย่างใดอย่างหนึ่งแปลว่าประเมินได้', () => {
  assert.equal(LOC.hasResult({ fx: { body: 1 } }), true);
  assert.equal(LOC.hasResult({ act: { marry: 'npc' } }), true);
  assert.equal(LOC.hasResult({ fx: {}, act: {} }), false);
  assert.equal(LOC.hasResult({}), false);
  assert.equal(LOC.hasResult(null), false);
  assert.equal(LOC.hasResult(undefined), false);
});

test('allTie: คะแนนเท่ากันหมดแปลว่าไม่มีเหตุผลให้เลือกตัวไหน', () => {
  assert.equal(LOC.allTie([0, 0]), true);
  assert.equal(LOC.allTie([2.5, 2.5, 2.5]), true);
  assert.equal(LOC.allTie([3, 0]), false);
  assert.equal(LOC.allTie([0, 0, 1]), false);
  assert.equal(LOC.allTie([]), false);
  assert.equal(LOC.allTie([7]), false); // ตัวเลือกเดียว = ไม่ต้องเดา
});
