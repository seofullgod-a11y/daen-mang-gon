/* ── LIVE MODE: ไลฟ์พรีเมียร์ซีรีส์ใหม่ ───────────
   สไตล์ไลฟ์ FB/IG: วิดีโอเล่นตามเวลาจริง (ทุกคนเห็นจุดเดียวกัน)
   + แชทสด + หัวใจลอย + ยอดผู้ชมเรียลไทม์ (Supabase Realtime)
   เจ้าของเปิด/ปิดไลฟ์จาก /admin → ตาราง settings (live_*)      */

/* LIVECFG ประกาศใน 02-config.js (ต้องมีก่อน loadSettings ทำงาน) */
var LV = { on: false, ch: null, hls: null, cd: null, joined: 0 };
var _lvNick = localStorage.getItem('cxv_nick') || '';

/* ── ประเมินสถานะไลฟ์จาก settings ── */
function liveState(){
  if((LIVECFG.live_on || '0') !== '1') return { s: 'off' };
  var m = ST.movies.find(function(x){ return x.id === LIVECFG.live_movie; });
  if(!m) return { s: 'off' };
  var start = LIVECFG.live_start ? new Date(LIVECFG.live_start).getTime() : 0;
  if(start && Date.now() < start) return { s: 'wait', m: m, start: start };
  return { s: 'on', m: m, start: start };
}

/* ── แบนเนอร์หน้าแรก (+ นับถอยหลังก่อนเริ่ม) ── */
function renderLiveBanner(){
  var b = document.getElementById('lvBanner'); if(!b) return;
  var fab = document.getElementById('lvFab');
  if(LV.cd){ clearInterval(LV.cd); LV.cd = null; }
  var st = liveState();
  if(st.s === 'off'){
    b.style.display = 'none';
    if(fab) fab.style.display = 'none';
    return;
  }
  if(fab){
    fab.style.display = 'flex';
    var fc = document.getElementById('lvFabCd');
    if(fc) fc.textContent = '';
  }
  var title = LIVECFG.live_title || ('พรีเมียร์ "' + displayTitle(st.m) + '"');
  b.style.display = 'flex';
  b.innerHTML =
    '<span class="lvb-dot"></span>' +
    '<div class="lvb-tx"><b>' + (st.s === 'wait' ? 'ไลฟ์กำลังจะเริ่ม' : 'LIVE กำลังไลฟ์') + '</b>' +
    '<span>' + esc(title) + (st.s === 'wait' ? ' · <em id="lvCd"></em>' : '') + '</span></div>' +
    '<button class="lvb-go">' + (st.s === 'wait' ? 'รอชม' : 'เข้าชม ›') + '</button>';
  b.onclick = function(){ openLive(); };
  if(st.s === 'wait'){
    var tick = function(){
      var left = Math.max(0, st.start - Date.now());
      var el = document.getElementById('lvCd');
      var s = Math.floor(left / 1000);
      var hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
      var txt = (hh ? hh + ':' : '') + ('0' + mm).slice(-2) + ':' + ('0' + ss).slice(-2);
      if(el) el.textContent = 'เริ่มใน ' + txt;
      var fc = document.getElementById('lvFabCd');
      if(fc) fc.textContent = txt;
      if(left <= 0){ clearInterval(LV.cd); LV.cd = null; renderLiveBanner(); }
    };
    tick(); LV.cd = setInterval(tick, 1000);
  }
}

/* ── เปิด/ปิดจอไลฟ์ ── */
function openLive(){
  var st = liveState();
  if(st.s === 'off'){ toast('ยังไม่มีไลฟ์ตอนนี้'); return; }
  var v = document.getElementById('liveView');
  if(!v.classList.contains('on')) navPush({ t: 'lv' });
  v.classList.add('on');
  document.body.classList.add('player-open');
  document.getElementById('lvTitle').textContent =
    LIVECFG.live_title || ('พรีเมียร์ "' + displayTitle(st.m) + '"');
  document.getElementById('lvChat').innerHTML = '';
  updateLvCount(1);
  lvMount(st);
  lvJoin(st);
  if(st.s === 'on' && typeof bumpView === 'function') bumpView(st.m.id);
  lvSys(st.s === 'wait' ? 'ไลฟ์กำลังจะเริ่ม รอสักครู่...' : 'ยินดีต้อนรับสู่ไลฟ์ 🎉 ทักทายกันได้เลย');
}
function closeLive(fromPop){
  var v = document.getElementById('liveView');
  if(!v.classList.contains('on')) return;
  var top = navTop();
  if(!fromPop && top && top.t === 'lv'){ history.back(); return; }
  v.classList.remove('on');
  if(!document.getElementById('player').classList.contains('on'))
    document.body.classList.remove('player-open');
  lvUnmount(); lvLeave();
}

