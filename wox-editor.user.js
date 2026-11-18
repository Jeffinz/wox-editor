// ==UserScript==
// @name         WoX Single-player Editor
// @version      3.3.3
// @updateURL    https://raw.githubusercontent.com/Jeffinz/wox-editor/main/wox-editor.user.js
// @downloadURL  https://raw.githubusercontent.com/Jeffinz/wox-editor/main/wox-editor.user.js
// @match        https://way-of-xian.wox-game.workers.dev/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
  // หาตารางข้อมูลของเกมจากรูปร่างของค่า เพราะชื่อ export ใน bundle ถูกย่อและเปลี่ยนทุก build
  const LOC = (() => {
    // คืน export เดียวที่ผ่าน test; ไม่มีหรือมีมากกว่า 1 ตัว → null (กันเลือกผิดตัวแบบเงียบ)
    const pick = (ns, test) => {
      const hits = [];
      // namespace ของ ES module เป็น enumerable ทุกตัว จึงวนด้วย Object.keys ได้
      for (const k of Object.keys(ns ?? {})) {
        let v;
        try { v = ns[k]; } catch { continue; } // export ที่อ่านแล้ว throw ให้ข้าม
        let ok = false;
        try { ok = !!test(v); } catch { ok = false; }
        if (ok) hits.push(v);
      }
      return hits.length === 1 ? hits[0] : null;
    };
    const IS = {
      // REALMS: [{id:"mortal",lifespan:75,statCap:100,layers:0,…}]
      realms: (v) => Array.isArray(v) && v[0]?.id === 'mortal' && typeof v[0].lifespan === 'number',
      // MARTIAL_RANKS: [{id:"novice",th:"ผู้ฝึกยุทธ์",…,years:0,…}]
      martialRanks: (v) => Array.isArray(v) && v[0]?.id === 'novice' && typeof v[0] === 'object' && 'years' in v[0],
      // TIERS: [{th:"สามัญ",en:"Common",color:"#8c918e"}]
      tiers: (v) => Array.isArray(v) && v[0]?.color === '#8c918e' && v[0].en === 'Common',
      // ITEMS: object ที่มี woodSword บาง build ตั้งแบบไม่ enumerable จึงอ่านจาก descriptor
      // woodSword เป็น getter ได้ จึงต้องกัน throw และถ้าอ่านจาก descriptor ไม่ได้ให้อ่านจากค่าโดยตรง
      items: (v) => {
        if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
        let slot;
        try { slot = Object.getOwnPropertyDescriptor(v, 'woodSword')?.value?.slot; } catch { slot = undefined; }
        if (slot === undefined) try { slot = v.woodSword?.slot; } catch { return false; }
        return slot === 'weapon';
      },
    };
    // อ่านชื่อ chunk หลักจากข้อความของเกม (pure): index → boot → app → core
    // ชื่อไฟล์มี hash เปลี่ยนทุก build จึงต้องอ่านจากไฟล์จริง ไม่ hardcode
    const chunkChain = (indexHtml, bootText, appText) => {
      const out = { boot: '', app: null, core: [] };
      // index มี inline script อื่นปนอยู่ จึงเอาเฉพาะ <script> ที่มีทั้ง type="module" และ src
      const tag = [...String(indexHtml ?? '').matchAll(/<script\b[^>]*>/gi)]
        .map((m) => m[0])
        .find((s) => /\btype\s*=\s*["']module["']/i.test(s) && /\bsrc\s*=\s*["'][^"']+["']/i.test(s));
      const src = tag?.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!src) return out;
      // "b/boot-x.js" (หรือ "./b/…", "/b/…") → "/b/boot-x.js"
      out.boot = '/' + String(src).replace(/^\.?\//, '');
      // chunk ร่วมอยู่โฟลเดอร์เดียวกับ boot
      const dir = out.boot.slice(0, out.boot.lastIndexOf('/') + 1);
      // boot เลือก entry ตอนรัน (มีทั้ง app และ wiki) จึงเอาเฉพาะ import ของ app
      const app = String(bootText ?? '').match(/import\(\s*["']\.\/(app-[\w-]+\.js)["']\s*\)/)?.[1];
      if (!app) return out;
      out.app = dir + app;
      // chunk ที่ app import แบบ static ทั้งหมด (ชื่อไม่ซ้ำ)
      const seen = new Set();
      for (const m of String(appText ?? '').matchAll(/from\s*["']\.\/(c-[\w-]+\.js)["']/g)) {
        if (seen.has(m[1])) continue;
        seen.add(m[1]);
        out.core.push(dir + m[1]);
      }
      return out;
    };
    // ระดับความหายาก: ไอเทมใช้ tier (ชื่อและสีตรงกับ TIERS ใน items.js), อีเว้นต์ใช้ rarityFor (ชื่อตรงกับ RARITY ใน rarity.js)
    const TIER_LBL = [['สามัญ', '#8c918e'], ['ขั้นมนุษย์', '#c9c9c0'], ['ขั้นปฐพี', '#4f9a58'], ['ขั้นฟ้า', '#3f7fc0'], ['ขั้นสวรรค์', '#8a5ac0'], ['ขั้นเซียน', '#d4a838']];
    const RAR_LBL = { common: ['ธรรมดา', '#8c918e'], uncommon: ['ไม่ธรรมดา', '#4f9a58'], rare: ['หายาก', '#3f7fc0'], epic: ['หายากมาก', '#8a5ac0'], legendary: ['ตำนาน', '#d4a838'] };
    // ป้ายระดับของไอเทมเป็น tuple [ชื่อ, สี] (pure, ห้าม throw): tier ตัวเลขอ่านจาก TIERS ของเกมก่อน ไม่มีค่อยใช้ TIER_LBL
    // build บางตัวส่ง tier เป็นสตริง (เช่น "legendary") จึงต้องรองรับ RAR_LBL ด้วย
    const tierOf = (item, tiers) => {
      const raw = item?.tier;
      // tier ที่เป็นสตริงตัวเลข ("3") ต้องนับเป็นตัวเลข ไม่ใช่สตริงระดับ
      const tier = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
      if (typeof tier === 'string') {
        const hit = RAR_LBL[tier];
        return Array.isArray(hit) ? hit : TIER_LBL[0];
      }
      if (tier === undefined || tier === null) return TIER_LBL[0];
      const row = tiers?.[tier];
      if (row && typeof row.th === 'string' && typeof row.color === 'string') return [row.th, row.color];
      return TIER_LBL[Math.min(5, tier)] ?? TIER_LBL[0];
    };
    // ลำดับระดับสตริงของไอเทม (ชื่อตรงกับ RAR_LBL); ย้ายจากฝั่ง DOM มาไว้ที่เดียวเพื่อให้เทสได้
    const RAR_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    // ระดับชื่อ → ขั้นของเกม: จับคู่ด้วยสีของป้าย (RAR_LBL กับ TIER_LBL) ไม่ใช่ลำดับใน RAR_ORDER
    // เทาคือสามัญ 0, เขียวคือขั้นปฐพี 2, ฟ้าคือขั้นฟ้า 3, ม่วงคือขั้นสวรรค์ 4, ทองคือขั้นเซียน 5 (ขั้นมนุษย์ไม่มีระดับชื่อคู่)
    const RAR_TO_TIER = { common: 0, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
    // ชื่อระดับของไอเทม (pure): สตริงที่อยู่ใน RAR_ORDER เท่านั้น ไม่งั้น null
    const rarKey = (tier) => (typeof tier === 'string' && RAR_ORDER.includes(tier) ? tier : null);
    // ลำดับชั้นของไอเทมสำหรับกรอง/เรียง (pure): ตัวเลขหรือสตริงตัวเลข → 0-5 (เหมือนเดิม), ไม่มีค่า → 0
    // สตริงระดับ (เช่น "epic") → ขั้นของเกมที่มีสีเดียวกันตาม RAR_TO_TIER
    // สตริงอื่นที่จับคู่ไม่ได้ → null: ต้องเห็นได้ทุกตัวกรองและอยู่ท้ายรายการ
    const tierIdx = (tier) => {
      const raw = tier ?? 0;
      const rar = rarKey(raw);
      if (rar) return RAR_TO_TIER[rar];
      const n = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
      return Number.isFinite(n) ? Math.min(5, n) : null;
    };
    // ตัวเรียงไอเทม (pure, ห้าม throw): ระดับสูงก่อน → ระดับที่รู้ไม่ได้อยู่ท้าย → ชื่อช่อง
    // slot อาจไม่ใช่สตริงหรือไม่มีเลย จึงต้องแปลงด้วย String เสมอ (ของเดิมเรียก slot.localeCompare ตรง ๆ แล้ว throw)
    const itemOrder = (a, b) => {
      const x = tierIdx(a?.tier), y = tierIdx(b?.tier);
      const slot = (i) => String(i?.slot ?? '');
      if (x === null || y === null) return (x === null) - (y === null) || slot(a).localeCompare(slot(b));
      return y - x || slot(a).localeCompare(slot(b));
    };
    // ไอเทมผ่านตัวกรองระดับไหม (pure): "all" ผ่านหมด; ระดับที่รู้ไม่ได้ผ่านทุกตัวกรอง (เหมือนของเดิม)
    // ตัวกรองมีชุดเดียวคือขั้นของเกม (index 0-5) เพราะไอเทมที่แผงแสดงใช้ tier ตัวเลขชุดเดียวกับตาราง TIERS
    const tierMatches = (item, filter) => {
      const f = String(filter ?? 'all');
      if (f === 'all') return true;
      const k = tierIdx(item?.tier);
      return k === null || String(k) === f;
    };
    // อ่านค่าตัวเลขจากช่องกรอก (pure): คืน null เมื่อว่างหรือไม่ใช่จำนวนจริง เพื่อไม่ให้เขียน 0 ทับค่าเดิม
    const numOr = (x) => {
      if (typeof x === 'number') return Number.isFinite(x) ? x : null;
      const s = String(x ?? '').trim();
      if (!s) return null;
      const n = +s;
      return Number.isFinite(n) ? n : null;
    };
    // ค่าที่จะเขียนลงช่องที่ว่างแล้วควรคงค่าเดิม (pure): ช่องว่าง/ไม่ใช่ตัวเลข → ใช้ค่าเดิม (ไม่ใช่ตัวเลข → 0)
    const numOrKeep = (x, prev) => numOr(x) ?? (Number.isFinite(prev) ? prev : 0);
    // URL สัมบูรณ์ของ chunk (pure): path เต็มมาจาก boot file เอง จึงไม่ต้องประกอบโฟลเดอร์เอง
    // ต้องตรงกับ URL ที่เกมใช้ทุกตัวอักษรเพื่อให้ได้ module instance เดิม
    const chunkUrl = (p, origin) => new URL(p, origin).href;
    // manifest ฐานที่ใช้ได้ (pure): ต้องเป็น object ธรรมดา ไม่ใช่ค่าที่ parse ผิดรูป (เช่น "abc", []) หรือรูปแบบเก่า (มี files)
    const usableManifest = (m) => !!m && typeof m === 'object' && !Array.isArray(m) && !m.files;
    // เทียบ manifest ฐานกับของรอบนี้ (pure): changed เมื่อ build เปลี่ยน, lost เมื่อตารางที่เคยเจอหายไป
    // manifest ที่ใช้เป็นฐานไม่ได้ (รูปแบบเก่า, ค่าที่ไม่ใช่ object) หรือ null ถือว่าไม่มีฐาน: คืน changed:false, lost:[]
    const diffManifest = (prev, cur) => {
      const out = { changed: false, lost: [] };
      if (!usableManifest(prev) || !cur) return out;
      if (prev.build !== cur.build) out.changed = true;
      for (const k of Object.keys(prev.found ?? {})) {
        if (prev.found[k] && !cur.found?.[k]) out.lost.push(k);
      }
      return out;
    };
    // อ่าน chunk หลักได้จริงหรือยัง (pure): มี build แต่ core ว่างหรือ import ไม่ครบ = ยังไม่ได้อ่าน ห้ามลงว่าตารางหาย
    const coreLoaded = (c) => Array.isArray(c?.core) && c.core.length > 0 && c.imported === true;
    // รวมตารางของรอบใหม่กับของเดิม (pure, ห้าม throw): คีย์ที่รอบใหม่เป็น null ให้คงของเดิมไว้
    // กันตารางที่อ่านได้แล้วหายไปตอนกด "ตรวจอีกครั้ง" แล้วรอบสองโหลดได้ไม่ครบ
    const keepTables = (prev, next) => {
      const out = {};
      for (const k of ['realms', 'martialRanks', 'tiers', 'items']) out[k] = next?.[k] ?? prev?.[k] ?? null;
      return out;
    };
    // แผงเก่าของสคริปต์เราที่ควรถูกลบหรือไม่ (pure): ต้องเป็น div ลูกตรงของ body ที่มี shadow root
    // ตัวระบุคือ aria-label ของ .w#w ซึ่งมีทุกรุ่นตั้งแต่ v3.0.0 ถึง v3.3.1; ข้อความในเนื้อหาไม่นับ (ของคนอื่นอาจมีคำเดียวกัน)
    const isStalePanel = (info) => !!info && info.tag === 'DIV' && info.hasShadow === true && info.ours !== true && info.label === 'WoX Editor';
    // ข้อความเดียวของแท็บอีเว้นต์/ช่วยเลือกเมื่อยังไม่รองรับเกมแบบ bundle (ทุกจุดที่พูดเรื่องนี้ใช้ค่านี้)
    const EV_UNSUPPORTED = 'อีเว้นต์/ช่วยเลือก: ยังไม่รองรับเกมแบบ bundle';
    // ตารางที่สคริปต์ใช้: ชื่อที่แสดงในแผง + คีย์ในผลของ loadCore() (ตรวจระบบกับตรวจอัปเดตอ่านชุดเดียวกัน)
    const TABLES = [['REALMS', 'realms'], ['MARTIAL_RANKS', 'martialRanks'], ['TIERS', 'tiers'], ['ITEMS', 'items']];
    // ฟิลด์ของ state ที่แผงแก้ได้: กลุ่มแรกต้องมี กลุ่มหลังมีหรือไม่มีก็ได้ตามเส้นทางของตัวละคร
    const STATE_REQUIRED = ['money', 'stats', 'ageMonths', 'karma', 'fame', 'bag', 'realm', 'layer', 'qi'];
    const STATE_OPTIONAL = ['martial', 'pending'];
    const baseName = (p) => String(p ?? '').slice(String(p ?? '').lastIndexOf('/') + 1);
    // บรรทัดตารางในแผงตรวจระบบ (pure, ห้าม throw): ไม่รวมบรรทัด BUILD ซึ่งผู้เรียกสร้างเอง
    // ข้อความ ☑ ใช้เฉพาะเมื่อรู้แน่แล้วเท่านั้น: chunk โหลดไม่ครบต้องเป็น "–" ไม่ใช่ "✖"
    const tableLines = (c) => {
      if (c?.reason === 'no-state') return ['– รอข้อมูลเกมเกิน 2 นาที เล่นในเกมสัก 1 เดือนแล้วกดตรวจอีกครั้ง'];
      if (!c || !Array.isArray(c.core) || c.core.length === 0) return ['– ยังไม่ได้อ่าน chunk หลัก'];
      const loaded = coreLoaded(c);
      return TABLES.map(([label, key]) => {
        if (c[key]) return `✔ ${label} (${c.where?.[key] || 'chunk หลัก'})`;
        if (loaded) return `✖ ${label}: หาไม่เจอใน chunk หลัก`;
        const failed = (c.failed ?? []).map(baseName).join(', ');
        return `– ${label}: ยังไม่แน่ใจ (chunk ${failed} โหลดไม่ได้)`;
      });
    };
    // บรรทัด state ในแผงตรวจระบบ (pure, ห้าม throw): ฟิลด์ไม่บังคับมีหรือไม่มีก็ไม่ใช่ error
    const stateLines = (t, statKeys) => {
      if (!t) return ['– ยังไม่มีข้อมูลตัวละคร (เล่นในเกม 1 เดือนก่อน แล้วกดตรวจอีกครั้ง)'];
      const out = [];
      const miss = STATE_REQUIRED.filter((k) => t[k] === undefined);
      out.push(miss.length ? `✖ state ไม่มีฟิลด์: ${miss.join(', ')}` : '✔ state ครบ');
      const sm = (statKeys ?? []).filter((k) => t.stats?.[k] === undefined);
      if (sm.length) out.push(`✖ stats ไม่มีค่า: ${sm.join(', ')}`);
      out.push(t.martial ? '✔ martial' : '– martial: ไม่มี (ตัวละครไม่ได้อยู่สายยุทธ์)');
      out.push(t.pending ? `✔ pending: ${t.pending.kind} ${t.pending.id}` : '– pending: ไม่มีอีเว้นต์ค้าง');
      return out;
    };
    const SIM_KEYS = ['majorTexts', 'majorEvent', 'events', 'rarityFor', 'openOptions', 'statOdds'];
    // ชื่อย่อของ sim ใน app chunk (pure, ห้าม throw, ห้ามอ้างตัวแปรนอกตัวฟังก์ชัน: shim ฝังด้วย toString)
    // รูปร่างมาจาก tools/locate-sim.mjs (พิสูจน์กับ 3 build); ต้องเจอชื่อละ 1 ที่ประกาศ ไม่งั้นคืน null
    const simNames = (src) => {
      const s = typeof src === 'string' ? src : '';
      const id = '[A-Za-z0-9_$]+';
      const esc = (x) => x.replace(/\$/g, '\\$');
      const one = (re) => {
        const all = [...s.matchAll(re)];
        return all.length === 1 ? all[0][1] : null;
      };
      // รายชื่อคีย์ต้องประกาศในฟังก์ชันนี้เอง เพราะ shim ฝัง simNames ด้วย toString แล้วไม่มีตัวแปรนอกฟังก์ชันให้อ้าง
      const keys = ['majorTexts', 'majorEvent', 'events', 'rarityFor', 'openOptions', 'statOdds'];
      const mt = s.match(new RegExp('function (' + id + ')\\(e,t=(' + id + ')\\(e\\.pending\\?\\.id\\),n=e\\.pending\\?\\.npc\\)'));
      if (!mt) return null;
      const out = { majorTexts: mt[1], majorEvent: mt[2] };
      out.events = one(new RegExp('[,; ]' + esc(out.majorEvent) + '=e=>(' + id + ')\\.get\\(e\\)', 'g'));
      out.rarityFor = one(new RegExp('(' + id + ')=e=>e\\.story\\?' + id + '\\(' + id + '\\.get\\(e\\.story\\)\\):' + id + '\\(e\\)', 'g'));
      out.openOptions = one(new RegExp('[,; ](' + id + ')=\\(e,t\\)=>\\{let n=t\\.options\\.filter\\(', 'g'));
      // statOdds: หา call site ของข้อความ "small","odds" แล้วไล่ chain ${a(b(c( — ไม่ผูกกับชื่อ helper แปลภาษา
      out.statOdds = one(new RegExp(id + '\\("small","odds",""\\)[^]{0,250}?\\$\\{' + id + '\\(' + id + '\\(' + '(' + id + ')' + '\\(', 'g'));
      for (const k of keys) {
        if (!out[k]) return null;
        // ต้องมีที่ประกาศเดียว: function X( หรือ X=... (ตัด ==/===/=> ที่ไม่ใช่การประกาศออก)
        const defs = [...s.matchAll(new RegExp('(?:function\\s+' + esc(out[k]) + '\\s*\\(|' + esc(out[k]) + '\\s*=[^=>])', 'g'))];
        if (defs.length !== 1) return null;
      }
      return out;
    };
    // เขียน specifier สัมพัทธ์ "…from\"./" "…import\"./" "…import(\"./" เป็น URL เต็ม (pure, ห้าม throw)
    // "./" ที่ไม่ตามหลัง from/import ต้องไม่ถูกแตะ
    const absolutize = (src, base) => {
      const s = typeof src === 'string' ? src : '';
      let n = 0;
      const out = s.replace(/((?:\bfrom|\bimport)\s*\(?\s*)"\.\//g, (m, head) => { n++; return head + '"' + base; });
      return { src: out, n };
    };
    // บรรทัดเปิด sim ต่อท้าย app module (pure; รายชื่อคีย์ในฟังก์ชันเองเพราะ shim ฝังด้วย toString)
    const simPatch = (names) => ';window.__woxSim={' + ['majorTexts', 'majorEvent', 'events', 'rarityFor', 'openOptions', 'statOdds'].map((k) => k + ':' + names[k]).join(',') + '};';
    // import map สำหรับ app URL เดียว (pure)
    const importMapJson = (appUrl, shimUrl) => JSON.stringify({ imports: { [String(appUrl)]: String(shimUrl) } });
    return { pick, IS, chunkChain, TIER_LBL, RAR_LBL, RAR_ORDER, tierOf, tierIdx, itemOrder, tierMatches, numOr, numOrKeep, chunkUrl, usableManifest, diffManifest, coreLoaded, keepTables, isStalePanel, EV_UNSUPPORTED, TABLES, STATE_REQUIRED, STATE_OPTIONAL, tableLines, stateLines, SIM_KEYS, simNames, absolutize, simPatch, importMapJson };
  })();
  // Node (เทส) โหลดไฟล์นี้แบบ CommonJS แล้วได้ LOC ทันทีโดยไม่แตะ DOM/localStorage
  if (typeof document === 'undefined') { module.exports = LOC; return; }
  const VERSION = '3.3.3'; // ต้องตรงกับ @version ด้านบน (tools/release.mjs ตรวจให้)
  const STATS = [['body', 'ร่างกาย'], ['mind', 'จิต'], ['will', 'ใจ'], ['charm', 'เสน่ห์'], ['luck', 'โชค']];
  let t = null, ITEMS = null, REALMS = null, TIERS = null, SIM = null, MJ = null, EVENTS = [];
  // tables = ตารางที่อ่านได้สะสมข้ามรอบ (F2); chainCache = ชื่อ chunk ที่หาได้แล้ว ใช้ข้าม fetch สามไฟล์ตอน retry (R2)
  let tables = null, chainCache = null;

  // จับ state ตอนเกมเซฟ (ต้องเกิดอย่างน้อย 1 ครั้ง)
  const orig = JSON.stringify;
  JSON.stringify = function (o, r, s) {
    // ต้องไม่ทำให้เกมพัง: proxy หรือ object แปลกที่ прибор 'in' แล้ว throw ให้ข้ามการจับ state
    let hit = false;
    try { hit = !!o && typeof o === 'object' && 'money' in o && 'stats' in o && 'ageMonths' in o; } catch { hit = false; }
    if (hit) t = o;
    return orig.call(this, o, r, s);
  };

  const norm = (x) => String(x ?? '').toLowerCase();
  const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get: (k) => { try { return localStorage.getItem('woxed.' + k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem('woxed.' + k, v); } catch { /* ignore */ } },
  };

  // สีและฟอนต์อิงจากธีมของเกม (jade / paper / cinnabar) ให้แผงดูเป็นส่วนเดียวกับเกม
  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    /* ธีม Jade Ink: มืดเป็นค่าเริ่มต้น สว่างตามระบบ (paper/jade/cinnabar ของเกม) */
    .w {
      --bg:#0e1715; --surface:#152320; --raised:#1d322d; --field:#0b1311;
      --ink:#e6efeb; --muted:#9bb0a8; --line:#243a34; --line-strong:#4a6c62;
      --jade:#4fa58a; --jade-h:#66b89e; --on-jade:#0c1a16;
      --cinnabar:#ef8478; --ok:#5fc07a; --focus:#8fe0c6; --gold:#e0b252; --glow:0 0 0 3px rgba(79,165,138,.28);
      --shadow:0 14px 40px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.05);
      --sp-1:4px; --sp-2:8px; --sp-3:12px; --ctl:34px; --r:8px;
      position: fixed; top: 12px; right: 12px; z-index: 2147483647;
      width: min(356px, calc(100vw - 24px)); max-height: calc(100vh - 24px);
      display: flex; flex-direction: column; overflow: hidden;
      background: var(--bg); color: var(--ink);
      border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow);
      font: 13px/1.5 var(--font-body, system-ui, "Noto Sans Thai", "Segoe UI", sans-serif);
    }
    @media (prefers-color-scheme: light) {
      .w {
        --bg:#e9efea; --surface:#f6f9f6; --raised:#e1ede6; --field:#fbfdfb;
        --ink:#1d2724; --muted:#53645e; --line:#c9d6cf; --line-strong:#6f877d;
        --jade:#2c6b59; --jade-h:#1f4f42; --on-jade:#fff;
        --cinnabar:#a8352a; --ok:#2c7a3d; --focus:#2c6b59; --gold:#7a5a0e; --glow:0 0 0 3px rgba(44,107,89,.22);
        --shadow:0 8px 28px rgba(29,39,36,.22);
      }
    }
    @media (pointer: coarse) { .w { --ctl:44px; } }
    .w[data-min="1"] { width: auto; max-height: none; }
    .w[data-min="1"] .body, .w[data-min="1"] .tabs { display: none; }
    .w[data-min="1"] .ttl span { display: none; }
    header { cursor: grab; touch-action: none; display: flex; align-items: center; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3); background: linear-gradient(135deg, color-mix(in srgb, var(--jade) 24%, var(--surface)), var(--surface) 62%); border-bottom: 1px solid var(--line); }
    .w[data-min="1"] header { border-bottom: 0; }
    header.drag { cursor: grabbing; }
    .ttl { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: var(--sp-2); flex: 1; min-width: 0; font-family: var(--font-display, inherit); }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--cinnabar); flex: none; }
    .dot.on { background: var(--ok); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ok) 25%, transparent), 0 0 8px var(--ok); }
    .st { font-size: 12px; color: var(--muted); font-weight: 400; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ver { font: 11px/1 ui-monospace, Consolas, monospace; color: var(--gold); border: 1px solid color-mix(in srgb, var(--gold) 45%, transparent); border-radius: 999px; padding: 2px 7px; }
    .tabs { display: flex; gap: 2px; padding: 0 var(--sp-2); background: var(--surface); border-bottom: 1px solid var(--line); }
    .tabs button {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
      min-height: var(--ctl); padding: 0 4px; border: 0; border-bottom: 2px solid transparent; background: none;
      color: var(--muted); font: inherit; cursor: pointer; white-space: nowrap;
    }
    .tabs button svg { width: 15px; height: 15px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .tabs button:hover { color: var(--ink); background: var(--raised); }
    .tabs button[aria-selected="true"] { color: var(--jade); border-bottom-color: var(--jade); font-weight: 700; background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--jade) 16%, transparent)); }
    .body { overflow: auto; padding: var(--sp-3); scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent; }
    section { margin: 0 0 var(--sp-2); padding: var(--sp-1) var(--sp-3) var(--sp-3); background: var(--surface); border: 1px solid var(--line); border-radius: 10px; }
    section:last-child { margin-bottom: 0; }
    h3 { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: var(--gold); }
    summary { display: flex; align-items: center; gap: 6px; min-height: var(--ctl); margin: 0 calc(var(--sp-1) * -1); padding: 0 var(--sp-1); border-radius: 6px; cursor: pointer; list-style: none; font-weight: 700; color: var(--gold); user-select: none; }
    summary::-webkit-details-marker { display: none; }
    summary::before { content: ""; width: 6px; height: 6px; border-right: 2px solid var(--muted); border-bottom: 2px solid var(--muted); transform: rotate(-45deg); margin: 0 4px 0 2px; transition: transform .15s ease; }
    details[open] > summary::before { transform: rotate(45deg); }
    summary:hover { background: var(--raised); }
    #hbag { max-height: 240px; overflow: auto; }
    .chk { display: flex; align-items: center; gap: var(--sp-2); min-height: var(--ctl); cursor: pointer; }
    .chk input { width: 16px; min-height: 0; accent-color: var(--jade); }
    .hint { color: var(--muted); font-size: 12px; margin: var(--sp-1) 0 0; }
    .row { display: grid; grid-template-columns: 1fr 84px auto; gap: 6px; align-items: center; margin-bottom: 5px; }
    .row.two { grid-template-columns: 1fr auto; }
    .field { display: grid; gap: 3px; margin-bottom: 7px; }
    .field > label { color: var(--muted); font-size: 12px; }
    .row > label { color: var(--ink); }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    input, select {
      width: 100%; min-height: var(--ctl); padding: 4px var(--sp-2); font: inherit; color: var(--ink);
      background: var(--field); border: 1px solid var(--line-strong); border-radius: 6px;
    }
    input::placeholder { color: var(--muted); }
    select[size] { padding: 2px; }
    select[size] option { padding: 5px var(--sp-2); border-radius: 4px; }
    select option { background: var(--field); color: var(--ink); }
    input[type=number] { font-variant-numeric: tabular-nums; text-align: right; }
    input:focus, select:focus { border-color: var(--jade); box-shadow: var(--glow); }
    button.b {
      min-height: var(--ctl); padding: 4px var(--sp-3); font: inherit; cursor: pointer; color: var(--ink);
      background: var(--raised); border: 1px solid var(--line-strong); border-radius: 6px; white-space: nowrap;
      transition: background-color .15s ease, border-color .15s ease;
    }
    button.b:hover { border-color: var(--jade); }
    button.b:active { background: var(--line); }
    button.b.pri { background: linear-gradient(180deg, var(--jade-h), var(--jade)); border-color: var(--jade); color: var(--on-jade); font-weight: 700; box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 2px 8px color-mix(in srgb, var(--jade) 30%, transparent); }
    button.b.pri:hover { background: var(--jade-h); border-color: var(--jade-h); }
    button.b.pri:active { background: var(--jade); }
    button.b.dng { color: var(--cinnabar); border-color: var(--cinnabar); }
    button.b.wide { width: 100%; }
    .ico { min-width: var(--ctl); min-height: var(--ctl); padding: 4px var(--sp-2); background: none; border: 1px solid transparent; border-radius: 6px; cursor: pointer; color: var(--muted); font: inherit; }
    .ico:hover { background: var(--raised); color: var(--ink); }
    :focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
    .bagrow { display: grid; grid-template-columns: 1fr 70px auto auto; gap: 6px; align-items: center; margin-bottom: 5px; }
    .bagrow .nm { overflow-wrap: anywhere; }
    .aibadge { position: fixed; z-index: 2147483000; pointer-events: none; padding: 1px 6px; border-radius: 10px; font: 700 12px/1.5 system-ui, sans-serif; white-space: nowrap; background: #e9efea; color: #53645e; box-shadow: 0 0 0 1px #c9d6cf; }
    .aibadge.best { background: #2c6b59; color: #fff; box-shadow: none; }
    .rdot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 4px; vertical-align: middle; box-shadow: 0 0 0 1px var(--line-strong); }
    .rtxt { color: var(--muted); font-size: 11px; }
    .empty { color: var(--muted); padding: var(--sp-2) 0; }
    .desc { background: var(--field); border: 1px solid var(--line); border-radius: 6px; padding: var(--sp-2) 10px; margin: 6px 0; color: var(--ink); min-height: 40px; }
    .toast { position: absolute; left: 10px; right: 10px; bottom: 10px; background: var(--jade); color: var(--on-jade); font-weight: 600; padding: var(--sp-2) var(--sp-3); border-radius: 6px; font-size: 12.5px; box-shadow: var(--shadow); }
    .toast[hidden] { display: none; }
    .toast.err { background: var(--cinnabar); color: var(--on-jade); }
    #hchk, #hupd { white-space: pre-wrap; font: 12px/1.6 ui-monospace, Consolas, monospace; color: var(--ink); margin: 6px 0; overflow-wrap: anywhere; }
    #hupd:empty { display: none; }
    [hidden] { display: none !important; }
    @media (prefers-reduced-motion: no-preference) { .toast { animation: tin .15s ease-out; } @keyframes tin { from { opacity: 0; transform: translateY(4px); } } }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
  `;

  addEventListener('DOMContentLoaded', () => {
    const host = document.createElement('div');
    host.dataset.woxed = VERSION; // แผงรุ่นหลังรู้จักกันด้วยค่านี้ ไม่ต้องอ่านเนื้อหา shadow root
    const root = host.attachShadow({ mode: 'open' });
    const $ = (id) => root.getElementById(id);
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="w" id="w" role="region" aria-label="WoX Editor">
        <header>
          <div class="ttl"><i class="dot" id="dot"></i><b>WoX Editor</b><span class="ver">v${VERSION}</span><span class="st" id="hs">รอข้อมูลเกม</span></div>
          <button class="ico" id="hx" aria-expanded="true" aria-label="ย่อแผง" title="ย่อ/ขยาย">▾</button>
        </header>
        <div class="tabs" role="tablist">
          <button role="tab" data-tab="main" aria-selected="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></svg><span>ค่าหลัก</span></button>
          <button role="tab" data-tab="bag" aria-selected="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg><span>กระเป๋า</span></button>
          <button role="tab" data-tab="ev" aria-selected="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg><span>อีเว้นต์</span></button>
          <button role="tab" data-tab="ai" aria-selected="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/></svg><span>ช่วยเลือก</span></button>
        </div>
        <div class="body">
          <div data-pane="main">
            <section>
              <h3>เงิน</h3>
              <div class="row two"><input id="hm" type="number" aria-label="เงิน"><button class="b pri" id="hmb">บันทึกเงิน</button></div>
            </section>
            <section>
              <h3>ค่าพลังหลัก</h3>
              ${STATS.map(([k, n]) => `<div class="row two" style="grid-template-columns:1fr 84px auto"><label for="s_${k}">${n}</label><input id="s_${k}" type="number"><button class="b" data-s="${k}">ตั้ง</button></div>`).join('')}
              <button class="b pri wide" id="hsa">บันทึกทุกค่าพลัง</button>
            </section>
            <section>
              <h3>กรรมและชื่อเสียง</h3>
              <div class="row"><label for="h_karma">กรรม</label><input id="h_karma" type="number"><button class="b" data-n="karma">ตั้ง</button></div>
              <div class="row"><label for="h_fame">ชื่อเสียง</label><input id="h_fame" type="number"><button class="b" data-n="fame">ตั้ง</button></div>
            </section>
            <section>
              <h3>ระดับการฝึกฝน</h3>
              <div class="field"><label for="h_realm">ขั้นพลัง</label><select id="h_realm"></select></div>
              <div class="pair">
                <div class="field"><label for="h_layer">ชั้น</label><input id="h_layer" type="number"></div>
                <div class="field"><label for="h_qi">ปราณ</label><input id="h_qi" type="number"></div>
              </div>
              <button class="b pri wide" id="hrl">บันทึกระดับฝึกฝน</button>
            </section>
            <section>
              <h3>สายยุทธ์</h3>
              <p class="hint" id="h_mst" style="margin:0 0 6px"></p>
              <div class="field"><label for="h_mrank">ระดับ</label><select id="h_mrank"></select></div>
              <div class="pair">
                <div class="field"><label for="h_mstage">ขั้น</label><select id="h_mstage"><option value="1">ต้น</option><option value="2">กลาง</option><option value="3">ปลาย</option></select></div>
                <div class="field"><label for="h_mforce">พลังภายใน</label><input id="h_mforce" type="number"></div>
              </div>
              <button class="b pri wide" id="hmr">บันทึกสายยุทธ์</button>
            </section>
            <section>
              <h3>ตรวจระบบ</h3>
              <div id="hupd" aria-live="assertive"></div>
              <div id="hchk" aria-live="polite">กดปุ่มเพื่อตรวจว่าเกมยังมีชื่อที่สคริปต์ใช้ครบไหม</div>
              <button class="b wide" id="hchkb">ตรวจอีกครั้ง</button>
            </section>
          </div>

          <div data-pane="bag" hidden>
            <section>
              <h3>ในกระเป๋า</h3>
              <div id="hbag"></div>
            </section>
            <section>
              <h3>เพิ่มไอเทม</h3>
              <div class="field"><label for="hq">ค้นหาชื่อไอเทม</label><input id="hq" type="search" placeholder="เช่น กระบี่ หรือ คัมภีร์" autocomplete="off"></div>
              <div class="field"><label for="hqr">ระดับความหายาก</label><select id="hqr"></select></div>
              <select id="hit" size="8" aria-label="ผลการค้นหาไอเทม"></select>
              <p class="hint" id="hqn"></p>
              <div class="row two" style="margin-top:8px;grid-template-columns:auto 84px 1fr"><label for="hn">จำนวน</label><input id="hn" type="number" value="1" min="1"><button class="b pri" id="hadd">เพิ่มลงกระเป๋า</button></div>
            </section>
          </div>

          <div data-pane="ev" hidden>
            <section>
              <h3>เรียกอีเว้นต์ใหญ่</h3>
              <div class="field"><label for="hevg">สาย</label><select id="hevg"></select></div>
              <div class="field"><label for="hevr">ระดับความหายาก</label><select id="hevr"></select></div>
              <div class="field"><label for="hevq">ค้นหาชื่ออีเว้นต์</label><input id="hevq" type="search" autocomplete="off"></div>
              <select id="hevl" size="9" aria-label="ผลการค้นหาอีเว้นต์"></select>
              <p class="hint" id="hevn"></p>
              <div class="desc" id="hevd" aria-live="polite"></div>
              <button class="b pri wide" id="hevb">เรียกอีเว้นต์นี้</button>
              <p class="hint">หลังเรียก ให้ทำอะไรในเกมสักอย่าง เช่น เปิดเมนูหรือเดินเวลา การ์ดอีเว้นต์จึงจะขึ้น</p>
            </section>
          </div>

          <div data-pane="ai" hidden>
            <section>
              <h3>เลือกคำตอบให้ตัวละคร</h3>
              <div class="field"><label for="ai_preset">เน้นผลลัพธ์แบบไหน</label>
                <select id="ai_preset">
                  <option value="balanced">สมดุล</option><option value="money">เน้นเงิน</option><option value="virtue">เน้นกรรมดีและชื่อเสียง</option>
                  <option value="power">เน้นพลังและการฝึกฝน</option><option value="safe">ปลอดภัยไว้ก่อน</option>
                </select></div>
              <label class="chk"><input type="checkbox" id="ai_mark"> ติดป้าย "แนะนำ" ที่ตัวเลือกบนการ์ด</label>
              <label class="chk"><input type="checkbox" id="ai_auto"> กดตัวเลือกที่ดีที่สุดให้อัตโนมัติ</label>
              <div class="field" style="margin-top:6px"><label for="ai_delay">หน่วงก่อนกด (มิลลิวินาที)</label><input id="ai_delay" type="number" min="200" step="100"></div>
              <div id="ai_out" class="desc" style="white-space:pre-line" aria-live="polite"></div>
              <p class="hint">คะแนน = โอกาสสำเร็จ × ผลเมื่อสำเร็จ + โอกาสพลาด × ผลเมื่อพลาด โดยถ่วงน้ำหนักตามตัวเลือกด้านบน ไอเทม เรื่องราวต่อเนื่อง และผลที่ตามมาทีหลังไม่ถูกนับ ผลที่ดูเหมือนทำให้ตายถูกตัดคะแนนหนัก ตัวเลือกที่สคริปต์อ่านผลไม่ได้จะไม่ถูกกดอัตโนมัติ</p>
            </section>
          </div>
        </div>
        <div class="toast" id="toast" role="status" hidden></div>
      </div>`;
    // เกมดักปุ่มตัวเลข/ช่องว่างที่ document (ดู event.target ซึ่งถูก retarget เป็น host)
    // จึงหยุดการส่งต่อของคีย์ที่มาจากช่องกรอกในแผงนี้ ให้พิมพ์ได้ปกติ
    for (const t of ['keydown', 'keypress', 'keyup']) {
      host.addEventListener(t, (e) => {
        const el = e.composedPath()[0];
        if (el?.matches?.('input, textarea, select, [contenteditable]')) e.stopPropagation();
      });
    }
    document.body.appendChild(host);
    // สคริปต์รุ่นเก่า (v3.0.0-3.3.1) ที่ยังค้างอยู่ใน Tampermonkey จะวาดแผงซ้อนทับ จึงลบเฉพาะแผงของรุ่นนั้น
    // ตัวระบุ: div ลูกตรงของ body + มี shadow root + .w#w aria-label="WoX Editor" (ไม่ใช้ข้อความในเนื้อหา เพราะอาจลบของคนอื่น)
    // (เฝ้าเฉพาะลูกตรงของ body เพื่อจับแผงที่มาทีหลัง; การลบไม่ทำให้เกิดการวนซ้ำ)
    const dropStalePanels = () => {
      for (const d of Array.from(document.body.children)) {
        const info = {
          tag: d.tagName, hasShadow: !!d.shadowRoot, ours: d === host || 'woxed' in d.dataset,
          label: d.shadowRoot?.querySelector('#w')?.getAttribute('aria-label') ?? null,
        };
        if (LOC.isStalePanel(info)) d.remove();
      }
    };
    dropStalePanels();
    new MutationObserver(dropStalePanels).observe(document.body, { childList: true });

    // ทุกหมวด (h3) พับ/กางได้ และจำสถานะไว้
    root.querySelectorAll('section').forEach((sec) => {
      const h = sec.querySelector('h3'); if (!h) return;
      const key = 'sec.' + h.textContent;
      const det = document.createElement('details'), sum = document.createElement('summary');
      sum.textContent = h.textContent; h.remove();
      det.open = store.get(key) !== '0';
      det.addEventListener('toggle', () => store.set(key, det.open ? '1' : '0'));
      while (sec.firstChild) det.appendChild(sec.firstChild);
      det.prepend(sum); sec.appendChild(det);
    });

    const w = $('w');

    // ลากหัวแผงเพื่อย้ายตำแหน่งได้อิสระ (จำตำแหน่งไว้)
    const place = (x, y) => {
      const r = w.getBoundingClientRect();
      x = Math.max(0, Math.min(innerWidth - r.width, x)); y = Math.max(0, Math.min(innerHeight - 40, y));
      w.style.left = x + 'px'; w.style.top = y + 'px'; w.style.right = 'auto';
      return [x, y];
    };
    try { const pos = JSON.parse(store.get('pos') || 'null'); if (pos) place(pos[0], pos[1]); } catch { /* ignore */ }
    const head = root.querySelector('header');
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || e.button > 0) return;
      const r = w.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      head.setPointerCapture(e.pointerId); head.classList.add('drag');
      const mv = (m) => place(m.clientX - dx, m.clientY - dy);
      const up = () => {
        head.classList.remove('drag'); head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up);
        store.set('pos', JSON.stringify([parseFloat(w.style.left), parseFloat(w.style.top)]));
      };
      head.addEventListener('pointermove', mv); head.addEventListener('pointerup', up);
    });
    addEventListener('resize', () => { if (w.style.left) place(parseFloat(w.style.left), parseFloat(w.style.top)); });
    const setMin = (m) => {
      w.dataset.min = m ? '1' : '0';
      $('hx').textContent = m ? '▸' : '▾';
      $('hx').setAttribute('aria-expanded', String(!m));
      $('hx').setAttribute('aria-label', m ? 'ขยายแผง' : 'ย่อแผง');
      store.set('min', m ? '1' : '0');
    };
    setMin(store.get('min') === '1');
    $('hx').onclick = () => setMin(w.dataset.min !== '1');

    let toastTimer;
    const toast = (msg, err) => {
      const el = $('toast');
      el.textContent = msg; el.classList.toggle('err', !!err); el.hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
    };

    const showTab = (k) => {
      root.querySelectorAll('[data-pane]').forEach((d) => { d.hidden = d.dataset.pane !== k; });
      root.querySelectorAll('[role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
      store.set('tab', k);
      if (k === 'ev' && SIM) drawEvents();
    };
    showTab(store.get('tab') || 'main');

    // ---------- รายการไอเทม / อีเว้นต์ (ค้นหาด้วยชื่อ) ----------
    // ตารางป้ายระดับอยู่ใน LOC แล้ว (เทสเรียกได้) ที่นี่ใช้ชื่อเดิมชี้ไปที่ค่าเดียวกัน
    const TIER_LBL = LOC.TIER_LBL;
    const RAR_LBL = LOC.RAR_LBL;
    const rarDot = (c) => `<i class="rdot" style="background:${c}"></i>`;
    const itemRar = (i) => LOC.tierOf(i, TIERS);
    const RAR_ORDER = LOC.RAR_ORDER;
    const evKey = (e) => { try { return SIM?.rarityFor?.(e) ?? 'common'; } catch { return 'common'; } };
    const evRar = (e) => RAR_LBL[evKey(e)] ?? RAR_LBL.common;
    // ลำดับชั้นของไอเทม: ใช้ LOC.tierIdx (null = จับคู่แถว TIERS ไม่ได้)
    // ตัวเลือกกรองมีชุดเดียวคือขั้นของเกม เพราะไอเทมที่แผงแสดง (ตารางที่มี woodSword) ใช้ tier ตัวเลขชุดเดียวกับ TIERS
    // ไอเทมที่ tier เป็นชื่อ (ชุดเครื่องประดับ) อยู่ในตารางอีกตัวที่ IS.items ไม่รับ จึงไม่ต้องมีตัวเลือกให้กรอง
    $('hqr').innerHTML = '<option value="all">ทุกระดับ</option>' + TIER_LBL.map(([n], k) => `<option value="${k}">${n}</option>`).join('');
    $('hevr').innerHTML = '<option value="all">ทุกระดับ</option>' + RAR_ORDER.map((k) => `<option value="${k}">${RAR_LBL[k][0]}</option>`).join('');
    let itemList = [];
    const drawItems = () => {
      const q = norm($('hq').value).trim(), r = $('hqr').value;
      // เรียงหายากก่อน (ขั้นสูงไปต่ำ) แล้วตามประเภทช่อง; ไอเทมที่รู้ระดับไม่ได้อยู่ท้ายและเห็นได้ทุกตัวกรอง
      const hit = itemList
        .filter((i) => LOC.tierMatches(i, r) && (!q || norm(i.th).includes(q) || norm(i.en).includes(q) || norm(i.id).includes(q)))
        .sort(LOC.itemOrder);
      $('hit').innerHTML = hit.slice(0, 300).map((i) => `<option value="${esc(i.id)}">[${esc(itemRar(i)[0])}] ${esc(i.th)}  ·  ${esc(i.slot)}</option>`).join('');
      if ($('hit').options.length) $('hit').selectedIndex = 0;
      $('hqn').textContent = hit.length ? `พบ ${hit.length} รายการ${hit.length > 300 ? ' (แสดง 300 รายการแรก)' : ''}` : 'ไม่พบไอเทมที่ตรงกับคำค้น ลองใช้คำสั้นลง';
    };
    $('hq').oninput = drawItems; $('hqr').onchange = drawItems;

    const evTitle = (e) => [e.th?.title, e.en?.title, e.th, e.en].find((x) => typeof x === 'string' && x.trim()) ?? e.id;
    const showEv = () => {
      const e = EVENTS.find((x) => x.id === $('hevl').value);
      $('hevd').textContent = e ? (e.th?.text ?? '').slice(0, 200) : 'เลือกอีเว้นต์เพื่อดูรายละเอียด';
    };
    const GROUPS = [['all', 'ทุกสาย'], ['major', 'ชีวิตทั่วไป'], ['people', 'ผู้คน / ความสัมพันธ์'], ['sect', 'สำนัก'], ['status', 'สถานะ / อาชีพ'],
      ['story', 'เรื่องราวต่อเนื่อง'], ['trip', 'เดินทาง / ดันเจี้ยน'], ['arc', 'ฉากใหญ่ (arc)'], ['other', 'อื่นๆ']];
    $('hevg').innerHTML = GROUPS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
    const GROUP_OF = new Map();
    // รวมอีเว้นต์ที่มีตัวเลือกทุกสายของเกม (เรื่องราวบางชุดโหลดทีหลัง จึงสร้างใหม่ทุกครั้งที่เปิดแท็บ)
    const buildEvents = () => {
      if (!SIM?.allMajors) return;
      GROUP_OF.clear();
      try {
        const a = SIM.eventsForAudit();
        for (const g of ['major', 'people', 'sect', 'status', 'story', 'trip', 'arc']) for (const e of a[g] ?? []) if (e?.id && !GROUP_OF.has(e.id)) GROUP_OF.set(e.id, g);
      } catch { /* ใช้กลุ่ม "อื่นๆ" */ }
      const seen = new Set();
      EVENTS = [...SIM.allMajors(), ...(MJ?.LIFE_PATH ? [MJ.LIFE_PATH] : [])].filter((e) => e && e.id && e.options?.length && !seen.has(e.id) && seen.add(e.id));
    };
    const drawEvents = () => {
      buildEvents();
      // เกมแบบ bundle ยังไม่มีแหล่งข้อมูลอีเว้นต์: ห้ามลงว่า "ไม่พบ" เพราะผู้ใช้จะคิดว่าค้นผิด
      if (!SIM && !EVENTS.length) { $('hevn').textContent = LOC.EV_UNSUPPORTED; return; }
      const q = norm($('hevq').value).trim(), g = $('hevg').value, r = $('hevr').value;
      const key = new Map(EVENTS.map((e) => [e.id, evKey(e)]));
      // เรียงหายากก่อน (ตำนานไปธรรมดา) แล้วตามชื่อ
      const hit = EVENTS
        .filter((e) => (g === 'all' || (GROUP_OF.get(e.id) ?? 'other') === g) && (r === 'all' || key.get(e.id) === r) && (!q || norm(evTitle(e)).includes(q) || norm(e.en?.title).includes(q) || norm(e.id).includes(q)))
        .sort((a, b) => RAR_ORDER.indexOf(key.get(b.id)) - RAR_ORDER.indexOf(key.get(a.id)) || evTitle(a).localeCompare(evTitle(b), 'th'));
      $('hevl').innerHTML = hit.slice(0, 300).map((e) => `<option value="${esc(e.id)}">[${esc(evRar(e)[0])}] ${esc(evTitle(e))}</option>`).join('');
      if ($('hevl').options.length) $('hevl').selectedIndex = 0;
      $('hevn').textContent = hit.length ? `พบ ${hit.length} อีเว้นต์` : 'ไม่พบอีเว้นต์ที่ตรงกับคำค้น';
      showEv();
    };
    $('hevq').oninput = drawEvents; $('hevg').onchange = drawEvents; $('hevr').onchange = drawEvents;
    $('hevl').onchange = showEv;

    // ---------- โหลดตารางข้อมูลจาก chunk ของเกม (เกมแบบ bundle ไม่มี /src/*.js แล้ว) ----------
    // หน้า wiki ใช้ entry อื่น: ห้าม fetch/import chunk ของเกมเลย
    const isWiki = () => !!document.querySelector('meta[name="wox-entry"][content="wiki"]');
    // ต้องรอจน hook JSON.stringify ได้ state ก่อน ไม่งั้น chunk หลัก throw ตอน top-level และเกมหยุด
    const waitState = (ms = 120000) => new Promise((res) => {
      const t0 = Date.now();
      const step = () => {
        if (t || Date.now() - t0 >= ms) return res(!!t);
        setTimeout(step, 500);
      };
      step();
    });
    // คืนค่าที่หาไม่เจอเป็น null และไม่ throw (แผงเป็นคนบอกผู้ใช้); build มาจาก /src/build.js ที่ยังได้ 200
    const loadCore = async () => {
      // where = ชื่อไฟล์ chunk ที่เจอตารางนั้น (แผงตรวจระบบใช้อ้างอิง); boot/app/core ใช้เก็บฐานใน woxed.manifest
      // imported = import() chunk หลักสำเร็จครบทุกตัวหรือยัง; ตรวจระบบ/ตรวจอัปเดตอ่านค่านี้ก่อนลงว่าตารางหาย
      // failed = path ของ chunk ที่ import ไม่ได้ (แผงตรวจระบบใช้บอกว่า "ยังไม่แน่ใจ" ไม่ใช่ "หาไม่เจอ")
      // reason = 'no-state' เมื่อรอ state ครบ 2 นาทีแล้วยังไม่ได้ (แผงบอกผู้ใช้ให้เล่นต่อ)
      const out = {
        build: '', boot: '', app: null, core: [], imported: false, failed: [], reason: '',
        where: { realms: '', martialRanks: '', tiers: '', items: '' },
        realms: null, martialRanks: null, tiers: null, items: null,
      };
      if (isWiki()) return out;
      const text = async (url) => {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error(url + ' ตอบ ' + r.status);
        return r.text();
      };
      try {
        out.build = (await text('/src/build.js')).match(/BUILD\s*=\s*"([^"]+)"/)?.[1] ?? '';
      } catch { /* ไม่มี BUILD ก็ไม่เป็นไร */ }
      if (!(await waitState())) { out.reason = 'no-state'; return out; }
      try {
        // ชื่อ chunk ไม่เปลี่ยนตลอดอายุหน้า จึงจำ chain ที่หาได้ครบแล้วไว้ กัน fetch /, boot, app ซ้ำตอนกด "ตรวจอีกครั้ง"
        // import chunk ซ้ำไม่เสียเครือข่าย เพราะเบราว์เซอร์ใช้ module cache อยู่แล้ว
        let chain = chainCache;
        if (!chain) {
          const idx = await text('/');
          const bootPath = LOC.chunkChain(idx, '', '').boot;
          if (!bootPath) return out;
          const bootText = await text(bootPath);
          const appPath = LOC.chunkChain(idx, bootText, '').app;
          if (!appPath) return out;
          chain = LOC.chunkChain(idx, bootText, await text(appPath));
          if (chain.app && chain.core.length > 0) chainCache = chain;
        }
        out.boot = chain.boot;
        out.app = chain.app;
        out.core = chain.core;
        out.imported = chain.core.length > 0;
        const mods = [];
        for (const p of chain.core) {
          try {
            // path เต็มมาจาก boot file แล้ว จึงใช้ path นั้นสร้าง URL เอง ไม่ hardcode โฟลเดอร์ /b/
            // URL ต้องเหมือนที่เกมใช้ทุกตัวอักษรเพื่อได้ module instance เดิม (ไม่ใส่ query กันแคช)
            mods.push({ path: p, ns: await import(LOC.chunkUrl(p, location.origin)) });
          } catch { out.imported = false; out.failed.push(p); /* chunk หนึ่งโหลดไม่ได้ ต้องไม่ทำให้เกมหยุด */ }
        }
        // คืนทั้งค่าและชื่อไฟล์ chunk ที่เจอ เพื่อให้แผงตรวจระบบบอกได้ว่าตารางมาจากไฟล์ไหน
        const find = (test) => {
          for (const m of mods) {
            let v = null;
            try { v = LOC.pick(m.ns, test); } catch { v = null; }
            if (v) return { v, path: m.path };
          }
          return null;
        };
        for (const k of ['realms', 'martialRanks', 'tiers', 'items']) {
          const hit = find(LOC.IS[k]);
          if (!hit) continue;
          out[k] = hit.v;
          out.where[k] = hit.path.slice(hit.path.lastIndexOf('/') + 1);
        }
      } catch { /* ดึงชื่อ chunk ไม่ได้: คืนค่าที่มีอยู่ (null) */ }
      return out;
    };

    const ITEMS_FAIL = 'โหลดรายการไอเทมไม่ได้ ลองรีโหลดหน้าเกม หรือเกมเปลี่ยนโครงสร้างไอเทม ดูแผงตรวจระบบ';
    const renderCore = (c) => {
      if (isWiki()) return;
      // รวมกับตารางรอบก่อน: รอบนี้ที่โหลดไม่ครบต้องไม่ทำให้ตารางที่อ่านได้แล้วหาย (F2)
      tables = LOC.keepTables(tables, c);
      if (tables.realms) {
        REALMS = tables.realms;
        $('h_realm').innerHTML = REALMS.map((r, i) => `<option value="${i}">${i}: ${esc(r.th)} (${r.layers} ชั้น)</option>`).join('');
      }
      if (tables.martialRanks) {
        $('h_mrank').innerHTML = tables.martialRanks.map((r, i) => `<option value="${i}">${i}: ${esc(r.th)}</option>`).join('');
      }
      // ต้องตั้ง TIERS ก่อน drawItems() เพราะรายการไอเทมอ่านป้ายระดับจากตารางของเกม
      TIERS = tables.tiers;
      if (tables.items) {
        ITEMS = tables.items;
        // คัมภีร์วิชาเป็น non-enumerable จึงต้องใช้ getOwnPropertyNames
        itemList = Object.getOwnPropertyNames(tables.items).map((k) => tables.items[k]).filter((i) => i && i.id)
          .sort(LOC.itemOrder);
        drawItems();
      } else $('hqn').textContent = ITEMS_FAIL;
      // majors.js/sim.js ไม่มีในเกมแบบ bundle แล้ว จึงไม่ import (จะได้ 404)
      $('hevn').textContent = LOC.EV_UNSUPPORTED;
      fresh(true);
    };
    // promise เดียวใช้ร่วมกันทั้งวาดแผง ตรวจระบบ และตรวจอัปเดต: fetch index/boot/app ครั้งเดียวต่อรอบ
    // ถ้าผลออกมาไม่ครบ (fetch ล้ม หรือ state ยังไม่มา) หรือวาดแผง throw ให้ล้าง promise เพื่อให้กด "ตรวจอีกครั้ง" ลองใหม่ได้
    // บั๊กตอนวาดแผงต้องโผล่ใน console (ไม่ใช่ถูกกลืนเป็นข้อความในแผง) แต่ต้องไม่ทำให้ปุ่มตรวจอีกครั้งตาย
    let corePromise = null;
    const startCore = () => {
      const p = loadCore();
      corePromise = p;
      p.then((c) => {
        const done = LOC.coreLoaded(c); // ตัดสินใจก่อนวาด: renderCore อาจ throw
        let failed = false;
        try {
          renderCore(c); // วาดเท่าที่ได้ (renderCore จัดการตารางที่ไม่มาเอง)
        } catch (e) {
          failed = true;
          console.error('[WoX Editor]', e);
        }
        if ((!done || failed) && corePromise === p) corePromise = null; // ผลไม่ครบ/วาดพลาด: รอบหน้าตรวจใหม่ได้
      }, () => {
        if (corePromise === p) corePromise = null;
        $('hqn').textContent = ITEMS_FAIL;
      });
      return p;
    };
    // ใช้ promise ที่มีอยู่ ถ้าไม่มี (ยังไม่เริ่ม หรือรอบก่อนไม่ครบ) เริ่มรอบใหม่
    const getCore = () => corePromise ?? startCore();
    startCore();

    // ---------- แสดงค่าปัจจุบัน ----------
    const name = (id) => ITEMS?.[id]?.th ?? id;
    const fresh = (force) => {
      if (!t) return false;
      // ไม่เขียนทับช่องที่ผู้ใช้กำลังแก้: ครอบทั้งช่องกรอก ช่องเลือก และกล่องข้อความ
      if (force || !['INPUT', 'SELECT', 'TEXTAREA'].includes(root.activeElement?.tagName)) {
        $('h_mst').textContent = t.martial ? '' : 'ตัวละครนี้ไม่ได้อยู่สายยุทธ์ จึงแก้ส่วนนี้ไม่ได้';
        if (t.martial) { $('h_mrank').value = t.martial.rank; $('h_mstage').value = t.martial.stage; $('h_mforce').value = Math.round(t.martial.force ?? 0); }
        $('h_karma').value = t.karma ?? 0; $('h_fame').value = t.fame ?? 0;
        $('h_realm').value = t.realm ?? 0; $('h_layer').value = t.layer ?? 0; $('h_qi').value = Math.round(t.qi ?? 0);
        $('hm').value = t.money;
        for (const [k] of STATS) $('s_' + k).value = t.stats?.[k] ?? '';
      }
      const bag = t.bag ?? {};
      $('hbag').innerHTML = Object.keys(bag).length
        ? Object.entries(bag).map(([id, n]) => `<div class="bagrow"><span class="nm">${ITEMS?.[id] ? rarDot(itemRar(ITEMS[id])[1]) + ' ' : ''}${esc(name(id))}${ITEMS?.[id] ? ` <small class="rtxt">· ${esc(itemRar(ITEMS[id])[0])}</small>` : ''}</span><input data-b="${esc(id)}" type="number" value="${n}" aria-label="จำนวน ${esc(name(id))}"><button class="b" data-bset="${esc(id)}">ตั้ง</button><button class="b dng" data-bdel="${esc(id)}" aria-label="ลบ ${esc(name(id))}">ลบ</button></div>`).join('')
        : '<div class="empty">กระเป๋าว่าง เพิ่มไอเทมได้ด้านล่าง</div>';
      return true;
    };
    const setStat = (k, v) => {
      (t.stats ??= {})[k] = v;
      (t.capSeen ??= {})[k] = Math.max(t.capSeen[k] ?? 0, v); // กันเกมดึงค่ากลับลงตามเพดาน
    };

    // เขียน DOM เฉพาะเมื่อสถานะเปลี่ยน (ทุกวินาทีเดิมเขียนทับทุกครั้งโดยไม่จำเป็น)
    let lastOn = null;
    setInterval(() => {
      const on = !!t;
      if (on === lastOn) return;
      lastOn = on;
      $('dot').classList.toggle('on', on);
      $('hs').textContent = on ? 'เชื่อมต่อแล้ว' : 'รอข้อมูลเกม · เล่นในเกม 1 เดือน';
    }, 1000);

    // ---------- ปุ่มต่างๆ ----------
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      if (d.tab) return showTab(d.tab);
      if (b.id === 'hx') return;
      if (b.id === 'hchkb') return runHealth();
      if (!t) return toast('ยังไม่ได้รับข้อมูลเกม ให้เล่นในเกมสัก 1 เดือนก่อน', true);
      let msg = 'บันทึกแล้ว';
      // ช่องว่าง/ไม่ใช่ตัวเลข = ไม่เขียนอะไรทับค่าเดิม (เดิมเขียน 0 ทับ) แล้วบอกผู้ใช้
      if (b.id === 'hmb') {
        const money = LOC.numOr($('hm').value);
        if (money === null) return toast('ใส่ตัวเลขก่อน', true);
        t.money = money;
      } else if (b.id === 'hmr') {
        if (!t.martial) return toast('ตัวละครนี้ไม่ได้อยู่สายยุทธ์', true);
        // ยังอ่านตาราง MARTIAL_RANKS ไม่ได้ = ช่องเลือกว่าง; เขียนลงไปจะได้ rank 0 ทับค่าเดิม
        if (!$('h_mrank').options.length) return toast('ยังอ่านตารางระดับสายยุทธ์ไม่ได้ รอสักครู่แล้วลองใหม่', true);
        const rank = LOC.numOr($('h_mrank').value);
        if (rank === null) return toast('เลือกระดับสายยุทธ์ก่อน', true);
        t.martial.rank = rank;
        t.martial.stage = LOC.numOrKeep($('h_mstage').value, t.martial.stage);
        t.martial.force = LOC.numOrKeep($('h_mforce').value, t.martial.force);
      } else if (d.n) {
        const v = LOC.numOr($('h_' + d.n).value);
        if (v === null) return toast('ใส่ตัวเลขก่อน', true);
        t[d.n] = v;
      } else if (b.id === 'hrl') {
        // ยังอ่านตาราง REALMS ไม่ได้ = ช่องเลือกว่าง; เขียนลงไปจะได้ realm 0 ทับค่าเดิม
        if (!$('h_realm').options.length) return toast('ยังอ่านตารางขั้นพลังไม่ได้ รอสักครู่แล้วลองใหม่', true);
        const realm = LOC.numOr($('h_realm').value);
        if (realm === null) return toast('เลือกขั้นพลังก่อน', true);
        t.realm = realm;
        t.layer = LOC.numOrKeep($('h_layer').value, t.layer);
        t.qi = LOC.numOrKeep($('h_qi').value, t.qi);
        if (t.realm > 0) t.cultivating = true;
      } else if (d.s) {
        const v = LOC.numOr($('s_' + d.s).value);
        if (v === null) return toast('ใส่ตัวเลขก่อน', true);
        setStat(d.s, v);
      } else if (b.id === 'hsa') {
        // ข้ามช่องที่ว่าง เขียนเฉพาะช่องที่มีค่า; ว่างทั้งหมด = ไม่ทำอะไรและบอกผู้ใช้
        const filled = STATS.map(([k]) => [k, LOC.numOr($('s_' + k).value)]).filter(([, v]) => v !== null);
        if (!filled.length) return toast('ใส่ตัวเลขก่อน', true);
        for (const [k, v] of filled) setStat(k, v);
      } else if (d.bset) {
        const n = LOC.numOr(root.querySelector(`[data-b="${CSS_ESC(d.bset)}"]`).value);
        if (n === null) return toast('ใส่ตัวเลขก่อน', true);
        const v = Math.max(0, n); // 0 = ลบไอเทม; ตัวเลขติดลบไม่มีความหมาย จึงนับเป็น 0
        (t.bag ??= {}); v ? (t.bag[d.bset] = v) : delete t.bag[d.bset];
      } else if (d.bdel) { delete t.bag[d.bdel]; msg = 'ลบแล้ว'; }
      else if (b.id === 'hadd') {
        const id = $('hit').value, n = LOC.numOr($('hn').value);
        if (!ITEMS?.[id]) return toast('เลือกไอเทมจากรายการก่อน', true);
        if (n === null || n <= 0) return toast('ใส่จำนวนที่มากกว่า 0', true);
        (t.bag ??= {})[id] = (t.bag[id] ?? 0) + n;
        msg = `เพิ่ม ${name(id)} ×${n} แล้ว`;
      } else if (b.id === 'hevb') {
        if (!SIM && !EVENTS.length) return toast(LOC.EV_UNSUPPORTED, true);
        const ev = SIM?.majorEvent($('hevl').value) ?? EVENTS.find((x) => x.id === $('hevl').value);
        if (!ev) return toast('เลือกอีเว้นต์จากรายการก่อน', true);
        if (t.pending && !confirm('ตอนนี้มีอีเว้นต์ค้างอยู่ จะเขียนทับไหม')) return;
        t.pending = { kind: 'major', id: ev.id, options: ev.options.map((o) => o.id), rarity: SIM?.rarityFor ? SIM.rarityFor(ev) : undefined };
        msg = `เรียก "${evTitle(ev)}" แล้ว ทำอะไรในเกมสักอย่างเพื่อให้การ์ดขึ้น`;
      } else return;
      fresh(true);
      toast(msg);
    });
    const CSS_ESC = (s) => (window.CSS?.escape ? window.CSS.escape(s) :String(s).replace(/"/g, '\\"'));

    // คีย์ลัด: Enter ในช่องค้นหา/รายการ = เพิ่มไอเทม/เรียกอีเว้นต์, Enter ในช่องตัวเลข = กดปุ่มตั้งของแถวนั้น
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const id = e.target.id;
      if (id === 'hq' || id === 'hit' || id === 'hn') $('hadd').click();
      else if (id === 'hevq' || id === 'hevl') $('hevb').click();
      else if (e.target.dataset?.b) root.querySelector(`[data-bset="${CSS_ESC(e.target.dataset.b)}"]`)?.click();
    });

    // ลูกศรขึ้น/ลงในช่องค้นหาเลื่อนเลือกผลลัพธ์ได้เลย
    for (const [q, l] of [['hq', 'hit'], ['hevq', 'hevl']]) {
      $(q).addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault(); const s = $(l);
        s.selectedIndex = Math.max(0, Math.min(s.options.length - 1, s.selectedIndex + (e.key === 'ArrowDown' ? 1 : -1)));
        s.dispatchEvent(new Event('change'));
      });
    }


    // ---------- ช่วยเลือกคำตอบ: ประเมินคะแนนตัวเลือกบนการ์ดอีเว้นต์ ----------
    const WEIGHTS = {
      balanced: { stat: 1, health: 0.8, money: 1, karma: 0.8, fame: 0.8, qi: 0.6, merit: 0.5, other: 0.2, risk: 1 },
      money: { stat: 0.4, health: 0.6, money: 3, karma: 0.2, fame: 0.4, qi: 0.3, merit: 0.3, other: 0.1, risk: 1 },
      virtue: { stat: 0.4, health: 0.5, money: 0.3, karma: 2.5, fame: 1.5, qi: 0.3, merit: 0.5, other: 0.3, risk: 1 },
      power: { stat: 2, health: 0.6, money: 0.3, karma: 0.3, fame: 0.3, qi: 1.5, merit: 0.5, other: 0.2, risk: 1 },
      safe: { stat: 0.8, health: 2.5, money: 0.8, karma: 0.5, fame: 0.5, qi: 0.4, merit: 0.3, other: 0.2, risk: 2 },
    };
    const STATKEYS = new Set(STATS.map(([k]) => k));
    const fxScore = (fx, W) => {
      let sc = 0;
      for (const [k, v] of Object.entries(fx ?? {})) {
        if (typeof v !== 'number') continue;
        if (STATKEYS.has(k)) sc += v * W.stat;
        else if (k === 'money') sc += Math.sign(v) * Math.log10(1 + Math.abs(v)) * 3 * W.money;
        else if (k === 'health') sc += v * 0.5 * W.health;
        else if (k === 'karma' || k === 'fame' || k === 'merit') sc += v * W[k];
        else if (k === 'qi') sc += v * 3 * W.qi;
        else sc += v * W.other;
      }
      return sc;
    };
    const outScore = (o, W) => {
      if (!o) return 0;
      let sc = fxScore(o.fx, W);
      if (/die|death|kill|dead|perish/i.test(JSON.stringify(o.act ?? {}))) sc -= 200;
      return sc;
    };
    const aiCfg = () => ({ preset: $('ai_preset').value, mark: $('ai_mark').checked, auto: $('ai_auto').checked, delay: Math.max(200, +$('ai_delay').value || 1200) });
    $('ai_preset').value = store.get('ai.preset') || 'balanced';
    $('ai_mark').checked = store.get('ai.mark') !== '0';
    $('ai_auto').checked = store.get('ai.auto') === '1';
    $('ai_delay').value = store.get('ai.delay') || '1200';
    const saveAi = () => { const c = aiCfg(); store.set('ai.preset', c.preset); store.set('ai.mark', c.mark ? '1' : '0'); store.set('ai.auto', c.auto ? '1' : '0'); store.set('ai.delay', String(c.delay)); aiScan(true); };
    for (const id of ['ai_preset', 'ai_mark', 'ai_auto', 'ai_delay']) $(id).addEventListener('change', () => { saveAi(); aiSig = ''; aiScan(); });

    let lastClicked = null, aiTimer = 0, aiPend = null;
    // สแกนโดยไม่แตะ DOM ของเกม: ผลไปแสดงในแท็บนี้ ไม่แทรกป้ายเข้าไปในปุ่มของเกม
    // (เดิมแทรกป้ายแล้ว observer ทั้งหน้าสแกนซ้ำทุกเฟรม ทำให้เกมกระตุกและคลิกหาย)
    const aiOut = $('ai_out');
    let aiSig = '', aiBadges = [];
    // ป้ายแนะนำวางทับข้างปุ่มบนการ์ด: อยู่ใน shadow root ของเราเอง จึงไม่แตะ DOM ของเกม และ observer ไม่เห็น
    // pointer-events: none ทำให้คลิกปุ่มของเกมได้ตามปกติ
    function placeBadges() {
      // ไม่มีป้ายให้วางและไม่มีป้ายค้าง = ไม่ต้องแตะ DOM เลย
      if (!aiBadges.length && !root.querySelector('.aibadge')) return;
      root.querySelectorAll('.aibadge').forEach((n) => n.remove());
      for (const k of aiBadges) {
        if (!k.b.isConnected) continue;
        const r = k.b.getBoundingClientRect();
        if (!r.width) continue;
        const el = document.createElement('span');
        el.className = 'aibadge' + (k.best ? ' best' : '');
        el.textContent = k.text;
        el.style.left = Math.round(r.right + 6) + 'px';
        el.style.top = Math.round(r.top + r.height / 2 - 11) + 'px';
        root.appendChild(el);
      }
    }
    // scroll/resize ยิงถี่มาก: วางป้ายครั้งเดียวต่อเฟรมพอ
    let badgeQueued = false;
    const queueBadges = () => {
      if (badgeQueued) return;
      badgeQueued = true;
      requestAnimationFrame(() => { badgeQueued = false; placeBadges(); });
    };
    addEventListener('scroll', queueBadges, { passive: true, capture: true });
    addEventListener('resize', queueBadges);
    function aiScan() {
      const cfg = aiCfg();
      const btns = t?.pending?.kind === 'major' ? [...document.querySelectorAll('#choice-options button[id^="choice-"]')] : [];
      const sig = btns.length ? [t.pending.id, cfg.preset, cfg.mark, cfg.auto, ...btns.map((b) => b.id)].join('|') : '';
      if (sig === aiSig) return; // การ์ดและการตั้งค่าไม่เปลี่ยน ไม่ต้องคำนวณใหม่
      aiBadges = [];
      if (!sig) { aiSig = ''; aiOut.textContent = ''; clearTimeout(aiTimer); aiPend = null; return; }
      // ยังไม่พร้อม (sim ยังโหลดไม่เสร็จ / ไม่มีอีเว้นต์) ต้องไม่จำ sig ไว้ ไม่งั้นจะไม่สแกนอีกจนการ์ดเปลี่ยน
      if (!SIM?.majorEvent || (!cfg.mark && !cfg.auto)) { aiOut.textContent = ''; clearTimeout(aiTimer); aiPend = null; return; }
      const ev = SIM.majorEvent(t.pending.id);
      if (!ev) { aiOut.textContent = ''; return; }
      aiSig = sig;
      const W = WEIGHTS[cfg.preset] ?? WEIGHTS.balanced;
      let opts = ev.options ?? [];
      try { const mt = SIM.majorTexts?.(t); if (mt?.options?.length) opts = mt.options; } catch { /* ใช้ตัวเลือกดิบ */ }
      const rows = [];
      for (const b of btns) {
        const opt = opts.find((o) => 'choice-' + o.id === b.id);
        if (!opt) { rows.push({ b, sc: null }); continue; }
        let p = 1;
        try {
          if (typeof opt.band === 'number') p = opt.band;
          else if (opt.chance?.stat) p = SIM.statOdds(t, opt.chance, ev);
        } catch { p = 0.5; }
        if (!(p >= 0 && p <= 1)) p = 0.5;
        const okS = opt.outcomes?.length
          ? [opt.ok, ...opt.outcomes].reduce((a, v) => a + outScore(v, W) * (v?.w ?? 1), 0) / [opt.ok, ...opt.outcomes].reduce((a, v) => a + (v?.w ?? 1), 0)
          : outScore(opt.ok, W);
        const failS = opt.fail ? outScore(opt.fail, W) : 0;
        const fs = cfg.preset === 'safe' && failS < 0 ? failS * W.risk : failS;
        const known0 = [opt.ok, opt.fail, ...(opt.outcomes ?? [])].some((v) => v && Object.keys(v.fx ?? {}).length);
        rows.push({ b, sc: p * okS + (1 - p) * fs, p, blind: !known0 });
      }
      const known = rows.filter((r) => r.sc !== null);
      if (!known.length) { aiOut.textContent = ''; return; }
      const scored = known.filter((r) => !r.blind);
      const best = scored.length ? scored.reduce((a, r) => (r.sc > a.sc ? r : a)) : null;
      aiOut.textContent = cfg.mark ? known.map((r) => (r === best ? '★ แนะนำ · ' : '') + r.b.textContent.trim().slice(0, 50) + ': ' + (r.blind ? 'ผลไม่ใช่ตัวเลข ประเมินไม่ได้' : 'คะแนน ' + r.sc.toFixed(1)) + (r.p < 1 ? ' · สำเร็จ ~' + Math.round(r.p * 100) + '%' : '')).join('\n') : '';
      if (cfg.mark) aiBadges = known.map((r) => ({ b: r.b, best: r === best, text: (r === best ? '★ แนะนำ' : r.blind ? 'ประเมินไม่ได้' : r.sc.toFixed(1)) + (r.p < 1 ? ' · ~' + Math.round(r.p * 100) + '%' : '') }));
      if (!cfg.auto) { clearTimeout(aiTimer); aiPend = null; }
      else if (best && known.length === rows.length && scored.length === rows.length && lastClicked !== t.pending && aiPend !== t.pending) {
        const pend = t.pending; aiPend = pend; clearTimeout(aiTimer);
        aiTimer = setTimeout(() => {
          aiPend = null;
          if (t.pending !== pend || !best.b.isConnected) return;
          lastClicked = pend; best.b.click();
        }, cfg.delay);
      }
    }
    let aiQueued = false;
    const aiObs = new MutationObserver(() => {
      if (!SIM) return; // เกมแบบ bundle ไม่มี SIM: ไม่ต้องสแกนหรือล้าง aiOut ทุกเฟรม
      if (aiQueued) return; aiQueued = true;
      requestAnimationFrame(() => {
        aiQueued = false;
        try { aiScan(); } catch { /* ignore */ }
        placeBadges();
      });
    });
    // เกมแบบ bundle ไม่มี SIM = ไม่มีแหล่งข้อมูลอีเว้นต์ให้เฝ้า จึงไม่เริ่ม observer จนงาน (ก) ต่อข้อมูลจริง
    if (SIM) aiObs.observe(document.body, { childList: true, subtree: true });

    // ---------- ตรวจระบบหลังเกมอัปเดต: ตารางจาก chunk หลัก + ฟิลด์ของ state ----------
    // ตารางและฟิลด์ state อยู่ใน LOC แล้ว (เทสเรียกได้) ที่นี่ใช้ชื่อเดิมชี้ไปที่ค่าเดียวกัน
    const TABLES = LOC.TABLES;
    const statKeys = STATS.map(([k]) => k);
    const runHealth = async () => {
      // ตรวจ state ก่อน เพราะทำได้ทันทีโดยไม่ต้องรอ chunk
      const state = LOC.stateLines(t, statKeys);
      const head = [`สคริปต์ v${VERSION}`];
      const show = (lines) => { $('hchk').textContent = lines.join('\n'); console.info('[WoX Editor]\n' + lines.join('\n')); };
      if (isWiki()) { show([...head, '– หน้า wiki ไม่มี chunk หลักของเกม จึงตรวจตารางไม่ได้', ...state]); return; }
      // บรรทัด state ขึ้นทันที ไม่ต้องรอ chunk (อ่าน chunk หลักใช้เวลาหลายวินาที)
      show([...head, '– กำลังอ่าน chunk หลัก…', ...state]);
      const c = await getCore().catch(() => null);
      const lines = [...head];
      lines.push(c?.build ? `✔ BUILD ${c.build} (/src/build.js)` : '✖ BUILD: อ่าน /src/build.js ไม่ได้');
      // ตารางที่ยังไม่รู้ (chunk โหลดไม่ครบ / state ยังไม่มา) ต้องขึ้น "–" ไม่ใช่ "✖" (LOC.tableLines ตัดสินให้)
      lines.push(...LOC.tableLines(c));
      lines.push('– ' + LOC.EV_UNSUPPORTED);
      show([...lines, ...state]);
    };
    // ตรวจการอัปเดต: ใช้ build กับชื่อ chunk จาก loadCore() เทียบกับฐานใน localStorage
    // ชื่อไฟล์ chunk มี hash อยู่แล้ว จึงไม่ต้อง hash เนื้อหาไฟล์
    const checkUpdate = async () => {
      if (isWiki()) return; // หน้า wiki ไม่มี chunk ของเกม ห้ามเขียนทับฐานด้วยค่าว่าง
      let c = null;
      try { c = await getCore(); } catch { /* อ่านไม่ได้: ไม่เขียนทับฐาน */ }
      // อ่าน BUILD ได้แต่ chunk ไม่มา = ยังไม่ได้อ่านจริง ห้ามเขียนทับฐาน (เหมือนหน้า wiki)
      if (!c?.build || !LOC.coreLoaded(c)) {
        $('hupd').textContent = c?.build ? 'ตรวจการอัปเดตไม่ได้: อ่าน chunk หลักไม่ได้' : 'ตรวจการอัปเดตไม่ได้: อ่าน BUILD จาก /src/build.js ไม่ได้';
        return;
      }
      const found = {};
      for (const [, key] of TABLES) found[key] = !!c[key];
      const cur = { build: c.build, chain: { boot: c.boot, app: c.app, core: c.core }, found };
      let prev = null;
      try { prev = JSON.parse(store.get('manifest') || 'null'); } catch { /* ใช้ค่าใหม่ */ }
      store.set('manifest', JSON.stringify(cur));
      const { changed, lost } = LOC.diffManifest(prev, cur);
      // manifest รูปแบบเก่า (มี files) หรือค่าที่ parse ได้แต่ไม่ใช่ object ถือว่าไม่มีฐาน
      if (!LOC.usableManifest(prev)) { $('hupd').textContent = 'บันทึกเวอร์ชันนี้เป็นฐานแล้ว (BUILD ' + cur.build + ')'; return; }
      if (!changed && !lost.length) { $('hupd').textContent = 'ไม่มีการเปลี่ยนแปลง (BUILD ' + cur.build + ')'; return; }
      const msg = (changed ? `เกมอัปเดตแล้ว BUILD ${prev.build || '?'} → ${cur.build}` : `BUILD ${cur.build} ไม่เปลี่ยน แต่ผลตรวจเปลี่ยน`) + '\n' +
        (lost.length ? '✖ ตารางที่หาย: ' + lost.join(', ') : '✔ ตารางเดิมยังอยู่ครบ');
      $('hupd').textContent = msg;
      toast(lost.length ? 'มีตารางที่เคยเจอหายไป ดูในแผง' : 'เกมอัปเดตแล้ว ดูรายละเอียดในแผง', lost.length > 0);
    };
    setTimeout(() => { runHealth(); checkUpdate(); }, 3000);

    const wait = setInterval(() => { if (fresh()) clearInterval(wait); }, 1000);
  });
})();
