#!/usr/bin/env node
// เทียบ src/ ของเกมก่อน/หลังอัปเดต โดยเก็บแค่ manifest JSON (ไม่ต้องเก็บสำเนาซอร์สเก่า)
// ใช้งาน:
//   node tools/snapshot-diff.mjs save                     บันทึก snapshots/<BUILD>.json จาก src/ ปัจจุบัน
//   node tools/snapshot-diff.mjs diff                     เทียบ snapshot ล่าสุดกับ src/ ปัจจุบัน
//   node tools/snapshot-diff.mjs diff <เก่า.json> [ใหม่.json]   เทียบสองไฟล์ (ไม่ใส่ไฟล์ใหม่ = src/ ปัจจุบัน)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const SNAP = join(ROOT, 'snapshots');

// export ที่ wox-editor.user.js เรียกใช้โดยตรง ถ้าหายหลังอัปเดต สคริปต์จะพัง
const CRITICAL = {
  'build.js': ['BUILD'],
  'data.js': ['REALMS'],
  'martial.js': ['MARTIAL_RANKS'],
  'items.js': ['ITEMS'],
  'majors.js': ['LIFE_PATH', 'MAJOR_EVENTS'],
  'sim.js': ['majorEvent', 'allMajors', 'eventsForAudit', 'majorTexts', 'statOdds', 'rarityFor'],
};

const MAX_LIST = 40;

function walk(dir, out = []) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, d.name);
    if (d.isDirectory()) walk(p, out);
    else if (d.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function exportsOf(text) {
  const names = new Set();
  for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm))
    for (const part of m[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/).pop();
      if (n) names.add(n);
    }
  return [...names].sort();
}

// ID ของอีเว้นต์และตัวเลือก: ev("id", ...) และ o("id", ...)
const ID_RE = /(?<![\w.$])(?:ev|o)\(\s*"([^"]+)"/g;

function manifest() {
  const files = {}, exp = {}, ids = {};
  let build = 'unknown';
  for (const p of walk(SRC).sort()) {
    const rel = relative(SRC, p).split(sep).join('/');
    const text = readFileSync(p, 'utf8');
    files[rel] = createHash('sha256').update(text).digest('hex').slice(0, 16);
    const ex = exportsOf(text);
    if (ex.length) exp[rel] = ex;
    for (const m of text.matchAll(ID_RE)) if (!Object.hasOwn(ids, m[1])) ids[m[1]] = rel;
    if (rel === 'build.js') build = text.match(/BUILD\s*=\s*"([^"]+)"/)?.[1] ?? build;
  }
  return { build, files, exports: exp, ids };
}

function save() {
  const m = manifest();
  mkdirSync(SNAP, { recursive: true });
  const file = join(SNAP, m.build.replace(/[^\w.-]/g, '_') + '.json');
  writeFileSync(file, JSON.stringify({ savedAt: new Date().toISOString(), ...m }, null, 1));
  console.log(`บันทึกแล้ว: ${file}`);
  console.log(`BUILD ${m.build} · ${Object.keys(m.files).length} ไฟล์ · ${Object.keys(m.ids).length} ID อีเว้นต์/ตัวเลือก`);
}

function latestSnap() {
  if (!existsSync(SNAP)) return null;
  const files = readdirSync(SNAP).filter((f) => f.endsWith('.json')).map((f) => join(SNAP, f));
  files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return files[0] ?? null;
}

const cap = (arr) => (arr.length > MAX_LIST ? [...arr.slice(0, MAX_LIST), `  ...และอีก ${arr.length - MAX_LIST} รายการ`] : arr);

function diff(a, b) {
  const out = [];
  out.push(`BUILD: ${a.build} → ${b.build}${a.build === b.build ? '  (เหมือนเดิม)' : ''}`);

  // 1) ไฟล์
  const fa = Object.keys(a.files), fb = Object.keys(b.files);
  const added = fb.filter((f) => !Object.hasOwn(a.files, f));
  const removed = fa.filter((f) => !Object.hasOwn(b.files, f));
  const changed = fa.filter((f) => Object.hasOwn(b.files, f) && a.files[f] !== b.files[f]);
  out.push('', `== ไฟล์ == เปลี่ยน ${changed.length} · เพิ่ม ${added.length} · หาย ${removed.length}`);
  out.push(...cap(changed.map((f) => `  ~ ${f}`)), ...cap(added.map((f) => `  + ${f}`)), ...cap(removed.map((f) => `  - ${f}`)));

  // 2) export ที่สคริปต์ใช้ (สำคัญสุด)
  out.push('', '== export ที่สคริปต์ใช้ ==');
  let critOk = true;
  for (const [f, names] of Object.entries(CRITICAL)) {
    if (!Object.hasOwn(b.files, f)) { out.push(`!! ${f}: ไฟล์หายไป`); critOk = false; continue; }
    const have = new Set(b.exports[f] ?? []);
    const miss = names.filter((n) => !have.has(n));
    if (miss.length) { out.push(`!! ${f}: หาย ${miss.join(', ')}`); critOk = false; }
  }
  if (critOk) out.push('ผ่านทั้งหมด');

  // 3) export ที่หายไปจากทุกไฟล์ (อาจไม่กระทบสคริปต์ แต่ควรรู้)
  const lost = [];
  for (const f of Object.keys(a.exports)) {
    const have = new Set(b.exports[f] ?? []);
    for (const n of a.exports[f]) if (!have.has(n)) lost.push(`  - ${f} :: ${n}`);
  }
  out.push('', `== export ที่หายไปจากไฟล์อื่น == ${lost.length} รายการ`, ...cap(lost));

  // 4) ID อีเว้นต์ (ถ้าหาย เซฟที่ค้างอีเว้นต์นั้นอาจพัง)
  const ia = Object.keys(a.ids), ib = Object.keys(b.ids);
  const idAdded = ib.filter((id) => !Object.hasOwn(a.ids, id));
  const idRemoved = ia.filter((id) => !Object.hasOwn(b.ids, id));
  out.push('', `== ID อีเว้นต์/ตัวเลือก == เพิ่ม ${idAdded.length} · หาย ${idRemoved.length}`);
  out.push(...cap(idRemoved.map((id) => `  - ${id}  (${a.ids[id]})`)));
  if (idRemoved.length) out.push('  หมายเหตุ: ID ที่หายอาจทำให้เซฟที่ค้างอีเว้นต์นั้นพัง ตรวจกับเซฟได้ที่ pending.id');
  out.push(...cap(idAdded.map((id) => `  + ${id}  (${b.ids[id]})`)));
  return out;
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'save') {
  save();
} else if (cmd === 'diff') {
  const pa = rest[0] ?? latestSnap();
  if (!pa) {
    console.error('ยังไม่มี snapshot ให้รันก่อน: node tools/snapshot-diff.mjs save');
    process.exit(1);
  }
  const a = JSON.parse(readFileSync(pa, 'utf8'));
  const b = rest[1] ? JSON.parse(readFileSync(rest[1], 'utf8')) : manifest();
  console.log(`เทียบ: ${pa}\nกับ:   ${rest[1] ?? 'src/ ปัจจุบัน'}\n`);
  console.log(diff(a, b).join('\n'));
} else {
  console.log('ใช้งาน: save | diff [เก่า.json] [ใหม่.json]');
}
