/* ── HOVER PREVIEW (คอมเท่านั้น) ──────────────────
   ชี้เมาส์ค้างที่โปสเตอร์ ~0.7 วิ → เล่นตัวอย่างเงียบๆ ในโปสเตอร์
   ใช้ field trailer ก่อน ถ้าไม่มีใช้ video หลัก                 */
(function(){
  var canHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches
    && window.matchMedia('(min-width:1101px)').matches;
  if(!canHover) return;

  var timer = null, activeCard = null, hoverHls = null;

  document.addEventListener('mouseover', function(e){
    var card = e.target.closest('[data-id]');
    if(!card || card === activeCard) return;
    if(document.getElementById('player').classList.contains('on')) return;
    var poster = card.querySelector('.poster');
    if(!poster) return;
    clearTimeout(timer);
    var pending = card;
    timer = setTimeout(function(){ startPreview(pending, poster); }, 700);
  });

  document.addEventListener('mouseout', function(e){
    var card = e.target.closest('[data-id]');
    if(!card) return;
    if(e.relatedTarget && card.contains(e.relatedTarget)) return;
    clearTimeout(timer);
    if(card === activeCard) stopPreview();
  });

  function stopPreview(){
    if(hoverHls){ try{ hoverHls.destroy(); }catch(e){} hoverHls = null; }
    if(activeCard){
      var pv = activeCard.querySelector('.hover-pv');
      if(pv) pv.remove();
      activeCard.classList.remove('previewing');
    }
    activeCard = null;
  }

  function startPreview(card, poster){
    var id = card.getAttribute('data-id');
    var m = ST.movies.find(function(x){ return x.id === id; });
    if(!m) return;
    var url = m.trailer || m.video;
    if(!url || typeof classify !== 'function') return;
    var c = classify(url);
    if(c.kind === 'none') return;

    stopPreview();
    activeCard = card;
    var wrap = document.createElement('div');
    wrap.className = 'hover-pv';

    if(c.kind === 'video' || c.kind === 'hls'){
      var v = document.createElement('video');
      v.muted = true; v.autoplay = true; v.loop = true; v.playsInline = true;
      v.setAttribute('playsinline', '');
      wrap.appendChild(v);
      if(c.kind === 'hls' && window.Hls && Hls.isSupported()){
        hoverHls = new Hls({ maxBufferLength: 12 });
        hoverHls.loadSource(c.src); hoverHls.attachMedia(v);
      } else {
        v.src = c.src;
      }
      v.play().catch(function(){});
    } else {
      var f = document.createElement('iframe');
      f.src = c.src + (c.src.indexOf('?') >= 0 ? '&' : '?') + 'autoplay=1&mute=1&muted=true&controls=0';
      f.allow = 'autoplay; encrypted-media';
      wrap.appendChild(f);
    }
    wrap.appendChild(el('<span class="hover-badge">' + IC.mute + '</span>'));
    poster.appendChild(wrap);
    card.classList.add('previewing');
  }

  window._stopHoverPreview = stopPreview;
})();
