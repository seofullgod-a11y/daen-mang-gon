/* ── CONFIG ───────────────────────────────────────
   ค่าเชื่อมต่อ Supabase (โปรเจกต์เดียวกับเว็บเดิม)
   anon key = public read-only ตามปกติของ Supabase   */
var APP_VERSION = '3.3';   // เลขเวอร์ชันแอป — เช็กได้ที่หน้า "ของฉัน"

var SB_URL = 'https://pugdpjixgwzpursmveht.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z2Rwaml4Z3d6cHVyc212ZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDkyNDQsImV4cCI6MjA5NDY4NTI0NH0.nLyAbmxqwMyN7SS6GErYJAXlbB1yjf_bKgGqrjYQ9k4';

/* ถ้าโหลดจาก Supabase ไม่สำเร็จ ให้แสดงข้อมูลตัวอย่างแทน */
var DEMO_FALLBACK = true;

function sbHeaders(){
  return { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };
}

/* โหลดสคริปต์ภายนอกเมื่อต้องใช้จริงเท่านั้น (เว็บเปิดไวขึ้น) */
var _scriptCache = {};
function loadScript(src){
  if(_scriptCache[src]) return _scriptCache[src];
  _scriptCache[src] = new Promise(function(res, rej){
    var sc = document.createElement('script');
    sc.src = src; sc.async = true;
    sc.onload = res; sc.onerror = function(){ delete _scriptCache[src]; rej(new Error('load fail')); };
    document.head.appendChild(sc);
  });
  return _scriptCache[src];
}
var HLS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';
var SUPA_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

/* ค่า SEO เริ่มต้น (ทับได้จากหลังบ้าน → ตาราง settings) */
var SITE = {
  title: 'CineMax — ดูซีรีส์สั้นแนวตั้ง อัปเดตทุกวัน',
  desc: 'ดูซีรีส์สั้นแนวตั้งและภาพยนตร์ออนไลน์ อัปเดตทุกวัน ดูฟรีทุกอุปกรณ์',
  kw: 'ซีรีส์สั้น, ซีรีส์แนวตั้ง, ดูซีรีส์ออนไลน์, หนังออนไลน์, short drama',
  og: '', url: ''
};

/* localStorage keys */
var LS_HIST = 'cxv_hist';   // ประวัติการดู + ตำแหน่งที่ค้าง
var LS_FAV  = 'cxv_fav';    // รายการโปรด
var LS_LIKE = 'cxv_like';   // ไลก์
