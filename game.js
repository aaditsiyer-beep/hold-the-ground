// Hold the Ground - 3D. Blocky characters on procedural terrain. Needs THREE (r128).
const KEEP = { x: 70, z: 0 }, FINAL_WAVE = 10, WATER = 0.4, HALF = 95;
const wrap = document.getElementById('wrap');
const $ = id => document.getElementById(id);

// ---------- terrain ----------
function hash(i, j) { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) { let s = 0, a = .5, f = 1; for (let o = 0; o < 4; o++) { s += vnoise(x * f, z * f) * a; a *= .5; f *= 2; } return s; }
const riverX = z => -15 + Math.sin(z * 0.045) * 18;
function heightAt(x, z) {
  let h = (fbm(x * 0.02 + 10, z * 0.02 + 10) - 0.45) * 22;
  const kf = Math.max(0, 1 - Math.hypot(x - KEEP.x, z - KEEP.z) / 35); h = h * (1 - kf) + 2 * kf;
  const sf = Math.max(0, 1 - Math.hypot(x + 80, z * 0.5) / 30); h = h * (1 - sf) + 2 * sf;
  const rd = x - riverX(z), rf = Math.exp(-(rd * rd) / 40); h = h * (1 - rf) + (-1.2) * rf;
  return h;
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
wrap.insertBefore(renderer.domElement, wrap.firstChild);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbcd8ee);
scene.fog = new THREE.Fog(0xbcd8ee, 70, 230);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(0xdff0ff, 0x6a5a3a, 0.75));
const sun = new THREE.DirectionalLight(0xfff2d6, 0.9);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
scene.add(sun, sun.target);

(function buildTerrain() {
  const g = new THREE.PlaneGeometry(200, 200, 140, 140); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const n = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const h = p.getY(i), slope = 1 - n.getY(i), v = hash(p.getX(i) * 3, p.getZ(i) * 3) * 0.08;
    if (h < WATER + 0.5) c.set(0xb8a36a);
    else if (slope > 0.22 || h > 9) c.set(0x80807a);
    else c.set(0x5b8f3c);
    c.offsetHSL(0, 0, v - 0.04);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.receiveShadow = true; scene.add(m);
  const w = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x3a78c4, transparent: true, opacity: 0.72 }));
  w.position.y = WATER; scene.add(w);

  // trees and rocks
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.4, 2.4, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), 260);
  const leaf = new THREE.InstancedMesh(new THREE.ConeGeometry(1.8, 4.6, 7), new THREE.MeshLambertMaterial({ color: 0x2f6b32 }), 260);
  const rock = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0x8a8a85 }), 70);
  const d = new THREE.Object3D(); let nt = 0, nr = 0;
  for (let k = 0; k < 1500 && (nt < 260 || nr < 70); k++) {
    const x = (Math.random() - .5) * 190, z = (Math.random() - .5) * 190, h = heightAt(x, z);
    if (h < 1.2 || Math.hypot(x - KEEP.x, z) < 14 || Math.hypot(x + 80, z) < 16) continue;
    if (Math.random() < 0.78 && nt < 260) {
      const s = 0.8 + Math.random() * 0.9;
      d.position.set(x, h + 1.2 * s, z); d.scale.setScalar(s); d.rotation.set(0, 0, 0); d.updateMatrix(); trunk.setMatrixAt(nt, d.matrix);
      d.position.y = h + 2.4 * s + 1.8 * s; d.updateMatrix(); leaf.setMatrixAt(nt++, d.matrix);
    } else if (nr < 70) {
      const s = 0.6 + Math.random() * 1.3;
      d.position.set(x, h + 0.3 * s, z); d.scale.set(s, s * 0.7, s); d.rotation.set(Math.random(), Math.random(), 0); d.updateMatrix(); rock.setMatrixAt(nr++, d.matrix);
    }
  }
  trunk.count = nt; leaf.count = nt; rock.count = nr;
  for (const o of [trunk, leaf, rock]) { o.castShadow = true; o.receiveShadow = true; scene.add(o); }

  // keep
  const kg = new THREE.Group(), stone = new THREE.MeshLambertMaterial({ color: 0x9a9a96 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(8, 11, 8), stone); tower.position.y = 5.5; kg.add(tower);
  for (const [x, z] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5], [0, -3.5], [0, 3.5], [-3.5, 0], [3.5, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), stone); b.position.set(x, 11.7, z); kg.add(b);
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), new THREE.MeshLambertMaterial({ color: 0x444444 })); pole.position.y = 14; kg.add(pole);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 0.1), new THREE.MeshLambertMaterial({ color: 0xffd24a })); flag.position.set(1.1, 15.6, 0); kg.add(flag);
  kg.position.set(KEEP.x + 3, 2, KEEP.z); kg.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
  scene.add(kg);
})();

