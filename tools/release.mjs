// ABOUTME: Release helper for wox-editor.user.js: checks version sync, syntax, then commits and pushes.
// ABOUTME: Refuses to release when any test was skipped, so a missing bundle cannot pass silently.
// ABOUTME: Usage: node tools/release.mjs [--dry-run] "message"   (bump @version and VERSION first)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { skippedCount } from './test-summary.mjs';

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const msg = args.filter((a) => a !== '--dry-run')[0];
if (args.includes('--help') || args.includes('-h') || (!msg && !dry)) {
  console.log('Usage: node tools/release.mjs [--dry-run] "commit message"\nBump @version in the header and VERSION in the script first.');
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
}

const file = 'wox-editor.user.js';
const src = readFileSync(file, 'utf8');
const header = src.match(/@version\s+(\S+)/)?.[1];
const konst = src.match(/const VERSION = '([^']+)'/)?.[1];
const fail = (m) => { console.error('✖ ' + m); process.exit(1); };
if (!header || !konst) fail('หา @version หรือ VERSION ไม่เจอ');
if (header !== konst) fail(`@version (${header}) ไม่ตรงกับ VERSION (${konst})`);
if (!/@updateURL\s+https:\/\//.test(src) || !/@downloadURL\s+https:\/\//.test(src)) fail('ไม่มี @updateURL/@downloadURL');

const run = (cmd, a) => execFileSync(cmd, a, { encoding: 'utf8' }).trim();
// @updateURL/@downloadURL ชี้ main: commit จาก branch อื่นผู้ใช้จะไม่เห็นอัปเดต และ merge ทีหลังจะชน version (R8)
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
if (branch !== 'main') fail(`ต้องรันบน main (ตอนนี้อยู่ branch ${branch}) — merge เข้า main ก่อนแล้ว bump version ที่นั่น`);
let last = null;
try { last = run('git', ['show', `HEAD:${file}`]).match(/@version\s+(\S+)/)?.[1]; } catch { /* first commit */ }
const gt = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
const dirty = run('git', ['status', '--porcelain', '--', file]);
if (last && dirty && !gt(header, last)) fail(`ไฟล์เปลี่ยนแต่ version ${header} ไม่สูงกว่า ${last} Tampermonkey จะไม่เห็นอัปเดต`);

run('node', ['--check', file]);
// ไฟล์ tests อยู่ในโฟลเดอร์ tests/ (Node เวอร์ชันนี้ไม่รับ path โฟลเดอร์ตรง ๆ จึงส่ง glob)
const out = (() => { try { return run('node', ['--test', 'tests/**/*.test.mjs']); } catch (e) { fail('เทสไม่ผ่าน\n' + ([e.stdout, e.stderr].filter(Boolean).join('\n') || e.message)); } })();
// เทสที่ skip ตัว (เช่นไม่มี bundle/) คือเทสเขียวหลอก: ต้องได้ skipped 0 จริง ๆ
const skipped = skippedCount(out);
if (skipped !== 0) fail(`เทสถูกข้าม ${skipped < 0 ? 'ทั้งชุด (ไม่พบบรรทัดสรุป)' : skipped + ' ตัว'} — ต้องได้ skipped 0 (ตั้ง WOX_BUNDLE หรือรัน tools/fetch-bundle.mjs ก่อน)`);
console.log(`✔ version ${header} (ก่อนหน้า ${last ?? 'ไม่มี'}), syntax และเทสผ่าน`);
if (dry) { console.log('dry-run: ไม่ commit/push'); process.exit(0); }
run('git', ['add', file, 'tools/release.mjs', 'tools/test-summary.mjs', 'tests/', '.gitignore', 'CLAUDE.md', 'AGENTS.md']);
// commit รอบก่อนอาจสำเร็จแต่ push ล้ม: รันซ้ำต้อง push ต่อได้ ไม่ใช่ตายที่ "nothing to commit" (R8)
let staged = true;
try { run('git', ['diff', '--cached', '--quiet']); staged = false; } catch { /* มีไฟล์ staged ให้ commit */ }
console.log(staged ? run('git', ['commit', '-m', msg]) : 'ไม่มีอะไรให้ commit — ข้ามไป push');
console.log(run('git', ['push']));
