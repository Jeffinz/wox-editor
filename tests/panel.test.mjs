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