// ---------- blocky characters ----------
function faceMat(skin) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#' + skin.toString(16).padStart(6, '0'); g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#222'; g.fillRect(18, 20, 6, 11); g.fillRect(40, 20, 6, 11);
  g.strokeStyle = '#222'; g.lineWidth = 4; g.beginPath(); g.arc(32, 34, 14, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  return new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c) });
}
function makeChar(o) {
  const mats = [], lam = col => { const m = new THREE.MeshLambertMaterial({ color: col }); mats.push(m); return m; };
  const root = new THREE.Group(), skin = o.skin ?? 0xf2d03b;
  const box = (w, h, d, m, x, y, z, parent) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; parent.add(b); return b; };
  box(1.6, 1.8, 0.8, lam(o.shirt), 0, 2.5, 0, root);
  const fm = faceMat(skin), sm = lam(skin); mats.push(fm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), [sm, sm, sm, sm, fm, sm]);
  head.position.y = 4; head.castShadow = true; root.add(head);
  const limb = (w, h, m, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); box(w, h, w, m, 0, -h / 2, 0, p); root.add(p); return p; };
  const pm = lam(o.pants), arm = lam(skin);
  const legL = limb(0.75, 1.6, pm, -0.4, 1.6), legR = limb(0.75, 1.6, pm, 0.4, 1.6);
  const armL = limb(0.7, 1.6, arm, -1.15, 3.3), armR = limb(0.7, 1.6, arm, 1.15, 3.3);
  if (o.weapon === 'sword') {
    const bl = lam(0xd9dde3); box(0.22, 0.22, 2.6, bl, 0, -1.5, 1.2, armR); box(0.7, 0.18, 0.18, lam(0x6b4a2b), 0, -1.5, 0.1, armR);
  } else if (o.weapon === 'bow') {
    box(0.15, 2.4, 0.15, lam(0x7a5230), 0, -1.5, 0.7, armL);
  }
  root.scale.setScalar(0.45 * (o.s || 1));
  scene.add(root);
  return { root, legL, legR, armL, armR, mats, phase: Math.random() * 6, atk: 0, flash: 0 };
}
function animChar(c, dt, moving, sp) {
  c.phase += dt * 9 * sp; const s = Math.sin(c.phase);
  const k = moving ? 1 : 0, lerp = (a, b) => a + (b - a) * Math.min(1, dt * 12);
  c.legL.rotation.x = lerp(c.legL.rotation.x, s * 0.9 * k); c.legR.rotation.x = lerp(c.legR.rotation.x, -s * 0.9 * k);
  c.armL.rotation.x = lerp(c.armL.rotation.x, -s * 0.7 * k);
  c.atk = Math.max(0, c.atk - dt);
  c.armR.rotation.x = c.atk > 0 ? -Math.sin(Math.PI * (1 - c.atk / 0.3)) * 2.3 : lerp(c.armR.rotation.x, s * 0.7 * k);
  c.flash = Math.max(0, c.flash - dt);
  for (const m of c.mats) m.emissive.setHex(c.flash > 0 ? 0xaa1111 : 0);
}
const face = (e, dx, dz) => { if (dx || dz) e.c.root.rotation.y = Math.atan2(dx, dz); };

