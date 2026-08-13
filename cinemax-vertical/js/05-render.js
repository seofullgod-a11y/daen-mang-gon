/* ── RENDER: หน้าแรก / ชาร์ต / ค้นหา / โปรไฟล์ ── */

function el(h){ var d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; }
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* โปสเตอร์: ใช้รูปจริง ถ้าไม่มี → gradient + อักษรลายน้ำ */
function posterHtml(m, extra){
  var inner;
  if(m.poster){
    inner = '<img class="art" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="' + esc(m.poster) + '" alt="" ' +
      'onerror="this.outerHTML=\'<div class=&quot;art&quot; style=&quot;' + art(m.id,9) + '&quot;></div>\'">';
  } else {
    inner = '<div class="art" style="' + art(m.id,9) + '"></div>' +
      '<span class="glyph">' + esc(displayTitle(m).charAt(0)) + '</span>';
  }
  var vw = viewsOf(m);
  var pv = vw >= 10 ? (IC.eye + ' ' + fmtCount(vw))
    : (m.rating ? (IC.star + ' ' + m.rating.toFixed(1)) : (m.year || ''));
  var isNew = m.added && (Date.now() - new Date(m.added).getTime()) < 7 * 86400000;   // 7 วันพอ — ไม่งั้น NEW เต็มจอจนไม่มีความหมาย
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
  if(!c || ev.target.closest('button')) return;
  var id = c.getAttribute('data-id');
  if(c.closest('#contRow') || c.closest('#gridHist')) openPlayer(id);  // ดูต่อ → เล่นทันที
  else openDetail(id);                                                  // อื่นๆ → หน้ารายละเอียด
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

/* ── Lazy render: ยังไม่เลื่อนถึง = ยังไม่สร้าง DOM เลย (เร็ว + ประหยัด) ──
   ระหว่างรอ แสดง skeleton (.pend) กันหน้าเตี้ย/กันจอกระตุก (CLS)
   Googlebot เรนเดอร์ด้วย viewport สูงเต็มหน้า → observer ยิงครบ เก็บเนื้อหาได้หมด */
var _lazyDone = {};
function lazyRender(key, elId, fn){
  var elm = document.getElementById(elId);
  var sec = elm && elm.closest ? elm.closest('.sec') : null;
  var run = function(){
    if(sec){
      sec.classList.remove('pend');
      if(!sec._revealed){ sec._revealed = 1; sec.classList.add('rev'); }   // fade-up นุ่มๆ ครั้งแรกที่โผล่
    }
    fn();
  };
  if(_lazyDone[key]){ run(); return; }
  if(!elm || !('IntersectionObserver' in window)){ _lazyDone[key] = 1; run(); return; }
  if(sec && sec.style.display !== 'none') sec.classList.add('pend');
  if(elm._io) elm._io.disconnect();
  var io = new IntersectionObserver(function(en){
    if(en[0].isIntersecting){ io.disconnect(); _lazyDone[key] = 1; run(); }
  }, /* ล่าง 0px = ใต้จอไม่เรนเดอร์เด็ดขาดจนกว่าจะโผล่ · บน 100000px = ถ้าเลื่อนข้ามไปแล้วให้เรนเดอร์เสมอ */
  { rootMargin: '100000px 0px 0px 0px' });
  io.observe(elm); elm._io = io;
}

function renderAll(){
  /* เหนือจอเท่านั้นที่ render ทันที */
  renderChips(); renderHero(); renderContinue(); renderRecos();
  /* ใต้จอ: ต่อคิวเป็นลูกโซ่ Top10 → ใหม่ล่าสุด → แนะนำ → บทความ
     (register observer ตัวถัดไปหลังตัวก่อนหน้า render จริง → ตำแหน่งเพจถูกต้อง ไม่ยิงก่อนเวลา) */
  lazyRender('rank', 'rankRow', function(){
    renderRank();
    requestAnimationFrame(function(){
      lazyRender('gridNew', 'gridNew', function(){
        renderGridNew();
        requestAnimationFrame(function(){
          lazyRender('gridRec', 'gridRec', function(){
            renderGridRec();
            requestAnimationFrame(function(){
              var secArt = document.getElementById('sec-articles');
              if(secArt) secArt.style.display = ST.articles.length ? '' : 'none';
              lazyRender('articles', 'homeArticles', renderArticles);
            });
          });
        });
      });
    });
  });
  lazyRender('explore', 'exploreRows', renderExplore);
  lazyRender('chart', 'rankFull', renderRankFull);
  renderProfile();
  var db = document.getElementById('demo-banner');
  if(db) db.style.display = ST.demo ? 'flex' : 'none';
  if(typeof applyUICustom === 'function') applyUICustom();   // ธีม/การซ่อนส่วนจากหลังบ้าน
  if(typeof renderLiveBanner === 'function') renderLiveBanner();   // กัน race: settings มาก่อนหนังโหลดเสร็จ
}

function visMovies(){
  return ST.movies.filter(function(m){ return !activeCat || (m.genre || '').indexOf(activeCat) >= 0; });
}

function renderChips(){
  var box = document.getElementById('chips'); box.innerHTML = '';
  if(!uiOn('chips')){ box.style.display = 'none'; return; }
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
      renderChips(); renderHero();
      if(_lazyDone.rank) renderRank();
      renderGrids();
    });
    box.appendChild(chip);
  });
}

