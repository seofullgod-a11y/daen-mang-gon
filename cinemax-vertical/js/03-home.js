/* ── RENDER ──────────────────────────────────────── */
function el(h){var d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild;}
function posterHtml(d,seed,extra){
  return '<div class="poster">'+
    '<div class="art" style="'+art(d.i,seed)+'"></div>'+
    '<span class="glyph">'+d.t.charAt(0)+'</span>'+(extra||'')+
    '<span class="pv">'+IC.eye+' '+d.v+'</span></div>';
}

var chips=document.getElementById('chips');
CATS.forEach(function(c,i){chips.appendChild(el('<div class="chip'+(i==0?' on':'')+'" onclick="pickChip(this)">'+c+'</div>'));});
function pickChip(e){document.querySelectorAll('#chips .chip').forEach(function(x){x.classList.remove('on')});e.classList.add('on');}

var hs=document.getElementById('heroScroll');
[3,7,0,4].forEach(function(idx){var d=DATA[idx];
  hs.appendChild(el('<div class="hero-card" onclick="openPlayer('+idx+')">'+
    '<div class="art" style="'+art(idx,5)+'"></div><div class="shade"></div>'+
    '<div class="hero-body"><span class="hero-tag">🔥 '+d.tag+'</span>'+
    '<div class="hero-title">'+d.t+'</div>'+
    '<div class="hero-meta"><span>'+d.v+' วิว</span><span>·</span><span>'+d.ep+' ตอน</span><span>·</span><span>อัปเดตทุกวัน</span></div></div>'+
    '<div class="hero-play">'+IC.play+'</div></div>'));
});

// continue watching
var cw=document.getElementById('contRow');
[[0,12,34],[5,27,61],[8,44,18]].forEach(function(x){
  var d=DATA[x[0]];
  cw.appendChild(el('<div class="cont-card" onclick="openPlayer('+d.i+')">'+
    posterHtml(d,7,'<span class="prog"><i style="width:'+x[2]+'%"></i></span>')+
    '<div class="t">'+d.t+'</div><div class="s">ดูถึง EP '+x[1]+'</div></div>'));
});

var rr=document.getElementById('rankRow');
DATA.slice(0,6).forEach(function(d,i){
  rr.appendChild(el('<div class="rank-card'+(i<3?' top':'')+'" onclick="openPlayer('+d.i+')">'+
    '<div class="rank-num">'+(i+1)+'</div>'+
    posterHtml(d,2,'<span class="badge">HOT</span>')+
    '<div class="t">'+d.t+'</div></div>'));
});

function fillGrid(id,list,isNew){var g=document.getElementById(id);
  list.forEach(function(d,k){
    g.appendChild(el('<div class="gcard" onclick="openPlayer('+d.i+')">'+
      posterHtml(d,9,(isNew&&k<3)?'<span class="badge new">NEW</span>':'')+
      '<div class="t">'+d.t+'</div><div class="s">'+d.tag+' · '+d.ep+' ตอน</div></div>'));
  });
}
fillGrid('gridNew',DATA.slice(6,12),true);
fillGrid('gridRec',DATA.slice(0,6));
fillGrid('gridSearch',DATA.slice(3,12));

var rf=document.getElementById('rankFull');
DATA.slice(0,10).forEach(function(d,i){
  rf.appendChild(el('<div style="display:flex;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)" onclick="openPlayer('+d.i+')">'+
    '<div class="kanit" style="width:30px;font-size:1.25rem;font-weight:900;text-align:center;'+
      (i<3?'background:linear-gradient(180deg,var(--gold2),var(--goldD));-webkit-background-clip:text;background-clip:text;color:transparent':'color:var(--g3)')+'">'+(i+1)+'</div>'+
    '<div style="width:52px;flex:0 0 52px">'+posterHtml(d,2).replace('class="poster"','class="poster" style="border-radius:10px"').replace(IC.eye+' '+d.v,'')+'</div>'+
    '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:.89rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+d.t+'</div>'+
    '<div style="font-size:.71rem;color:var(--g2);margin-top:3px">'+d.tag+' · '+d.v+' วิว · '+d.ep+' ตอน</div></div>'+
    '<div style="font-size:.8rem">🔥</div></div>'));
});

