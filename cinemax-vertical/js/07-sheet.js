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
        var watched = false;
        var h = getHist()[m.id];
        if(h && (h.s < s || (h.s === s && h.e > p.ep.ep))) watched = true;
        var cls = 'ep-cell' + (i === curIdx ? ' cur' : (watched ? ' watched' : ''));
        var cell = el('<div class="' + cls + '">' + p.ep.ep + '</div>');
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

  document.getElementById('sheetbg').classList.add('on');
  document.getElementById('sheet').classList.add('on');
}

function closeSheet(){
  document.getElementById('sheetbg').classList.remove('on');
  document.getElementById('sheet').classList.remove('on');
}
