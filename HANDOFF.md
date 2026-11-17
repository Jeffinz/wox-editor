# Handoff: ย้าย wox-editor ไปใช้เกมเวอร์ชัน bundle

Written: 2026-11-17 21:35 · Working directory: `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev`

อ่าน `CLAUDE.md` ใน working directory ก่อน ไฟล์นั้นมีกติกาของโปรเจกต์ เช่น ตอบภาษาไทย, `node --check`, bump `@version` + `VERSION` และปล่อยด้วย `tools/release.mjs` ผู้ใช้อยากให้เรียกว่า "นายท่านชาโดว์"

## Goal

ทำให้ userscript `wox-editor.user.js` (Tampermonkey, ใช้กับเกม Way of Xian โหมดเล่นคนเดียว) กลับมาใช้ได้กับเกมเวอร์ชันบนเว็บตอนนี้ (BUILD `mwkobenp`) เกมเลิกเสิร์ฟ `/src/*.js` แล้ว สคริปต์เดิมจึงโหลดรายการขั้นพลัง ขั้นยุทธ์ ไอเทม อีเว้นต์ และช่วยเลือกไม่ได้

งานถือว่าเสร็จเมื่อทำตามแผน `docs/superpowers/plans/2026-11-17-bundle-port.md` ครบ Task 1-4 (v3.3.0) และนายท่านทดสอบในเกมจริงผ่าน ส่วน Task 5 เป็น spike เรื่องอีเว้นต์และช่วยเลือก ต้องจบที่เอกสาร แล้วรอนายท่านตัดสินใจ

## Where things stand

- **เสร็จแล้ว:** ตรวจ bundle ของเกม, เขียนเครื่องมือดึง bundle, เขียนแผน 5 task ทั้งหมด merge เข้า `main` และ push แล้ว (`162d07c`)
- **กำลังทำ:** ไม่มี
- **ยังไม่เริ่ม:** Task 1-5 ในแผน และยังไม่ได้แก้โค้ดของ `wox-editor.user.js` เลย (ตอนนี้เป็น v3.2.0)

## Verified facts

