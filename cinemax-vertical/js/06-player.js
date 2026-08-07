/* ── VERTICAL PLAYER ──────────────────────────────
   เล่นวิดีโอจริง: Cloudflare Stream / YouTube / HLS(.m3u8) / MP4 / Google Drive
   ซีรีส์ → เลื่อนขึ้น-ลงเปลี่ยนตอน | หนัง → เลื่อนไปเรื่องถัดไป          */

var FEED = [];        // [{m, ep|null}]
var CUR = null;       // movie ปัจจุบัน
var curIdx = 0;
var _hls = null;
var _muted = true;

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
function openPlayer(id){
  var m = ST.movies.find(function(x){ return x.id === id; });
  if(!m) return;
  CUR = m;
  document.getElementById('player').classList.add('on');
  document.body.classList.add('player-open');

  if(m.type === 'series'){
    buildFeed([{ m: m, ep: null, loading: true }], 0);
    loadEpisodes(m.id).then(function(eps){
      if(CUR !== m) return;
      if(!eps.length){ buildFeed([{ m: m, ep: null, empty: true }], 0); return; }
      var pages = eps.map(function(e){ return { m: m, ep: e }; });
      var h = getHist()[m.id], start = 0;
      if(h && h.s != null){
        var i = pages.findIndex(function(p){ return p.ep.season === h.s && p.ep.ep === h.e; });
        if(i >= 0) start = i;
      }
      buildFeed(pages, start);
    });
  } else {
    var others = ST.movies.filter(function(x){ return x.id !== m.id && x.type === 'movie' && (isPlayable(x) || ST.demo); });
    buildFeed([{ m: m, ep: null }].concat(others.map(function(x){ return { m: x, ep: null }; })), 0);
  }
}

function closePlayer(){
  document.getElementById('player').classList.remove('on');
  document.body.classList.remove('player-open');
  unmountAll(); closeSheet();
  CUR = null; FEED = [];
  renderContinue(); renderProfile();
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
      (p.loading ? '<div class="ep-note"><span class="spin"></span> กำลังโหลดตอน...</div>' : '') +
      (p.empty ? '<div class="ep-note">ยังไม่มีตอนในซีรีส์นี้</div>' : '') +
      ((!p.loading && !p.empty && !p.ep && !m.video) ? '<div class="ep-note">🎬 ยังไม่มีลิงก์วิดีโอ' + (ST.demo ? ' (โหมดตัวอย่าง)' : '') + '</div>' : '') +
      '</div>');
    page.addEventListener('click', function(){
      var v = page.querySelector('video');
      if(v){ if(v.paused){ v.play(); page.classList.remove('paused'); } else { v.pause(); page.classList.add('paused'); } }
    });
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
  var url = p.ep ? p.ep.video : p.m.video;
  var c = classify(url);
  if(c.kind === 'none') return;

  if(c.kind === 'video' || c.kind === 'hls'){
    var v = document.createElement('video');
    v.playsInline = true; v.autoplay = true; v.muted = _muted;
    v.setAttribute('playsinline',''); v.preload = 'auto';
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
    v.play().catch(function(){ page.classList.add('paused'); });
    document.getElementById('muteBtn').style.display = 'grid';
    updateMuteBtn();
  } else {
    var f = document.createElement('iframe');
    f.src = c.src; f.allow = 'accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture;fullscreen';
    f.allowFullscreen = true;
    md.appendChild(f);
    document.getElementById('muteBtn').style.display = 'none';
    document.getElementById('progFill').style.width = '0%';
  }
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
  if(p.ep){
    sub = 'ตอนที่ ' + p.ep.ep + (p.ep.season > 1 ? ' · Season ' + p.ep.season : '') + (p.ep.title ? ' · ' + p.ep.title : '');
  } else {
    sub = [m.genre, m.year].filter(Boolean).join(' · ') || (m.type === 'series' ? 'ซีรีส์' : 'ภาพยนตร์');
  }
  document.getElementById('plSub').textContent = sub;

  /* epbar */
  if(p.ep){
    document.getElementById('epCurTxt').textContent = 'EP ' + p.ep.ep;
    document.getElementById('epTotTxt').textContent = FEED.length;
  } else {
    document.getElementById('epCurTxt').textContent = (i + 1);
    document.getElementById('epTotTxt').textContent = FEED.length + ' เรื่อง';
  }

  buildRail(m); buildCaption(m, p);
  if(!p.loading && !p.empty) saveProgress(m.id, pageInfo(i));
}

function jumpTo(i){
  var feed = document.getElementById('feed');
  feed.scrollTo({ top: i * feed.clientHeight, behavior: 'smooth' });
}

document.getElementById('feed').addEventListener('scroll', function(){
  var i = Math.round(this.scrollTop / this.clientHeight);
  if(i !== curIdx) activate(i);
});

/* ── rail ── */
function buildRail(m){
  var liked = isLiked(m.id), faved = isFav(m.id);
  var avatar = m.poster
    ? '<img src="' + esc(m.poster) + '" referrerpolicy="no-referrer" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">'
    : '<div style="position:absolute;inset:0;' + art(m.id,2) + '"></div>';
  document.getElementById('rail').innerHTML =
    '<div class="avatar">' + avatar + '</div>' +
    '<button class="act' + (liked ? ' liked' : '') + '" id="btnLike"><div class="ic">' + IC.heart + '</div><div class="n">' + (liked ? 'ถูกใจแล้ว' : 'ถูกใจ') + '</div></button>' +
    '<button class="act' + (faved ? ' faved' : '') + '" id="btnFav"><div class="ic">' + IC.bookmark + '</div><div class="n">' + (faved ? 'บันทึกแล้ว' : 'บันทึก') + '</div></button>' +
    '<button class="act" onclick="openSheet()"><div class="ic">' + IC.list + '</div><div class="n">' + (FEED[curIdx] && FEED[curIdx].ep ? 'ตอน' : 'เรื่อง') + '</div></button>' +
    '<button class="act" id="btnShare"><div class="ic">' + IC.share + '</div><div class="n">แชร์</div></button>';
  document.getElementById('btnLike').addEventListener('click', function(ev){
    ev.stopPropagation();
    var on = toggleLike(m.id); this.classList.toggle('liked', on);
    this.querySelector('.n').textContent = on ? 'ถูกใจแล้ว' : 'ถูกใจ';
    if(on) heartBurst();
  });
  document.getElementById('btnFav').addEventListener('click', function(ev){
    ev.stopPropagation();
    var on = toggleFav(m.id); this.classList.toggle('faved', on);
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

function heartBurst(){
  var b = el('<div class="burst">' + IC.heartF + '</div>');
  b.style.right = '28px'; b.style.bottom = '240px';
  document.getElementById('player').appendChild(b);
  setTimeout(function(){ b.remove(); }, 1000);
}

/* ── mute ── */
function toggleMute(){
  _muted = !_muted;
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
  if(ev.key === 'Escape'){ closePlayer(); }
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
