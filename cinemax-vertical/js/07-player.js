/* ── VERTICAL PLAYER ──────────────────────────────
   เล่นวิดีโอจริง: Cloudflare Stream / YouTube / HLS(.m3u8) / MP4 / Google Drive
   ซีรีส์ → เลื่อนขึ้น-ลงเปลี่ยนตอน | หนัง → เลื่อนไปเรื่องถัดไป          */

var FEED = [];        // [{m, ep|null}]
var CUR = null;       // movie ปัจจุบัน
var curIdx = 0;
var _hls = null;
var _muted = localStorage.getItem('cxv_muted') !== '0';        // จำค่าเสียง
var _speed = parseFloat(localStorage.getItem('cxv_speed')) || 1; // จำความเร็ว
var SPEEDS = [1, 1.25, 1.5, 2];

function curVideo(){
  var pg = document.querySelector('#feed .ep[data-i="' + curIdx + '"]');
  return pg ? pg.querySelector('video') : null;
}

/* ── วิเคราะห์ชนิด URL ── */
function classify(url){
  if(!url) return { kind:'none' };
  url = url.trim();
  if(/\.m3u8($|\?)/.test(url)) return { kind:'hls', src:url };
  if(/\.(mp4|webm|mov)($|\?)/i.test(url)) return { kind:'video', src:url };
  var cf = url.match(/(?:videodelivery\.net|cloudflarestream\.com)\/([a-zA-Z0-9]+)/);
  if(cf) return { kind:'iframe', src:'https://iframe.cloudflarestream.com/' + cf[1] + '?autoplay=true&muted=true&preload=auto&loop=false' };
  var yt = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  if(yt) return { kind:'iframe', src:'https://www.youtube-nocookie.com/embed/' + yt[1] + '?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1' };
  var gd = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if(gd) return { kind:'iframe', src:'https://drive.google.com/file/d/' + gd[1] + '/preview' };
  if(url.indexOf('mediadelivery.net') >= 0){
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return { kind:'iframe', src:url + sep + 'autoplay=true&muted=true&responsive=true' };
  }
  if(/^https?:\/\//.test(url)) return { kind:'iframe', src:url };
  return { kind:'none' };
}

/* ── เปิด player ── */
function openPlayer(id, target){
  var m = ST.movies.find(function(x){ return x.id === id; });
  if(!m) return;
  CUR = m;
  var wasOpen = document.getElementById('player').classList.contains('on');
  document.getElementById('player').classList.add('on');
  document.body.classList.add('player-open');
  if(!wasOpen) navPush({ t: 'player' });

  if(m.type === 'series'){
    buildFeed([{ m: m, ep: null, loading: true }], 0);
    loadEpisodes(m.id).then(function(eps){
      if(CUR !== m) return;
      if(!eps.length){ buildFeed([{ m: m, ep: null, empty: true }], 0); return; }
      var pages = eps.map(function(e){ return { m: m, ep: e }; });
      var start = 0;
      var want = target || (function(){ var h = getHist()[m.id]; return (h && h.s != null) ? { s: h.s, e: h.e } : null; })();
      if(want){
        var i = pages.findIndex(function(p){ return p.ep.season === want.s && p.ep.ep === want.e; });
        if(i >= 0) start = i;
      }
      buildFeed(pages, start);
    });
  } else {
    var others = ST.movies.filter(function(x){ return x.id !== m.id && x.type === 'movie' && (isPlayable(x) || ST.demo); });
    buildFeed([{ m: m, ep: null }].concat(others.map(function(x){ return { m: x, ep: null }; })), 0);
  }
}

function closePlayer(fromPop){
  var top = navTop();
  if(!fromPop && top && top.t === 'player'){ history.back(); return; }
  document.getElementById('player').classList.remove('on');
  document.body.classList.remove('player-open');
  unmountAll(); closeSheet(true); closeComments(true);
  if(typeof liveLeave === 'function') liveLeave();
  CUR = null; FEED = [];
  renderContinue(); renderProfile();
  if(typeof renderRecos === 'function') renderRecos();
}

/* ── สร้าง feed ── */
function buildFeed(pages, startIdx){
  FEED = pages; curIdx = -1;
  var feed = document.getElementById('feed'); feed.innerHTML = '';
  pages.forEach(function(p, i){
    var m = p.m;
    var ph = m.poster
      ? '<img class="ph-img" src="' + esc(m.poster) + '" referrerpolicy="no-referrer" alt="" onerror="this.remove()">'
      : '';
    var page = el('<div class="ep" data-i="' + i + '">' +
      '<div class="ph" style="' + art(m.id, (p.ep ? p.ep.ep * 3 : 0) + 1) + '">' + ph + '</div>' +
      '<div class="media"></div><div class="vg"></div>' +
      '<div class="center">' + IC.play + '</div>' +
      '<div class="bufspin"><span class="spin"></span></div>' +
      (p.loading ? '<div class="ep-note"><span class="spin"></span> กำลังโหลดตอน...</div>' : '') +
      (p.empty ? '<div class="ep-note">ยังไม่มีตอนในซีรีส์นี้</div>' : '') +
      ((!p.loading && !p.empty && !p.ep && !m.video) ? '<div class="ep-note">🎬 ยังไม่มีลิงก์วิดีโอ' + (ST.demo ? ' (โหมดตัวอย่าง)' : '') + '</div>' : '') +
      '</div>');
    attachGestures(page);
    feed.appendChild(page);
  });
  requestAnimationFrame(function(){
    feed.scrollTop = startIdx * feed.clientHeight;
    activate(startIdx);
  });
}

/* ── mount / unmount media ── */
function unmountAll(){
  if(_hls){ try{ _hls.destroy(); }catch(e){} _hls = null; }
  document.querySelectorAll('#feed .media').forEach(function(md){ md.innerHTML = ''; });
}

function mountMedia(i){
  var p = FEED[i]; if(!p) return;
  var page = document.querySelector('#feed .ep[data-i="' + i + '"]'); if(!page) return;
  var md = page.querySelector('.media');
  var url = p.trailerUrl || (p.ep ? p.ep.video : p.m.video);
  var c = classify(url);
  if(c.kind === 'none') return;

  if(c.kind === 'video' || c.kind === 'hls'){
    var v = document.createElement('video');
    v.playsInline = true; v.autoplay = true; v.muted = _muted;
    v.setAttribute('playsinline',''); v.preload = 'auto';
    v.playbackRate = _speed;
    md.appendChild(v);
    if(c.kind === 'hls' && window.Hls && Hls.isSupported()){
      _hls = new Hls({ maxBufferLength: 30 });
      _hls.loadSource(c.src); _hls.attachMedia(v);
    } else {
      v.src = c.src;
    }
    /* ดูต่อจากวินาทีที่ค้าง */
    var h = getHist()[p.m.id];
    if(h && h.idx === i && h.sec > 10){
      v.addEventListener('loadedmetadata', function(){ try{ v.currentTime = Math.max(h.sec - 3, 0); }catch(e){} }, { once:true });
    }
    var lastSave = 0;
    v.addEventListener('timeupdate', function(){
      if(!v.duration) return;
      document.getElementById('progFill').style.width = (v.currentTime / v.duration * 100) + '%';
      var now = Date.now();
      if(now - lastSave > 4000){
        lastSave = now;
        saveProgress(p.m.id, pageInfo(i, { sec: Math.floor(v.currentTime), pct: Math.round(v.currentTime / v.duration * 100) }));
      }
    });
    v.addEventListener('ended', function(){ if(curIdx < FEED.length - 1) jumpTo(curIdx + 1); });
    v.addEventListener('waiting', function(){ page.classList.add('buffering'); });
    ['playing','canplay','seeked'].forEach(function(evn){
      v.addEventListener(evn, function(){ page.classList.remove('buffering'); });
    });
    v.play().catch(function(){ page.classList.add('paused'); });
    document.getElementById('muteBtn').style.display = 'grid';
    var sb = document.getElementById('speedBtn');
    sb.style.display = 'grid'; sb.textContent = _speed + 'x';
    var pb = document.getElementById('pipBtn');
    var pipOk = (document.pictureInPictureEnabled && v.requestPictureInPicture) || v.webkitSetPresentationMode;
    pb.style.display = pipOk ? 'grid' : 'none';
    updateMuteBtn();
  } else {
    var f = document.createElement('iframe');
    f.src = c.src; f.allow = 'accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture;fullscreen';
    f.allowFullscreen = true;
    md.appendChild(f);
    document.getElementById('muteBtn').style.display = 'none';
    document.getElementById('speedBtn').style.display = 'none';
    document.getElementById('pipBtn').style.display = 'none';
    document.getElementById('progFill').style.width = '0%';
  }
}

/* ── GESTURES: แตะหยุด/เล่น · แตะสองครั้งถูกใจ · กดค้างเร่ง 2x ── */
function attachGestures(page){
  var tapTimer = null, holdTimer = null, held = false;
  page.addEventListener('pointerdown', function(){
    held = false;
    holdTimer = setTimeout(function(){
      held = true;
      var v = curVideo();
      if(v){ v.playbackRate = 2; document.getElementById('fastInd').classList.add('on'); }
    }, 400);
  });
  function endHold(){
    clearTimeout(holdTimer);
    if(held){
      var v = curVideo();
      if(v) v.playbackRate = _speed;
      document.getElementById('fastInd').classList.remove('on');
    }
  }
  page.addEventListener('pointerup', function(ev){
    endHold();
    if(held){ held = false; return; }
    if(tapTimer){                       // แตะสองครั้ง → ถูกใจ
      clearTimeout(tapTimer); tapTimer = null;
      var m = FEED[curIdx] && FEED[curIdx].m;
      if(m && !isLiked(m.id)){
        toggleLike(m.id); bumpLike(m.id, 1);
        var lb = document.getElementById('btnLike');
        if(lb){
          lb.classList.add('liked');
          lb.querySelector('.ic').innerHTML = IC.heartFill;
          lb.querySelector('.n').textContent = likeLabel(m, true);
        }
      }
      heartBurstAt(ev.clientX, ev.clientY);
      if(typeof sendReact === 'function') sendReact('❤️');
    } else {
      tapTimer = setTimeout(function(){   // แตะครั้งเดียว → หยุด/เล่น
        tapTimer = null;
        var v = page.querySelector('video');
        if(v){ if(v.paused){ v.play(); page.classList.remove('paused'); } else { v.pause(); page.classList.add('paused'); } }
      }, 250);
    }
  });
  page.addEventListener('pointercancel', endHold);
  page.addEventListener('pointerleave', endHold);
}

/* ── มินิเพลเยอร์ (Picture-in-Picture) ── */
function togglePiP(){
  var v = curVideo(); if(!v){ toast('ใช้ได้กับวิดีโอแบบ HLS/MP4'); return; }
  try{
    if(document.pictureInPictureElement){
      document.exitPictureInPicture().catch(function(){});
    } else if(v.requestPictureInPicture){
      v.requestPictureInPicture().catch(function(){ toast('อุปกรณ์นี้ไม่รองรับจอลอย'); });
    } else if(v.webkitSetPresentationMode){
      v.webkitSetPresentationMode(
        v.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
    } else {
      toast('อุปกรณ์นี้ไม่รองรับจอลอย');
    }
  }catch(e){ toast('อุปกรณ์นี้ไม่รองรับจอลอย'); }
}

function cycleSpeed(){
  var i = (SPEEDS.indexOf(_speed) + 1) % SPEEDS.length;
  _speed = SPEEDS[i];
  localStorage.setItem('cxv_speed', _speed);
  var v = curVideo(); if(v) v.playbackRate = _speed;
  document.getElementById('speedBtn').textContent = _speed + 'x';
  toast('ความเร็ว ' + _speed + 'x');
}

function pageInfo(i, extra){
  var p = FEED[i] || {};
  var info = { idx: i };
  if(p.ep){ info.s = p.ep.season; info.e = p.ep.ep; }
  return Object.assign(info, extra || {});
}

/* ── เปลี่ยนหน้า (ตอน/เรื่อง) ── */
function activate(i){
  if(i === curIdx || !FEED[i]) return;
  curIdx = i;
  unmountAll();
  document.querySelectorAll('#feed .ep').forEach(function(pg){ pg.classList.remove('paused'); });
  mountMedia(i);

  var p = FEED[i], m = p.m;
  CUR = m;
  document.getElementById('plTitle').childNodes[0].nodeValue = displayTitle(m);
  var sub;
  if(p.trailerUrl){
    sub = 'ตัวอย่าง · ' + ([m.genre, m.year].filter(Boolean).join(' · ') || '');
  } else if(p.ep){
    sub = 'ตอนที่ ' + p.ep.ep + (p.ep.season > 1 ? ' · Season ' + p.ep.season : '') + (p.ep.title ? ' · ' + p.ep.title : '');
  } else {
    sub = [m.genre, m.year].filter(Boolean).join(' · ') || (m.type === 'series' ? 'ซีรีส์' : 'ภาพยนตร์');
  }
  document.getElementById('plSub').textContent = sub;

  /* epbar */
  if(p.loading || p.empty){
    document.getElementById('epCurTxt').textContent = '–';
    document.getElementById('epTotTxt').textContent = '–';
  } else if(p.ep){
    document.getElementById('epCurTxt').textContent = 'EP ' + p.ep.ep;
    document.getElementById('epTotTxt').textContent = FEED.length;
  } else {
    document.getElementById('epCurTxt').textContent = (i + 1);
    document.getElementById('epTotTxt').textContent = FEED.length + ' เรื่อง';
  }

  var ap = document.getElementById('arrPrev'), an = document.getElementById('arrNext');
  if(ap){ ap.disabled = i <= 0; an.disabled = i >= FEED.length - 1; }
  buildRail(m); buildCaption(m, p);
  if(!p.loading && !p.empty && !p.trailerUrl){
    saveProgress(m.id, pageInfo(i));
    bumpView(m.id);   // นับยอดวิวจริง (ครั้งเดียวต่อเรื่องต่อการเปิดเว็บ)
    if(typeof liveJoin === 'function') liveJoin(m.id);   // เข้าห้อง live ของเรื่องนี้
  }
}

function jumpTo(i){
  i = Math.max(0, Math.min(FEED.length - 1, i));
  var feed = document.getElementById('feed');
  feed.scrollTo({ top: i * feed.clientHeight, behavior: 'smooth' });
}

document.getElementById('feed').addEventListener('scroll', function(){
  var i = Math.round(this.scrollTop / this.clientHeight);
  if(i !== curIdx) activate(i);
});

/* ── rail ── */
function likeLabel(m, liked){
  var n = likesOf(m);
  return n > 0 ? fmtCount(n) : (liked ? 'ถูกใจแล้ว' : 'ถูกใจ');
}
function buildRail(m){
  var liked = isLiked(m.id), faved = isFav(m.id);
  var avatar = m.poster
    ? '<img src="' + esc(m.poster) + '" referrerpolicy="no-referrer" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">'
    : '<div style="position:absolute;inset:0;' + art(m.id,2) + '"></div>';
  document.getElementById('rail').innerHTML =
    '<div class="avatar" role="button" aria-label="รายละเอียดเรื่อง" onclick="event.stopPropagation();openDetail(\'' + esc(m.id) + '\')">' + avatar + '</div>' +
    '<button class="act' + (liked ? ' liked' : '') + '" id="btnLike"><div class="ic">' + (liked ? IC.heartFill : IC.heart) + '</div><div class="n">' + likeLabel(m, liked) + '</div></button>' +
    '<button class="act" id="btnCmt"><div class="ic">' + IC.chat + '</div><div class="n">คอมเมนต์</div></button>' +
    '<button class="act' + (faved ? ' faved' : '') + '" id="btnFav"><div class="ic">' + (faved ? IC.bookmarkFill : IC.bookmark) + '</div><div class="n">' + (faved ? 'บันทึกแล้ว' : 'บันทึก') + '</div></button>' +
    '<button class="act" onclick="openSheet()"><div class="ic">' + IC.list + '</div><div class="n">' + (FEED[curIdx] && FEED[curIdx].ep ? 'ตอน' : 'เรื่อง') + '</div></button>' +
    '<button class="act" id="btnShare"><div class="ic">' + IC.share + '</div><div class="n">แชร์</div></button>';
  document.getElementById('btnLike').addEventListener('click', function(ev){
    ev.stopPropagation();
    var on = toggleLike(m.id); this.classList.toggle('liked', on);
    bumpLike(m.id, on ? 1 : -1);
    this.querySelector('.ic').innerHTML = on ? IC.heartFill : IC.heart;
    this.querySelector('.n').textContent = likeLabel(m, on);
    if(on){ heartBurst(); if(typeof sendReact === 'function') sendReact('❤️'); }
  });
  document.getElementById('btnCmt').addEventListener('click', function(ev){
    ev.stopPropagation(); openComments();
  });
  document.getElementById('btnFav').addEventListener('click', function(ev){
    ev.stopPropagation();
    var on = toggleFav(m.id); this.classList.toggle('faved', on);
    this.querySelector('.ic').innerHTML = on ? IC.bookmarkFill : IC.bookmark;
    this.querySelector('.n').textContent = on ? 'บันทึกแล้ว' : 'บันทึก';
    toast(on ? 'เพิ่มในรายการโปรดแล้ว' : 'นำออกจากรายการโปรดแล้ว');
  });
  document.getElementById('btnShare').addEventListener('click', function(ev){
    ev.stopPropagation();
    var url = location.href.split('#')[0] + '#' + encodeURIComponent(m.id);
    if(navigator.share){ navigator.share({ title: displayTitle(m), url: url }).catch(function(){}); }
    else { navigator.clipboard && navigator.clipboard.writeText(url); toast('คัดลอกลิงก์แล้ว'); }
  });
}

function buildCaption(m, p){
  var tags = (m.genre || '').split(/[·,/|]/).map(function(g){ return g.trim(); }).filter(Boolean).slice(0, 3);
  var tagHtml = tags.map(function(t, i){ return '<span' + (i === 0 ? ' class="hl"' : '') + '>#' + esc(t) + '</span>'; }).join('');
  var desc = (p.ep && p.ep.desc) || m.desc || '';
  if(desc.length > 120) desc = desc.slice(0, 120) + '…';
  document.getElementById('plBot').innerHTML =
    (tagHtml ? '<div class="pl-tags">' + tagHtml + '</div>' : '') +
    '<div class="pl-cap"><b>' + esc(displayTitle(m)) + '</b>' + (desc ? ' — ' + esc(desc) : '') + '</div>';
}

function heartBurst(){ heartBurstAt(null, null); }
function heartBurstAt(x, y){
  var b = el('<div class="burst">' + IC.heartF + '</div>');
  var host = document.getElementById('player');
  if(x != null){
    var r = host.getBoundingClientRect();
    b.style.left = (x - r.left - 15) + 'px'; b.style.top = (y - r.top - 15) + 'px';
  } else {
    b.style.right = '28px'; b.style.bottom = '240px';
  }
  host.appendChild(b);
  setTimeout(function(){ b.remove(); }, 1000);
}

/* ── ลากแถบเวลาเพื่อเลื่อนตำแหน่ง + บอกเวลา (native video เท่านั้น) ── */
function fmtTime(sec){
  sec = Math.max(0, Math.floor(sec || 0));
  var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s2 = sec % 60;
  var mm = (h ? String(m).padStart(2, '0') : m), ss = String(s2).padStart(2, '0');
  return (h ? h + ':' : '') + mm + ':' + ss;
}
(function(){
  var bar = document.getElementById('progBar');
  if(!bar) return;
  var tip = document.getElementById('seekTip');
  function seek(clientX){
    var v = curVideo(); if(!v || !v.duration) return;
    var r = bar.getBoundingClientRect();
    var p = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
    v.currentTime = p * v.duration;
    document.getElementById('progFill').style.width = (p * 100) + '%';
    if(tip){
      tip.textContent = fmtTime(p * v.duration) + ' / ' + fmtTime(v.duration);
      tip.style.left = Math.min(Math.max(clientX - r.left, 30), r.width - 30) + 'px';
    }
  }
  var dragging = false;
  bar.addEventListener('pointerdown', function(e){
    dragging = true; bar.setPointerCapture(e.pointerId); seek(e.clientX);
    if(tip && curVideo()) tip.classList.add('on');
    e.stopPropagation();
  });
  bar.addEventListener('pointermove', function(e){ if(dragging){ seek(e.clientX); e.stopPropagation(); } });
  bar.addEventListener('pointerup', function(e){
    dragging = false;
    if(tip) tip.classList.remove('on');
    e.stopPropagation();
  });
})();

/* ── mute ── */
function toggleMute(){
  _muted = !_muted;
  localStorage.setItem('cxv_muted', _muted ? '1' : '0');
  var v = document.querySelector('#feed video');
  if(v) v.muted = _muted;
  updateMuteBtn();
}
function updateMuteBtn(){
  document.getElementById('muteBtn').innerHTML = _muted ? IC.mute : IC.sound;
}

/* ── keyboard (คอม) ── */
document.addEventListener('keydown', function(ev){
  if(!document.getElementById('player').classList.contains('on')) return;
  if(ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return; // กำลังพิมพ์คอมเมนต์
  if(ev.key === 'Escape'){
    if(document.getElementById('cmtSheet').classList.contains('on')) closeComments();
    else if(document.getElementById('sheet').classList.contains('on')) closeSheet();
    else if(document.getElementById('dtSheet').classList.contains('on')) closeDetail();
    else closePlayer();
  }
  else if(ev.key === 'ArrowDown'){ ev.preventDefault(); if(curIdx < FEED.length - 1) jumpTo(curIdx + 1); }
  else if(ev.key === 'ArrowUp'){ ev.preventDefault(); if(curIdx > 0) jumpTo(curIdx - 1); }
  else if(ev.key === 'm' || ev.key === 'M'){ toggleMute(); }
  else if(ev.key === ' '){
    var pg = document.querySelector('#feed .ep[data-i="' + curIdx + '"]');
    if(pg && pg.querySelector('video')){ ev.preventDefault(); pg.click(); }
  }
});

/* ── toast ── */
var _toastTimer = null;
function toast(msg){
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function(){ t.classList.remove('on'); }, 2200);
}
