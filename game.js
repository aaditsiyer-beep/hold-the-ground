const T = 40, W = 18, H = 12, FINAL_WAVE = 10;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const GRASS = 0, RIVER = 1, HILL = 2, WALL = 3;
const TCOL = ['#4f8a45', '#3a74c4', '#8a7a55', '#6b6b73'];

let grid, enemies, soldiers, effects, player, gold, keepHp, wave, spawnQueue, spawnT, waveActive;
let tool, state, swordLvl, field, swimField, mouse = { x: 0, y: 0 }, keys = {}, msg = '';

const ENEMY = {
  grunt:   { hp: 30,  speed: 40, dmg: 8,  keep: 5,  reward: 6,  color: '#c94a4a', r: 11, swim: false },
  runner:  { hp: 18,  speed: 80, dmg: 5,  keep: 4,  reward: 5,  color: '#e0a040', r: 9,  swim: false },
  swimmer: { hp: 40,  speed: 45, dmg: 8,  keep: 6,  reward: 9,  color: '#3fc0c0', r: 11, swim: true },
  brute:   { hp: 140, speed: 28, dmg: 20, keep: 15, reward: 25, color: '#7a2a7a', r: 16, swim: false },
};

const SHOP = [
  { id: 'sword',   label: 'Sword (Esc)',   cost: 0 },
  { id: 'river',   label: 'River $10',     cost: 10, terrain: RIVER },
  { id: 'hill',    label: 'Hill $15',      cost: 15, terrain: HILL },
  { id: 'wall',    label: 'Wall $20',      cost: 20, terrain: WALL },
  { id: 'soldier', label: 'Soldier $30',   cost: 30 },
  { id: 'archer',  label: 'Archer $45',    cost: 45 },
  { id: 'upgrade', label: 'Sharpen Sword $40', cost: 40, instant: true },
  { id: 'potion',  label: 'Potion $25',    cost: 25, instant: true },
];

function init() {
  grid = Array.from({ length: H }, () => Array.from({ length: W }, () => ({ t: GRASS, hp: 0 })));
  enemies = []; soldiers = []; effects = [];
  player = { x: 14 * T, y: 6 * T, hp: 100, max: 100, cd: 0, swing: 0, ang: 0, hurt: 0 };
  gold = 70; keepHp = 100; wave = 0; spawnQueue = []; spawnT = 0; waveActive = false;
  swordLvl = 0; tool = 'sword'; state = 'play'; msg = 'Press Enter to start wave 1';
  recompute(); buildShop();
}

function cost(t, swim) {
  if (t === WALL) return 15;
  if (t === RIVER) return swim ? 1 : 4;
  if (t === HILL) return 3;
  return 1;
}
function compute(swim) {
  const d = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const open = [];
  for (let y = 0; y < H; y++) { d[y][W - 1] = 0; open.push([W - 1, y]); }
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (d[open[i][1]][open[i][0]] < d[open[bi][1]][open[bi][0]]) bi = i;
    const [x, y] = open.splice(bi, 1)[0];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const nd = d[y][x] + cost(grid[y][x].t, swim);
      if (nd < d[ny][nx]) { d[ny][nx] = nd; open.push([nx, ny]); }
    }
  }
  return d;
}
function recompute() { field = compute(false); swimField = compute(true); }

function buildShop() {
  const el = document.getElementById('shop'); el.innerHTML = '';
  for (const s of SHOP) {
    const b = document.createElement('button');
    b.textContent = s.label; b.dataset.id = s.id;
    b.onclick = () => choose(s.id);
    el.appendChild(b);
  }
  refreshShop();
}
function refreshShop() {
  for (const b of document.querySelectorAll('#shop button')) b.classList.toggle('sel', b.dataset.id === tool);
}
function choose(id) {
  const s = SHOP.find(x => x.id === id);
  if (s.instant) {
    if (gold < s.cost) return flash('Not enough gold');
    gold -= s.cost;
    if (id === 'upgrade') { swordLvl++; flash('Sword sharpened (Lv ' + swordLvl + ')'); }
    if (id === 'potion') { player.hp = Math.min(player.max, player.hp + 50); flash('Healed'); }
    return;
  }
  tool = id; refreshShop();
}
function flash(m) { msg = m; setTimeout(() => { if (msg === m) msg = ''; }, 1500); }