// ---------- game state ----------
const ENEMY = {
  grunt:   { hp: 40,  speed: 4.5, dmg: 8,  keep: 5,  reward: 6,  shirt: 0xc94a4a, pants: 0x333333, s: 1 },
  runner:  { hp: 24,  speed: 8,   dmg: 5,  keep: 4,  reward: 5,  shirt: 0xe0a040, pants: 0x553311, s: 0.9 },
  swimmer: { hp: 50,  speed: 4.8, dmg: 8,  keep: 6,  reward: 9,  shirt: 0x2aa8a8, pants: 0x226666, s: 1, swim: true },
  brute:   { hp: 180, speed: 3,   dmg: 20, keep: 15, reward: 25, shirt: 0x7a2a7a, pants: 0x2a1a2a, s: 1.6, skin: 0xc8a060 },
};
let player, enemies, soldiers, walls, effects, gold, keepHp, wave, queue, spawnT, waveActive, swordLvl, state, msg;
let yaw = Math.PI / 2, pitch = 0.5; const keys = {}; let mouseDown = false;

function clearAll() {
  for (const e of [...(enemies || []), ...(soldiers || [])]) scene.remove(e.c.root);
  if (player) scene.remove(player.c.root);
  for (const w of walls || []) scene.remove(w.mesh);
  for (const f of effects || []) scene.remove(f.obj);
}
function init() {
  clearAll();
  const x = KEEP.x - 12;
  player = { x, z: 0, y: heightAt(x, 0), vy: 0, hp: 100, max: 100, cd: 0, hurt: 0, ang: Math.PI / 2, c: makeChar({ shirt: 0x2a6fd6, pants: 0x1c2e63, weapon: 'sword' }) };
  enemies = []; soldiers = []; walls = []; effects = [];
  gold = 80; keepHp = 100; wave = 0; queue = []; spawnT = 0; waveActive = false; swordLvl = 0; state = 'play';
  yaw = Math.PI / 2; say('Press Enter to start wave 1. The enemy comes from the west.');
  $('over').hidden = true;
}
function say(m) { msg = m; $('msg').textContent = m; }
let sayT; function flashMsg(m) { say(m); clearTimeout(sayT); sayT = setTimeout(() => { if (msg === m) say(''); }, 1800); }

function startWave() {
  if (waveActive || state !== 'play') return;
  wave++; waveActive = true; say('');
  const q = [];
  for (let i = 0; i < 4 + wave * 2; i++) q.push('grunt');
  if (wave >= 2) for (let i = 0; i < wave; i++) q.push('runner');
  if (wave >= 3) for (let i = 0; i < Math.floor(wave / 2) + 1; i++) q.push('swimmer');
  if (wave >= 5) for (let i = 0; i < Math.floor((wave - 3) / 2); i++) q.push('brute');
  for (let i = q.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [q[i], q[j]] = [q[j], q[i]]; }
  queue = q; spawnT = 0;
}
function spawnEnemy(type) {
  const d = ENEMY[type], x = -85 + Math.random() * 6, z = (Math.random() - .5) * 50;
  enemies.push({ type, d, x, z, y: heightAt(x, z), hp: d.hp, max: d.hp, cd: 0, tz: (Math.random() - .5) * 12, dying: 0,
    c: makeChar({ shirt: d.shirt, pants: d.pants, s: d.s, skin: d.skin }) });
}

const inWater = e => heightAt(e.x, e.z) < WATER - 0.1;
function collideWalls(e, r) {
  for (const w of walls) {
    const dx = e.x - w.x, dz = e.z - w.z, dd = Math.hypot(dx, dz), min = w.r + r;
    if (dd < min && dd > 0.001) { e.x = w.x + dx / dd * min; e.z = w.z + dz / dd * min; return w; }
  }
  return null;
}
function hurt(e, dmg) { e.hp -= dmg; e.c.flash = 0.12; }
function tracer(a, b) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0xffe9a0 }));
  scene.add(l); effects.push({ obj: l, t: 0.1 });
}
const nearest = (from, list, max) => { let b = null, bd = max; for (const e of list) { if (e.dying) continue; const d = Math.hypot(e.x - from.x, e.z - from.z); if (d < bd) { bd = d; b = e; } } return b && { e: b, d: bd }; };

