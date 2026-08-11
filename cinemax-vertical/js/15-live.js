/* ── LIVE LAYER: คนกำลังดูเรียลไทม์ + อีโมจิลอย ──
   ใช้ Supabase Realtime (presence + broadcast) — ไม่ต้องสร้างตารางเพิ่ม
   ถ้าโหลดไลบรารีไม่ได้/โหมดตัวอย่าง → ข้ามเงียบๆ เว็บทำงานปกติ     */

var _sbRT = null, _liveCh = null, _liveMid = null, _lastReact = 0;

function rtClient(){
  if(_sbRT) return _sbRT;
  if(ST.demo || !window.supabase || !window.supabase.createClient) return null;
  try{
    _sbRT = window.supabase.createClient(SB_URL, SB_KEY, {
      realtime: { params: { eventsPerSecond: 5 } }
    });
  }catch(e){ _sbRT = null; }
  return _sbRT;
}

function liveJoin(mid){
  if(_liveMid === mid) return;
  liveLeave();
  var c = rtClient(); if(!c) return;
  _liveMid = mid;
  try{
    _liveCh = c.channel('live:' + mid, {
      config: { presence: { key: 'u' + Math.random().toString(36).slice(2, 9) }, broadcast: { self: false } }
    });
    _liveCh.on('presence', { event: 'sync' }, function(){
      var n = 0, st = _liveCh.presenceState();
      for(var k in st) n += st[k].length;
      updateLiveBadge(n);
    });
    _liveCh.on('broadcast', { event: 'react' }, function(p){
      spawnReact((p.payload && p.payload.e) || '❤️');
    });
    _liveCh.subscribe(function(status){
      if(status === 'SUBSCRIBED'){ try{ _liveCh.track({ t: 1 }); }catch(e){} }
    });
  }catch(e){ _liveCh = null; }
}

function liveLeave(){
  if(_liveCh){ try{ _liveCh.unsubscribe(); }catch(e){} _liveCh = null; }
  _liveMid = null;
  updateLiveBadge(0);
}

function updateLiveBadge(n){
  var b = document.getElementById('liveBadge'); if(!b) return;
  if(n >= 2){ b.style.display = 'inline-flex'; b.querySelector('span').textContent = n; }
  else b.style.display = 'none';
}

/* ส่งอีโมจิ: เห็นเองทันที + กระจายให้คนดูเรื่องเดียวกัน/ในห้องปาร์ตี้ */
function sendReact(e){
  var now = Date.now();
  if(now - _lastReact < 300) return;
  _lastReact = now;
  spawnReact(e);
  var ch = (window.PARTY && PARTY && PARTY.ch) ? PARTY.ch : _liveCh;
  if(ch){ try{ ch.send({ type: 'broadcast', event: 'react', payload: { e: e } }); }catch(err){} }
}

function spawnReact(e){
  var layer = document.getElementById('reactLayer'); if(!layer) return;
  var d = document.createElement('div');
  d.className = 'fx-react';
  d.textContent = e;
  d.style.left = (58 + Math.random() * 26) + '%';
  d.style.setProperty('--dx', (Math.random() * 70 - 35) + 'px');
  d.style.setProperty('--dur', (2 + Math.random()) + 's');
  layer.appendChild(d);
  setTimeout(function(){ d.remove(); }, 3200);
}
