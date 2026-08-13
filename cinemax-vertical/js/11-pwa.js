/* ── PWA: register service worker + ปุ่มติดตั้งแอป ── */

/* ลงทะเบียน service worker (ทำงานเมื่อเปิดผ่าน http/https เท่านั้น ไม่ทำงานกับ file://) */
if('serviceWorker' in navigator && location.protocol.indexOf('http') === 0){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('service-worker.js')
      .then(function(reg){ if(reg && reg.update) reg.update(); })   // เช็กเวอร์ชันใหม่ทุกครั้งที่เปิด
      .catch(function(e){ console.warn('SW register failed:', e && e.message); });
  });
  /* เมื่อ service worker ใหม่เข้าควบคุม → รีโหลดหน้า 1 ครั้งให้ได้ไฟล์ล่าสุดทันที */
  var _swReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function(){
    if(_swReloaded) return; _swReloaded = true;
    location.reload();
  });
}

var _deferredPrompt = null;
var LS_INSTALL_DISMISS = 'cxv_install_x';

function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

/* Android/Chrome/Edge: จับ event เพื่อเรียกกล่องติดตั้งเอง */
window.addEventListener('beforeinstallprompt', function(e){
  e.preventDefault();
  _deferredPrompt = e;
  showInstallUI();
});

/* ติดตั้งสำเร็จ */
window.addEventListener('appinstalled', function(){
  _deferredPrompt = null;
  hideInstallBar();
  var row = document.getElementById('rowInstall'); if(row) row.style.display = 'none';
  toast('ติดตั้งแอปสำเร็จ 🎉');
});

function showInstallUI(){
  if(isStandalone()) return;
  var row = document.getElementById('rowInstall');
  if(row) row.style.display = 'flex';   // ปุ่มในหน้าโปรไฟล์มีเสมอ (ติดตั้งทีหลังได้)
  if(localStorage.getItem(LS_INSTALL_DISMISS)) return;   // เคยเห็นแล้ว = ไม่เด้งอีกตลอดไป
  setTimeout(function(){
    var bar = document.getElementById('installBar');
    if(!bar || isStandalone()) return;
    bar.classList.add('on');
    /* โชว์ครั้งเดียวเท่านั้น — บันทึกทันทีที่โชว์ */
    localStorage.setItem(LS_INSTALL_DISMISS, '1');
    /* ผู้ใช้กดอะไรก็ตามในเว็บ (เมนู/เล่น/การ์ด) ที่ไม่ใช่ตัวแบนเนอร์ → แบนเนอร์หายทันที */
    var onTap = function(ev){
      if(ev.target && ev.target.closest && ev.target.closest('#installBar')) return;
      document.removeEventListener('pointerdown', onTap, true);
      hideInstallBar();
    };
    document.addEventListener('pointerdown', onTap, true);
  }, 2500);
}

function hideInstallBar(){
  var bar = document.getElementById('installBar');
  if(bar) bar.classList.remove('on');
}

function dismissInstall(){
  hideInstallBar();
  localStorage.setItem(LS_INSTALL_DISMISS, '1');
}

function promptInstall(){
  if(_deferredPrompt){
    hideInstallBar();
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.then(function(){ _deferredPrompt = null; });
  } else if(isIOS()){
    document.getElementById('iosHelp').classList.add('on');
    hideInstallBar();
  } else {
    toast('เปิดเมนูเบราว์เซอร์ แล้วเลือก "ติดตั้งแอป"');
  }
}

/* iOS ไม่มี beforeinstallprompt → โชว์ปุ่ม/แบนเนอร์เองถ้ายังไม่ได้ติดตั้ง */
if(isIOS() && !isStandalone()){
  window.addEventListener('load', showInstallUI);
}
