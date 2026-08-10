/* ── RENDER: หน้าแรก / ชาร์ต / ค้นหา / โปรไฟล์ ── */

function el(h){ var d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; }
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* โปสเตอร์: ใช้รูปจริง ถ้าไม่มี → gradient + อักษรลายน้ำ */
function posterHtml(m, extra){
  var inner;
  if(m.poster){
    inner = '<img class="art" loading="lazy" referrerpolicy="no-referrer" src="' + esc(m.poster) + '" alt="" ' +
      'onerror="this.outerHTML=\'<div class=&quot;art&quot; style=&quot;' + art(m.id,9) + '&quot;></div>\'">';
  } else {
    inner = '<div class="art" style="' + art(m.id,9) + '"></div>' +
      '<span class="glyph">' + esc(displayTitle(m).charAt(0)) + '</span>';
  }
  var vw = viewsOf(m);
  var pv = vw >= 10 ? (IC.eye + ' ' + fmtCount(vw))
    : (m.rating ? (IC.star + ' ' + m.rating.toFixed(1)) : (m.year || ''));
  var isNew = m.added && (Date.now() - new Date(m.added).getTime()) < 14 * 86400000;
  var badge = m.coming ? '<span class="badge cs">เร็วๆ นี้</span>' : (isNew ? '<span class="badge new">NEW</span>' : '');
  return '<div class="poster">' + inner + badge + (extra || '') +
    (pv ? '<span class="pv">' + pv + '</span>' : '') + '</div>';
}

function cardHtml(m, extra){
  return '<div class="gcard" data-id="' + esc(m.id) + '">' + posterHtml(m, extra) +
    '<div class="t">' + esc(displayTitle(m)) + '</div>' +
    '<div class="s">' + esc(m.genre || (m.type === 'series' ? 'ซีรีส์' : 'ภาพยนตร์')) + (m.year ? ' · ' + m.year : '') + '</div></div>';
}

/* คลิกการ์ดที่ไหนก็ได้ → เปิด player (event delegation) */
document.addEventListener('click', function(ev){
  var c = ev.target.closest('[data-id]');
  if(c && !ev.target.closest('button')) openPlayer(c.getAttribute('data-id'));
});

var activeCat = '';
var _gridLim = { gridNew: 12, gridRec: 12 };

/* ── skeleton ระหว่างโหลดครั้งแรก ── */
function renderSkeletons(){
  document.getElementById('billboard').classList.add('skel');
  function skRow(id, n, cls){
    var g = document.getElementById(id); g.innerHTML = '';
    for(var i = 0; i < n; i++) g.appendChild(el('<div class="' + cls + '"><div class="poster sk"></div></div>'));
  }
  skRow('rankRow', 8, 'rank-card');
  skRow('gridNew', 6, 'gcard');
  skRow('gridRec', 6, 'gcard');
}

/* ── ลองเชื่อมต่อฐานข้อมูลใหม่ ── */
function retryConnect(){
  toast('กำลังเชื่อมต่อใหม่...');
  loadMovies().then(function(){ return loadStats(); }).then(function(){
    renderAll();
    toast(ST.demo ? 'ยังเชื่อมต่อไม่ได้ ลองอีกครั้งภายหลัง' : 'เชื่อมต่อสำเร็จ ✓');
  });
}

function renderAll(){
  renderChips(); renderHero(); renderContinue();
  renderRank(); renderGrids(); renderRankFull(); renderProfile();
  var db = document.getElementById('demo-banner');
  if(db) db.style.display = ST.demo ? 'flex' : 'none';
}

function visMovies(){
  return ST.movies.filter(function(m){ return !activeCat || (m.genre || '').indexOf(activeCat) >= 0; });
}

function renderChips(){
  var box = document.getElementById('chips'); box.innerHTML = '';
  var cats = [];
  ST.movies.forEach(function(m){
    (m.genre || '').split(/[·,/|]/).forEach(function(g){
      g = g.trim(); if(g && cats.indexOf(g) < 0) cats.push(g);
    });
  });
  ['ทั้งหมด'].concat(cats.slice(0, 12)).forEach(function(c, i){
    var chip = el('<div class="chip' + ((i === 0 && !activeCat) || c === activeCat ? ' on' : '') + '">' + esc(c) + '</div>');
    chip.addEventListener('click', function(){
      activeCat = (c === 'ทั้งหมด') ? '' : c;
      renderChips(); renderHero(); renderRank(); renderGrids();
    });
    box.appendChild(chip);
  });
}

/* ── HERO BILLBOARD (หมุนอัตโนมัติ + แถบโปสเตอร์) ── */
var _bbTimer = null, _bbIdx = 0, _bbItems = [];

