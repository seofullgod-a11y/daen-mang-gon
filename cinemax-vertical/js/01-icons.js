/* ── ICONS: สไตล์ iOS/macOS (SF Symbols look) ─────
   ใช้ชุด Framework7 Icons (MIT) — หน้าตา/ชื่อเดียวกับ SF Symbols
   โหลดฟอนต์จาก CDN ใน index.html                    */

function fi(name, sz){
  return '<i class="f7-icons" aria-hidden="true" style="font-size:' + (sz || 22) + 'px">' + name + '</i>';
}

var IC = {
  home:        fi('house_fill'),
  trophy:      fi('chart_bar_fill'),
  search:      fi('search', 20),
  user:        fi('person_fill'),
  play:        fi('play_fill'),
  back:        fi('chevron_left', 20),
  heart:       fi('heart'),
  heartFill:   fi('heart_fill'),
  heartF:      fi('heart_fill', 30),
  chat:        fi('chat_bubble'),
  bookmark:    fi('bookmark'),
  bookmarkFill:fi('bookmark_fill'),
  list:        fi('list_bullet', 18),
  share:       fi('square_arrow_up'),
  eye:         fi('eye_fill', 13),
  clock:       fi('clock', 18),
  coin:        fi('money_dollar_circle', 18),
  gear:        fi('gear_alt_fill', 18),
  star:        fi('star_fill', 12),
  chevUp:      fi('chevron_up', 22),
  chevDown:    fi('chevron_down', 22),
  download:    fi('square_arrow_down', 18),
  send:        fi('paperplane_fill', 18),
  shuffle:     fi('shuffle', 18),
  mute:        fi('speaker_slash_fill', 20),
  sound:       fi('speaker_2_fill', 20),
   mic:         fi('mic_fill', 19),
  pip:         fi('rectangle_on_rectangle', 20),
  party:       fi('person_2_fill', 20),
  explore:     fi('square_grid_2x2_fill', 21),
 xmark:       fi('xmark', 16),
  forward:     fi('forward_fill', 15)
};

document.querySelectorAll('[data-ic]').forEach(function(n){
  n.innerHTML = IC[n.getAttribute('data-ic')] || '';
});
