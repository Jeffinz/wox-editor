// ABOUTME: Release helper for wox-editor.user.js: checks version sync, syntax, then commits and pushes.
// ABOUTME: Usage: node tools/release.mjs [--dry-run] "message"   (bump @version and VERSION first)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

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
let last = null;
try { last = run('git', ['show', `HEAD:${file}`]).match(/@version\s+(\S+)/)?.[1]; } catch { /* first commit */ }
const gt = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
const dirty = run('git', ['status', '--porcelain', '--', file]);
if (last && dirty && !gt(header, last)) fail(`ไฟล์เปลี่ยนแต่ version ${header} ไม่สูงกว่า ${last} Tampermonkey จะไม่เห็นอัปเดต`);

run('node', ['--check', file]);
console.log(`✔ version ${header} (ก่อนหน้า ${last ?? 'ไม่มี'}), syntax ผ่าน`);
if (dry) { console.log('dry-run: ไม่ commit/push'); process.exit(0); }
run('git', ['add', file, 'tools/release.mjs', '.gitignore', 'CLAUDE.md', 'AGENTS.md']);
console.log(run('git', ['commit', '-m', msg]));
console.log(run('git', ['push']));
