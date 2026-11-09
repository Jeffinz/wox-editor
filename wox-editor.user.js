// ==UserScript==
// @name         WoX Single-player Editor
// @version      3.1.1
// @updateURL    https://raw.githubusercontent.com/Jeffinz/wox-editor/main/wox-editor.user.js
// @downloadURL  https://raw.githubusercontent.com/Jeffinz/wox-editor/main/wox-editor.user.js
// @match        https://way-of-xian.wox-game.workers.dev/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
  const VERSION = '3.1.1'; // ต้องตรงกับ @version ด้านบน (tools/release.mjs ตรวจให้)
  const STATS = [['body', 'ร่างกาย'], ['mind', 'จิต'], ['will', 'ใจ'], ['charm', 'เสน่ห์'], ['luck', 'โชค']];
  let t = null, ITEMS = null, REALMS = null, SIM = null, MJ = null, EVENTS = [];

  // จับ state ตอนเกมเซฟ (ต้องเกิดอย่างน้อย 1 ครั้ง)
  const orig = JSON.stringify;
  JSON.stringify = function (o, r, s) {
    if (o && typeof o === 'object' && 'money' in o && 'stats' in o && 'ageMonths' in o) t = o;
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
      --bg:#14201d; --surface:#1b2b27; --raised:#243a34; --field:#101a17;
      --ink:#e6efeb; --muted:#9bb0a8; --line:#34504a; --line-strong:#5f8277;
      --jade:#4fa58a; --jade-h:#66b89e; --on-jade:#0c1a16;
      --cinnabar:#ef8478; --ok:#5fc07a; --focus:#8fe0c6;
      --shadow:0 10px 30px rgba(0,0,0,.45);
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
        --cinnabar:#a8352a; --ok:#2c7a3d; --focus:#2c6b59;
        --shadow:0 8px 28px rgba(29,39,36,.22);
      }
    }
    @media (pointer: coarse) { .w { --ctl:44px; } }
    .w[data-min="1"] { width: auto; max-height: none; }
    .w[data-min="1"] .body, .w[data-min="1"] .tabs { display: none; }
    .w[data-min="1"] .ttl span { display: none; }
    header { cursor: grab; touch-action: none; display: flex; align-items: center; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3); background: var(--surface); border-bottom: 1px solid var(--line); }
    .w[data-min="1"] header { border-bottom: 0; }
    header.drag { cursor: grabbing; }
    .ttl { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: var(--sp-2); flex: 1; min-width: 0; font-family: var(--font-display, inherit); }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--cinnabar); flex: none; }
    .dot.on { background: var(--ok); }
    .st { font-size: 12px; color: var(--muted); font-weight: 400; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ver { font: 11px/1 ui-monospace, Consolas, monospace; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 2px 6px; }
    .tabs { display: flex; gap: 2px; padding: 0 var(--sp-2); background: var(--surface); border-bottom: 1px solid var(--line); }
    .tabs button {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
      min-height: var(--ctl); padding: 0 4px; border: 0; border-bottom: 2px solid transparent; background: none;
      color: var(--muted); font: inherit; cursor: pointer; white-space: nowrap;
    }
    .tabs button svg { width: 15px; height: 15px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .tabs button:hover { color: var(--ink); background: var(--raised); }
    .tabs button[aria-selected="true"] { color: var(--jade); border-bottom-color: var(--jade); font-weight: 700; }
    .body { overflow: auto; padding: var(--sp-3); scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent; }
    section { margin: 0 0 var(--sp-2); padding: var(--sp-1) var(--sp-3) var(--sp-3); background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); }
    section:last-child { margin-bottom: 0; }
    h3 { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: var(--jade); }
    summary { display: flex; align-items: center; gap: 6px; min-height: var(--ctl); margin: 0 calc(var(--sp-1) * -1); padding: 0 var(--sp-1); border-radius: 6px; cursor: pointer; list-style: none; font-weight: 700; color: var(--jade); user-select: none; }
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
    input[type=number] { font-variant-numeric: tabular-nums; }
    button.b {
      min-height: var(--ctl); padding: 4px var(--sp-3); font: inherit; cursor: pointer; color: var(--ink);
      background: var(--raised); border: 1px solid var(--line-strong); border-radius: 6px; white-space: nowrap;
      transition: background-color .15s ease, border-color .15s ease;
    }
    button.b:hover { border-color: var(--jade); }
    button.b:active { background: var(--line); }
    button.b.pri { background: var(--jade); border-color: var(--jade); color: var(--on-jade); font-weight: 700; }
    button.b.pri:hover { background: var(--jade-h); border-color: var(--jade-h); }
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
    // สคริปต์รุ่นเก่าที่ยังค้างอยู่ใน Tampermonkey จะวาดแผงซ้อนทับ จึงลบแผง WoX อื่นที่ไม่ใช่ของเรา
    // (เฝ้าเฉพาะลูกตรงของ body เพื่อจับแผงที่มาทีหลัง; การลบไม่ทำให้เกิดการวนซ้ำ)
    const dropStalePanels = () => {
      for (const d of document.body.children) {
        if (d !== host && d.shadowRoot?.textContent.includes('WoX Editor')) d.remove();
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
    // ระดับความหายาก: ไอเทมใช้ tier (ชื่อและสีตรงกับ TIERS ใน items.js), อีเว้นต์ใช้ rarityFor (ชื่อตรงกับ RARITY ใน rarity.js)
    const TIER_LBL = [['สามัญ', '#8c918e'], ['ขั้นมนุษย์', '#c9c9c0'], ['ขั้นปฐพี', '#4f9a58'], ['ขั้นฟ้า', '#3f7fc0'], ['ขั้นสวรรค์', '#8a5ac0'], ['ขั้นเซียน', '#d4a838']];
    const RAR_LBL = { common: ['ธรรมดา', '#8c918e'], uncommon: ['ไม่ธรรมดา', '#4f9a58'], rare: ['หายาก', '#3f7fc0'], epic: ['หายากมาก', '#8a5ac0'], legendary: ['ตำนาน', '#d4a838'] };
    const rarDot = (c) => `<i class="rdot" style="background:${c}"></i>`;
    const itemRar = (i) => TIER_LBL[Math.min(5, i?.tier ?? 0)] ?? TIER_LBL[0];
    const RAR_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const evKey = (e) => { try { return SIM?.rarityFor?.(e) ?? 'common'; } catch { return 'common'; } };
    const evRar = (e) => RAR_LBL[evKey(e)] ?? RAR_LBL.common;
    const tierIdx = (i) => Math.min(5, i?.tier ?? 0);
    // ตัวเลือกระดับความหายากในช่องกรอง (ค่า "all" = ทุกระดับ)
    $('hqr').innerHTML = '<option value="all">ทุกระดับ</option>' + TIER_LBL.map(([n], k) => `<option value="${k}">${n}</option>`).join('');
    $('hevr').innerHTML = '<option value="all">ทุกระดับ</option>' + RAR_ORDER.map((k) => `<option value="${k}">${RAR_LBL[k][0]}</option>`).join('');
    let itemList = [];
    const drawItems = () => {
      const q = norm($('hq').value).trim(), r = $('hqr').value;
      // เรียงหายากก่อน (ขั้นสูงไปต่ำ) แล้วตามประเภทช่อง
      const hit = itemList
        .filter((i) => (r === 'all' || String(tierIdx(i)) === r) && (!q || norm(i.th).includes(q) || norm(i.en).includes(q) || norm(i.id).includes(q)))
        .sort((a, b) => tierIdx(b) - tierIdx(a) || a.slot.localeCompare(b.slot));
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

    import('/src/data.js').then((m) => {
      REALMS = m.REALMS;
      $('h_realm').innerHTML = REALMS.map((r, i) => `<option value="${i}">${i}: ${esc(r.th)} (${r.layers} ชั้น)</option>`).join('');
      fresh(true);
    }).catch(() => {});
    import('/src/martial.js').then((m) => {
      $('h_mrank').innerHTML = m.MARTIAL_RANKS.map((r, i) => `<option value="${i}">${i}: ${esc(r.th)}</option>`).join('');
      fresh(true);
    }).catch(() => {});
    import('/src/items.js').then((m) => {
      ITEMS = m.ITEMS;
      // คัมภีร์วิชาเป็น non-enumerable จึงต้องใช้ getOwnPropertyNames
      itemList = Object.getOwnPropertyNames(ITEMS).map((k) => ITEMS[k]).filter((i) => i && i.id)
        .sort((a, b) => a.slot.localeCompare(b.slot) || (a.tier ?? 0) - (b.tier ?? 0));
      drawItems();
      fresh(true);
    }).catch(() => { $('hqn').textContent = 'โหลดรายการไอเทมไม่ได้ ลองรีโหลดหน้าเกม'; });
    Promise.all([import('/src/majors.js'), import('/src/sim.js')]).then(([mj, sim]) => {
      SIM = sim; MJ = mj;
      drawEvents();
      aiSig = ''; try { aiScan(); } catch { /* ignore */ } // sim มาถึงทีหลัง ต้องสแกนการ์ดที่ค้างอยู่ใหม่
    }).catch(() => { $('hevn').textContent = 'โหลดรายการอีเว้นต์ไม่ได้ ลองรีโหลดหน้าเกม'; });

    // ---------- แสดงค่าปัจจุบัน ----------
    const name = (id) => ITEMS?.[id]?.th ?? id;
    const fresh = (force) => {
      if (!t) return false;
      if (force || root.activeElement?.tagName !== 'INPUT') {
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
      t.stats[k] = v;
      (t.capSeen ??= {})[k] = Math.max(t.capSeen[k] ?? 0, v); // กันเกมดึงค่ากลับลงตามเพดาน
    };

    setInterval(() => {
      $('dot').classList.toggle('on', !!t);
      $('hs').textContent = t ? 'เชื่อมต่อแล้ว' : 'รอข้อมูลเกม · เล่นในเกม 1 เดือน';
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
      if (b.id === 'hmb') t.money = +$('hm').value || 0;
      else if (b.id === 'hmr') {
        if (!t.martial) return toast('ตัวละครนี้ไม่ได้อยู่สายยุทธ์', true);
        t.martial.rank = +$('h_mrank').value; t.martial.stage = +$('h_mstage').value; t.martial.force = +$('h_mforce').value || 0;
      } else if (d.n) t[d.n] = +$('h_' + d.n).value || 0;
      else if (b.id === 'hrl') { t.realm = +$('h_realm').value; t.layer = +$('h_layer').value || 0; t.qi = +$('h_qi').value || 0; if (t.realm > 0) t.cultivating = true; }
      else if (d.s) setStat(d.s, +$('s_' + d.s).value || 0);
      else if (b.id === 'hsa') for (const [k] of STATS) setStat(k, +$('s_' + k).value || 0);
      else if (d.bset) {
        const v = Math.max(0, +root.querySelector(`[data-b="${CSS_ESC(d.bset)}"]`).value || 0);
        (t.bag ??= {}); v ? (t.bag[d.bset] = v) : delete t.bag[d.bset];
      } else if (d.bdel) { delete t.bag[d.bdel]; msg = 'ลบแล้ว'; }
      else if (b.id === 'hadd') {
        const id = $('hit').value, n = +$('hn').value || 0;
        if (!ITEMS?.[id]) return toast('เลือกไอเทมจากรายการก่อน', true);
        if (n <= 0) return toast('ใส่จำนวนที่มากกว่า 0', true);
        (t.bag ??= {})[id] = (t.bag[id] ?? 0) + n;
        msg = `เพิ่ม ${name(id)} ×${n} แล้ว`;
      } else if (b.id === 'hevb') {
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
    addEventListener('scroll', placeBadges, { passive: true, capture: true });
    addEventListener('resize', placeBadges);
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
      if (aiQueued) return; aiQueued = true;
      requestAnimationFrame(() => {
        aiQueued = false;
        try { aiScan(); } catch { /* ignore */ }
        placeBadges();
      });
    });
    aiObs.observe(document.body, { childList: true, subtree: true });

    // ---------- ตรวจระบบหลังเกมอัปเดต: export ที่สคริปต์เรียกใช้ + ฟิลด์ของ state + อีเว้นต์ค้าง ----------
    // ต้องตรงกับ CRITICAL ใน tools/snapshot-diff.mjs
    const NEEDS = [
      ['/src/build.js', ['BUILD']],
      ['/src/data.js', ['REALMS']],
      ['/src/martial.js', ['MARTIAL_RANKS']],
      ['/src/items.js', ['ITEMS']],
      ['/src/majors.js', ['LIFE_PATH']],
      ['/src/sim.js', ['majorEvent', 'allMajors', 'eventsForAudit', 'majorTexts', 'statOdds', 'rarityFor']],
    ];
    const STATE_KEYS = ['money', 'stats', 'ageMonths', 'karma', 'fame', 'bag', 'realm', 'layer', 'qi'];
    const runHealth = async () => {
      const lines = [];
      let build = '?';
      for (const [path, names] of NEEDS) {
        try {
          const m = await import(path);
          if (path.endsWith('build.js')) build = m.BUILD ?? '?';
          const miss = names.filter((n) => !(n in m));
          lines.push(miss.length ? `✖ ${path}: หาย ${miss.join(', ')}` : `✔ ${path}`);
        } catch { lines.push(`✖ ${path}: โหลดไม่ได้`); }
      }
      lines.unshift(`สคริปต์ v${VERSION} · BUILD ${build}`);
      if (!t) lines.push('– ยังไม่มีข้อมูลตัวละคร (เล่นในเกม 1 เดือนก่อน แล้วกดตรวจอีกครั้ง)');
      else {
        const miss = STATE_KEYS.filter((k) => t[k] === undefined);
        lines.push(miss.length ? `✖ state ไม่มีฟิลด์: ${miss.join(', ')}` : '✔ state ครบ');
        const sm = STATS.map(([k]) => k).filter((k) => t.stats?.[k] === undefined);
        if (sm.length) lines.push(`✖ stats ไม่มีค่า: ${sm.join(', ')}`);
        if (t.pending?.id) lines.push(SIM?.majorEvent?.(t.pending.id) ? '✔ อีเว้นต์ค้างยังมีในเกม' : `✖ อีเว้นต์ค้าง "${t.pending.id}" ไม่พบในโค้ดแล้ว`);
      }
      $('hchk').textContent = lines.join('\n');
      console.info('[WoX Editor]\n' + lines.join('\n'));
    };
    // ตรวจการอัปเดต: ดึงไฟล์จากเว็บเกมที่กำลังเล่น (ไม่ใช่โฟลเดอร์ในเครื่อง) เทียบกับฐานที่จำไว้ใน localStorage
    const WATCH = ['build.js', 'data.js', 'martial.js', 'items.js', 'majors.js', 'sim.js'];
    const exportsOfSrc = (text) => {
      const s = new Set();
      for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) s.add(m[1]);
      for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const p of m[1].split(',')) { const n = p.trim().split(/\s+as\s+/).pop(); if (n) s.add(n); }
      return [...s].sort();
    };
    const hashOf = async (text) => {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
    };
    const checkUpdate = async () => {
      const cur = { build: '', files: {}, exports: {} };
      try {
        for (const f of WATCH) {
          const r = await fetch('/src/' + f, { cache: 'no-store' });
          if (!r.ok) throw new Error(f + ' ตอบ ' + r.status);
          const text = await r.text();
          cur.files[f] = await hashOf(text);
          cur.exports[f] = exportsOfSrc(text);
          if (f === 'build.js') cur.build = text.match(/BUILD\s*=\s*"([^"]+)"/)?.[1] ?? '';
        }
      } catch (e) { $('hupd').textContent = 'ตรวจการอัปเดตไม่ได้: ' + e.message; return; }
      let prev = null;
      try { prev = JSON.parse(store.get('manifest') || 'null'); } catch { /* ใช้ค่าใหม่ */ }
      store.set('manifest', JSON.stringify(cur));
      if (!prev?.files) { $('hupd').textContent = 'บันทึกเวอร์ชันนี้เป็นฐานแล้ว (BUILD ' + cur.build + ')'; return; }
      const changed = WATCH.filter((f) => prev.files[f] !== cur.files[f]);
      if (!changed.length && prev.build === cur.build) { $('hupd').textContent = 'ไม่มีการเปลี่ยนแปลง (BUILD ' + cur.build + ')'; return; }
      const lost = [];
      for (const f of WATCH) for (const n of prev.exports?.[f] ?? []) if (!cur.exports[f].includes(n)) lost.push(`${f} :: ${n}`);
      const msg = `เกมอัปเดตแล้ว BUILD ${prev.build || '?'} → ${cur.build}\nไฟล์ที่เปลี่ยน: ${changed.join(', ') || '-'}\n` +
        (lost.length ? '✖ export ที่หาย: ' + lost.join(', ') : '✔ export เดิมยังอยู่');
      $('hupd').textContent = msg;
      toast(lost.length ? 'เกมอัปเดต และมี export หาย ดูในแผง' : 'เกมอัปเดตแล้ว ดูรายละเอียดในแผง', lost.length > 0);
    };
    setTimeout(() => { runHealth(); checkUpdate(); }, 3000);

    const wait = setInterval(() => { if (fresh()) clearInterval(wait); }, 1000);
  });
})();
