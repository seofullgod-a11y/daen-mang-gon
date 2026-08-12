/* ── BOOT ─────────────────────────────────────────
   โหลดข้อมูล → render → เปิดเรื่องจาก #hash (ลิงก์แชร์) */

(function(){
  var av = document.getElementById('appVer');
  if(av) av.textContent = 'CineMax เวอร์ชัน ' + APP_VERSION;

  /* search input */
  var si = document.getElementById('searchInput');
  si.addEventListener('input', function(){ doSearch(si.value); });

  /* skeleton ระหว่างโหลด */
  renderSkeletons();

  Promise.all([loadMovies().then(function(){ return loadStats(); }), loadArticles(), loadSettings()]).then(function(){
    renderAll();

    /* เปิดจากลิงก์ ?m=id (หนัง) / ?a=slug (บทความ) — URL แบบนี้ Google เก็บเข้า index ได้ */
    var qs = new URLSearchParams(location.search);
    if(qs.get('a')){ setTimeout(function(){ openArticle(qs.get('a')); }, 100); }
    else if(qs.get('m') && ST.movies.some(function(m){ return m.id === qs.get('m'); })){
      setTimeout(function(){ openDetail(qs.get('m')); }, 100);
    }
    /* เปิดจากลิงก์แชร์ #movieId หรือ #party=CODE (แบบเดิมยังใช้ได้) */
    var h = decodeURIComponent((location.hash || '').slice(1));
    if(h.indexOf('party=') === 0){
      var pc = h.slice(6).toUpperCase();
      if(pc && typeof partyJoin === 'function') setTimeout(function(){ partyJoin(pc); }, 600);
    } else if(h && ST.movies.some(function(m){ return m.id === h; })){
      openPlayer(h);
    }
  });

  /* refresh ข้อมูลเมื่อกลับมาที่แท็บ (ทุก 5 นาทีขึ้นไป) */
  var lastLoad = Date.now();
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible' && Date.now() - lastLoad > 300000 && !ST.demo){
      lastLoad = Date.now();
      loadMovies().then(function(){ if(!document.getElementById('player').classList.contains('on')) renderAll(); });
    }
  });
})();
