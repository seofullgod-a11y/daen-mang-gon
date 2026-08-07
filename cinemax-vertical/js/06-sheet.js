/* ── SHEET ───────────────────────────────────────── */
function openSheet(){
  if(!CUR)return;
  document.getElementById('sheetTitle').textContent=CUR.t;
  document.getElementById('sheetCnt').textContent='ทั้งหมด '+CUR.ep+' ตอน';
  var g=document.getElementById('epGrid'); g.innerHTML='';
  for(var e=1;e<=CUR.ep;e++){
    var cls='ep-cell';
    if(e===curEp)cls+=' cur';
    else if(e<curEp)cls+=' watched';
    else if(e>12)cls+=' lock';
    g.appendChild(el('<div class="'+cls+'" onclick="jumpEp('+e+')">'+e+'</div>'));
  }
  document.getElementById('sheetbg').classList.add('on');
  document.getElementById('sheet').classList.add('on');
}
function closeSheet(){document.getElementById('sheetbg').classList.remove('on');document.getElementById('sheet').classList.remove('on');}
function jumpEp(e){
  if(e>12){
    document.getElementById('sheetTitle').textContent='🔒 ปลดล็อกตอนที่ '+e+' (30 เหรียญ)';
    return;
  }
  var feed=document.getElementById('feed');
  feed.scrollTo({top:(Math.min(e,6)-1)*feed.clientHeight,behavior:'smooth'});
  closeSheet();
}

setTimeout(function(){var n=document.querySelector('.note');if(n)n.classList.add('hide');},4500);
