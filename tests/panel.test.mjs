// ABOUTME: เทสของตัวตัดสินว่า element ไหนคือแผงเก่าของสคริปต์เราที่ควรถูกลบ
// ABOUTME: กันการลบ host ของสคริปต์อื่นหรือของเราเองที่บังเอิญมีคำว่า "WoX Editor" อยู่ในเนื้อหา
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LOC = require('../wox-editor.user.js');

const P = (o) => ({ tag: 'DIV', hasShadow: true, ours: false, label: 'WoX Editor', ...o });

test('isStalePanel matches old editor panels only', () => {
  assert.equal(LOC.isStalePanel(P({})), true);
  assert.equal(LOC.isStalePanel(P({ ours: true })), false);
  assert.equal(LOC.isStalePanel(P({ label: null })), false); // userscript อื่นที่แค่มีคำนี้ในเนื้อหา
  assert.equal(LOC.isStalePanel(P({ tag: 'SECTION' })), false);
  assert.equal(LOC.isStalePanel(P({ hasShadow: false })), false);
  assert.equal(LOC.isStalePanel(null), false);
});

test('isStateField: เฉพาะช่องที่ fresh() เขียนค่าจากเกมลงไป', () => {
  for (const f of [{ id: 'hm' }, { id: 'h_karma' }, { id: 'h_mrank' }, { id: 's_body' }, { b: 'woodSword' }, { id: '', b: 'x' }]) assert.equal(LOC.isStateField(f), true, JSON.stringify(f));
  for (const f of [{ id: 'hq' }, { id: 'hqr' }, { id: 'hn' }, { id: 'hmb' }, { id: 'hmr' }, { id: 'ai_mark' }, { id: '' }, {}, null, undefined]) assert.equal(LOC.isStateField(f), false, JSON.stringify(f));
});

test('fieldKey: คีย์ของช่องที่ fresh() เขียนค่าลงไป (ใช้เป็นกุญแจของ dirty)', () => {
  assert.equal(LOC.fieldKey({ id: 'hm' }), 'hm');
  assert.equal(LOC.fieldKey({ id: 'h_karma' }), 'h_karma');
  assert.equal(LOC.fieldKey({ id: 's_body' }), 's_body');
  // ช่องกระเป๋าไม่มี id มีแต่ data-b: คีย์ต้องแยกจากช่องอื่นและไม่ชนกันข้ามไอเทม
  assert.equal(LOC.fieldKey({ id: '', b: 'woodSword' }), 'b:woodSword');
  assert.equal(LOC.fieldKey({ b: 'x' }), 'b:x');
  // ช่องที่ไม่ใช่ของ state (ค้นหา/กรอง/ตั้งค่าช่วยเลือก) ต้องไม่มีคีย์ จึงไม่ล็อกการรีเฟรช
  for (const f of [{ id: 'hq' }, { id: 'hqr' }, { id: 'hn' }, { id: 'hmb' }, { id: 'ai_delay' }, {}, null, undefined]) {
    assert.equal(LOC.fieldKey(f), null, JSON.stringify(f));
  }
});

test('isStateField กับ fieldKey ตัดสินตรงกันเสมอ', () => {
  for (const f of [{ id: 'hm' }, { id: 'h_qi' }, { id: 's_luck' }, { b: 'x' }, { id: 'hq' }, {}, null]) {
    assert.equal(LOC.isStateField(f), LOC.fieldKey(f) !== null, JSON.stringify(f));
  }
});

test('aiKey: sig เดิมและ sim สถานะเดิมต้องเท่ากัน, sim มาใหม่ต้องไม่เท่า', () => {
  assert.equal(LOC.aiKey('a|b', true), LOC.aiKey('a|b', true));
  assert.notEqual(LOC.aiKey('a|b', false), LOC.aiKey('a|b', true));
  assert.notEqual(LOC.aiKey('a|b', true), LOC.aiKey('a|c', true));
  assert.equal(LOC.aiKey('', false), '0|');
});
