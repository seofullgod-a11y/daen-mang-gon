/* ── CONFIG ───────────────────────────────────────
   ค่าเชื่อมต่อ Supabase (โปรเจกต์เดียวกับเว็บเดิม)
   anon key = public read-only ตามปกติของ Supabase   */
var APP_VERSION = '1.8';   // เลขเวอร์ชันแอป — เช็กได้ที่หน้า "ของฉัน"

var SB_URL = 'https://pugdpjixgwzpursmveht.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z2Rwaml4Z3d6cHVyc212ZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDkyNDQsImV4cCI6MjA5NDY4NTI0NH0.nLyAbmxqwMyN7SS6GErYJAXlbB1yjf_bKgGqrjYQ9k4';

/* ถ้าโหลดจาก Supabase ไม่สำเร็จ ให้แสดงข้อมูลตัวอย่างแทน */
var DEMO_FALLBACK = true;

function sbHeaders(){
  return { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };
}

/* localStorage keys */
var LS_HIST = 'cxv_hist';   // ประวัติการดู + ตำแหน่งที่ค้าง
var LS_FAV  = 'cxv_fav';    // รายการโปรด
var LS_LIKE = 'cxv_like';   // ไลก์
