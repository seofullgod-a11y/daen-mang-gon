/* ── DATA LAYER ───────────────────────────────────
   โหลดหนังจาก Supabase (ตาราง movies) + ตอนซีรีส์ (ตาราง episodes)
   แปลง field ย่อของเว็บเดิม → object ที่อ่านง่าย                */

var ST = { movies: [], demo: false, loaded: false };

/* gradient สำรอง เมื่อไม่มีรูปโปสเตอร์ */
var DUO = [
  ['#e50914','#3a0306'],['#b3161f','#141414'],['#ff4d55','#40080c'],
  ['#8f070e','#1b1b1b'],['#d92631','#26070a'],['#6e0509','#121212'],
  ['#f23540','#2e0508'],['#a30d15','#0f0f0f'],['#c9202a','#331014'],
  ['#7c1016','#1e1e1e'],['#e8323c','#20090b'],['#99161d','#170405']
];
function hashCode(s){var h=0;s=String(s||'');for(var i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}return Math.abs(h);}
function art(key, seed){
  var i = hashCode(key) + (seed||0);
  var g = DUO[i % DUO.length], a = (i * 47) % 360;
  return 'background:radial-gradient(120% 85% at 25% 10%,rgba(255,255,255,.2),transparent 55%),radial-gradient(100% 70% at 82% 100%,rgba(0,0,0,.45),transparent 60%),linear-gradient('+a+'deg,'+g[0]+','+g[1]+' 88%)';
}

/* ── normalize movie (field ย่อเว็บเดิม → เต็ม) ── */
function normMovie(d, row){
  d = d || {};
  return {
    id:      d.id || (row && row.id) || '',
    title:   d.t || '',
    titleTh: d.tht || '',
    tagline: d.tg || '',
    year:    d.yr || '',
    dur:     d.dr || 0,
    rating:  parseFloat(d.rt) || 0,
    genre:   d.gn || '',
    type:    d.tp === 'series' ? 'series' : 'movie',
    dir:     d.di || '',
    cast:    d.ca || '',
    desc:    d.ds || '',
    video:   d.mv || d.vd || '',         // เว็บเดิมเล่นจาก mv || vd
    trailer: d.tr || '',
    poster:  d.po || '',
    bg:      d.bg || '',
    status:  d.st || 'active',
    added:   d.ad || ((row && row.updated_at) || '').slice(0,10),
    coming:  d.cs === 'coming',
    kw:      d.kw || ''                  // คีย์เวิร์ด SEO (ตั้งจากหลังบ้าน)
  };
}
function displayTitle(m){ return m.titleTh || m.title || 'ไม่มีชื่อ'; }
function isPlayable(m){ return m.type === 'series' || !!m.video; }

/* ── โหลดหนังทั้งหมด ── */
function loadMovies(){
  return fetch(SB_URL + '/rest/v1/movies?select=id,data,updated_at&order=updated_at.desc', { headers: sbHeaders() })
    .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(rows){
      var list = rows.map(function(r){ return normMovie(r.data, r); })
        .filter(function(m){ return m.id && m.status !== 'hidden' && m.status !== 'draft'; });
      if(!list.length) throw new Error('empty');
      ST.movies = list; ST.demo = false; ST.loaded = true;
      return list;
    })
    .catch(function(e){
      console.warn('Supabase load failed:', e.message);
      if(DEMO_FALLBACK){ ST.movies = demoMovies(); ST.demo = true; ST.loaded = true; return ST.movies; }
      ST.movies = []; ST.loaded = true; return [];
    });
}

