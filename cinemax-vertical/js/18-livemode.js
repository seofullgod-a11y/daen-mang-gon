/* ── LIVE MODE: ไลฟ์พรีเมียร์ซีรีส์ใหม่ ───────────
   สไตล์ไลฟ์ FB/IG: วิดีโอเล่นตามเวลาจริง (ทุกคนเห็นจุดเดียวกัน)
   + แชทสด + หัวใจลอย + ยอดผู้ชมเรียลไทม์ (Supabase Realtime)
   เจ้าของเปิด/ปิดไลฟ์จาก /admin → ตาราง settings (live_*)      */

/* LIVECFG ประกาศใน 02-config.js (ต้องมีก่อน loadSettings ทำงาน) */
var LV = { on: false, ch: null, hls: null, cd: null, joined: 0 };
var _lvNick = localStorage.getItem('cxv_nick') || '';

/* ── ประเมินสถานะไลฟ์จาก settings ── */
function liveState(){
  if((LIVECFG.live_on || '0') !== '1' || !LIVECFG.live_movie) return { s: 'off' };
  /* เรื่องอาจยังไม่อยู่ในลิสต์ (โหลดไม่เสร็จ หรือถูกซ่อนรอพรีเมียร์) → ไลฟ์ยังต้องทำงาน */
  var m = ST.movies.find(function(x){ return x.id === LIVECFG.live_movie; }) || null;
  var start = LIVECFG.live_start ? new Date(LIVECFG.live_start).getTime() : 0;
  if(start && Date.now() < start) return { s: 'wait', m: m, start: start };
  return { s: 'on', m: m, start: start };
}
/* ดึงข้อมูลเรื่องที่ไลฟ์ตรงจาก Supabase (กรณีเรื่องถูกซ่อน ไม่อยู่ใน ST.movies) */
function lvFetchMovie(cb){
  var inList = ST.movies.find(function(x){ return x.id === LIVECFG.live_movie; });
  if(inList){ cb(inList); return; }
  fetch(SB_URL + '/rest/v1/movies?select=id,data&id=eq.' + encodeURIComponent(LIVECFG.live_movie),
    { headers: sbHeaders() })
    .then(function(r){ return r.ok ? r.json() : []; })
    .catch(function(){ return []; })
    .then(function(rows){ cb(rows[0] ? normMovie(rows[0].data, rows[0]) : null); });
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
  var title = LIVECFG.live_title || (st.m ? 'พรีเมียร์ "' + displayTitle(st.m) + '"' : 'ไลฟ์พิเศษกำลังมา');
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
  document.getElementById('lvChat').innerHTML = '';
  updateLvCount(1);
  lvJoin(st);
  lvSys(st.s === 'wait' ? 'ไลฟ์กำลังจะเริ่ม รอสักครู่...' : 'ยินดีต้อนรับสู่ไลฟ์ 🎉 ทักทายกันได้เลย');
  /* โหลดข้อมูลเรื่อง (รองรับเรื่องที่ถูกซ่อนรอพรีเมียร์) แล้วค่อยเริ่มวิดีโอ */
  lvFetchMovie(function(m){
    if(!document.getElementById('liveView').classList.contains('on')) return;
    st.m = m;
    document.getElementById('lvTitle').textContent =
      LIVECFG.live_title || (m ? 'พรีเมียร์ "' + displayTitle(m) + '"' : 'ไลฟ์พิเศษ');
    lvMount(st);
    if(st.s === 'on' && m && typeof bumpView === 'function') bumpView(m.id);
  });
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
  if(!st.m){ cb(''); return; }
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
  var pub = ST.movies.some(function(x){ return x.id === LIVECFG.live_movie; });
  md.innerHTML = '<div class="lv-wait"><b>ไลฟ์จบแล้ว ขอบคุณที่รับชม 🙏</b>' +
    (pub ? '<button class="more-btn" style="max-width:260px;margin-top:14px" ' +
      'onclick="closeLive();openDetail(LIVECFG.live_movie)">ดูย้อนหลัง / ดูรายละเอียดเรื่อง</button>' : '') + '</div>';
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

/* ── รีแอคชันลอยสไตล์ Facebook Live ── */
var LV_REACTS = {
  heart: '<span class="fxr fxr-heart"><svg viewBox="0 0 24 24"><path fill="#fff" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>',
  like:  '<span class="fxr fxr-like"><svg viewBox="0 0 24 24"><path fill="#fff" d="M2 21h4V9H2v12zM23 10c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg></span>',
  wow:   '<span class="fxr fxr-emo">😮</span>',
  haha:  '<span class="fxr fxr-emo">😆</span>'
};
var _lvLastReact = 0;
function lvHeart(kind){
  var now = Date.now();
  if(now - _lvLastReact < 250) return;
  _lvLastReact = now;
  kind = LV_REACTS[kind] ? kind : 'heart';
  lvSpawnHeart(kind);
  if(LV.ch){ try{ LV.ch.send({ type: 'broadcast', event: 'react', payload: { e: kind } }); }catch(e){} }
}
function lvSpawnHeart(e){
  var layer = document.getElementById('lvReacts'); if(!layer) return;
  var d = document.createElement('div');
  d.className = 'fx-react';
  /* รองรับทั้ง key ใหม่ (heart/like/wow/haha) และอีโมจิดิบจากเวอร์ชันเก่า */
  d.innerHTML = LV_REACTS[e] || ('<span class="fxr fxr-emo">' + esc(String(e || '❤️')) + '</span>');
  d.style.left = (74 + Math.random() * 16) + '%';
  d.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
  d.style.setProperty('--dur', (1.9 + Math.random()) + 's');
  layer.appendChild(d);
  setTimeout(function(){ d.remove(); }, 3200);
}
/* กด Enter ในช่องคอมเมนต์ = ส่ง */
(function(){
  var inp = document.getElementById('lvInput');
  if(inp) inp.addEventListener('keydown', function(ev){
    if(ev.key === 'Enter'){ ev.preventDefault(); lvSend(); }
  });
})();

/* ── เช็กสถานะไลฟ์ทุก 60 วิ — เปิด/ปิดไลฟ์จากหลังบ้านแล้วผู้ชมที่ค้างหน้าเว็บเห็นเอง ── */
setInterval(function(){
  if(document.visibilityState !== 'visible' || ST.demo) return;
  fetch(SB_URL + '/rest/v1/settings?select=key,value&key=like.live_*', { headers: sbHeaders() })
    .then(function(r){ return r.ok ? r.json() : null; })
    .catch(function(){ return null; })
    .then(function(rows){
      if(!rows) return;
      var cfg = {};
      rows.forEach(function(r){ cfg[r.key] = r.value; });
      if(JSON.stringify(cfg) !== JSON.stringify(LIVECFG)){
        LIVECFG = cfg;
        renderLiveBanner();
      }
    });
}, 60000);
