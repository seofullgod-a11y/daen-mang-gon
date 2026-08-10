/* ── EXTRAS: Intro เปิดแอป + ค้นหาด้วยเสียง ────── */

/* ── Intro splash (ครั้งเดียวต่อการเปิดแท็บ/แอป) ── */
(function(){
  var intro = document.getElementById('intro');
  if(!intro) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(sessionStorage.getItem('cxv_intro') || reduced){
    intro.remove(); return;
  }
  sessionStorage.setItem('cxv_intro', '1');
  function done(){ if(intro){ intro.classList.add('out'); setTimeout(function(){ intro.remove(); intro = null; }, 450); } }
  intro.addEventListener('click', done);        // แตะข้ามได้
  setTimeout(done, 2100);                        // จบเองใน ~2 วิ
})();

/* ── ค้นหาด้วยเสียง (Web Speech API) ── */
(function(){
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var btn = document.getElementById('micBtn');
  if(!btn) return;
  if(!SR){ btn.style.display = 'none'; return; }   // เบราว์เซอร์ไม่รองรับ → ซ่อนปุ่ม
  var rec = null;
  var input = document.getElementById('searchInput');
  var defaultPh = input.placeholder;

  btn.addEventListener('click', function(){
    if(rec){ try{ rec.stop(); }catch(e){} return; }
    rec = new SR();
    rec.lang = 'th-TH';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    btn.classList.add('listening');
    input.placeholder = 'กำลังฟัง... พูดชื่อเรื่องได้เลย 🎙️';
    rec.onresult = function(e){
      var t = (e.results[0] && e.results[0][0] && e.results[0][0].transcript) || '';
      if(t){ input.value = t; doSearch(t); }
    };
    rec.onerror = function(e){
      if(e.error === 'not-allowed') toast('กรุณาอนุญาตการใช้ไมโครโฟน');
      else if(e.error !== 'aborted' && e.error !== 'no-speech') toast('ไม่ได้ยินเสียง ลองใหม่อีกครั้ง');
      else if(e.error === 'no-speech') toast('ไม่ได้ยินเสียง ลองพูดอีกครั้ง');
    };
    rec.onend = function(){
      btn.classList.remove('listening');
      input.placeholder = defaultPh;
      rec = null;
    };
    try{ rec.start(); }catch(err){ rec = null; btn.classList.remove('listening'); }
  });
})();