/* ── โหลดตอนของซีรีส์ (ตาราง episodes) ── */
function loadEpisodes(seriesId){
  return fetch(SB_URL + '/rest/v1/episodes?select=*&series_id=eq.' + encodeURIComponent(seriesId), { headers: sbHeaders() })
    .then(function(r){ return r.ok ? r.json() : []; })
    .catch(function(){ return []; })
    .then(function(rows){
      return rows.map(function(e){
        return {
          season: e.season != null ? e.season : (e.season_number || 1),
          ep:     e.episode != null ? e.episode : (e.episode_number || 1),
          title:  e.title || e.name || '',
          video:  e.video_url || '',
          thumb:  e.thumbnail || '',
          desc:   e.overview || e.description || '',
          dur:    e.duration_sec || (e.runtime ? e.runtime * 60 : 0)
        };
      }).filter(function(e){ return e.video; })
        .sort(function(a,b){ return a.season !== b.season ? a.season - b.season : a.ep - b.ep; });
    });
}

/* ── บทความ (SEO) + ตั้งค่าเว็บ ── */
ST.articles = [];
function loadArticles(){
  return fetch(SB_URL + '/rest/v1/articles?select=slug,title,cover,excerpt,tags,created_at&status=eq.published&order=created_at.desc&limit=20',
    { headers: sbHeaders() })
    .then(function(r){ return r.ok ? r.json() : []; })
    .catch(function(){ return []; })
    .then(function(rows){ ST.articles = rows || []; return ST.articles; });
}
function loadArticleBody(slug){
  return fetch(SB_URL + '/rest/v1/articles?select=*&slug=eq.' + encodeURIComponent(slug) + '&limit=1',
    { headers: sbHeaders() })
    .then(function(r){ return r.ok ? r.json() : []; })
    .catch(function(){ return []; })
    .then(function(rows){ return rows[0] || null; });
}
function loadSettings(){
  return fetch(SB_URL + '/rest/v1/settings?select=key,value', { headers: sbHeaders() })
    .then(function(r){ return r.ok ? r.json() : []; })
    .catch(function(){ return []; })
    .then(function(rows){
      (rows || []).forEach(function(r){
        if(r.key === 'site_title' && r.value) SITE.title = r.value;
        if(r.key === 'site_desc' && r.value) SITE.desc = r.value;
        if(r.key === 'site_kw' && r.value) SITE.kw = r.value;
        if(r.key === 'og_image' && r.value) SITE.og = r.value;
        if(r.key === 'site_url' && r.value) SITE.url = r.value;
      });
      applySiteSEO();
    });
}
function applySiteSEO(){
  document.title = SITE.title;
  var set = function(id, v){ var n = document.getElementById(id); if(n && v) n.setAttribute('content', v); };
  set('mDesc', SITE.desc); set('mKw', SITE.kw);
  set('ogTitle', SITE.title); set('ogDesc', SITE.desc);
  set('ogImg', SITE.og || 'icons/icon-512.png');   // ไม่ตั้งค่าเอง → คืนเป็นไอคอนเว็บ
  var cn = document.getElementById('mCanon');
  if(cn) cn.setAttribute('href', SITE.url || location.origin + location.pathname);
}

/* ── localStorage: ประวัติ / โปรด / ไลก์ ── */
function lsGet(k, dflt){ try{ return JSON.parse(localStorage.getItem(k)) || dflt; }catch(e){ return dflt; } }
function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

function getHist(){ return lsGet(LS_HIST, {}); }
function saveProgress(movieId, info){
  var h = getHist();
  h[movieId] = Object.assign(h[movieId] || {}, info, { ts: Date.now() });
  lsSet(LS_HIST, h);
}
function continueList(){
  var h = getHist();
  return Object.keys(h)
    .map(function(id){ var m = ST.movies.find(function(x){ return x.id === id; }); return m ? { m: m, p: h[id] } : null; })
    .filter(Boolean)
    .sort(function(a,b){ return (b.p.ts||0) - (a.p.ts||0); });
}
function getFavs(){ return lsGet(LS_FAV, []); }
function toggleFav(id){
  var f = getFavs(), i = f.indexOf(id);
  if(i >= 0) f.splice(i,1); else f.unshift(id);
  lsSet(LS_FAV, f); return i < 0;
}
function isFav(id){ return getFavs().indexOf(id) >= 0; }
function getLikes(){ return lsGet(LS_LIKE, []); }
function toggleLike(id){
  var f = getLikes(), i = f.indexOf(id);
  if(i >= 0) f.splice(i,1); else f.unshift(id);
  lsSet(LS_LIKE, f); return i < 0;
}
function isLiked(id){ return getLikes().indexOf(id) >= 0; }

