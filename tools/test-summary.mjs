// ABOUTME: อ่านบรรทัดสรุปของ node --test เพื่อให้ release รู้ว่ามีเทสถูก skip กี่ตัว
// ABOUTME: ใช้โดย tools/release.mjs; คืน -1 เมื่อไม่พบบรรทัดสรุปเพื่อให้ fail แบบปิด
// summary ของ node --test อยู่ท้าย output จึงใช้บรรทัดที่ตรงตัวสุดท้าย
export const skippedCount = (out) => {
  const all = [...String(out ?? '').matchAll(/^# skipped (\d+)\r?$/gm)];
  return all.length ? Number(all.at(-1)[1]) : -1;
};
