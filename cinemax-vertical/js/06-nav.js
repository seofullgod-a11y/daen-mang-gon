/* ── NAV + HISTORY ─────────────────────────────────
   ปุ่มย้อนกลับ (มือถือ/เบราว์เซอร์) ทำงานเหมือนแอปจริง:
   ปิดคอมเมนต์ → ปิดหน้าต่างตอน → ปิด player → กลับแท็บก่อนหน้า → ออกจากเว็บ */

var NAVSTACK = [];
var _curScr = 'home';
var _scrollMem = {};

function navTop(){ return NAVSTACK[NAVSTACK.length - 1]; }
function navPush(entry){
  NAVSTACK.push(entry);
  try{ history.pushState({ cx: NAVSTACK.length }, ''); }catch(e){}
}

window.addEventListener('popstate', function(){
  var top = NAVSTACK.pop();
  if(!top) return;
  if(top.t === 'pt') closePartySheet(true);
  else if(top.t === 'cmt') closeComments(true);
  else if(top.t === 'sheet') closeSheet(true);
  else if(top.t === 'player') closePlayer(true);
  else if(top.t === 'dt') closeDetail(true);
  else if(top.t === 'art') closeArticle(true);
  else if(top.t === 'ct') closeCat(true);
  else if(top.t === 'lv') closeLive(true);
  else if(top.t === 'scr') go(top.from, true);
});

function go(scr, fromPop){
  if(scr === _curScr){
    if(scr === 'search') focusSearch();
    return;
  }
  if(!fromPop) navPush({ t: 'scr', from: _curScr });
  _scrollMem[_curScr] = window.scrollY || 0;
  _curScr = scr;

  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('on'); });
  var m = { home:'scr-home', rank:'scr-rank', search:'scr-search', me:'scr-me' };
  document.getElementById(m[scr]).classList.add('on');
  document.querySelectorAll('[data-scr]').forEach(function(b){
    b.classList.toggle('on', b.getAttribute('data-scr') === scr);
  });
  window.scrollTo(0, _scrollMem[scr] || 0);

  if(scr === 'search'){
    doSearch(document.getElementById('searchInput').value);
    focusSearch();
  }
  if(scr === 'me') renderProfile();
}

function focusSearch(){
  setTimeout(function(){ document.getElementById('searchInput').focus(); }, 60);
}

/* ปุ่มเล่นตรงกลาง: สุ่มเรื่องที่เล่นได้ */
function playRandom(){
  var list = ST.movies.filter(isPlayable);
  if(!list.length) return;
  openPlayer(list[Math.floor(Math.random() * list.length)].id);
}