function startWave() {
  if (waveActive || state !== 'play') return;
  wave++; waveActive = true; msg = '';
  const q = [];
  for (let i = 0; i < 4 + wave * 2; i++) q.push('grunt');
  if (wave >= 2) for (let i = 0; i < wave; i++) q.push('runner');
  if (wave >= 3) for (let i = 0; i < Math.floor(wave / 2) + 1; i++) q.push('swimmer');
  if (wave >= 5) for (let i = 0; i < Math.floor((wave - 3) / 2); i++) q.push('brute');
  for (let i = q.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [q[i], q[j]] = [q[j], q[i]]; }
  spawnQueue = q; spawnT = 0;
}

function spawn(type) {
  const d = ENEMY[type];
  enemies.push({ type, x: 4, y: (Math.random() * (H - 1) + 0.5) * T, hp: d.hp, max: d.hp, cd: 0, ...{ d } });
}

function tileAt(x, y) {
  const gx = Math.floor(x / T), gy = Math.floor(y / T);
  if (gx < 0 || gy < 0 || gx >= W || gy >= H) return null;
  return grid[gy][gx];
}
function blocked(x, y) { const t = tileAt(x, y); return !t || t.t === WALL; }
function tryMove(o, dx, dy) {
  if (!blocked(o.x + dx, o.y)) o.x += dx;
  if (!blocked(o.x, o.y + dy)) o.y += dy;
}
function speedMul(o, swim) {
  const t = tileAt(o.x, o.y); if (!t) return 1;
  if (t.t === RIVER) return swim ? 1.3 : 0.5;
  if (t.t === HILL) return 0.8;
  return 1;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function attack() {
  if (player.cd > 0 || state !== 'play') return;
  player.cd = 0.35; player.swing = 0.14;
  const dmg = 12 + swordLvl * 6, reach = 56;
  for (const e of enemies) {
    const dd = dist(player, e);
    if (dd > reach + e.d.r) continue;
    const a = Math.atan2(e.y - player.y, e.x - player.x);
    let diff = Math.abs(a - player.ang); if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff < 1.05) { hit(e, dmg); e.x += Math.cos(a) * 10; e.y += Math.sin(a) * 10; }
  }
}
function hit(e, dmg) {
  e.hp -= dmg; effects.push({ x: e.x, y: e.y, t: 0.25, text: Math.round(dmg) });
}