/* ── media: เล่นวิดีโอ sync ตามเวลาเริ่มไลฟ์ ── */
function lvVideoUrl(st, cb){
  /* ซีรีส์ + ระบุตอน → ใช้วิดีโอของตอนนั้น */
  var epNo = parseInt(LIVECFG.live_ep) || 0;
  if(st.m.type === 'series' && epNo){
    loadEpisodes(st.m.id).then(function(eps){
      var e = eps.find(function(x){ return x.ep === epNo; });
      cb(e ? e.video : st.m.video);
    });
  } else cb(st.m.video);
}
function lvMount(st){
  lvUnmount();
  var md = document.getElementById('lvMedia');
  if(st.s === 'wait'){
    md.innerHTML = '<div class="lv-wait"><span class="lvb-dot big"></span>' +
      '<b>ไลฟ์กำลังจะเริ่ม</b><span id="lvWaitCd"></span></div>';
    var tick = function(){
      var left = Math.max(0, st.start - Date.now());
      var el = document.getElementById('lvWaitCd'); if(!el) return;
      var s = Math.floor(left / 1000);
      el.textContent = ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2);
      if(left <= 0){ clearInterval(LV.wd); openLive(); }   // ถึงเวลา → รีโหลดเป็นโหมดไลฟ์
    };
    tick(); LV.wd = setInterval(tick, 500);
    return;
  }
  lvVideoUrl(st, function(url){
    var c = classify(url);
    if(c.kind === 'none'){ md.innerHTML = '<div class="lv-wait"><b>ยังไม่มีวิดีโอสำหรับไลฟ์นี้</b></div>'; return; }
    if(c.kind === 'video' || c.kind === 'hls'){
      var vd = document.createElement('video');
      vd.playsInline = true; vd.autoplay = true; vd.muted = false;
      vd.setAttribute('playsinline', ''); vd.preload = 'auto';
      md.innerHTML = ''; md.appendChild(vd);
      if(c.kind === 'hls' && !vd.canPlayType('application/vnd.apple.mpegurl')){
        (window.Hls ? Promise.resolve() : loadScript(HLS_CDN)).then(function(){
          if(!document.body.contains(vd)) return;
          if(window.Hls && Hls.isSupported()){
            LV.hls = new Hls({ maxBufferLength: 30 });
            LV.hls.loadSource(c.src); LV.hls.attachMedia(vd);
          } else vd.src = c.src;
        }).catch(function(){ vd.src = c.src; });
      } else vd.src = c.src;
      /* sync ตำแหน่ง = เวลาที่ผ่านไปจริงตั้งแต่เริ่มไลฟ์ (ทุกคนเห็นจุดเดียวกัน) */
      vd.addEventListener('loadedmetadata', function(){
        if(st.start){
          var elapsed = (Date.now() - st.start) / 1000;
          if(vd.duration && elapsed >= vd.duration){ lvEnded(); return; }
          try{ vd.currentTime = Math.max(0, elapsed); }catch(e){}
        }
        vd.play().catch(function(){
          /* autoplay เสียงถูกบล็อก → ปุ่มแตะเพื่อเริ่ม */
          var tap = el('<button class="lv-tap">แตะเพื่อเริ่มชมไลฟ์ 🔴</button>');
          tap.addEventListener('click', function(){ vd.play(); tap.remove(); });
          md.appendChild(tap);
        });
      }, { once: true });
      vd.addEventListener('ended', lvEnded);
      /* ไลฟ์จริงไม่มี pause/เลื่อน — แตะจอ = ส่งหัวใจแบบ IG */
      vd.style.pointerEvents = 'none';
    } else {
      md.innerHTML = '';
      var f = document.createElement('iframe');
      f.src = c.src; f.allow = 'autoplay;encrypted-media;fullscreen';
      f.allowFullscreen = true;
      md.appendChild(f);
    }
  });
}
function lvEnded(){
  var md = document.getElementById('lvMedia');
  md.innerHTML = '<div class="lv-wait"><b>ไลฟ์จบแล้ว ขอบคุณที่รับชม 🙏</b>' +
    '<button class="more-btn" style="max-width:260px;margin-top:14px" ' +
    'onclick="closeLive();openDetail(LIVECFG.live_movie)">ดูย้อนหลัง / ดูรายละเอียดเรื่อง</button></div>';
}
function lvUnmount(){
  if(LV.hls){ try{ LV.hls.destroy(); }catch(e){} LV.hls = null; }
  if(LV.wd){ clearInterval(LV.wd); LV.wd = null; }
  document.getElementById('lvMedia').innerHTML = '';
}

