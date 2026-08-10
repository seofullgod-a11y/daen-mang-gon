/* ── STATS: ยอดวิว/ถูกใจจริง (ตาราง stats + RPC) ── */

ST.stats = {};

function fmtCount(n){
  n = +n || 0;
  if(n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if(n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K';
  return '' + n;
}
function viewsOf(m){ var s = ST.stats[m.id]; return s ? (+s.views || 0) : 0; }
function likesOf(m){ var s = ST.stats[m.id]; return s ? (+s.likes || 0) : 0; }

/* เรียงตามความนิยมจริง: ยอดวิว → คะแนน */
function popSort(a, b){
  var va = viewsOf(a), vb = viewsOf(b);
  if(vb !== va) return vb - va;
  return b.rating - a.rating;
}

function loadStats(){
  if(ST.demo) return Promise.resolve();
  return fetch(SB_URL + '/rest/v1/stats?select=movie_id,views,likes', { headers: sbHeaders() })
    .then(function(r){ return r.ok ? r.json() : []; })
    .catch(function(){ return []; })
    .then(function(rows){
      var map = {};
      rows.forEach(function(r){ map[r.movie_id] = r; });
      ST.stats = map;
    });
}

function rpc(name, body){
  return fetch(SB_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, sbHeaders()),
    body: JSON.stringify(body)
  }).catch(function(){});
}

/* นับวิว: ครั้งเดียวต่อเรื่องต่อการเปิดเว็บ */
var _viewed = {};
function bumpView(id){
  if(ST.demo || _viewed[id]) return;
  _viewed[id] = 1;
  rpc('inc_view', { mid: id });
  var s = ST.stats[id] = ST.stats[id] || { views: 0, likes: 0 };
  s.views = (+s.views || 0) + 1;
}

function bumpLike(id, delta){
  if(ST.demo) return;
  rpc('inc_like', { mid: id, delta: delta });
  var s = ST.stats[id] = ST.stats[id] || { views: 0, likes: 0 };
  s.likes = Math.max((+s.likes || 0) + (delta >= 0 ? 1 : -1), 0);
}