function update(dt) {
  if (state !== 'play') return;
  // player
  player.cd -= dt; player.swing -= dt; player.hurt -= dt;
  player.ang = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  let mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  let my = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (mx || my) {
    const l = Math.hypot(mx, my), sp = 130 * speedMul(player, false) * dt;
    tryMove(player, mx / l * sp, my / l * sp);
  }
  if (keys[' '] || (mouse.down && tool === 'sword')) attack();

  // spawning
  if (spawnQueue.length) {
    spawnT -= dt;
    if (spawnT <= 0) { spawn(spawnQueue.pop()); spawnT = Math.max(0.35, 1.1 - wave * 0.06); }
  }

  // enemies
  for (const e of enemies) {
    const d = e.d; e.cd -= dt;
    let tgt = null, best = 80;
    const cands = [player, ...soldiers];
    for (const c of cands) { const dd = dist(e, c); if (dd < best) { best = dd; tgt = c; } }
    const sp = d.speed * speedMul(e, d.swim) * dt;
    if (tgt) {
      if (best > d.r + 12) {
        const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
        tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp);
      } else if (e.cd <= 0) {
        e.cd = 0.8; tgt.hp -= d.dmg;
        if (tgt === player) player.hurt = 0.2;
      }
    } else {
      const f = d.swim ? swimField : field;
      const gx = Math.min(W - 1, Math.max(0, Math.floor(e.x / T))), gy = Math.min(H - 1, Math.max(0, Math.floor(e.y / T)));
      let bx = gx, by = gy, bd = f[gy][gx];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (f[ny][nx] < bd) { bd = f[ny][nx]; bx = nx; by = ny; }
      }
      const nt = grid[by][bx];
      if (nt.t === WALL) {
        if (!nt.hp) nt.hp = 60;
        if (e.cd <= 0) { e.cd = 0.5; nt.hp -= d.dmg * (e.type === 'brute' ? 2 : 1); if (nt.hp <= 0) { nt.t = GRASS; nt.hp = 0; recompute(); } }
      } else {
        const a = Math.atan2((by + 0.5) * T - e.y, (bx + 0.5) * T - e.x);
        e.x += Math.cos(a) * sp; e.y += Math.sin(a) * sp;
      }
    }
    if (e.x >= (W - 1) * T + 6) { keepHp -= d.keep; e.hp = 0; e.leaked = true; }
  }

  // soldiers
  for (const s of soldiers) {
    s.cd -= dt;
    const onHill = tileAt(s.x, s.y)?.t === HILL;
    const range = (s.ranged ? 150 : 28) * (onHill ? 1.3 : 1);
    let tgt = null, best = 1e9;
    for (const e of enemies) { const dd = dist(s, e); if (dd < best) { best = dd; tgt = e; } }
    if (tgt && best < (s.ranged ? 200 : 160)) {
      if (best > range) {
        const a = Math.atan2(tgt.y - s.y, tgt.x - s.x);
        if (!s.ranged || best > range) tryMove(s, Math.cos(a) * 60 * dt, Math.sin(a) * 60 * dt);
      } else if (s.cd <= 0) {
        s.cd = s.ranged ? 0.9 : 0.6;
        const dmg = (s.ranged ? 9 : 10) * (onHill ? 1.3 : 1);
        hit(tgt, dmg);
        if (s.ranged) effects.push({ line: [s.x, s.y, tgt.x, tgt.y], t: 0.08 });
      }
    }
  }

  // cleanup & rewards
  for (const e of enemies) if (e.hp <= 0 && !e.leaked) gold += e.d.reward;
  enemies = enemies.filter(e => e.hp > 0);
  soldiers = soldiers.filter(s => s.hp > 0);
  for (const f of effects) f.t -= dt;
  effects = effects.filter(f => f.t > 0);

  if (waveActive && !spawnQueue.length && !enemies.length) {
    waveActive = false; gold += 20 + wave * 5;
    if (wave >= FINAL_WAVE) state = 'won';
    else msg = 'Wave ' + wave + ' cleared! +' + (20 + wave * 5) + 'g. Enter for next wave';
  }
  if (player.hp <= 0 || keepHp <= 0) { state = 'dead'; msg = player.hp <= 0 ? 'You have fallen.' : 'The keep was overrun.'; }
}