/* ── HERO BILLBOARD (หมุนอัตโนมัติ + แถบโปสเตอร์) ── */
var _bbTimer = null, _bbIdx = 0, _bbItems = [];

function renderHero(){
  var bb = document.getElementById('billboard');
  bb.classList.remove('skel');
  if(!uiOn('billboard')){ bb.style.display = 'none'; return; }
  if(_bbTimer){ clearInterval(_bbTimer); _bbTimer = null; }
  var list = visMovies().filter(function(m){ return isPlayable(m) || ST.demo; })
    .slice().sort(popSort).slice(0, 6);
  _bbItems = list; _bbIdx = 0;
  if(!list.length){ bb.style.display = 'none'; return; }
  bb.style.display = '';

  var bgHtml = list.map(function(m, i){
    var src = m.bg || m.poster;
    /* ใบแรก = LCP → โหลดด่วนสุด, ใบอื่นค่อยโหลดทีหลัง (ไม่แย่งเน็ตตอนเปิดเว็บ) */
    var prio = i === 0 ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"';
    return src
      ? '<img class="bb-img' + (i === 0 ? ' on' : '') + '" data-i="' + i + '"' + prio + ' referrerpolicy="no-referrer" src="' + esc(src) + '" alt="' + esc(displayTitle(m)) + '" onerror="this.style.visibility=\'hidden\'">'
      : '<div class="bb-img' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" style="' + art(m.id,5) + '"></div>';
  }).join('');

  bb.innerHTML =
    '<div class="bb-bg">' + bgHtml + '</div><div class="bb-shade"></div>' +
    '<div class="bb-body" id="bbBody"></div>' +
    '<div class="bb-rail" id="bbRail">' + list.map(function(m, i){
      var inner = m.poster
        ? '<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="' + esc(m.poster) + '" alt="">'
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
    _bbTimer = setInterval(function(){ bbGo((_bbIdx + 1) % _bbItems.length); },
      Math.max(3, parseInt(UICFG.ui_bb_sec) || 6) * 1000);
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
  if(!uiOn('cont')){ sec.style.display = 'none'; return; }
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
  if(!uiOn('top10')){ var sc = rr.closest('.sec'); if(sc) sc.style.display = 'none'; return; }
  var list = visMovies().slice().sort(popSort).slice(0, 10);
  list.forEach(function(m, i){
    rr.appendChild(el('<div class="rank-card" data-id="' + esc(m.id) + '">' +
      '<div class="rank-num">' + (i + 1) + '</div>' +
      '<div class="rank-po">' + posterHtml(m) + '</div></div>'));
  });
  /* SEO: ItemList ให้ Google เข้าใจว่านี่คือชาร์ต Top 10 พร้อมลิงก์เข้าแต่ละเรื่อง */
  try{
    var ld = document.getElementById('ldList');
    if(!ld){ ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'ldList'; document.head.appendChild(ld); }
    var base = SITE.url || (location.origin + location.pathname);
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList',
      name: 'Top 10 ซีรีส์สั้นยอดนิยมวันนี้',
      itemListElement: list.map(function(m, i){
        return { '@type': 'ListItem', position: i + 1, name: displayTitle(m),
          url: base + '?m=' + encodeURIComponent(m.id) };
      }) });
  }catch(e){}
}