function renderHero(){
  var bb = document.getElementById('billboard');
  bb.classList.remove('skel');
  if(_bbTimer){ clearInterval(_bbTimer); _bbTimer = null; }
  var list = visMovies().filter(function(m){ return isPlayable(m) || ST.demo; })
    .slice().sort(popSort).slice(0, 6);
  _bbItems = list; _bbIdx = 0;
  if(!list.length){ bb.style.display = 'none'; return; }
  bb.style.display = '';

  var bgHtml = list.map(function(m, i){
    var src = m.bg || m.poster;
    return src
      ? '<img class="bb-img' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" referrerpolicy="no-referrer" src="' + esc(src) + '" alt="" onerror="this.style.visibility=\'hidden\'">'
      : '<div class="bb-img' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" style="' + art(m.id,5) + '"></div>';
  }).join('');

  bb.innerHTML =
    '<div class="bb-bg">' + bgHtml + '</div><div class="bb-shade"></div>' +
    '<div class="bb-body" id="bbBody"></div>' +
    '<div class="bb-rail" id="bbRail">' + list.map(function(m, i){
      var inner = m.poster
        ? '<img referrerpolicy="no-referrer" src="' + esc(m.poster) + '" alt="">'
        : '<div style="position:absolute;inset:0;' + art(m.id,9) + '"></div>';
      return '<div class="bb-thumb' + (i === 0 ? ' on' : '') + '" data-i="' + i + '">' + inner + '</div>';
    }).join('') + '</div>' +
    '<div class="bb-dots" id="bbDots">' + list.map(function(_, i){
      return '<span class="' + (i === 0 ? 'on' : '') + '" data-i="' + i + '"></span>';
    }).join('') + '</div>';

  bb.querySelectorAll('.bb-thumb,.bb-dots span').forEach(function(n){
    n.addEventListener('click', function(ev){ ev.stopPropagation(); bbGo(parseInt(n.getAttribute('data-i'), 10), true); });
  });

  if(!bb._wired){
    bb._wired = true;
    var sx = null;
    bb.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; }, { passive:true });
    bb.addEventListener('touchend', function(e){
      if(sx == null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if(Math.abs(dx) > 50 && _bbItems.length > 1)
        bbGo((_bbIdx + (dx < 0 ? 1 : -1) + _bbItems.length) % _bbItems.length, true);
    }, { passive:true });
    bb.addEventListener('mouseenter', function(){ if(_bbTimer){ clearInterval(_bbTimer); _bbTimer = null; } });
    bb.addEventListener('mouseleave', bbAuto);
  }
  bbBody(0); bbAuto();
}

function bbAuto(){
  if(_bbTimer) clearInterval(_bbTimer);
  if(_bbItems.length > 1)
    _bbTimer = setInterval(function(){ bbGo((_bbIdx + 1) % _bbItems.length); }, 6000);
}

function bbGo(i, manual){
  _bbIdx = i;
  var bb = document.getElementById('billboard');
  bb.querySelectorAll('.bb-img').forEach(function(n){ n.classList.toggle('on', +n.getAttribute('data-i') === i); });
  bb.querySelectorAll('.bb-thumb').forEach(function(n){ n.classList.toggle('on', +n.getAttribute('data-i') === i); });
  bb.querySelectorAll('.bb-dots span').forEach(function(n){ n.classList.toggle('on', +n.getAttribute('data-i') === i); });
  bbBody(i);
  if(manual) bbAuto();
}

function bbBody(i){
  var m = _bbItems[i]; if(!m) return;
  var desc = m.desc || ''; if(desc.length > 170) desc = desc.slice(0, 170) + '…';
  document.getElementById('bbBody').innerHTML =
    '<span class="hero-tag">🔥 ' + esc((m.genre || '').split(/[·,/|]/)[0] || 'แนะนำ') + '</span>' +
    '<h1 class="bb-title">' + esc(displayTitle(m)) + '</h1>' +
    '<div class="bb-meta">' +
      (m.rating ? '<span class="gd">★ ' + m.rating.toFixed(1) + '</span><i>·</i>' : '') +
      '<span>' + (m.type === 'series' ? 'ซีรีส์' : 'ภาพยนตร์') + '</span>' +
      (m.year ? '<i>·</i><span>' + m.year + '</span>' : '') +
      (m.genre ? '<i>·</i><span>' + esc(m.genre) + '</span>' : '') + '</div>' +
    (desc ? '<p class="bb-desc">' + esc(desc) + '</p>' : '') +
    '<div class="bb-actions">' +
      '<button class="bb-play" onclick="openPlayer(\'' + esc(m.id) + '\')">' + IC.play + ' ดูเลย</button>' +
      '<button class="bb-fav" onclick="bbFav(this,\'' + esc(m.id) + '\')">' + (isFav(m.id) ? '✓ โปรดแล้ว' : '+ โปรด') + '</button></div>';
}

function bbFav(btn, id){
  var on = toggleFav(id);
  btn.textContent = on ? '✓ โปรดแล้ว' : '+ โปรด';
  toast(on ? 'เพิ่มในรายการโปรดแล้ว' : 'นำออกจากรายการโปรดแล้ว');
  renderProfile();
}

