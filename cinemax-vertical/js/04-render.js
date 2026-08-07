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
  var pv = m.rating ? (IC.star + ' ' + m.rating.toFixed(1)) : (m.year || '');
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

function renderHero(){
  var hs = document.getElementById('heroScroll'); hs.innerHTML = '';
  var list = visMovies().filter(function(m){ return isPlayable(m) || ST.demo; })
    .slice().sort(function(a,b){ return b.rating - a.rating; }).slice(0, 5);
  list.forEach(function(m){
    var bgUrl = m.bg || m.poster;
    var artHtml = bgUrl
      ? '<img class="art" loading="lazy" referrerpolicy="no-referrer" src="' + esc(bgUrl) + '" alt="" onerror="this.style.display=\'none\'">'
      : '<div class="art" style="' + art(m.id,5) + '"></div>';
    hs.appendChild(el('<div class="hero-card" data-id="' + esc(m.id) + '">' + artHtml +
      '<div class="shade"></div><div class="hero-body">' +
      '<span class="hero-tag">🔥 ' + esc((m.genre || '').split(/[·,/|]/)[0] || 'แนะนำ') + '</span>' +
      '<div class="hero-title">' + esc(displayTitle(m)) + '</div>' +
      '<div class="hero-meta">' +
        (m.rating ? '<span>★ ' + m.rating.toFixed(1) + '</span><span>·</span>' : '') +
        '<span>' + (m.type === 'series' ? 'ซีรีส์' : 'ภาพยนตร์') + '</span>' +
        (m.year ? '<span>·</span><span>' + m.year + '</span>' : '') + '</div></div>' +
      '<div class="hero-play">' + IC.play + '</div></div>'));
  });
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
  var list = visMovies().slice().sort(function(a,b){ return b.rating - a.rating; }).slice(0, 10);
  list.forEach(function(m, i){
    rr.appendChild(el('<div class="rank-card' + (i < 3 ? ' top' : '') + '" data-id="' + esc(m.id) + '">' +
      '<div class="rank-num">' + (i + 1) + '</div>' + posterHtml(m) +
      '<div class="t">' + esc(displayTitle(m)) + '</div></div>'));
  });
}

function renderGrids(){
  var gNew = document.getElementById('gridNew'), gRec = document.getElementById('gridRec');
  gNew.innerHTML = ''; gRec.innerHTML = '';
  var vis = visMovies();
  vis.slice().sort(function(a,b){ return (b.added || '').localeCompare(a.added || ''); })
    .slice(0, 12).forEach(function(m){ gNew.appendChild(el(cardHtml(m))); });
  vis.slice().sort(function(a,b){ return hashCode(a.id + 'x') - hashCode(b.id + 'x'); })
    .slice(0, 12).forEach(function(m){ gRec.appendChild(el(cardHtml(m))); });
}

function renderRankFull(){
  var rf = document.getElementById('rankFull'); rf.innerHTML = '';
  ST.movies.slice().sort(function(a,b){ return b.rating - a.rating; }).slice(0, 20).forEach(function(m, i){
    rf.appendChild(el('<div class="rl-item" data-id="' + esc(m.id) + '">' +
      '<div class="rl-num' + (i < 3 ? ' top' : '') + '">' + (i + 1) + '</div>' +
      '<div class="rl-po">' + posterHtml(m).replace('class="pv"','class="pv" style="display:none"') + '</div>' +
      '<div class="rl-info"><div class="rl-t">' + esc(displayTitle(m)) + '</div>' +
      '<div class="rl-s">' + esc(m.genre || '') + (m.rating ? ' · ★ ' + m.rating.toFixed(1) : '') +
      (m.year ? ' · ' + m.year : '') + '</div></div>' +
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
  list.slice(0, 30).forEach(function(m){ g.appendChild(el(cardHtml(m))); });
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
