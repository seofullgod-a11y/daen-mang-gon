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

  loadMovies().then(function(){ return loadStats(); }).then(function(){
    renderAll();

    /* เปิดจากลิงก์แชร์ #movieId */
    var h = decodeURIComponent((location.hash || '').slice(1));
    if(h && ST.movies.some(function(m){ return m.id === h; })){
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
