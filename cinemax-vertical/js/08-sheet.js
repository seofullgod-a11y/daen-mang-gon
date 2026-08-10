/* ── BOTTOM SHEET: เลือกตอน / เลือกเรื่อง ── */

function openSheet(){
  if(!FEED.length) return;
  var isSeries = !!(FEED[curIdx] && FEED[curIdx].ep);
  var m = FEED[curIdx].m;
  document.getElementById('sheetTitle').textContent = displayTitle(m);
  document.getElementById('sheetCnt').textContent = isSeries
    ? ('ทั้งหมด ' + FEED.length + ' ตอน') : (FEED.length + ' เรื่อง');

  var tabs = document.getElementById('seasonTabs');
  var g = document.getElementById('epGrid');
  tabs.innerHTML = ''; g.innerHTML = '';

  if(isSeries){
    g.className = 'ep-grid';
    var seasons = [];
    FEED.forEach(function(p){ if(seasons.indexOf(p.ep.season) < 0) seasons.push(p.ep.season); });
    seasons.sort(function(a,b){ return a - b; });
    var curSeason = FEED[curIdx].ep.season;

    function renderSeason(s){
      g.innerHTML = '';
      FEED.forEach(function(p, i){
        if(p.ep.season !== s) return;
        var e = p.ep;
        var watched = false;
        var h = getHist()[m.id];
        if(h && h.s != null && (h.s > s || (h.s === s && h.e > e.ep))) watched = true;
        var cur = (i === curIdx);
        var th = e.thumb
          ? '<img loading="lazy" src="' + esc(e.thumb) + '" referrerpolicy="no-referrer" alt="" onerror="this.remove()">'
          : '';
        var cell = el('<div class="epc' + (cur ? ' cur' : '') + (watched ? ' watched' : '') + '">' +
          '<div class="epc-th" style="' + art(m.id, e.ep * 3 + 1) + '">' + th +
            '<span class="epc-n">EP ' + e.ep + '</span>' +
            (e.dur ? '<span class="epc-d">' + fmtTime(e.dur) + '</span>' : '') +
            (cur ? '<span class="epc-play">' + IC.play + '</span>' : '') +
            (watched && !cur ? '<span class="epc-w">✓</span>' : '') +
          '</div>' +
          (e.title ? '<div class="epc-t">' + esc(e.title) + '</div>' : '') +
          '</div>');
        cell.addEventListener('click', function(){ jumpTo(i); closeSheet(); });
        g.appendChild(cell);
      });
    }
    if(seasons.length > 1){
      tabs.style.display = 'flex';
      seasons.forEach(function(s){
        var b = el('<div class="chip' + (s === curSeason ? ' on' : '') + '">Season ' + s + '</div>');
        b.addEventListener('click', function(){
          tabs.querySelectorAll('.chip').forEach(function(x){ x.classList.remove('on'); });
          b.classList.add('on'); renderSeason(s);
        });
        tabs.appendChild(b);
      });
    } else {
      tabs.style.display = 'none';
    }
    renderSeason(curSeason);
  } else {
    /* โหมดหนัง: รายการเรื่องถัดไป */
    tabs.style.display = 'none';
    g.className = 'mv-list';
    FEED.forEach(function(p, i){
      var mm = p.m;
      var item = el('<div class="mv-item' + (i === curIdx ? ' cur' : '') + '">' +
        '<div class="mv-po">' + posterHtml(mm).replace('class="pv"', 'class="pv" style="display:none"') + '</div>' +
        '<div class="mv-info"><div class="mv-t">' + esc(displayTitle(mm)) + '</div>' +
        '<div class="mv-s">' + esc(mm.genre || '') + (mm.rating ? ' · ★ ' + mm.rating.toFixed(1) : '') + '</div></div>' +
        (i === curIdx ? '<div class="mv-now">กำลังดู</div>' : '') + '</div>');
      item.addEventListener('click', function(){ jumpTo(i); closeSheet(); });
      g.appendChild(item);
    });
  }

  if(!document.getElementById('sheet').classList.contains('on')) navPush({ t: 'sheet' });
  document.getElementById('sheetbg').classList.add('on');
  document.getElementById('sheet').classList.add('on');
}

function closeSheet(fromPop){
  if(!document.getElementById('sheet').classList.contains('on')) return;
  var top = navTop();
  if(!fromPop && top && top.t === 'sheet'){ history.back(); return; }
  document.getElementById('sheetbg').classList.remove('on');
  document.getElementById('sheet').classList.remove('on');
}