function renderGridNew(){
  fillGridLimited('gridNew',
    visMovies().slice().sort(function(a,b){ return (b.added || '').localeCompare(a.added || ''); }));
}
function renderGridRec(){
  if(!uiOn('gridrec')){ var g = document.getElementById('gridRec'), sc = g && g.closest('.sec'); if(sc) sc.style.display = 'none'; return; }
  fillGridLimited('gridRec',
    visMovies().slice().sort(function(a,b){ return hashCode(a.id + 'x') - hashCode(b.id + 'x'); }));
}
function renderGrids(){   // re-render เฉพาะกริดที่เคย render แล้ว (เรียกจากปุ่มดูเพิ่ม/เปลี่ยนหมวด)
  if(_lazyDone.gridNew) renderGridNew();
  if(_lazyDone.gridRec) renderGridRec();
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

/* ── บทความท้ายหน้าแรก (SEO content) ── */
function renderArticles(){
  var sec = document.getElementById('sec-articles'), box = document.getElementById('homeArticles');
  if(!box) return;
  if(!ST.articles.length || !uiOn('articles')){ if(sec) sec.style.display = 'none'; return; }
  if(sec) sec.style.display = '';
  box.innerHTML = '';
  ST.articles.slice(0, 6).forEach(function(a){
    var cov = a.cover
      ? '<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="' + esc(a.cover) + '" alt="' + esc(a.title) + '" onerror="this.remove()">'
      : '<div class="art-ph" style="' + art('a_' + a.slug, 4) + '"></div>';
    var card = el('<a class="art-card" href="?a=' + encodeURIComponent(a.slug) + '">' +
      '<div class="art-cov">' + cov + '</div>' +
      '<div class="art-b"><h3>' + esc(a.title) + '</h3>' +
      (a.excerpt ? '<p>' + esc(a.excerpt) + '</p>' : '') +
      '<span class="art-more">อ่านต่อ ›</span></div></a>');
    card.addEventListener('click', function(ev){ ev.preventDefault(); openArticle(a.slug); });
    box.appendChild(card);
  });
}

/* หน้าอ่านบทความ (เต็มจอ + SEO meta/JSON-LD) */
function openArticle(slug){
  var v = document.getElementById('artView');
  document.getElementById('artBody').innerHTML = '<div class="cmt-empty"><span class="spin"></span></div>';
  if(!v.classList.contains('on')) navPush({ t: 'art' });
  v.classList.add('on');
  loadArticleBody(slug).then(function(a){
    if(!a || !v.classList.contains('on')){ if(!a) document.getElementById('artBody').innerHTML = '<div class="cmt-empty">ไม่พบบทความ</div>'; return; }
    /* SEO */
    document.title = a.title + ' | CineMax';
    var d = document.getElementById('mDesc');
    if(d) d.setAttribute('content', (a.excerpt || a.body || '').slice(0, 155));
    var ot = document.getElementById('ogTitle'); if(ot) ot.setAttribute('content', a.title);
    var od = document.getElementById('ogDesc'); if(od) od.setAttribute('content', (a.excerpt || '').slice(0, 155));
    if(a.cover){ var oi = document.getElementById('ogImg'); if(oi) oi.setAttribute('content', a.cover); }
    var cn = document.getElementById('mCanon');
    if(cn) cn.setAttribute('href', (SITE.url || location.origin + location.pathname) + '?a=' + encodeURIComponent(slug));
    var ld = document.getElementById('ldArt');
    if(!ld){ ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'ldArt'; document.head.appendChild(ld); }
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article',
      headline: a.title, description: a.excerpt || '', image: a.cover || undefined,
      datePublished: a.created_at, inLanguage: 'th' });
    /* เนื้อหา: บรรทัด ## = หัวข้อ, ย่อหน้าเว้นบรรทัด */
    var bodyHtml = String(a.body || '').split(/\n{2,}/).map(function(pra){
      pra = pra.trim(); if(!pra) return '';
      if(pra.indexOf('## ') === 0) return '<h2>' + esc(pra.slice(3)) + '</h2>';
      return '<p>' + esc(pra).replace(/\n/g, '<br>') + '</p>';
    }).join('');
    var tags = (a.tags || '').split(',').map(function(t){ return t.trim(); }).filter(Boolean);
    document.getElementById('artBody').innerHTML =
      (a.cover ? '<img class="art-hero" src="' + esc(a.cover) + '" alt="' + esc(a.title) + '" referrerpolicy="no-referrer" onerror="this.remove()">' : '') +
      '<h1>' + esc(a.title) + '</h1>' +
      '<div class="art-date">' + new Date(a.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) + '</div>' +
      bodyHtml +
      (tags.length ? '<div class="pl-tags" style="margin-top:18px">' + tags.map(function(t){ return '<span>#' + esc(t) + '</span>'; }).join('') + '</div>' : '');
    document.getElementById('artView').scrollTop = 0;
  });
}
function closeArticle(fromPop){
  var v = document.getElementById('artView');
  if(!v.classList.contains('on')) return;
  var top = navTop();
  if(!fromPop && top && top.t === 'art'){ history.back(); return; }
  v.classList.remove('on');
  applySiteSEO();
  var ld = document.getElementById('ldArt'); if(ld) ld.remove();
}