function playerAttack() {
  if (player.cd > 0 || state !== 'play') return;
  player.cd = 0.4; player.c.atk = 0.3;
  const t = nearest(player, enemies, 7);
  if (t) player.ang = Math.atan2(t.e.x - player.x, t.e.z - player.z);
  const fx = Math.sin(player.ang), fz = Math.cos(player.ang), dmg = 12 + swordLvl * 6;
  for (const e of enemies) {
    if (e.dying) continue;
    const dx = e.x - player.x, dz = e.z - player.z, d = Math.hypot(dx, dz);
    if (d < 3.6 + e.d.s * 0.5 && (dx * fx + dz * fz) / (d || 1) > 0.15) { hurt(e, dmg); e.x += dx / d * 0.8; e.z += dz / d * 0.8; }
  }
}

// ---------- shop ----------
const SHOP = [
  { id: 'soldier', label: '1 Soldier $30', cost: 30 },
  { id: 'archer', label: '2 Archer $45', cost: 45 },
  { id: 'wall', label: '3 Wall $20', cost: 20 },
  { id: 'upgrade', label: '4 Sharpen Sword $40', cost: 40 },
  { id: 'potion', label: '5 Potion $25', cost: 25 },
];
function buy(id) {
  if (state !== 'play') return;
  const s = SHOP.find(x => x.id === id);
  if (gold < s.cost) return flashMsg('Not enough gold');
  gold -= s.cost;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  if (id === 'soldier' || id === 'archer') {
    const x = player.x + fx * 4 + (Math.random() - .5) * 3, z = player.z + fz * 4 + (Math.random() - .5) * 3, ranged = id === 'archer';
    soldiers.push({ x, z, y: heightAt(x, z), hp: ranged ? 35 : 60, max: ranged ? 35 : 60, cd: 0, ranged, dying: 0,
      c: makeChar(ranged ? { shirt: 0x3fa55b, pants: 0x2a4a30, weapon: 'bow' } : { shirt: 0x4a8ae0, pants: 0x1c2e63, weapon: 'sword' }) });
  } else if (id === 'wall') {
    const x = player.x + fx * 5, z = player.z + fz * 5;
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 1.1), new THREE.MeshLambertMaterial({ color: 0x77777a }));
    m.position.set(x, heightAt(x, z) + 1.3, z); m.rotation.y = yaw; m.castShadow = m.receiveShadow = true; scene.add(m);
    walls.push({ x, z, r: 1.7, hp: 80, mesh: m });
  } else if (id === 'upgrade') { swordLvl++; flashMsg('Sword sharpened (Lv ' + swordLvl + ')'); }
  else if (id === 'potion') { player.hp = Math.min(player.max, player.hp + 50); flashMsg('Healed'); }
}
const shopEl = $('shop');
for (const s of SHOP) { const b = document.createElement('button'); b.textContent = s.label; b.onclick = () => buy(s.id); shopEl.appendChild(b); }
{ const b = document.createElement('button'); b.textContent = 'Enter: Start Wave'; b.onclick = startWave; shopEl.appendChild(b); }

