#!/usr/bin/env node
// ABOUTME: ดึง bundle JS ของเกมจากเว็บ (index.html -> b/boot-*.js -> chunk ที่ import ต่อ) มาเก็บไว้อ่าน
// ABOUTME: ไม่รันโค้ดที่ดึงมา แค่บันทึกไฟล์ลง bundle/<BUILD>/ ใช้แทน src/ ในเครื่องที่เก่าแล้ว
// ใช้งาน:
//   node tools/fetch-bundle.mjs            ดึงทั้งหมดลง bundle/<BUILD>/
//   node tools/fetch-bundle.mjs --list     แสดงรายการไฟล์ที่จะดึง ไม่บันทึก
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://way-of-xian.wox-game.workers.dev';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIST_ONLY = process.argv.includes('--list');

async function get(path) {
  const res = await fetch(new URL(path, ORIGIN));
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.text();
}

// specifier แบบ relative ใน import/export/import() ของไฟล์ JS ที่ bundler สร้าง
function importsOf(code) {
  const re = /(?:\bfrom|\bimport)\s*\(?\s*["'](\.{1,2}\/[^"']+\.js)["']/g;
  return [...code.matchAll(re)].map((m) => m[1]);
}

const html = await get('/');
const entries = [...html.matchAll(/<script[^>]*\bsrc=["']([^"']+\.js)["']/g)].map((m) => m[1]);
if (entries.length === 0) throw new Error('ไม่พบ <script src> ใน index.html: เกมอาจเปลี่ยนวิธีโหลดอีกแล้ว');

const buildSrc = await get('/src/build.js').catch(() => '');
const build = buildSrc.match(/BUILD\s*=\s*["']([^"']+)["']/)?.[1] ?? 'unknown';

const files = new Map(); // path บนเว็บ -> เนื้อไฟล์
const queue = entries.map((e) => new URL(e, ORIGIN + '/').pathname);
while (queue.length) {
  const path = queue.shift();
  if (files.has(path)) continue;
  const code = await get(path);
  files.set(path, code);
  for (const spec of importsOf(code)) queue.push(new URL(spec, ORIGIN + path).pathname);
}

console.log(`BUILD ${build}: ${files.size} ไฟล์`);
for (const [path, code] of files) console.log(`  ${path}  ${code.length} ตัวอักษร`);
if (LIST_ONLY) process.exit(0);

const out = join(ROOT, 'bundle', build);
writeOut('index.html', html);
writeOut('src/build.js', buildSrc);
for (const [path, code] of files) writeOut(path.slice(1), code);
console.log(`บันทึกที่ ${out}`);

function writeOut(rel, text) {
  const file = join(out, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}