- **`/src/sim.js` ตอบ 404 แม้ใส่ header `Sec-Fetch-Dest: script`** ส่วน `/src/build.js` ยังได้ 200 เป็น `export const BUILD = "mwkobenp";` หลักฐานมาจาก `curl` ไปที่ `https://way-of-xian.wox-game.workers.dev` เมื่อ 2026-11-17
- **index.html โหลดไฟล์เดียวคือ `<script type="module" src="b/boot-3ENUIJBD.js">`** boot import `./c-VVBFTXUG.js` กับ `./c-RCZEDD4B.js` แบบ static และ import `./app-56NJKGMX.js` (หรือ `./wiki-UPDJ4Y7Q.js` ในหน้า wiki) แบบ dynamic ดูได้ที่ไฟล์ใน `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch\bundle\mwkobenp\b\`
- **`app-56NJKGMX.js` ไม่มี `export`** (`grep -c 'export{'` ได้ 0) และ import จาก `./c-577XDD6D.js`
- **`c-577XDD6D.js` export 1789 ชื่อ และทุกชื่อถูกย่อ** ตารางที่สคริปต์ต้องใช้มีดังนี้:
  - `REALMS` ในโค้ดคือ `bo`, export เป็น `q`
  - `ITEMS` ในโค้ดคือ `qe`, export เป็น `_e`
  - `MARTIAL_RANKS` ในโค้ดคือ `Xr`, export เป็น `Ca`
  - `TIERS` ในโค้ดคือ `Wl`, export เป็น `Xe`

  หลักฐานคือ grep `export{…}` ตัวสุดท้ายของไฟล์ ค่าแถวแรกของแต่ละตารางอยู่ในตารางของแผน
- **sim อยู่ใน `app-56NJKGMX.js` เท่านั้น** ฟังก์ชันที่เกี่ยวข้องคือ `majorTexts`, `statOdds`, `rarityFor`, `majorEvent`, `allMajors`, `eventsForAudit` และ `LIFE_PATH` หลักฐานคือ `"lifePath"`, `"jhStage"`, `"{m:"` และ clamp `.02,.95` เจอแค่ใน app
- **ข้อมูลบางส่วนมาจาก `d/*.bin` ที่เข้ารหัส AES-GCM** boot ถอดรหัสแล้วใส่ไว้ที่ `u.d` ของ `c-VVBFTXUG.js` (`var u={d:null,blob:null,manifest:null,entry:null};export{u as a}`) key ข้างในใช้ชื่อเดิม เช่น `d.wuxia.WUXIA_ITEMS`
- **`c-577XDD6D.js` throw ตอนรัน top-level ถ้า `u.d` ยังว่าง** ข้อความ error คือ `"wox: the data of wuxia is not loaded (boot order, or this page's blobs)"`
- **REA ใช้กับสองไฟล์ใหญ่ไม่ได้** `analyze_javascript_application` ทำให้ heap 1024 MiB หมด พอลองใหม่ด้วย `max_heap_mb: 4096` ก็เจอ `resource_constraint` "retained representation allowance is exhausted" evidence ภาพรวมเก็บไว้ที่ `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch\bundle\rea-evidence-mwkobenp.json`
- **`tools/fetch-bundle.mjs` ใช้ได้** สคริปต์ดึงไฟล์ JS ทั้งหมด 35 ไฟล์ (20 MB) ลง `bundle/mwkobenp/` แล้ว

## Guesses, not yet proven

- **การ `import('/b/c-577XDD6D.js')` จากสคริปต์น่าจะได้ instance เดียวกับเกม** ถ้า URL ตรงกันและเกมโหลดเสร็จแล้ว จะไม่รันซ้ำ วิธีพิสูจน์คือ Task 4 Step 8 ทดสอบในเกมจริง
- **การดัก state ผ่าน hook `JSON.stringify` (แก้เงิน/ค่าสถานะ) น่าจะยังใช้ได้** เพราะไม่ได้พึ่ง `/src/` แต่ยังไม่มีใครลองในเกมเวอร์ชันนี้
- **ITEMS อาจมี `tier` เป็นสตริง** ใน bundle เจอ `tier:"legendary"` ในของสวมใส่ แต่ยังไม่รู้ว่าอยู่ใน `ITEMS` (`_e`) หรือตารางอื่น Task 3 รองรับไว้ทั้งสองแบบ
- **ช่วยเลือกอาจกลับมาไม่ได้** เพราะ sim ไม่มี export Task 5 มีไว้หาคำตอบเรื่องนี้

## Ruled out and wrong turns

- เว็บไม่ได้บล็อก `/src/` ด้วย header ไฟล์ไม่มีอยู่จริงแล้ว อย่าเสียเวลาปลอม header
- ห้าม import `app-*.js` หรือ `boot-*.js` แม้จะต่อ query string ก็ตาม เพราะจะได้เกมชุดที่สองทั้งชุด
- ห้ามถอดรหัส `d/*.bin` นอกเกม และห้ามใช้ key ใน `c-RCZEDD4B.js` เจ้าของเกมตั้งใจปิดส่วนนี้ นายท่านจึงจำกัดให้อ่านได้เฉพาะค่าในหน่วยความจำของหน้าเกม
- `SIM_MIRROR` ใน `wiki-UPDJ4Y7Q.js` ฟังดูมีประโยชน์ แต่เป็นแค่ค่าคงที่ไม่กี่ตัว เช่น `{certainAt:1.5,levelFull:2}` ไม่ใช่ sim
- อย่ารัน REA `analyze_javascript_application` กับ `c-577` หรือ `app` ซ้ำด้วยค่าเดิม เพราะจะเต็มอีก ใช้ grep บนไฟล์ใน `bundle/mwkobenp/b/` แทน
- `src/` ในเครื่องเป็น BUILD เก่า (`mw3fx19c`) ใช้อ่านเทียบได้ แต่ไม่ตรงกับเกมจริง `tools/snapshot-diff.mjs` ก็ใช้กับเกมเวอร์ชันนี้ไม่ได้แล้ว แต่**ห้ามลบ** ถ้านายท่านยังไม่สั่ง

## Next step

1. ถามนายท่านว่าตรวจแผนแล้วหรือยัง และจะรันแบบ Subagent-driven หรือ Native (ผู้เขียนแผนแนะนำ Native) จากนั้นเปิดแผน `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch\docs\superpowers\plans\2026-11-17-bundle-port.md` แล้วเริ่ม Task 1 ใน worktree `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch` บน branch `wip/bundle-fetch` ซึ่งตอนนี้ตรงกับ `main`
2. ทำ Task 2, 3, 4 ตามลำดับ แต่ละ task ใช้ interface ของ task ก่อนหน้า
3. Task 4 Step 8: ให้นายท่านทดสอบในเกมจริงก่อน แล้วจึงรัน `tools/release.mjs` จริง
4. ทำ Task 5 (spike) แล้วหยุดรอนายท่านเลือกทางสำหรับอีเว้นต์และช่วยเลือก

ถ้าไม่มีโฟลเดอร์ `bundle/mwkobenp/` เช่น ใช้เครื่องอื่นหรือเกม build ใหม่แล้ว ให้รัน `node tools/fetch-bundle.mjs` ใน worktree ก่อน แต่ชื่อไฟล์ในแผนเป็นของ BUILD `mwkobenp` เท่านั้น

## Waiting on the user

- นายท่านยังไม่ได้ยืนยันว่าแผนตรงกับที่ต้องการ และยังไม่ได้เลือกวิธีรัน (Subagent-driven หรือ Native)
- นายท่านเท่านั้นที่ทดสอบในเกมจริงได้: ต้องอัปเดตสคริปต์ใน Tampermonkey แล้วรีโหลดหน้าเกมเอง ถ้าจะใช้ claude-in-chrome แทน ต้องขออนุญาตก่อน
- นายท่านยังไม่ได้ตัดสินใจเรื่องอีเว้นต์และช่วยเลือก ต้องรอผล Task 5 ก่อน
- ยังไม่มีใครถามนายท่านว่าจะลบ worktree `wox-bundle-fetch` กับ branch `wip/bundle-fetch` (ในเครื่องและบน origin) หลังงานเสร็จหรือไม่

## Files and places

- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\wox-editor.user.js`: สคริปต์หลัก v3.2.0 จุดที่ต้องแก้คือบล็อก `import('/src/…')` ประมาณบรรทัด 389-410, `TIER_LBL`/`RAR_LBL`/`itemRar` บรรทัด 329-332 และ `NEEDS`/`runHealth`/`WATCH`/`checkUpdate` ประมาณบรรทัด 619-690
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\CLAUDE.md`: กติกาโปรเจกต์และบทเรียนเก่า Task 4 ต้องแก้หัวข้อ 3, 6 และ 8
- `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch\`: worktree ของงานนี้ (branch `wip/bundle-fetch`)
- `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch\docs\superpowers\plans\2026-11-17-bundle-port.md`: แผน 5 task พร้อมตารางสิ่งที่ตรวจพบ
- `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch\tools\fetch-bundle.mjs`: ดึง bundle ลง `bundle/<BUILD>/` (`--list` ใช้ดูรายการอย่างเดียว)
- `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch\bundle\mwkobenp\`: bundle ที่ดึงมา (index.html, `src/build.js`, `b/*.js`) อยู่ใน `.gitignore` ใช้เป็นข้อมูลอ่านอย่างเดียว ห้ามรัน
- `C:\Users\PC\Desktop\Wox UI\wox-bundle-fetch\bundle\rea-evidence-mwkobenp.json`: evidence ของ REA ขนาด 146 MB
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\tools\release.mjs`: ปล่อยเวอร์ชัน Task 1 จะเพิ่มขั้น `node --test tests/`
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\src\`: ซอร์สเกม BUILD เก่า `mw3fx19c` ใช้อ่านเทียบอย่างเดียว
- `C:\Users\PC\Desktop\Wox UI\way-of-xian.wox-game.workers.dev\journal\2026-11-17.md`: บันทึกของวันนี้ อยู่ใน `.gitignore`
- repo: https://github.com/Jeffinz/wox-editor เป็นสาธารณะ

## Changes made

- `tools/fetch-bundle.mjs`: สร้างใหม่ commit `07979af` แล้ว
- `docs/superpowers/plans/2026-11-17-bundle-port.md`: สร้างใหม่ commit `b895c75` แล้ว
- `.gitignore`: เพิ่ม `bundle/` (อยู่ใน `07979af`) และ `journal/` (อยู่ใน `162d07c`)
- ทั้ง 3 commit อยู่บน `main` และ `wip/bundle-fetch` ทั้งในเครื่องและบน origin แล้ว
- `journal/2026-11-17.md`: สร้างใหม่ ไม่ได้ commit เพราะอยู่ใน ignore
- `HANDOFF.md` (ไฟล์นี้): สร้างใหม่ commit บน `main` ในเครื่องแล้ว แต่ยังไม่ได้ push
