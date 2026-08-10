/* ── COMMENTS: คอมเมนต์ใต้ตอน (ตาราง comments) ── */

var _nick = localStorage.getItem('cxv_nick') || '';

function openComments(){
  var p = FEED[curIdx]; if(!p) return;
  var m = p.m;
  document.getElementById('cmtSub').textContent = displayTitle(m) + (p.ep ? ' · EP ' + p.ep.ep : '');
  document.getElementById('cmtNick').value = _nick;
  if(!document.getElementById('cmtSheet').classList.contains('on')) navPush({ t: 'cmt' });
  document.getElementById('cmtSheetbg').classList.add('on');
  document.getElementById('cmtSheet').classList.add('on');
  var list = document.getElementById('cmtList');
  list.innerHTML = '<div class="cmt-empty"><span class="spin"></span></div>';
  if(ST.demo){
    list.innerHTML = '<div class="cmt-empty">โหมดตัวอย่าง — คอมเมนต์ใช้ได้เมื่อเชื่อมต่อฐานข้อมูล</div>';
    return;
  }
  fetch(SB_URL + '/rest/v1/comments?select=*&movie_id=eq.' + encodeURIComponent(m.id) +
        '&order=created_at.desc&limit=60', { headers: sbHeaders() })
    .then(function(r){ return r.ok ? r.json() : []; })
    .catch(function(){ return []; })
    .then(renderComments);
}

function closeComments(fromPop){
  if(!document.getElementById('cmtSheet').classList.contains('on')) return;
  var top = navTop();
  if(!fromPop && top && top.t === 'cmt'){ history.back(); return; }
  document.getElementById('cmtSheetbg').classList.remove('on');
  document.getElementById('cmtSheet').classList.remove('on');
}

function renderComments(rows){
  var list = document.getElementById('cmtList');
  document.getElementById('cmtCount').textContent = rows.length ? (rows.length >= 60 ? '60+' : rows.length) + ' ความคิดเห็น' : '';
  if(!rows.length){
    list.innerHTML = '<div class="cmt-empty">ยังไม่มีคอมเมนต์ — เป็นคนแรกเลย! 💬</div>';
    return;
  }
  list.innerHTML = '';
  rows.forEach(function(c){ list.appendChild(cmtItem(c)); });
}

function cmtItem(c){
  var initial = (c.nick || '?').trim().charAt(0).toUpperCase();
  return el('<div class="cmt">' +
    '<div class="cmt-av" style="' + art('nick_' + c.nick, 3) + '">' + esc(initial) + '</div>' +
    '<div class="cmt-b"><div class="cmt-top">' +
      '<span class="cmt-nick">' + esc(c.nick) + '</span>' +
      (c.episode ? '<span class="cmt-ep">EP ' + c.episode + '</span>' : '') +
      '<span class="cmt-time">' + timeAgo(c.created_at) + '</span></div>' +
    '<div class="cmt-body">' + esc(c.body) + '</div></div></div>');
}

function timeAgo(iso){
  var s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if(s < 60) return 'เมื่อสักครู่';
  if(s < 3600) return Math.floor(s / 60) + ' นาทีที่แล้ว';
  if(s < 86400) return Math.floor(s / 3600) + ' ชม.ที่แล้ว';
  if(s < 2592000) return Math.floor(s / 86400) + ' วันที่แล้ว';
  return new Date(iso).toLocaleDateString('th-TH', { day:'numeric', month:'short' });
}

function sendComment(){
  var p = FEED[curIdx]; if(!p) return;
  if(ST.demo){ toast('โหมดตัวอย่าง — ยังส่งคอมเมนต์ไม่ได้'); return; }
  var nickEl = document.getElementById('cmtNick'), bodyEl = document.getElementById('cmtBody');
  var nick = nickEl.value.trim() || 'ผู้ชมนิรนาม';
  var body = bodyEl.value.trim();
  if(!body){ bodyEl.focus(); return; }
  _nick = nick; localStorage.setItem('cxv_nick', nick);
  var payload = { movie_id: p.m.id, nick: nick.slice(0, 30), body: body.slice(0, 500) };
  if(p.ep){ payload.season = p.ep.season; payload.episode = p.ep.ep; }
  var btn = document.getElementById('cmtSend'); btn.disabled = true;
  fetch(SB_URL + '/rest/v1/comments', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, sbHeaders()),
    body: JSON.stringify(payload)
  })
  .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(function(rows){
    var c = rows[0] || Object.assign({ created_at: new Date().toISOString() }, payload);
    var list = document.getElementById('cmtList');
    var empty = list.querySelector('.cmt-empty'); if(empty) empty.remove();
    list.insertBefore(cmtItem(c), list.firstChild);
    document.getElementById('cmtCount').textContent = list.querySelectorAll('.cmt').length + ' ความคิดเห็น';
    bodyEl.value = '';
    toast('ส่งคอมเมนต์แล้ว 💬');
  })
  .catch(function(){ toast('ส่งไม่สำเร็จ ลองใหม่อีกครั้ง'); })
  .then(function(){ btn.disabled = false; });
}
