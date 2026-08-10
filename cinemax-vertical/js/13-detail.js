/* ── DETAIL SHEET: หน้ารายละเอียดเรื่อง ──────────
   แตะโปสเตอร์ → เห็นเรื่องย่อ/นักแสดง/รายการตอน ก่อนกดเล่น
   (z-index ต่ำกว่า player → กดเล่นแล้ว player ทับ ปิด player กลับมาหน้านี้) */

var _dtMovie = null;

function openDetail(id){
  var m = ST.movies.find(function(x){ return x.id === id; });
  if(!m) return;
  _dtMovie = m;

  var heroImg = m.bg || m.poster;
  var hero = heroImg
    ? '<img src="' + esc(heroImg) + '" referrerpolicy="no-referrer" alt="" onerror="this.style.visibility=\'hidden\'">'
    : '<div class="dt-art" style="' + art(m.id,5) + '"></div>';

  var tokens = (m.genre || '').split(/[·,/|]/).map(function(t){ return t.trim(); }).filter(Boolean);
  var pills = [];
  if(m.rating) pills.push('<span class="dt-pill gd">★ ' + m.rating.toFixed(1) + '</span>');
  pills.push('<span class="dt-pill">' + (m.type === 'series' ? 'ซีรีส์' : 'ภาพยนตร์') + '</span>');
  if(m.year) pills.push('<span class="dt-pill">' + m.year + '</span>');
  if(m.dur)  pills.push('<span class="dt-pill">' + m.dur + ' นาที</span>');
  tokens.slice(0,3).forEach(function(t){ pills.push('<span class="dt-pill">' + esc(t) + '</span>'); });

  var crew = '';
  if(m.dir)  crew += '<div class="dt-crew"><b>ผู้กำกับ</b>' + esc(m.dir) + '</div>';
  if(m.cast) crew += '<div class="dt-crew"><b>นักแสดง</b>' + esc(m.cast) + '</div>';

  var faved = isFav(m.id);
  document.getElementById('dtSheet').innerHTML =
    '<div class="dt-hero">' + hero +
      '<div class="dt-shade"></div>' +
      '<button class="dt-x" onclick="closeDetail()" aria-label="ปิด">' + IC.xmark + '</button>' +
      '<div class="dt-title">' + esc(displayTitle(m)) + '</div></div>' +
    '<div class="dt-body">' +
      '<div class="dt-pills">' + pills.join('') + '</div>' +
      '<div class="dt-actions">' +
        '<button class="dt-play" onclick="dtPlay()">' + IC.play + ' ' +
          (getHist()[m.id] ? 'ดูต่อ' : 'เล่นเลย') + '</button>' +
        (m.trailer ? '<button class="dt-btn" onclick="openTrailer()">ตัวอย่าง</button>' : '') +
        '<button class="dt-ico" id="dtFav" onclick="dtFav()">' + (faved ? IC.heartFill : IC.heart) + '</button>' +
        '<button class="dt-ico" onclick="dtShare()">' + IC.share + '</button></div>' +
      (m.desc ? '<p class="dt-desc">' + esc(m.desc) + '</p>' : '') +
      crew +
      (m.type === 'series' ? '<div class="dt-eps-h">ตอนทั้งหมด</div><div class="dt-eps" id="dtEps"><span class="spin"></span></div>' : '') +
    '</div>';

  if(!document.getElementById('dtSheet').classList.contains('on')) navPush({ t: 'dt' });
  document.getElementById('dtBg').classList.add('on');
  document.getElementById('dtSheet').classList.add('on');

  if(m.type === 'series'){
    loadEpisodes(m.id).then(function(eps){
      var box = document.getElementById('dtEps');
      if(!box || _dtMovie !== m) return;
      if(!eps.length){ box.innerHTML = '<span class="dt-none">ยังไม่มีตอน</span>'; return; }
      box.innerHTML = '';
      var h = getHist()[m.id];
      eps.forEach(function(e){
        var watched = h && h.s != null && (h.s > e.season || (h.s === e.season && h.e > e.ep));
        var cur = h && h.s === e.season && h.e === e.ep;
        var th = e.thumb
          ? '<img loading="lazy" src="' + esc(e.thumb) + '" referrerpolicy="no-referrer" alt="" onerror="this.remove()">' : '';
        var cell = el('<div class="epc' + (cur ? ' cur' : '') + (watched ? ' watched' : '') + '">' +
          '<div class="epc-th" style="' + art(m.id, e.ep * 3 + 1) + '">' + th +
            '<span class="epc-n">EP ' + e.ep + '</span>' +
            (e.dur ? '<span class="epc-d">' + fmtTime(e.dur) + '</span>' : '') + '</div>' +
          (e.title ? '<div class="epc-t">' + esc(e.title) + '</div>' : '') + '</div>');
        cell.addEventListener('click', function(){ openPlayer(m.id, { s: e.season, e: e.ep }); });
        box.appendChild(cell);
      });
    });
  }
}

function closeDetail(fromPop){
  if(!document.getElementById('dtSheet').classList.contains('on')) return;
  var top = navTop();
  if(!fromPop && top && top.t === 'dt'){ history.back(); return; }
  document.getElementById('dtBg').classList.remove('on');
  document.getElementById('dtSheet').classList.remove('on');
  _dtMovie = null;
}

function dtPlay(){ if(_dtMovie) openPlayer(_dtMovie.id); }
function dtFav(){
  if(!_dtMovie) return;
  var on = toggleFav(_dtMovie.id);
  document.getElementById('dtFav').innerHTML = on ? IC.heartFill : IC.heart;
  toast(on ? 'เพิ่มในรายการโปรดแล้ว' : 'นำออกจากรายการโปรดแล้ว');
  renderProfile();
}
function dtShare(){
  if(!_dtMovie) return;
  var url = location.href.split('#')[0] + '#' + encodeURIComponent(_dtMovie.id);
  if(navigator.share){ navigator.share({ title: displayTitle(_dtMovie), url: url }).catch(function(){}); }
  else { navigator.clipboard && navigator.clipboard.writeText(url); toast('คัดลอกลิงก์แล้ว'); }
}

/* เล่นตัวอย่าง (ไม่นับวิว/ไม่บันทึกประวัติ) */
function openTrailer(){
  var m = _dtMovie; if(!m || !m.trailer) return;
  CUR = m;
  var wasOpen = document.getElementById('player').classList.contains('on');
  document.getElementById('player').classList.add('on');
  document.body.classList.add('player-open');
  if(!wasOpen) navPush({ t: 'player' });
  buildFeed([{ m: m, ep: null, trailerUrl: m.trailer }], 0);
}