/* ── หน้าหมวดหมู่/แท็ก (?t=tag) — เอื้อ SEO: URL จริง + meta + ItemList ── */
function tagsOf(m){
  var out = [], seen = {};
  (m.genre || '').split(/[·,/|]/).concat((m.kw || '').split(','))
    .forEach(function(t){ t = t.trim(); if(t && !seen[t]){ seen[t] = 1; out.push(t); } });
  return out;
}
function allTags(){
  var map = {};
  ST.movies.forEach(function(m){ tagsOf(m).forEach(function(t){ map[t] = (map[t] || 0) + 1; }); });
  return map;
}
function openCat(tag){
  tag = String(tag || '').trim(); if(!tag) return;
  var v = document.getElementById('catView');
  if(!v.classList.contains('on')) navPush({ t: 'ct' });
  v.classList.add('on');

  var list = ST.movies.filter(function(m){ return tagsOf(m).indexOf(tag) >= 0; })
    .slice().sort(popSort);
  document.getElementById('catTitle').innerHTML = '<em>#</em>' + esc(tag);
  document.getElementById('catSub').textContent = list.length
    ? 'รวม ' + list.length + ' เรื่องในหมวด "' + tag + '" — เรียงตามความนิยม'
    : '';

  /* แท็กใกล้เคียง (หมวดอื่นที่มีเรื่องเยอะสุด) */
  var rel = document.getElementById('catRel'); rel.innerHTML = '';
  var map = allTags();
  Object.keys(map).filter(function(t){ return t !== tag; })
    .sort(function(a, b){ return map[b] - map[a]; }).slice(0, 8)
    .forEach(function(t){
      var s = el('<span>#' + esc(t) + '</span>');
      s.addEventListener('click', function(){ openCat(t); });
      rel.appendChild(s);
    });

  var g = document.getElementById('catGrid'); g.innerHTML = '';
  if(!list.length){
    g.innerHTML = '<div class="cmt-empty">ยังไม่มีเรื่องในหมวดนี้</div>';
  } else {
    list.forEach(function(m){ g.appendChild(el(cardHtml(m))); });
  }

  /* SEO */
  document.title = 'รวมเรื่องแนว ' + tag + ' ดูฟรีทั้งหมด | CineMax';
  var d = document.getElementById('mDesc');
  if(d) d.setAttribute('content',
    ('รวมซีรีส์สั้นและหนังแนว ' + tag + ' ' + (list.length ? list.length + ' เรื่อง ' : '') +
     'ดูฟรีทุกอุปกรณ์ อัปเดตทุกวันที่ CineMax').slice(0, 155));
  var ot = document.getElementById('ogTitle'); if(ot) ot.setAttribute('content', document.title);
  var od = document.getElementById('ogDesc'); if(od) od.setAttribute('content', d ? d.getAttribute('content') : '');
  var base = SITE.url || (location.origin + location.pathname);
  var cn = document.getElementById('mCanon');
  if(cn) cn.setAttribute('href', base + '?t=' + encodeURIComponent(tag));
  try{
    var ld = document.getElementById('ldCat');
    if(!ld){ ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'ldCat'; document.head.appendChild(ld); }
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList',
      name: 'รวมเรื่องแนว ' + tag,
      itemListElement: list.slice(0, 20).map(function(m, i){
        return { '@type': 'ListItem', position: i + 1, name: displayTitle(m),
          url: base + '?m=' + encodeURIComponent(m.id) };
      }) });
  }catch(e){}
  v.scrollTop = 0;
}
function closeCat(fromPop){
  var v = document.getElementById('catView');
  if(!v.classList.contains('on')) return;
  var top = navTop();
  if(!fromPop && top && top.t === 'ct'){ history.back(); return; }
  v.classList.remove('on');
  applySiteSEO();
  var ld = document.getElementById('ldCat'); if(ld) ld.remove();
}

