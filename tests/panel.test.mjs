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

test('aiKey: sig เดิมและ sim สถานะเดิมต้องเท่ากัน, sim มาใหม่ต้องไม่เท่า', () => {
  assert.equal(LOC.aiKey('a|b', true), LOC.aiKey('a|b', true));
  assert.notEqual(LOC.aiKey('a|b', false), LOC.aiKey('a|b', true));
  assert.notEqual(LOC.aiKey('a|b', true), LOC.aiKey('a|c', true));
  assert.equal(LOC.aiKey('', false), '0|');
});

test('aiNeedsScan: เกมวาดการ์ดเดิมซ้ำด้วย id เดิมแต่เป็นปุ่มใหม่ ต้องสแกนใหม่ (A1)', () => {
  const a = { id: 'choice-a' }, b = { id: 'choice-b' };
  // การ์ดเดิม ปุ่มเดิม คีย์เดิม = ไม่ต้องสแกนซ้ำ
  assert.equal(LOC.aiNeedsScan('1|x', '1|x', [a, b], [a, b]), false);
  assert.equal(LOC.aiNeedsScan('1|', '1|', [], []), false);
  // คีย์เปลี่ยน = สแกน
  assert.equal(LOC.aiNeedsScan('1|y', '1|x', [a, b], [a, b]), true);
  // id เดิมแต่เป็น DOM node ชุดใหม่ (ล้าง #choice-options แล้วสร้างใหม่) = ต้องสแกนใหม่
  const a2 = { id: 'choice-a' }, b2 = { id: 'choice-b' };
  assert.equal(LOC.aiNeedsScan('1|x', '1|x', [a2, b2], [a, b]), true);
  // ลำดับ/จำนวนปุ่มเปลี่ยน = สแกน
  assert.equal(LOC.aiNeedsScan('1|x', '1|x', [b, a], [a, b]), true);
  assert.equal(LOC.aiNeedsScan('1|x', '1|x', [a], [a, b]), true);
  // ค่าที่ไม่ใช่อาร์เรย์ต้องไม่ throw และถือว่าเป็นชุดใหม่
  assert.equal(LOC.aiNeedsScan('1|x', '1|x', [a], null), true);
  assert.equal(LOC.aiNeedsScan('1|x', '1|x', null, null), false);
});