/* ── Realtime: ห้องไลฟ์ (presence + แชท + หัวใจ) ── */
function lvRoomId(){
  return 'lvroom:' + (LIVECFG.live_movie || 'x') + ':' + (LIVECFG.live_start || '0');
}
function lvJoin(st){
  lvLeave();
  var c = (typeof rtClient === 'function') ? rtClient() : null;
  if(!c){
    /* ไลบรารีกำลังโหลด → ลองใหม่ (rtClient โหลด supabase-js ให้เอง) */
    if(!LV.retry){
      LV.retry = setInterval(function(){
        if(!document.getElementById('liveView').classList.contains('on')){ clearInterval(LV.retry); LV.retry = null; return; }
        var c2 = rtClient();
        if(c2){ clearInterval(LV.retry); LV.retry = null; lvJoin(liveState()); }
      }, 800);
    }
    return;
  }
  try{
    LV.ch = c.channel(lvRoomId(), {
      config: { presence: { key: 'v' + Math.random().toString(36).slice(2, 9) }, broadcast: { self: false } }
    });
    LV.ch.on('presence', { event: 'sync' }, function(){
      var n = 0, s = LV.ch.presenceState();
      for(var k in s) n += s[k].length;
      updateLvCount(Math.max(n, 1));
    });
    LV.ch.on('broadcast', { event: 'chat' }, function(p){
      if(p.payload) lvChatAdd(p.payload.n, p.payload.b);
    });
    LV.ch.on('broadcast', { event: 'react' }, function(p){
      lvSpawnHeart((p.payload && p.payload.e) || '❤️');
    });
    LV.ch.subscribe(function(status){
      if(status === 'SUBSCRIBED'){ try{ LV.ch.track({ t: 1 }); }catch(e){} }
    });
  }catch(e){ LV.ch = null; }
}
function lvLeave(){
  if(LV.retry){ clearInterval(LV.retry); LV.retry = null; }
  if(LV.ch){ try{ LV.ch.unsubscribe(); }catch(e){} LV.ch = null; }
}
function updateLvCount(n){
  var el = document.getElementById('lvCount');
  if(el) el.textContent = fmtCount(n);
}

/* ── แชท ── */
function lvSys(t){ lvChatAdd(null, t, true); }
function lvChatAdd(nick, body, sys){
  var box = document.getElementById('lvChat'); if(!box) return;
  var d;
  if(sys){
    d = el('<div class="lvc sys">' + esc(body) + '</div>');
  } else {
    d = el('<div class="lvc"><i style="' + art('nick_' + nick, 3) + '">' +
      esc((nick || '?').charAt(0).toUpperCase()) + '</i><div><b>' + esc(nick || 'ผู้ชม') + '</b> ' +
      esc(body) + '</div></div>');
  }
  box.appendChild(d);
  while(box.children.length > 40) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}
function lvSend(){
  var inp = document.getElementById('lvInput');
  var b = (inp.value || '').trim();
  if(!b) return;
  if(b.length > 200) b = b.slice(0, 200);
  if(!_lvNick){
    var n = prompt('ตั้งชื่อที่ใช้ในแชท (ครั้งเดียว):', '');
    if(n == null) return;
    _lvNick = (n.trim() || 'ผู้ชม').slice(0, 20);
    localStorage.setItem('cxv_nick', _lvNick);
  }
  inp.value = '';
  lvChatAdd(_lvNick, b);   // เห็นของตัวเองทันที
  if(LV.ch){ try{ LV.ch.send({ type: 'broadcast', event: 'chat', payload: { n: _lvNick, b: b } }); }catch(e){} }
}

/* ── หัวใจลอย ── */
var _lvLastReact = 0;
function lvHeart(emo){
  var now = Date.now();
  if(now - _lvLastReact < 250) return;
  _lvLastReact = now;
  emo = emo || '❤️';
  lvSpawnHeart(emo);
  if(LV.ch){ try{ LV.ch.send({ type: 'broadcast', event: 'react', payload: { e: emo } }); }catch(e){} }
}
function lvSpawnHeart(emo){
  var layer = document.getElementById('lvReacts'); if(!layer) return;
  var d = document.createElement('div');
  d.className = 'fx-react';
  d.textContent = emo;
  d.style.left = (72 + Math.random() * 18) + '%';
  d.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
  d.style.setProperty('--dur', (1.8 + Math.random()) + 's');
  layer.appendChild(d);
  setTimeout(function(){ d.remove(); }, 3000);
}
