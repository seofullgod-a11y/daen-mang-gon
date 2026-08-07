/* ── PLAYER ──────────────────────────────────────── */
var CUR=null, curEp=1;
function openPlayer(idx){
  CUR=DATA[idx]; curEp=1;
  var feed=document.getElementById('feed'); feed.innerHTML='';
  for(var e=1;e<=6;e++){
    feed.appendChild(el('<div class="ep" data-ep="'+e+'" onclick="togglePause(this)">'+
      '<div class="scene" style="'+art(idx, e*3+1)+'"></div>'+
      '<div class="vg"></div><div class="shine"></div>'+
      '<div class="center">'+IC.play+'</div></div>'));
  }
  document.getElementById('plTitle').childNodes[0].nodeValue=CUR.t;
  document.getElementById('plSub').textContent='ตอนที่ 1 · '+CUR.tag;
  document.getElementById('epTotTxt').textContent=CUR.ep;
  buildRail(); buildCaption();
  document.getElementById('player').classList.add('on');
  feed.scrollTop=0;
  updateEp(1);
}
function playRandom(){openPlayer(3);}
function closePlayer(){document.getElementById('player').classList.remove('on');closeSheet();}

function buildRail(){
  document.getElementById('rail').innerHTML=
    '<div class="avatar"><div class="art" style="position:absolute;inset:0;'+art(CUR.i,2)+'"></div></div>'+
    '<button class="act" onclick="like(this,event)"><div class="ic">'+IC.heart+'</div><div class="n">'+(120+CUR.i*7)+'K</div></button>'+
    '<button class="act"><div class="ic">'+IC.chat+'</div><div class="n">'+(3+CUR.i)+'.2K</div></button>'+
    '<button class="act"><div class="ic">'+IC.bookmark+'</div><div class="n">บันทึก</div></button>'+
    '<button class="act" onclick="openSheet()"><div class="ic">'+IC.list.replace('width="17"','width="20"').replace('height="17"','height="20"')+'</div><div class="n">ตอน</div></button>'+
    '<button class="act"><div class="ic">'+IC.share+'</div><div class="n">แชร์</div></button>';
}
function buildCaption(){
  document.getElementById('plBot').innerHTML=
    '<div class="pl-tags"><span class="hl">#'+CUR.tag+'</span><span>#ซีรีส์แนวตั้ง</span><span>#อัปเดตทุกวัน</span></div>'+
    '<div class="pl-cap"><b>'+CUR.t+'</b> — '+CUR.cap+'</div>';
}
function togglePause(node){node.classList.toggle('paused');}
function like(btn,ev){
  ev.stopPropagation();
  btn.classList.toggle('liked');
  if(btn.classList.contains('liked')){
    var b=el('<div class="burst">'+IC.heartF+'</div>');
    b.style.right='28px'; b.style.bottom='240px';
    document.getElementById('phone').appendChild(b);
    setTimeout(function(){b.remove();},1000);
  }
}
document.getElementById('feed').addEventListener('scroll',function(){
  var e=Math.round(this.scrollTop/this.clientHeight)+1;
  if(e!==curEp){curEp=e;updateEp(e);}
});
function updateEp(e){
  var real=Math.min(e,CUR?CUR.ep:80);
  document.getElementById('plSub').textContent='ตอนที่ '+real+' · '+(CUR?CUR.tag:'');
  document.getElementById('epCurTxt').textContent='EP '+real;
  document.getElementById('progFill').style.width=(15+(e%5)*18)+'%';
}

