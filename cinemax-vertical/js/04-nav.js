/* ── NAV ─────────────────────────────────────────── */
function go(scr){
  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('on')});
  var m={home:'scr-home',rank:'scr-rank',search:'scr-search',me:'scr-me'};
  document.getElementById(m[scr]).classList.add('on');
  document.querySelectorAll('#nav button[data-scr]').forEach(function(b){
    b.classList.toggle('on', b.getAttribute('data-scr')===scr);});
}