/* Esc ปิดหน้าที่เปิดอยู่ (ตอน player ไม่เปิด — player มี handler ของตัวเอง) */
document.addEventListener('keydown', function(ev){
  if(ev.key !== 'Escape') return;
  if(document.getElementById('player').classList.contains('on')) return;
  if(ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
  if(document.getElementById('dtSheet').classList.contains('on')) closeDetail();
  else if(document.getElementById('liveView') && document.getElementById('liveView').classList.contains('on')) closeLive();
  else if(document.getElementById('catView').classList.contains('on')) closeCat();
  else if(document.getElementById('artView').classList.contains('on')) closeArticle();
});

/* ── หน้าสำรวจ: แถวโปสเตอร์ตามแนว (Netflix-style) ── */
function renderExplore(){
  var box = document.getElementById('exploreRows'); if(!box) return;
  box.innerHTML = '';
  var map = {};
  ST.movies.forEach(function(m){
    (m.genre || '').split(/[·,/|]/).forEach(function(g){
      g = g.trim(); if(!g) return;
      (map[g] = map[g] || []).push(m);
    });
  });
  Object.keys(map)
    .sort(function(a, b){ return map[b].length - map[a].length; })
    .slice(0, 12)
    .forEach(function(g){
      var row = el('<div class="sec"><div class="sec-h"><h2>' + esc(g) + '</h2>' +
        '<span class="more">' + map[g].length + ' เรื่อง</span></div><div class="cont-row"></div></div>');
      var r = row.querySelector('.cont-row');
      map[g].slice().sort(popSort).slice(0, 15).forEach(function(m){
        r.appendChild(el('<div class="cont-card" data-id="' + esc(m.id) + '">' + posterHtml(m) +
          '<div class="t">' + esc(displayTitle(m)) + '</div></div>'));
      });
      box.appendChild(row);
    });
}

/* ── ค้นหา (fuzzy — พิมพ์ผิด/ตกหล่นก็เจอ) ── */
function normTxt(str){
  return String(str || '').toLowerCase()
    .replace(/[\u0E47-\u0E4E]/g, '')   // ตัดวรรณยุกต์/ไม้ไต่คู้ ไทย
    .replace(/\s+/g, '');
}
function levCap(a, b, cap){
  if(Math.abs(a.length - b.length) > cap) return cap + 1;
  var prev = [], cur = [];
  for(var j = 0; j <= b.length; j++) prev[j] = j;
  for(var i = 1; i <= a.length; i++){
    cur[0] = i; var rowMin = i;
    for(var j2 = 1; j2 <= b.length; j2++){
      var cost = a.charAt(i-1) === b.charAt(j2-1) ? 0 : 1;
      cur[j2] = Math.min(prev[j2] + 1, cur[j2-1] + 1, prev[j2-1] + cost);
      if(cur[j2] < rowMin) rowMin = cur[j2];
    }
    if(rowMin > cap) return cap + 1;
    var t = prev; prev = cur; cur = t;
  }
  return prev[b.length];
}
function movieScore(m, Q){
  var H = normTxt(displayTitle(m) + ' ' + m.title + ' ' + m.titleTh + ' ' + m.genre + ' ' + m.cast + ' ' + m.dir);
  var idx = H.indexOf(Q);
  if(idx >= 0) return 100 - Math.min(idx, 20);          // เจอตรงๆ
  var T = normTxt(displayTitle(m) + ' ' + m.title);
  var cap = Q.length <= 4 ? 1 : (Q.length <= 8 ? 2 : 3);   // ยอมพิมพ์ผิดตามความยาว
  var best = cap + 1;
  var span = Q.length;
  for(var i = 0; i + span - cap <= T.length; i++){
    var d = levCap(T.substr(i, span), Q, cap);
    if(d < best){ best = d; if(best === 0) break; }
  }
  return best <= cap ? (60 - best * 12) : 0;
}
var LS_RECENT = 'cxv_recent';
function getRecent(){ return lsGet(LS_RECENT, []); }
function pushRecent(q){
  var r = getRecent().filter(function(x){ return x !== q; });
  r.unshift(q); lsSet(LS_RECENT, r.slice(0, 8));
}
var _recentT = null;
function renderSearchExtras(){
  var box = document.getElementById('searchExtras'); if(!box) return;
  var html = '';
  var rec = getRecent();
  if(rec.length){
    html += '<div class="sx-h">ค้นหาล่าสุด<button class="sx-clear" onclick="lsSet(LS_RECENT,[]);renderSearchExtras()">ลบทั้งหมด</button></div>' +
      '<div class="sx-chips">' + rec.map(function(r){
        return '<span class="sx-chip" data-q="' + esc(r) + '" onclick="var i=document.getElementById(\'searchInput\');i.value=this.dataset.q;doSearch(this.dataset.q)">' + esc(r) + '</span>';
      }).join('') + '</div>';
  }
  var map = allTags();
  var top = Object.keys(map).sort(function(a, b){ return map[b] - map[a]; }).slice(0, 8);
  if(top.length){
    html += '<div class="sx-h">หมวดยอดฮิต</div><div class="sx-chips">' + top.map(function(t){
      return '<span class="sx-chip hot" data-q="' + esc(t) + '" onclick="openCat(this.dataset.q)">#' + esc(t) + '</span>';
    }).join('') + '</div>';
  }
  box.innerHTML = html;
  box.style.display = html ? 'block' : 'none';
}
function doSearch(q){
  var g = document.getElementById('gridSearch'), hd = document.getElementById('searchHead');
  var sx = document.getElementById('searchExtras');
  g.innerHTML = '';
  q = (q || '').trim();
  var list;
  if(!q){
    list = ST.movies.slice().sort(popSort).slice(0, 12);
    renderSearchExtras();
  } else {
    if(sx) sx.style.display = 'none';
    var Q = normTxt(q);
    list = ST.movies
      .map(function(m){ return { m: m, sc: movieScore(m, Q) }; })
      .filter(function(x){ return x.sc > 0; })
      .sort(function(a, b){ return b.sc - a.sc || popSort(a.m, b.m); })
      .map(function(x){ return x.m; });
    /* จำคำค้น (หลังหยุดพิมพ์ + เจอผลจริง) */
    clearTimeout(_recentT);
    if(q.length >= 2 && list.length){
      _recentT = setTimeout(function(){ pushRecent(q); }, 1200);
    }
  }
  hd.textContent = q ? ('ผลการค้นหา "' + q + '" (' + list.length + ')') : 'ยอดนิยม';
  if(q && !list.length){
    g.innerHTML = '<div class="sx-none">ไม่พบ "' + esc(q) + '"<br>' +
      '<button class="more-btn" style="max-width:280px;margin:14px auto 0" ' +
      'onclick="var i=document.getElementById(\'searchInput\');i.value=\'\';doSearch(\'\')">ดูเรื่องยอดนิยมแทน</button></div>';
    return;
  }
  list.slice(0, 60).forEach(function(m){ g.appendChild(el(cardHtml(m))); });
}

/* ── แนะนำตามประวัติ: "เพราะคุณดู ..." ── */
function renderRecos(){
  var sec = document.getElementById('sec-reco'); if(!sec) return;
  if(!uiOn('reco')){ sec.style.display = 'none'; return; }
  var hist = continueList();
  if(!hist.length){ sec.style.display = 'none'; return; }
  var src = hist[0].m;
  var tokens = (src.genre || '').split(/[·,/|]/).map(function(t){ return t.trim(); }).filter(Boolean);
  var pool = ST.movies.filter(function(x){
    if(x.id === src.id) return false;
    var g = x.genre || '';
    return tokens.some(function(t){ return g.indexOf(t) >= 0; });
  }).sort(popSort);
  if(pool.length < 3){ sec.style.display = 'none'; return; }
  sec.style.display = '';
  document.getElementById('recoHead').textContent = 'เพราะคุณดู "' + displayTitle(src) + '"';
  var row = document.getElementById('recoRow'); row.innerHTML = '';
  pool.slice(0, 12).forEach(function(m){
    row.appendChild(el('<div class="cont-card" data-id="' + esc(m.id) + '">' + posterHtml(m) +
      '<div class="t">' + esc(displayTitle(m)) + '</div></div>'));
  });
}

/* ── โปรไฟล์ ── */
function renderProfile(){
  var h = getHist();
  document.getElementById('st-watch').textContent = Object.keys(h).length;
  document.getElementById('st-fav').textContent = getFavs().length;
  document.getElementById('st-like').textContent = getLikes().length;
  var g = document.getElementById('gridFav'); g.innerHTML = '';
  var favs = getFavs().map(function(id){ return ST.movies.find(function(m){ return m.id === id; }); }).filter(Boolean);
  var fe = document.getElementById('fav-empty');
  fe.style.display = favs.length ? 'none' : 'block';
  if(!favs.length) fe.innerHTML = 'ยังไม่มีรายการโปรด — กด "บันทึก" ระหว่างดูเพื่อเก็บไว้ที่นี่' +
    '<br><button class="more-btn" style="max-width:240px;margin:12px auto 0" onclick="go(\'rank\')">ไปสำรวจเรื่องเด่น ›</button>';
  favs.slice(0, 30).forEach(function(m){ g.appendChild(el(cardHtml(m))); });
  renderHistory();
}
function clearHistory(){
  lsSet(LS_HIST, {}); renderContinue(); renderProfile(); renderRecos();
}

/* ── ประวัติการดูทั้งหมด (หน้าโปรไฟล์) ── */
function renderHistory(){
  var g = document.getElementById('gridHist'); if(!g) return;
  g.innerHTML = '';
  var list = continueList();
  document.getElementById('hist-empty').style.display = list.length ? 'none' : 'block';
  list.slice(0, 30).forEach(function(x){
    var label = x.m.type === 'series' && x.p.s ? ('S' + x.p.s + ' EP ' + x.p.e) : 'ดูค้างไว้';
    g.appendChild(el('<div class="gcard" data-id="' + esc(x.m.id) + '">' +
      posterHtml(x.m, '<span class="prog"><i style="width:' + Math.min(Math.max(x.p.pct || 5, 3), 100) + '%"></i></span>') +
      '<div class="t">' + esc(displayTitle(x.m)) + '</div><div class="s" style="color:var(--rose)">' + label + '</div></div>'));
  });
}