function renderContinue(){
  var sec = document.getElementById('sec-cont'), row = document.getElementById('contRow');
  var list = continueList().slice(0, 10);
  sec.style.display = list.length ? '' : 'none';
  row.innerHTML = '';
  list.forEach(function(x){
    var label = x.m.type === 'series' && x.p.s ? ('S' + x.p.s + ' EP ' + x.p.e) : ('ดูค้างไว้');
    var pct = Math.min(Math.max(x.p.pct || 5, 3), 100);
    row.appendChild(el('<div class="cont-card" data-id="' + esc(x.m.id) + '">' +
      posterHtml(x.m, '<span class="prog"><i style="width:' + pct + '%"></i></span>') +
      '<div class="t">' + esc(displayTitle(x.m)) + '</div><div class="s">' + label + '</div></div>'));
  });
}

function renderRank(){
  var rr = document.getElementById('rankRow'); rr.innerHTML = '';
  var list = visMovies().slice().sort(popSort).slice(0, 10);
  list.forEach(function(m, i){
    rr.appendChild(el('<div class="rank-card' + (i < 3 ? ' top' : '') + '" data-id="' + esc(m.id) + '">' +
      '<div class="rank-num">' + (i + 1) + '</div>' + posterHtml(m) +
      '<div class="t">' + esc(displayTitle(m)) + '</div></div>'));
  });
}

function renderGrids(){
  var vis = visMovies();
  fillGridLimited('gridNew',
    vis.slice().sort(function(a,b){ return (b.added || '').localeCompare(a.added || ''); }));
  fillGridLimited('gridRec',
    vis.slice().sort(function(a,b){ return hashCode(a.id + 'x') - hashCode(b.id + 'x'); }));
}
function fillGridLimited(id, list){
  var g = document.getElementById(id); g.innerHTML = '';
  var lim = _gridLim[id] || 12;
  list.slice(0, lim).forEach(function(m){ g.appendChild(el(cardHtml(m))); });
  var moreBtn = document.getElementById(id + '-more');
  if(moreBtn) moreBtn.remove();
  if(list.length > lim){
    var b = el('<button class="more-btn" id="' + id + '-more">ดูเพิ่ม (' + (list.length - lim) + ')</button>');
    b.addEventListener('click', function(){ _gridLim[id] = lim + 18; renderGrids(); });
    g.parentNode.appendChild(b);
  }
}

function renderRankFull(){
  var rf = document.getElementById('rankFull'); rf.innerHTML = '';
  ST.movies.slice().sort(popSort).slice(0, 20).forEach(function(m, i){
    rf.appendChild(el('<div class="rl-item" data-id="' + esc(m.id) + '">' +
      '<div class="rl-num' + (i < 3 ? ' top' : '') + '">' + (i + 1) + '</div>' +
      '<div class="rl-po">' + posterHtml(m).replace('class="pv"','class="pv" style="display:none"') + '</div>' +
      '<div class="rl-info"><div class="rl-t">' + esc(displayTitle(m)) + '</div>' +
      '<div class="rl-s">' + esc(m.genre || '') + (viewsOf(m) > 0 ? ' · 👁 ' + fmtCount(viewsOf(m)) : '') +
      (m.rating ? ' · ★ ' + m.rating.toFixed(1) : '') + '</div></div>' +
      (i < 3 ? '<div class="rl-fire">🔥</div>' : '') + '</div>'));
  });
}

/* ── ค้นหา ── */
function doSearch(q){
  var g = document.getElementById('gridSearch'), hd = document.getElementById('searchHead');
  g.innerHTML = '';
  q = (q || '').trim().toLowerCase();
  var list = !q ? ST.movies.slice(0, 12) : ST.movies.filter(function(m){
    return (m.title + ' ' + m.titleTh + ' ' + m.genre + ' ' + m.cast + ' ' + m.dir).toLowerCase().indexOf(q) >= 0;
  });
  hd.textContent = q ? ('ผลการค้นหา "' + q + '" (' + list.length + ')') : 'ยอดนิยม';
  list.slice(0, 60).forEach(function(m){ g.appendChild(el(cardHtml(m))); });
}

/* ── โปรไฟล์ ── */
function renderProfile(){
  var h = getHist();
  document.getElementById('st-watch').textContent = Object.keys(h).length;
  document.getElementById('st-fav').textContent = getFavs().length;
  document.getElementById('st-like').textContent = getLikes().length;
  var g = document.getElementById('gridFav'); g.innerHTML = '';
  var favs = getFavs().map(function(id){ return ST.movies.find(function(m){ return m.id === id; }); }).filter(Boolean);
  document.getElementById('fav-empty').style.display = favs.length ? 'none' : 'block';
  favs.slice(0, 30).forEach(function(m){ g.appendChild(el(cardHtml(m))); });
}
function clearHistory(){
  lsSet(LS_HIST, {}); renderContinue(); renderProfile();
}