/* ── ข้อมูลตัวอย่าง (เมื่อต่อฐานข้อมูลไม่ได้) ── */
function demoMovies(){
  var T = [
    ['สัญญารักท่านประธาน','CEO·โรแมนซ์','แต่งงานสายฟ้าแลบกับเจ้าสัวหมื่นล้าน... แต่เขาคือคนที่ฉันเคยเกลียดที่สุด',8.7],
    ['แค้นนี้ต้องชำระ','ดราม่า·ล้างแค้น','ถูกน้องสาวแย่งทุกอย่างไป วันนี้ฉันกลับมาเอาคืนทั้งหมด',8.2],
    ['ภรรยาลับของเจ้าสัว','CEO·โรแมนซ์','เขาซ่อนฉันไว้ 3 ปี จนวันที่ความลับถูกเปิดเผยต่อหน้าทุกคน',7.9],
    ['สวมรอยเจ้าสาวหมื่นล้าน','สวมรอย·โรแมนซ์','ฉันแค่แสร้งเป็นเธอหนึ่งคืน แต่ท่านประธานกลับไม่ยอมปล่อยมือ',9.1],
    ['เกิดใหม่เป็นคุณหนูตระกูลดัง','เกิดใหม่·แฟนตาซี','ตายแล้วเกิดใหม่ ครั้งนี้ฉันจะไม่ยอมเป็นเบี้ยล่างใครอีก',8.5],
    ['รักข้ามภพท่านอ๋อง','ข้ามภพ·พีเรียด','ตื่นมาอีกทีกลายเป็นสนมในวังหลวง กับอ๋องเย็นชาที่ซ่อนความลับ',8.0],
    ['เมียน้อยที่ท่านรัก','ดราม่า·ตบจูบ','ทุกคนคิดว่าฉันเป็นแค่ของเล่น จนวันที่เขาประกาศให้โลกรู้',7.6],
    ['ลูกครึ่งมังกรผู้สืบทอด','แฟนตาซี·แอ็กชัน','สายเลือดมังกรตื่นขึ้น พลังที่ถูกผนึกไว้กำลังจะเปลี่ยนทุกอย่าง',8.9],
    ['หย่าแล้วท่านประธานคุกเข่าง้อ','CEO·ตบจูบ','เซ็นใบหย่าวันนั้น เขาถึงรู้ว่าฉันคือทายาทที่เขาตามหา',8.4],
    ['คุณหมอสาวกับท่านนายพล','โรแมนซ์·ดราม่า','สนามรบทำให้เราเจอกัน หัวใจแข็งแกร่งของเขากลับอ่อนไหวเพราะฉัน',7.4],
    ['ทายาทลับตระกูลหลง','CEO·ดราม่า','ถูกทอดทิ้งตั้งแต่เด็ก วันนี้กลับมาในฐานะเจ้าของอาณาจักร',8.8],
    ['ราชินีน้ำแข็งกับองครักษ์','แฟนตาซี·พีเรียด','นางพญาผู้เย็นชากับองครักษ์ผู้ภักดี ความลับที่ห้ามใครล่วงรู้',8.1]
  ];
  return T.map(function(x, i){
    return normMovie({
      id: 'demo_' + i, t: x[0], gn: x[1], ds: x[2], rt: x[3],
      yr: 2025 + (i % 2), tp: 'movie', st: 'active',
      ad: new Date(Date.now() - i * 86400000 * 3).toISOString().slice(0,10)
    });
  });
}