function draw() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = grid[y][x];
    ctx.fillStyle = TCOL[c.t]; ctx.fillRect(x * T, y * T, T, T);
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.strokeRect(x * T, y * T, T, T);
    if (c.t === HILL) { ctx.fillStyle = '#a89868'; ctx.beginPath(); ctx.moveTo(x*T+6,y*T+T-6); ctx.lineTo(x*T+T/2,y*T+8); ctx.lineTo(x*T+T-6,y*T+T-6); ctx.fill(); }
    if (c.t === WALL) { ctx.fillStyle = '#4a4a52'; ctx.fillRect(x*T+4,y*T+4,T-8,T-8); }
  }
  ctx.fillStyle = 'rgba(255,215,0,.35)'; ctx.fillRect((W - 1) * T, 0, T, H * T);
  ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.fillText('KEEP', (W - 1) * T + 6, 14);

  // placement preview
  const gx = Math.floor(mouse.x / T), gy = Math.floor(mouse.y / T);
  if (tool !== 'sword' && gx >= 0 && gy >= 0 && gx < W && gy < H) {
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2; ctx.strokeRect(gx * T + 1, gy * T + 1, T - 2, T - 2); ctx.lineWidth = 1;
  }

  for (const s of soldiers) { dot(s, 10, s.ranged ? '#e6d27a' : '#5aa0ff'); bar(s, 10, s.hp / s.max); }
  for (const e of enemies) { dot(e, e.d.r, e.d.color); bar(e, e.d.r, e.hp / e.max); }

  // player
  dot(player, 12, player.hurt > 0 ? '#fff' : '#f2f2f2');
  ctx.strokeStyle = '#8cf'; ctx.lineWidth = 3; ctx.beginPath();
  ctx.moveTo(player.x, player.y); ctx.lineTo(player.x + Math.cos(player.ang) * 22, player.y + Math.sin(player.ang) * 22); ctx.stroke(); ctx.lineWidth = 1;
  if (player.swing > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.beginPath();
    ctx.arc(player.x, player.y, 52, player.ang - 1.05, player.ang + 1.05); ctx.stroke(); ctx.lineWidth = 1;
  }

  for (const f of effects) {
    if (f.line) { ctx.strokeStyle = '#ffe9a0'; ctx.beginPath(); ctx.moveTo(f.line[0], f.line[1]); ctx.lineTo(f.line[2], f.line[3]); ctx.stroke(); }
    else { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(f.text, f.x, f.y - 14 - (0.25 - f.t) * 30); }
  }

  // HUD
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, 360, 40);
  ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
  ctx.fillText('HP ' + Math.max(0, Math.ceil(player.hp)) + '/' + player.max + '   Keep ' + Math.max(0, keepHp) + '   Gold ' + gold, 8, 16);
  ctx.fillText('Wave ' + wave + '/' + FINAL_WAVE + '   Sword Lv ' + swordLvl + '   Soldiers ' + soldiers.length, 8, 33);
  if (msg) { ctx.textAlign = 'center'; ctx.font = '16px sans-serif'; ctx.fillStyle = '#ffd24a'; ctx.fillText(msg, cv.width / 2, cv.height - 14); ctx.textAlign = 'left'; }

  if (state !== 'play') {
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.textAlign = 'center'; ctx.fillStyle = state === 'won' ? '#7fe07f' : '#ff6b6b'; ctx.font = 'bold 44px sans-serif';
    ctx.fillText(state === 'won' ? 'VICTORY' : 'YOU DIED', cv.width / 2, 210);
    ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
    ctx.fillText(state === 'won' ? 'You held the land for ' + FINAL_WAVE + ' waves.' : msg + ' Reached wave ' + wave + '.', cv.width / 2, 250);
    ctx.fillText('Press R to restart', cv.width / 2, 285); ctx.textAlign = 'left';
  }
}
function dot(o, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 7); ctx.fill(); }
function bar(o, r, p) { ctx.fillStyle = '#300'; ctx.fillRect(o.x - r, o.y - r - 7, r * 2, 3); ctx.fillStyle = '#4f4'; ctx.fillRect(o.x - r, o.y - r - 7, r * 2 * Math.max(0, p), 3); }

function place(gx, gy) {
  if (gx < 0 || gy < 0 || gx >= W - 1 || gy >= H) return;
  const s = SHOP.find(x => x.id === tool), c = grid[gy][gx];
  if (gold < s.cost) return flash('Not enough gold');
  if (s.terrain !== undefined) {
    if (c.t === s.terrain) return;
    const px = Math.floor(player.x / T), py = Math.floor(player.y / T);
    if (s.terrain === WALL && px === gx && py === gy) return flash("Can't wall yourself in");
    c.t = s.terrain; c.hp = s.terrain === WALL ? 60 : 0; gold -= s.cost; recompute();
    for (const sd of soldiers) if (blocked(sd.x, sd.y)) { sd.x += T; }
  } else {
    if (c.t === WALL || c.t === RIVER) return flash('Needs grass or hill');
    gold -= s.cost;
    const ranged = tool === 'archer';
    soldiers.push({ x: (gx + .5) * T, y: (gy + .5) * T, hp: ranged ? 30 : 50, max: ranged ? 30 : 50, cd: 0, ranged });
  }
}

function setMouse(e) { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * cv.width / r.width; mouse.y = (e.clientY - r.top) * cv.height / r.height; }
cv.addEventListener('mousemove', setMouse);
cv.addEventListener('mousedown', e => {
  setMouse(e); mouse.down = true;
  if (state !== 'play') return;
  if (tool !== 'sword') place(Math.floor(mouse.x / T), Math.floor(mouse.y / T));
});
window.addEventListener('mouseup', () => mouse.down = false);
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === ' ') e.preventDefault();
  if (k === 'enter') startWave();
  if (k === 'escape') { tool = 'sword'; refreshShop(); }
  if (k === 'r' && state !== 'play') init();
  const n = parseInt(k); if (n >= 1 && n <= 6 && state === 'play') choose(SHOP[n].id);
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

let last = performance.now();
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); draw(); requestAnimationFrame(loop); }
init(); requestAnimationFrame(loop);