// ---------- update ----------
function update(dt) {
  if (state === 'play') {
    // player
    player.cd -= dt; player.hurt -= dt;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -fz, rz = fx;
    const ix = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), iz = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
    let moving = false;
    if (ix || iz) {
      let dx = fx * iz + rx * ix, dz = fz * iz + rz * ix; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
      const sp = 9 * (inWater(player) ? 0.55 : 1) * dt;
      player.x = Math.max(-HALF, Math.min(HALF, player.x + dx * sp)); player.z = Math.max(-HALF, Math.min(HALF, player.z + dz * sp));
      player.ang = Math.atan2(dx, dz); moving = true;
    }
    collideWalls(player, 0.7);
    const gy = heightAt(player.x, player.z);
    if (keys[' '] && player.y <= gy + 0.05) player.vy = 9;
    player.vy -= 26 * dt; player.y += player.vy * dt;
    if (player.y < gy) { player.y = gy; player.vy = 0; }
    if (keys.arrowleft || keys.q) yaw += 2 * dt; if (keys.arrowright || keys.e) yaw -= 2 * dt;
    if (mouseDown && !rightDrag) playerAttack();
    face({ c: player.c }, Math.sin(player.ang), Math.cos(player.ang));
    animChar(player.c, dt, moving, 1);

    // spawn
    if (queue.length) { spawnT -= dt; if (spawnT <= 0) { spawnEnemy(queue.pop()); spawnT = Math.max(0.4, 1.4 - wave * 0.08); } }

    // enemies
    for (const e of enemies) {
      if (e.dying) continue;
      e.cd -= dt; const d = e.d, r = 0.6 * d.s;
      const targets = [player, ...soldiers.filter(s => !s.dying)];
      const t = nearest(e, targets, 14);
      let tx, tz, moving = true, sp = d.speed * (inWater(e) && !d.swim ? 0.55 : 1);
      if (t) { tx = t.e.x; tz = t.e.z; } else { tx = KEEP.x - 3; tz = KEEP.z + e.tz; }
      const dx = tx - e.x, dz = tz - e.z, dist = Math.hypot(dx, dz) || 1;
      if (t && t.d < 1.9 * d.s + 0.6) {
        moving = false; face(e, dx, dz);
        if (e.cd <= 0) { e.cd = 0.9; e.c.atk = 0.3; t.e.hp -= d.dmg; t.e.c.flash = 0.12; if (t.e === player) player.hurt = 0.2; }
      } else {
        e.x += dx / dist * sp * dt; e.z += dz / dist * sp * dt; face(e, dx, dz);
        const w = collideWalls(e, r);
        if (w) { moving = false; w.hp -= d.dmg * (e.type === 'brute' ? 2 : 1) * dt; if (e.cd <= 0) { e.cd = 0.5; e.c.atk = 0.3; } }
      }
      e.y = heightAt(e.x, e.z);
      if (Math.hypot(e.x - (KEEP.x + 3), e.z - KEEP.z) < 6.5) { keepHp -= d.keep; e.hp = -999; e.leaked = true; }
      animChar(e.c, dt, moving, sp / 4.5);
    }

    // soldiers
    for (const s of soldiers) {
      if (s.dying) continue;
      s.cd -= dt;
      const t = nearest(s, enemies, 32); let moving = false;
      if (t) {
        const dx = t.e.x - s.x, dz = t.e.z - s.z; face(s, dx, dz);
        const range = s.ranged ? 20 : 2.3;
        if (t.d > range) {
          s.x += dx / t.d * 6 * dt; s.z += dz / t.d * 6 * dt; moving = true; collideWalls(s, 0.6);
        } else if (s.cd <= 0) {
          s.cd = s.ranged ? 1.1 : 0.7; s.c.atk = 0.3; hurt(t.e, 10 + swordLvl * 2);
          if (s.ranged) tracer(new THREE.Vector3(s.x, s.y + 2, s.z), new THREE.Vector3(t.e.x, t.e.y + 2, t.e.z));
        }
      }
      s.y = heightAt(s.x, s.z); animChar(s.c, dt, moving, 1.2);
    }

    // walls
    for (const w of walls) if (w.hp <= 0) scene.remove(w.mesh);
    walls = walls.filter(w => w.hp > 0);

    // deaths
    for (const e of enemies) if (e.hp <= 0 && !e.dying) { e.dying = 0.7; if (!e.leaked) gold += e.d.reward; }
    for (const s of soldiers) if (s.hp <= 0 && !s.dying) s.dying = 0.7;

    // wave end
    if (waveActive && !queue.length && !enemies.length) {
      waveActive = false; const b = 20 + wave * 5; gold += b;
      if (wave >= FINAL_WAVE) endGame(true); else say('Wave ' + wave + ' cleared. +' + b + ' gold. Press Enter for the next wave.');
    }
    if (player.hp <= 0) endGame(false, 'You have fallen.'); else if (keepHp <= 0) endGame(false, 'The keep was overrun.');
  }

  // dying bodies fall over and vanish (also runs after game over)
  for (const list of [enemies, soldiers]) for (const e of list) if (e.dying > 0) {
    e.dying -= dt; const p = 1 - Math.max(0, e.dying) / 0.7;
    e.c.root.rotation.x = -Math.PI / 2 * Math.min(1, p * 1.6);
    if (e.dying <= 0) { scene.remove(e.c.root); e.gone = true; }
  }
  enemies = enemies.filter(e => !e.gone); soldiers = soldiers.filter(s => !s.gone);
  for (const f of effects) f.t -= dt;
  effects = effects.filter(f => { if (f.t <= 0) scene.remove(f.obj); return f.t > 0; });

  if (state === 'dead') {
    player.c.root.rotation.x = Math.max(-Math.PI / 2, player.c.root.rotation.x - dt * 3);
  }
  // sync meshes
  for (const e of [...enemies, ...soldiers]) e.c.root.position.set(e.x, e.y, e.z);
  player.c.root.position.set(player.x, player.y, player.z);
  for (const e of [...enemies, ...soldiers]) if (!e.dying) e.c.root.rotation.x = 0;
}
function endGame(won, why) {
  state = won ? 'won' : 'dead'; $('over').hidden = false;
  $('overTitle').textContent = won ? 'VICTORY' : 'YOU DIED';
  $('overTitle').style.color = won ? '#7fe07f' : '#ff6b6b';
  $('overText').textContent = won ? 'You held the ground for ' + FINAL_WAVE + ' waves.' : why + ' You reached wave ' + wave + '.';
}

