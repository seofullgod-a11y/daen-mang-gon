/* ── WATCH PARTY: ห้องดูพร้อมกัน ─────────────────
   โฮสต์สร้างห้อง → แชร์โค้ด/ลิงก์ → ทุกคนเล่น-หยุด-ข้าม sync ตามโฮสต์
   ใช้ Supabase Realtime broadcast — sync เวลาได้กับวิดีโอ HLS/MP4      */

var PARTY = null;          // {code, isHost, ch, n}
var _hostTimer = null;
var _applyingState = false;

function partyCode(){
  var s = '', A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for(var i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

/* ── Party sheet ── */
function openPartySheet(){
  renderPartyBody();
  if(!document.getElementById('ptSheet').classList.contains('on')) navPush({ t: 'pt' });
  document.getElementById('ptBg').classList.add('on');
  document.getElementById('ptSheet').classList.add('on');
}
function closePartySheet(fromPop){
  if(!document.getElementById('ptSheet').classList.contains('on')) return;
  var top = navTop();
  if(!fromPop && top && top.t === 'pt'){ history.back(); return; }
  document.getElementById('ptBg').classList.remove('on');
  document.getElementById('ptSheet').classList.remove('on');
}

function renderPartyBody(){
  var box = document.getElementById('ptBody'); if(!box) return;
  if(PARTY){
    box.innerHTML =
      '<div class="pt-code-h">โค้ดห้องของคุณ</div>' +
      '<div class="pt-code">' + PARTY.code + '</div>' +
      '<div class="pt-meta">👥 ' + PARTY.n + ' คนในห้อง · ' +
        (PARTY.isHost ? 'คุณเป็นโฮสต์ (ผู้ควบคุม)' : 'โฮสต์เป็นผู้ควบคุมการเล่น') + '</div>' +
      '<div class="pt-row">' +
        '<button class="dt-play" onclick="copyPartyLink()">' + IC.share + ' คัดลอกลิงก์ชวนเพื่อน</button>' +
        '<button class="dt-btn" onclick="leaveParty()">ออกจากห้อง</button></div>' +
      '<p class="pt-hint">เพื่อนเปิดลิงก์ หรือกดปุ่มปาร์ตี้แล้วกรอกโค้ดนี้ ก็เข้าห้องเดียวกันทันที<br>' +
      'การ sync เวลาใช้ได้กับวิดีโอแบบ HLS/MP4</p>';
  } else {
    box.innerHTML =
      '<div class="pt-sec">' +
        '<button class="dt-play" onclick="partyCreate()">🎉 สร้างห้องดูพร้อมกัน</button></div>' +
      '<div class="pt-or">หรือเข้าร่วมห้องเพื่อน</div>' +
      '<div class="pt-row">' +
        '<input id="ptCodeInput" class="pt-input" placeholder="กรอกโค้ด เช่น AB2CD" maxlength="6" autocomplete="off" ' +
          'oninput="this.value=this.value.toUpperCase()">' +
        '<button class="dt-btn" onclick="partyJoin(document.getElementById(\'ptCodeInput\').value)">เข้าร่วม</button></div>' +
      '<p class="pt-hint">ดูซีรีส์เรื่องเดียวกันพร้อมเพื่อน เล่น-หยุด-ข้ามตอน ตรงกันทุกจอ + ส่งอีโมจิหากันได้</p>';
  }
}
function updatePartyUI(){
  var b = document.getElementById('ptBtn');
  if(b) b.classList.toggle('active', !!PARTY);
  if(document.getElementById('ptSheet').classList.contains('on')) renderPartyBody();
}

/* ── สร้าง / เข้าร่วม ── */
function partyCreate(){ joinPartyChannel(partyCode(), true); }
function partyJoin(code){
  code = (code || '').trim().toUpperCase();
  if(code.length < 4){ toast('กรอกโค้ดห้องก่อนครับ'); return; }
  joinPartyChannel(code, false);
}

function joinPartyChannel(code, isHost){
  var c = rtClient();
  if(!c){ toast('โหมดนี้ต้องเชื่อมต่ออินเทอร์เน็ต/ฐานข้อมูล'); return; }
  leaveParty(true);
  try{
    var ch = c.channel('party:' + code, {
      config: { presence: { key: 'p' + Math.random().toString(36).slice(2, 9) }, broadcast: { self: false } }
    });
    PARTY = { code: code, isHost: isHost, ch: ch, n: 1 };
    ch.on('presence', { event: 'sync' }, function(){
      var n = 0, st = ch.presenceState();
      for(var k in st) n += st[k].length;
      if(PARTY){ PARTY.n = n; updatePartyUI(); }
    });
    ch.on('broadcast', { event: 'state' }, function(p){
      if(PARTY && !PARTY.isHost) applyPartyState(p.payload);
    });
    ch.on('broadcast', { event: 'react' }, function(p){
      spawnReact((p.payload && p.payload.e) || '❤️');
    });
    ch.on('broadcast', { event: 'end' }, function(){
      if(PARTY && !PARTY.isHost){ toast('โฮสต์ปิดห้องแล้ว'); leaveParty(true); }
    });
    ch.subscribe(function(s){
      if(s === 'SUBSCRIBED'){
        try{ ch.track({ h: isHost ? 1 : 0 }); }catch(e){}
        updatePartyUI();
        if(isHost) startHostLoop();
        toast(isHost ? ('สร้างห้องแล้ว! โค้ด: ' + code) : ('เข้าร่วมห้อง ' + code + ' แล้ว รอโฮสต์เล่น...'));
      } else if(s === 'CHANNEL_ERROR' || s === 'TIMED_OUT'){
        toast('เชื่อมต่อห้องไม่สำเร็จ ลองใหม่อีกครั้ง');
        leaveParty(true);
      }
    });
  }catch(e){ PARTY = null; toast('เชื่อมต่อห้องไม่สำเร็จ'); }
}

function copyPartyLink(){
  if(!PARTY) return;
  var url = location.href.split('#')[0] + '#party=' + PARTY.code;
  if(navigator.share){ navigator.share({ title: 'มาดูด้วยกันที่ CineMax 🍿', url: url }).catch(function(){}); }
  else { navigator.clipboard && navigator.clipboard.writeText(url); toast('คัดลอกลิงก์แล้ว ส่งให้เพื่อนเลย!'); }
}

/* ── โฮสต์: กระจายสถานะทุก 1.5 วิ ── */
function startHostLoop(){
  clearInterval(_hostTimer);
  _hostTimer = setInterval(broadcastPartyState, 1500);
}
function broadcastPartyState(){
  if(!PARTY || !PARTY.isHost || !PARTY.ch) return;
  if(!document.getElementById('player').classList.contains('on') || !CUR) return;
  var p = FEED[curIdx] || {};
  if(p.trailerUrl) return;
  var v = curVideo();
  try{
    PARTY.ch.send({ type: 'broadcast', event: 'state', payload: {
      mid: CUR.id,
      s: p.ep ? p.ep.season : null,
      e: p.ep ? p.ep.ep : null,
      idx: curIdx,
      sec: v ? v.currentTime : null,
      playing: v ? !v.paused : true,
      at: Date.now()
    }});
  }catch(e){}
}

/* ── ผู้ชม: ตามสถานะโฮสต์ ── */
function applyPartyState(st){
  if(!st || !st.mid) return;
  var playerOn = document.getElementById('player').classList.contains('on');
  if(!playerOn || !CUR || CUR.id !== st.mid){
    if(!_applyingState){
      _applyingState = true;
      openPlayer(st.mid, st.s != null ? { s: st.s, e: st.e } : undefined);
      setTimeout(function(){ _applyingState = false; }, 2000);
    }
    return;
  }
  if(typeof st.idx === 'number' && st.idx !== curIdx && FEED[st.idx]){ jumpTo(st.idx); return; }
  var v = curVideo();
  if(!v || st.sec == null) return;
  var target = st.sec + (st.playing ? (Date.now() - st.at) / 1000 : 0);
  if(Math.abs(v.currentTime - target) > 1.5){ try{ v.currentTime = target; }catch(e){} }
  var pg = document.querySelector('#feed .ep[data-i="' + curIdx + '"]');
  if(st.playing && v.paused){ v.play().catch(function(){}); if(pg) pg.classList.remove('paused'); }
  else if(!st.playing && !v.paused){ v.pause(); if(pg) pg.classList.add('paused'); }
}

function leaveParty(silent){
  clearInterval(_hostTimer); _hostTimer = null;
  if(PARTY && PARTY.ch){
    if(PARTY.isHost){ try{ PARTY.ch.send({ type: 'broadcast', event: 'end', payload: {} }); }catch(e){} }
    try{ PARTY.ch.unsubscribe(); }catch(e){}
  }
  PARTY = null;
  updatePartyUI();
  if(!silent) toast('ออกจากห้องแล้ว');
}
