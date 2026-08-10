/* ── PWA: register service worker + ปุ่มติดตั้งแอป ── */

/* ลงทะเบียน service worker (ทำงานเมื่อเปิดผ่าน http/https เท่านั้น ไม่ทำงานกับ file://) */
if('serviceWorker' in navigator && location.protocol.indexOf('http') === 0){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('service-worker.js').catch(function(e){
      console.warn('SW register failed:', e && e.message);
    });
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
  if(row) row.style.display = 'flex';   // ปุ่มในหน้าโปรไฟล์เสมอ
  if(localStorage.getItem(LS_INSTALL_DISMISS)) return;   // แบนเนอร์: ถ้าเคยปิดแล้วไม่ต้องเด้ง
  setTimeout(function(){
    var bar = document.getElementById('installBar');
    if(bar && !isStandalone()) bar.classList.add('on');
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
