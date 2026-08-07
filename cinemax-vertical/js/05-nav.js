/* ── NAV: สลับหน้า ── */
function go(scr){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('on'); });
  var m = { home:'scr-home', rank:'scr-rank', search:'scr-search', me:'scr-me' };
  document.getElementById(m[scr]).classList.add('on');
  document.querySelectorAll('[data-scr]').forEach(function(b){
    b.classList.toggle('on', b.getAttribute('data-scr') === scr);
  });
  if(scr === 'search'){
    doSearch(document.getElementById('searchInput').value);
    setTimeout(function(){ document.getElementById('searchInput').focus(); }, 50);
  }
  if(scr === 'me') renderProfile();
}

/* ปุ่มเล่นตรงกลาง: สุ่มเรื่องที่เล่นได้ */
function playRandom(){
  var list = ST.movies.filter(isPlayable);
  if(!list.length) return;
  openPlayer(list[Math.floor(Math.random() * list.length)].id);
}
