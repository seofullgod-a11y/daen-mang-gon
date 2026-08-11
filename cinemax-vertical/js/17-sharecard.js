/* ── SHARE CARD: สร้างภาพการ์ดแชร์สวยๆ (canvas) ──
   โปสเตอร์ + ชื่อเรื่อง + คะแนน + โลโก้ → แชร์/ดาวน์โหลดเป็น PNG */

function makeShareCard(m){
  return new Promise(function(resolve){
    var W = 1080, H = 1350;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d');
    var done = false;

    /* พื้นหลัง */
    var g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#200304'); g.addColorStop(.45, '#0b0b0b'); g.addColorStop(1, '#000');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    var rg = x.createRadialGradient(W/2, 40, 60, W/2, 40, 760);
    rg.addColorStop(0, 'rgba(229,9,20,.4)'); rg.addColorStop(1, 'rgba(229,9,20,0)');
    x.fillStyle = rg; x.fillRect(0, 0, W, 800);

    var pw = 600, ph = 900, px = (W - pw) / 2, py = 100, r = 28;
    function roundRect(x1, y1, w, h, rad){
      x.beginPath();
      x.moveTo(x1 + rad, y1);
      x.arcTo(x1 + w, y1, x1 + w, y1 + h, rad);
      x.arcTo(x1 + w, y1 + h, x1, y1 + h, rad);
      x.arcTo(x1, y1 + h, x1, y1, rad);
      x.arcTo(x1, y1, x1 + w, y1, rad);
      x.closePath();
    }

    function drawRest(){
      if(done) return; done = true;
      /* ชื่อเรื่อง (ตัด 2 บรรทัด) */
      x.textAlign = 'center';
      x.fillStyle = '#fff';
      x.font = '700 62px Kanit, "Noto Sans Thai", sans-serif';
      var title = displayTitle(m), lines = [];
      if(x.measureText(title).width <= W - 140) lines = [title];
      else {
        var mid = Math.floor(title.length / 2), cut = mid;
        for(var i2 = 0; i2 < 12; i2++){
          if(title.charAt(mid - i2) === ' '){ cut = mid - i2; break; }
          if(title.charAt(mid + i2) === ' '){ cut = mid + i2; break; }
        }
        lines = [title.slice(0, cut).trim(), title.slice(cut).trim()];
        lines[1] = lines[1].length > 22 ? lines[1].slice(0, 22) + '…' : lines[1];
      }
      var ty = 1090;
      lines.forEach(function(ln){ x.fillText(ln, W/2, ty); ty += 74; });

      /* คะแนน + แนว */
      x.font = '600 40px Kanit, sans-serif';
      x.fillStyle = '#ff4d55';
      var meta = (m.rating ? '★ ' + m.rating.toFixed(1) + '   ' : '') +
                 ((m.genre || '').split(/[·,/|]/)[0] || '');
      x.fillText(meta.trim(), W/2, ty + 6);

      /* โลโก้ล่าง */
      var ly = H - 74;
      x.font = '700 46px Kanit, sans-serif';
      x.textAlign = 'center';
      var t1 = 'Cine', t2 = 'Max';
      var w1 = x.measureText(t1).width, w2 = x.measureText(t2).width;
      var seal = 52, gap = 14;
      var total = seal + gap + w1 + w2;
      var lx = (W - total) / 2;
      /* ตรา 剧 */
      var sg = x.createLinearGradient(lx, ly - seal, lx + seal, ly);
      sg.addColorStop(0, '#e50914'); sg.addColorStop(1, '#8f070e');
      roundRect(lx, ly - seal + 8, seal, seal, 14);
      x.fillStyle = sg; x.fill();
      x.fillStyle = '#fff'; x.font = '700 34px Kanit, sans-serif';
      x.fillText('剧', lx + seal/2, ly - seal/2 + 20);
      x.textAlign = 'left'; x.font = '700 46px Kanit, sans-serif';
      x.fillStyle = '#fff'; x.fillText(t1, lx + seal + gap, ly);
      x.fillStyle = '#e50914'; x.fillText(t2, lx + seal + gap + w1, ly);
      resolve(c);
    }

    function drawPoster(img){
      x.save();
      x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 60; x.shadowOffsetY = 24;
      roundRect(px, py, pw, ph, r); x.fillStyle = '#111'; x.fill();
      x.restore();
      x.save();
      roundRect(px, py, pw, ph, r); x.clip();
      if(img){
        var ir = img.width / img.height, tr = pw / ph, dw, dh;
        if(ir > tr){ dh = ph; dw = dh * ir; } else { dw = pw; dh = dw / ir; }
        x.drawImage(img, px + (pw - dw)/2, py + (ph - dh)/2, dw, dh);
      } else {
        var pg = x.createLinearGradient(px, py, px + pw, py + ph);
        pg.addColorStop(0, '#b3161f'); pg.addColorStop(1, '#200304');
        x.fillStyle = pg; x.fillRect(px, py, pw, ph);
        x.fillStyle = 'rgba(255,255,255,.25)';
        x.font = '700 300px Kanit, sans-serif'; x.textAlign = 'center';
        x.fillText(displayTitle(m).charAt(0), px + pw/2, py + ph/2 + 100);
      }
      x.restore();
    }

    if(m.poster){
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function(){
        try{ drawPoster(img); }catch(e){ drawPoster(null); }
        drawRest();
      };
      img.onerror = function(){ drawPoster(null); drawRest(); };
      img.src = m.poster;
      setTimeout(function(){ if(!done){ drawPoster(null); drawRest(); } }, 4000);
    } else {
      drawPoster(null); drawRest();
    }
  });
}

function shareCard(m){
  if(!m) return;
  toast('กำลังสร้างการ์ดแชร์... 📸');
  var ready = (document.fonts && document.fonts.load)
    ? Promise.all([document.fonts.load('700 62px Kanit'), document.fonts.load('600 40px Kanit')]).catch(function(){})
    : Promise.resolve();
  ready.then(function(){ return makeShareCard(m); }).then(function(canvas){
    canvas.toBlob(function(blob){
      if(!blob){ toast('สร้างภาพไม่สำเร็จ'); return; }
      var url = location.href.split('#')[0] + '#' + encodeURIComponent(m.id);
      var file;
      try{ file = new File([blob], 'cinemax-share.png', { type: 'image/png' }); }catch(e){}
      if(file && navigator.canShare && navigator.canShare({ files: [file] })){
        navigator.share({ files: [file], title: displayTitle(m), text: 'ดู "' + displayTitle(m) + '" ได้ที่ ' + url })
          .catch(function(){});
      } else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'cinemax-share.png';
        document.body.appendChild(a); a.click(); a.remove();
        navigator.clipboard && navigator.clipboard.writeText(url);
        toast('ดาวน์โหลดการ์ดแล้ว + คัดลอกลิงก์ 📸');
      }
    }, 'image/png');
  });
}