function render() {
  // camera follows the player
  const dist = 13, cp = Math.cos(pitch), fx = Math.sin(yaw), fz = Math.cos(yaw);
  let cx = player.x - fx * dist * cp, cz = player.z - fz * dist * cp, cy = player.y + 2.5 + Math.sin(pitch) * dist;
  cy = Math.max(cy, heightAt(cx, cz) + 1.5);
  camera.position.set(cx, cy, cz); camera.lookAt(player.x, player.y + 2, player.z);
  sun.position.set(player.x + 30, 55, player.z + 20); sun.target.position.set(player.x, 0, player.z);
  renderer.render(scene, camera);
  $('hp').style.width = Math.max(0, player.hp / player.max * 100) + '%';
  $('keep').style.width = Math.max(0, keepHp) + '%';
  $('stats').textContent = 'Gold ' + gold + '   Wave ' + wave + '/' + FINAL_WAVE + '   Sword Lv ' + swordLvl + '   Soldiers ' + soldiers.length;
  $('hurt').style.opacity = player.hurt > 0 ? 0.35 : 0;
}

// ---------- input ----------
let rightDrag = false, lastX = 0, lastY = 0;
const cv = renderer.domElement;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => { if (e.button === 2) { rightDrag = true; lastX = e.clientX; lastY = e.clientY; } else { mouseDown = true; playerAttack(); } });
window.addEventListener('mouseup', () => { mouseDown = false; rightDrag = false; });
window.addEventListener('mousemove', e => {
  if (!rightDrag) return;
  yaw -= (e.clientX - lastX) * 0.005; pitch = Math.max(0.15, Math.min(1.2, pitch + (e.clientY - lastY) * 0.004)); lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
  if (k === 'enter') startWave();
  if (k === 'f') playerAttack();
  if (k === 'r' && state !== 'play') init();
  const n = parseInt(k); if (n >= 1 && n <= 5) buy(SHOP[n - 1].id);
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
$('again').onclick = init;

function resize() { const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(wrap); resize();

let last = performance.now();
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(loop); }
init(); requestAnimationFrame(loop);
