// Hold the Ground - first-person 3D. Blocky characters on procedural terrain. Needs THREE (r128).
const KEEP = { x: 70, z: 0 }, BASE = { x: -78, z: 0 }, WATER = 0.4, HALF = 100, CAP = 45;
const wrap = document.getElementById('wrap');
const $ = id => document.getElementById(id);
const fmt = n => Math.floor(n).toLocaleString('en-US');

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
  const sf = Math.max(0, 1 - Math.hypot(x - BASE.x, z) / 36); h = h * (1 - sf) + 2 * sf;
  const rd = x - riverX(z), rf = Math.exp(-(rd * rd) / 40); h = h * (1 - rf) + (-1.2) * rf;
  return h;
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
wrap.insertBefore(renderer.domElement, wrap.firstChild);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbcd8ee);
scene.fog = new THREE.Fog(0xbcd8ee, 70, 230);
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 400);
camera.rotation.order = 'YXZ';
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xdff0ff, 0x6a5a3a, 0.8));
const sun = new THREE.DirectionalLight(0xfff2d6, 0.9);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
scene.add(sun, sun.target);

const lam = (col, o) => new THREE.MeshLambertMaterial(Object.assign({ color: col }, o));
function boxMesh(w, h, d, m, x, y, z, parent) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; if (parent) parent.add(b); return b; }

(function buildTerrain() {
  const g = new THREE.PlaneGeometry(200, 200, 140, 140); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const n = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const h = p.getY(i), slope = 1 - n.getY(i), v = hash(p.getX(i) * 3, p.getZ(i) * 3) * 0.08;
    if (h < WATER + 0.5) c.set(0xb8a36a); else if (slope > 0.22 || h > 9) c.set(0x80807a); else c.set(0x5b8f3c);
    c.offsetHSL(0, 0, v - 0.04); col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.receiveShadow = true; scene.add(m);
  const w = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), lam(0x3a78c4, { transparent: true, opacity: 0.72 }));
  w.position.y = WATER; scene.add(w);

  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.4, 2.4, 6), lam(0x6b4a2b), 260);
  const leaf = new THREE.InstancedMesh(new THREE.ConeGeometry(1.8, 4.6, 7), lam(0x2f6b32), 260);
  const rock = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), lam(0x8a8a85), 70);
  const d = new THREE.Object3D(); let nt = 0, nr = 0;
  for (let k = 0; k < 1800 && (nt < 260 || nr < 70); k++) {
    const x = (Math.random() - .5) * 190, z = (Math.random() - .5) * 190, h = heightAt(x, z);
    if (h < 1.2 || Math.hypot(x - KEEP.x, z) < 14 || Math.hypot(x - BASE.x, z) < 32) continue;
    if (Math.random() < 0.78 && nt < 260) {
      const s = 0.8 + Math.random() * 0.9;
      d.position.set(x, h + 1.2 * s, z); d.scale.setScalar(s); d.rotation.set(0, 0, 0); d.updateMatrix(); trunk.setMatrixAt(nt, d.matrix);
      d.position.y = h + 4.2 * s; d.updateMatrix(); leaf.setMatrixAt(nt++, d.matrix);
    } else if (nr < 70) {
      const s = 0.6 + Math.random() * 1.3;
      d.position.set(x, h + 0.3 * s, z); d.scale.set(s, s * 0.7, s); d.rotation.set(Math.random(), Math.random(), 0); d.updateMatrix(); rock.setMatrixAt(nr++, d.matrix);
    }
  }
  trunk.count = nt; leaf.count = nt; rock.count = nr;
  for (const o of [trunk, leaf, rock]) { o.castShadow = true; o.receiveShadow = true; scene.add(o); }
})();

// ---------- buildings ----------
function meshMats(mesh) { const a = []; mesh.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => a.push(m)); }); return a; }
function makeKeepMesh() {
  const kg = new THREE.Group(), stone = lam(0x9a9a96);
  boxMesh(8, 11, 8, stone, 0, 5.5, 0, kg);
  for (const [x, z] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5], [0, -3.5], [0, 3.5], [-3.5, 0], [3.5, 0]]) boxMesh(1.4, 1.4, 1.4, stone, x, 11.7, z, kg);
  boxMesh(0.2, 5, 0.2, lam(0x444444), 0, 14, 0, kg); boxMesh(2.2, 1.3, 0.1, lam(0xffd24a), 1.1, 15.6, 0, kg);
  return kg;
}
function makeHouseMesh() {
  const g = new THREE.Group();
  boxMesh(5, 3, 5, lam(0x8a3b32), 0, 1.5, 0, g);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.6, 4), lam(0x3b2a2a)); roof.rotation.y = Math.PI / 4; roof.position.y = 4.3; roof.castShadow = true; g.add(roof);
  boxMesh(1, 1.8, 0.2, lam(0x20140f), 0, 0.9, 2.5, g);
  return g;
}
function makeCastleMesh() {
  const g = new THREE.Group(), dark = lam(0x4b4048);
  boxMesh(12, 14, 12, dark, 0, 7, 0, g);
  for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) { boxMesh(3.2, 18, 3.2, dark, x, 9, z, g); boxMesh(3.8, 1.2, 3.8, lam(0x2b2328), x, 18.6, z, g); }
  boxMesh(0.25, 6, 0.25, lam(0x222222), 0, 17, 0, g); boxMesh(3, 1.8, 0.1, lam(0xb02a2a), 1.5, 19.2, 0, g);
  return g;
}
function bankTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#d4a82a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#6b4e0a'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 32, 36);
  return new THREE.CanvasTexture(c);
}
function makeBankMesh() {
  const g = new THREE.Group(), t = bankTexture(), side = new THREE.MeshLambertMaterial({ map: t }), gold = lam(0xd4a82a);
  const b = new THREE.Mesh(new THREE.BoxGeometry(4, 3.2, 4), [side, side, gold, gold, side, side]); b.position.y = 1.6; b.castShadow = b.receiveShadow = true; g.add(b);
  boxMesh(4.6, 0.5, 4.6, lam(0x8a6a14), 0, 3.4, 0, g);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) boxMesh(0.5, 3.2, 0.5, lam(0xf0e0a0), x, 1.6, z, g);
  return g;
}
function makeWallMesh() { const g = new THREE.Group(); boxMesh(3.6, 2.6, 1.1, lam(0x77777a), 0, 1.3, 0, g); return g; }

function makeStruct(type, x, z, r, hp, mesh, extra) {
  const y = heightAt(x, z); mesh.position.set(x, y, z); scene.add(mesh);
  return Object.assign({ type, x, z, r, hp, max: hp, mesh, mats: meshMats(mesh), flash: 0, y }, extra);
}

// ---------- blocky characters ----------
function faceMat(skin) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#' + skin.toString(16).padStart(6, '0'); g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#222'; g.fillRect(18, 20, 6, 11); g.fillRect(40, 20, 6, 11);
  g.strokeStyle = '#222'; g.lineWidth = 4; g.beginPath(); g.arc(32, 34, 14, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  return new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c) });
}
function makeChar(o) {
  const mats = [], L = col => { const m = lam(col); mats.push(m); return m; };
  const root = new THREE.Group(), skin = o.skin ?? 0xf2d03b;
  const bx = (w, h, d, m, x, y, z, par) => boxMesh(w, h, d, m, x, y, z, par);
  bx(1.6, 1.8, 0.8, L(o.shirt), 0, 2.5, 0, root);
  const fm = faceMat(skin), sm = L(skin); mats.push(fm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), [sm, sm, sm, sm, fm, sm]); head.position.y = 4; head.castShadow = true; root.add(head);
  const limb = (w, h, m, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); bx(w, h, w, m, 0, -h / 2, 0, p); root.add(p); return p; };
  const pm = L(o.pants), am = L(skin);
  const legL = limb(0.75, 1.6, pm, -0.4, 1.6), legR = limb(0.75, 1.6, pm, 0.4, 1.6);
  const armL = limb(0.7, 1.6, am, -1.15, 3.3), armR = limb(0.7, 1.6, am, 1.15, 3.3);
  const wc = o.wcol ?? 0xd9dde3;
  if (o.weapon === 'sword') { bx(0.22, 0.22, 2.6, L(wc), 0, -1.5, 1.2, armR); bx(0.7, 0.18, 0.18, L(0x6b4a2b), 0, -1.5, 0.1, armR); }
  else if (o.weapon === 'bow') bx(0.15, 2.4, 0.15, L(0x7a5230), 0, -1.5, 0.7, armL);
  else if (o.weapon === 'hammer') { bx(0.2, 0.2, 2.4, L(0x6b4a2b), 0, -1.5, 1.0, armR); bx(1.0, 1.0, 1.3, L(wc), 0, -1.5, 2.3, armR); }
  else if (o.weapon === 'trident') { bx(0.16, 0.16, 3.4, L(wc), 0, -1.5, 1.4, armR); for (const x of [-0.45, 0, 0.45]) bx(0.14, 0.14, 0.9, L(wc), x, -1.5, 3.4, armR); bx(1.1, 0.14, 0.14, L(wc), 0, -1.5, 3.0, armR); }
  else if (o.weapon === 'staff') { bx(0.16, 0.16, 3.4, L(0x6b4a2b), 0, -1.5, 1.4, armR); const gm = lam(wc, { emissive: wc }); bx(0.5, 0.5, 0.5, gm, 0, -1.5, 3.3, armR); }
  if (o.halo) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.09, 6, 24), new THREE.MeshBasicMaterial({ color: o.halo })); h.rotation.x = Math.PI / 2; h.position.y = 5.2; root.add(h); }
  root.scale.setScalar(0.45 * (o.s || 1));
  scene.add(root);
  return { root, legL, legR, armL, armR, mats, phase: Math.random() * 6, atk: 0, flash: 0, glow: o.glow || 0 };
}
function animChar(c, dt, moving, sp) {
  c.phase += dt * 9 * sp; const s = Math.sin(c.phase);
  const k = moving ? 1 : 0, lerp = (a, b) => a + (b - a) * Math.min(1, dt * 12);
  c.legL.rotation.x = lerp(c.legL.rotation.x, s * 0.9 * k); c.legR.rotation.x = lerp(c.legR.rotation.x, -s * 0.9 * k);
  c.armL.rotation.x = lerp(c.armL.rotation.x, -s * 0.7 * k);
  c.atk = Math.max(0, c.atk - dt);
  c.armR.rotation.x = c.atk > 0 ? -Math.sin(Math.PI * (1 - c.atk / 0.3)) * 2.3 : lerp(c.armR.rotation.x, s * 0.7 * k);
  c.flash = Math.max(0, c.flash - dt);
  for (const m of c.mats) m.emissive.setHex(c.flash > 0 ? 0xaa1111 : c.glow);
}
const face = (e, dx, dz) => { if (dx || dz) e.c.root.rotation.y = Math.atan2(dx, dz); };

// ---------- first-person sword ----------
const vm = new THREE.Group(); camera.add(vm);
const VM = o => { o.renderOrder = 999; if (o.material) { o.material.depthTest = false; } return o; };
const skinM = lam(0xf2d03b), bladeM = lam(0xe4e8ef, { emissive: 0x223344 }), hiltM = lam(0x6b4a2b);
const sw = new THREE.Group(); vm.add(sw);
sw.add(VM(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.7), skinM)).translateZ(0.35));
const blade = VM(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 1.25), bladeM)); blade.position.z = -0.7; sw.add(blade);
const guard = VM(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.08), hiltM)); guard.position.z = -0.08; sw.add(guard);
const arcM = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false });
const arc = VM(new THREE.Mesh(new THREE.RingGeometry(1.1, 1.22, 32, 1, 0, Math.PI * 0.7), arcM)); arc.position.z = -2.2; camera.add(arc);
const ringM = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false });
const fullRing = VM(new THREE.Mesh(new THREE.RingGeometry(1.0, 1.1, 40), ringM)); fullRing.position.z = -2.2; camera.add(fullRing);
const REST = { px: .38, py: -.42, pz: -.45, rx: .5, ry: .25, rz: 0 };
const POSES = {
  slashA: [{ px: .8, py: -.35, pz: -.4, rx: .3, ry: -1.0, rz: 0 }, { px: -.35, py: -.45, pz: -.45, rx: .2, ry: 1.2, rz: 0 }],
  slashB: [{ px: -.35, py: -.45, pz: -.45, rx: .2, ry: 1.2, rz: .2 }, { px: .8, py: -.35, pz: -.4, rx: .3, ry: -1.0, rz: 0 }],
  overhead: [{ px: .3, py: .05, pz: -.2, rx: 2.1, ry: .1, rz: 0 }, { px: .2, py: -.6, pz: -.75, rx: -.8, ry: .1, rz: 0 }],
  lunge: [{ px: .3, py: -.35, pz: .2, rx: .25, ry: .2, rz: 0 }, { px: .1, py: -.3, pz: -1.0, rx: .02, ry: 0, rz: 0 }],
};
const mixP = (a, b, t) => { const o = {}; for (const k in a) o[k] = a[k] + (b[k] - a[k]) * t; return o; };
function setPose(p) { sw.position.set(p.px, p.py, p.pz); sw.rotation.set(p.rx, p.ry, p.rz); }
const SWING = { slashA: { dur: .32, at: .4 }, slashB: { dur: .32, at: .4 }, overhead: { dur: .45, at: .55 }, lunge: { dur: .3, at: .35 }, spin: { dur: .55, at: .3 } };

// ---------- game state ----------
const ENEMY = {
  grunt:   { hp: 40,  speed: 4.5, dmg: 8,  reward: 15, shirt: 0xc94a4a, pants: 0x333333, s: 1 },
  runner:  { hp: 24,  speed: 8,   dmg: 5,  reward: 12, shirt: 0xe0a040, pants: 0x553311, s: 0.9 },
  swimmer: { hp: 50,  speed: 4.8, dmg: 8,  reward: 25, shirt: 0x2aa8a8, pants: 0x226666, s: 1, swim: true },
  brute:   { hp: 180, speed: 3,   dmg: 20, reward: 60, shirt: 0x7a2a7a, pants: 0x2a1a2a, s: 1.6, skin: 0xc8a060 },
};
const GODS = [
  { id: 'zeus', name: 'Zeus', myth: 'Greek', kind: 'bolt', shirt: 0xf4f1e8, pants: 0xd8c070, weapon: 'staff', wcol: 0xffe14a, col: 0xffe14a, desc: 'Lightning that chains between enemies.' },
  { id: 'poseidon', name: 'Poseidon', myth: 'Greek', kind: 'wave', shirt: 0x1a8a9a, pants: 0x14546a, weapon: 'trident', wcol: 0x9fe8ff, col: 0x44c0ff, desc: 'Crashing waves that hurl enemies back.' },
  { id: 'hades', name: 'Hades', myth: 'Greek', kind: 'drain', shirt: 0x3a2a5a, pants: 0x1c1430, weapon: 'staff', wcol: 0xa040ff, col: 0xa040ff, desc: 'Drains life from enemies to heal himself.' },
  { id: 'athena', name: 'Athena', myth: 'Greek', kind: 'spear', shirt: 0xb0b8c8, pants: 0x6a728a, weapon: 'trident', wcol: 0xeef2ff, col: 0xdde6ff, desc: 'Piercing spears. Heals nearby soldiers.' },
  { id: 'thor', name: 'Thor', myth: 'Norse', kind: 'hammer', shirt: 0xb03030, pants: 0x4a3a2a, weapon: 'hammer', wcol: 0x9aa4b0, col: 0x9fd0ff, desc: 'Hammer slams that shake the ground.' },
  { id: 'odin', name: 'Odin', myth: 'Norse', kind: 'ravens', shirt: 0x44506a, pants: 0x222a3a, weapon: 'staff', wcol: 0x888899, col: 0x888899, desc: 'Ravens strike three enemies at once.' },
  { id: 'loki', name: 'Loki', myth: 'Norse', kind: 'dagger', shirt: 0x2a8a4a, pants: 0x143a22, weapon: 'sword', wcol: 0x40e080, col: 0x40e080, desc: 'Lightning-fast melee strikes.' },
  { id: 'freya', name: 'Freya', myth: 'Norse', kind: 'heal', shirt: 0xe0a0c0, pants: 0x8a5a78, weapon: 'staff', wcol: 0xff9fcf, col: 0xff9fcf, desc: 'Light bolts that heal you and your army.' },
];
const GOD_RANGE = { bolt: 45, wave: 26, drain: 20, spear: 34, hammer: 4.5, ravens: 40, dagger: 3.2, heal: 30 };
const GOD_CD = { bolt: 1.5, wave: 1.8, drain: 1.2, spear: 1.3, hammer: 1.3, ravens: 1.6, dagger: 0.35, heal: 1.1 };
const GOD_DMG = { bolt: 160, wave: 90, drain: 110, spear: 150, hammer: 130, ravens: 110, dagger: 70, heal: 85 };
const GOD_COST = 50000;

let player, enemies, soldiers, structs, eBuild, effects, sinkers, gold, swordLvl, state, gameT, army, shopOpen = false;
let yaw = -Math.PI / 2, pitch = 0, bobT = 0, msg = '', sayT; const keys = {};
let charging = false, chargeT = 0, queued = false, lookDrag = false;
const FX = { arcT: 0, dur: 0.3 };

function say(m) { msg = m; $('msg').textContent = m; }
function flashMsg(m) { say(m); clearTimeout(sayT); sayT = setTimeout(() => { if (msg === m) say(''); }, 2200); }

function clearAll() {
  for (const e of [...(enemies || []), ...(soldiers || [])]) scene.remove(e.c.root);
  for (const s of [...(structs || []), ...(eBuild || [])]) scene.remove(s.mesh);
  for (const f of effects || []) scene.remove(f.obj);
  for (const s of sinkers || []) scene.remove(s.mesh);
}
function init() {
  clearAll();
  const px = KEEP.x - 14;
  player = { x: px, z: 0, y: heightAt(px, 0), vy: 0, hp: 100, max: 100, hurt: 0, dead: false, respawn: 0, swing: null, combo: 0, comboT: 0, spinCd: 0, dash: 0 };
  enemies = []; soldiers = []; effects = []; sinkers = []; structs = []; eBuild = [];
  structs.push(makeStruct('keep', KEEP.x + 3, KEEP.z, 6, 1500, makeKeepMesh()));
  const HOUSES = [[-62, 0], [-66, -12], [-66, 12], [-74, -21], [-74, 21], [-90, -14], [-90, 14]];
  for (const [x, z] of HOUSES) eBuild.push(makeStruct('house', x, z, 3.2, 160, makeHouseMesh(), { t: 8 + Math.random() * 8 }));
  eBuild.push(makeStruct('castle', BASE.x - 4, 0, 8, 800, makeCastleMesh(), { t: 45 }));
  for (const b of eBuild) b.mesh.rotation.y = Math.PI / 2;
  gold = 500; swordLvl = 0; gameT = 0; army = 'defend'; state = 'play';
  yaw = -Math.PI / 2; pitch = 0; charging = false; chargeT = 0; queued = false;
  setShop(false); $('over').hidden = true; $('btnArmy').textContent = 'Army: Defend (T)';
  say('The enemy kingdom is to the west. Press B for the shop. Click the view to look around with the mouse.');
}

const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const nearest = (from, list, max) => { let b = null, bd = max; for (const e of list) { if (e.dying) continue; const d = Math.hypot(e.x - from.x, e.z - from.z); if (d < bd) { bd = d; b = e; } } return b && { e: b, d: bd }; };
const inWater = e => heightAt(e.x, e.z) < WATER - 0.1;
const alive = b => b.hp > 0;
function collide(e, r, withEnemy) {
  let hit = null;
  for (const list of withEnemy ? [structs, eBuild] : [structs]) for (const w of list) {
    if (!alive(w)) continue;
    const dx = e.x - w.x, dz = e.z - w.z, dd = Math.hypot(dx, dz), min = w.r + r;
    if (dd < min && dd > 0.001) { e.x = w.x + dx / dd * min; e.z = w.z + dz / dd * min; hit = hit || w; }
  }
  return hit;
}
function hurtT(t, dmg) { if (t.c) { t.hp -= dmg; t.c.flash = 0.12; } else { t.hp -= dmg; t.flash = 0.12; } }

// ---------- effects ----------
function tracer(a, b, col) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: col || 0xffe9a0 }));
  scene.add(l); effects.push({ obj: l, t: 0.12, dur: 0.12 });
}
function shock(x, z, r, col) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  m.position.set(x, heightAt(x, z) + 0.25, z); scene.add(m); effects.push({ obj: m, t: 0.4, dur: 0.4, grow: r });
}
function aoe(x, z, r, dmg, kb, bld) {
  for (const e of enemies) {
    if (e.dying) continue; const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
    if (d < r + e.d.s * 0.5) { hurtT(e, dmg); if (kb && d > 0.01) { e.x += dx / d * kb; e.z += dz / d * kb; } }
  }
  if (bld) for (const b of eBuild) if (alive(b) && Math.hypot(b.x - x, b.z - z) < r + b.r) hurtT(b, dmg);
}

// ---------- sword ----------
function startSwing(type) {
  if (player.swing || player.dead || shopOpen) return false;
  const c = SWING[type]; player.swing = { type, t: 0, dur: c.dur, at: c.at, hit: false };
  FX.arcT = c.dur; FX.dur = c.dur; FX.type = type;
  if (type === 'lunge') player.dash = c.dur * 0.8;
  return true;
}
function comboSwing() {
  const seq = ['slashA', 'slashB', 'overhead'];
  if (player.swing) { queued = true; return; }
  player.combo = player.comboT > 0 ? (player.combo + 1) % 3 : 0;
  startSwing(seq[player.combo]);
}
function swingDamage(type) {
  const base = 12 + swordLvl * 6, fx = Math.sin(yaw), fz = Math.cos(yaw);
  const C = { slashA: { reach: 4.6, cone: .3, m: 1, kb: 1.2 }, slashB: { reach: 4.6, cone: .3, m: 1.1, kb: 1.2 }, overhead: { reach: 5, cone: .3, m: 1.8, kb: 2.5 },
    lunge: { reach: 8, cone: .7, m: 2.5, kb: 3, line: true }, spin: { reach: 5.4, cone: -2, m: 1.3, kb: 3 } }[type];
  const targets = [...enemies.filter(e => !e.dying), ...eBuild.filter(alive)];
  for (const t of targets) {
    const dx = t.x - player.x, dz = t.z - player.z, d = Math.hypot(dx, dz) || 0.001, rad = t.r || (0.4 + 0.6 * t.d.s);
    if (d - rad > C.reach || (dx * fx + dz * fz) / d < C.cone) continue;
    if (C.line && Math.abs(dx * fz - dz * fx) > 1.8 + rad) continue;
    hurtT(t, base * C.m);
    if (t.c) { t.x += dx / d * C.kb; t.z += dz / d * C.kb; }
  }
  if (type === 'overhead') { const x = player.x + fx * 3.5, z = player.z + fz * 3.5; shock(x, z, 5.5, 0xcfe6ff); aoe(x, z, 5.5, base * 0.9, 2.5, true); }
  if (type === 'spin') shock(player.x, player.z, 5.4, 0x9fd0ff);
}

// ---------- shop ----------
const ITEMS = [
  { sec: 'Army', id: 'soldier', name: 'Soldier', desc: 'Melee fighter. Obeys your army orders.', cost: 60 },
  { id: 'archer', name: 'Archer', desc: 'Shoots from range.', cost: 90 },
  { sec: 'Buildings', id: 'bank', name: 'Bank', desc: '+40 gold per second. Enemies will target it.', cost: 300 },
  { id: 'wall', name: 'Wall', desc: 'Blocks enemies until they break it.', cost: 40 },
  { sec: 'Gear', id: 'upgrade', name: 'Sharpen Sword', desc: '+6 damage per level.', cost: () => 120 * (swordLvl + 1) },
  { id: 'potion', name: 'Potion', desc: 'Restores 50 health.', cost: 50 },
  ...GODS.map((g, i) => ({ sec: i === 0 ? 'Greek gods ($50,000 each)' : i === 4 ? 'Norse gods ($50,000 each)' : null, id: g.id, god: g, name: g.name, desc: g.desc, cost: GOD_COST })),
];
const costOf = it => typeof it.cost === 'function' ? it.cost() : it.cost;
function renderShop() {
  $('shopGold').textContent = 'Gold ' + fmt(gold);
  const body = $('shopBody'); body.innerHTML = ''; let grid;
  for (const it of ITEMS) {
    if (it.sec) { const h = document.createElement('h3'); h.textContent = it.sec; body.appendChild(h); grid = document.createElement('div'); grid.className = 'grid'; body.appendChild(grid); }
    const c = costOf(it), card = document.createElement('div'); card.className = 'card' + (it.god ? ' god' : '');
    const t = document.createElement('div'); t.className = 't'; t.textContent = it.name;
    const d = document.createElement('div'); d.className = 'd'; d.textContent = it.desc;
    const b = document.createElement('button'); b.textContent = 'Buy $' + fmt(c); b.disabled = gold < c;
    b.onclick = () => { buy(it.id); renderShop(); };
    card.append(t, d, b); grid.appendChild(card);
  }
}
function setShop(open) {
  shopOpen = open; $('shopMenu').hidden = !open;
  if (open) { try { document.exitPointerLock(); } catch (e) {} renderShop(); charging = false; }
}
function placeAhead(dist) { return { x: Math.max(-HALF, Math.min(HALF, player.x + Math.sin(yaw) * dist)), z: Math.max(-HALF, Math.min(HALF, player.z + Math.cos(yaw) * dist)) }; }
function roomFor(x, z, r) { return ![...structs, ...eBuild].some(b => alive(b) && Math.hypot(b.x - x, b.z - z) < b.r + r + 0.5); }
function buy(id) {
  if (state !== 'play') return;
  const it = ITEMS.find(x => x.id === id), c = costOf(it);
  if (gold < c) return flashMsg('Not enough gold');
  if (id === 'bank' || id === 'wall') {
    const bank = id === 'bank', r = bank ? 2.8 : 1.7, p = placeAhead(bank ? 8 : 5);
    if (!roomFor(p.x, p.z, r)) return flashMsg('No room there. Face open ground.');
    const m = bank ? makeBankMesh() : makeWallMesh();
    const s = makeStruct(id, p.x, p.z, r, bank ? 200 : 100, m); if (!bank) m.rotation.y = yaw;
    structs.push(s);
  } else if (id === 'soldier' || id === 'archer') {
    const x = player.x + Math.sin(yaw) * 4 + (Math.random() - .5) * 3, z = player.z + Math.cos(yaw) * 4 + (Math.random() - .5) * 3, ranged = id === 'archer';
    soldiers.push({ x, z, y: heightAt(x, z), hp: ranged ? 35 : 60, max: ranged ? 35 : 60, cd: 0, ranged, dying: 0, speed: 6,
      c: makeChar(ranged ? { shirt: 0x3fa55b, pants: 0x2a4a30, weapon: 'bow' } : { shirt: 0x4a8ae0, pants: 0x1c2e63, weapon: 'sword' }) });
  } else if (it.god) {
    const g = it.god, x = player.x + Math.sin(yaw) * 5, z = player.z + Math.cos(yaw) * 5;
    soldiers.push({ x, z, y: heightAt(x, z), hp: 1500, max: 1500, cd: 0, ranged: GOD_RANGE[g.kind] > 5, dying: 0, speed: 7, god: g,
      c: makeChar({ shirt: g.shirt, pants: g.pants, weapon: g.weapon, wcol: g.wcol, s: 2.4, halo: g.col, glow: (g.col >> 1) & 0x7f7f7f }) });
    shock(x, z, 8, g.col); flashMsg(g.name + ' joins your army!');
  } else if (id === 'upgrade') { swordLvl++; flashMsg('Sword sharpened (Lv ' + swordLvl + ')'); }
  else if (id === 'potion') { player.hp = Math.min(player.max, player.hp + 50); flashMsg('Healed'); }
  gold -= c;
}
function setArmy(a) { army = a; $('btnArmy').textContent = 'Army: ' + (a === 'defend' ? 'Defend' : 'Attack') + ' (T)'; flashMsg(a === 'attack' ? 'Your army marches on the enemy kingdom.' : 'Your army holds the line.'); }

// ---------- enemies and gods ----------
function spawnEnemy(x, z, type) {
  const d = ENEMY[type];
  enemies.push({ type, d, x, z, y: heightAt(x, z), hp: d.hp, max: d.hp, cd: 0, tz: (Math.random() - .5) * 10, dying: 0, c: makeChar({ shirt: d.shirt, pants: d.pants, s: d.s, skin: d.skin }) });
}
function pickType() {
  const r = Math.random();
  if (gameT > 240 && r < .12) return 'brute'; if (gameT > 120 && r < .3) return 'swimmer'; if (gameT > 60 && r < .5) return 'runner'; return 'grunt';
}
function godAttack(s, t, isB) {
  const g = s.god, k = g.kind, tx = t.x, tz = t.z, ty = (t.y || heightAt(tx, tz)) + 2;
  s.cd = GOD_CD[k]; s.c.atk = 0.3; const dmg = GOD_DMG[k];
  const sky = (x, z, col) => tracer(new THREE.Vector3(x, ty + 28, z), new THREE.Vector3(x, heightAt(x, z) + 1, z), col);
  if (isB) { t.hp -= dmg * 1.5; t.flash = 0.12; if (k === 'bolt' || k === 'hammer') shock(tx, tz, 5, g.col); else tracer(new THREE.Vector3(s.x, s.y + 3, s.z), new THREE.Vector3(tx, ty, tz), g.col); return; }
  if (k === 'bolt') {
    hurtT(t, dmg); sky(tx, tz, g.col);
    let n = 0; for (const e of enemies) { if (e === t || e.dying || n >= 3) continue; if (Math.hypot(e.x - tx, e.z - tz) < 9) { hurtT(e, dmg / 2); sky(e.x, e.z, g.col); n++; } }
  } else if (k === 'wave') { shock(tx, tz, 8, g.col); aoe(tx, tz, 8, dmg, 4); }
  else if (k === 'drain') { hurtT(t, dmg); s.hp = Math.min(s.max, s.hp + 60); tracer(new THREE.Vector3(s.x, s.y + 3, s.z), new THREE.Vector3(tx, ty, tz), g.col); }
  else if (k === 'spear') {
    hurtT(t, dmg); tracer(new THREE.Vector3(s.x, s.y + 3, s.z), new THREE.Vector3(tx, ty, tz), g.col);
    for (const a of soldiers) if (!a.dying && Math.hypot(a.x - s.x, a.z - s.z) < 14) a.hp = Math.min(a.max, a.hp + 25);
  } else if (k === 'hammer') { shock(s.x, s.z, 6, g.col); aoe(s.x, s.z, 6, dmg, 3, true); sky(tx, tz, g.col); }
  else if (k === 'ravens') {
    const list = enemies.filter(e => !e.dying).sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z)).slice(0, 3);
    for (const e of list) if (Math.hypot(e.x - s.x, e.z - s.z) < 40) { hurtT(e, dmg); tracer(new THREE.Vector3(s.x, s.y + 6, s.z), new THREE.Vector3(e.x, e.y + 2, e.z), 0x222233); }
  } else if (k === 'dagger') { hurtT(t, dmg); }
  else if (k === 'heal') {
    hurtT(t, dmg); tracer(new THREE.Vector3(s.x, s.y + 3, s.z), new THREE.Vector3(tx, ty, tz), g.col);
    for (const a of soldiers) if (!a.dying && Math.hypot(a.x - s.x, a.z - s.z) < 16) a.hp = Math.min(a.max, a.hp + 40);
    if (!player.dead && Math.hypot(player.x - s.x, player.z - s.z) < 16) player.hp = Math.min(player.max, player.hp + 15);
  }
}

function destroyStruct(b, enemySide) {
  const list = enemySide ? eBuild : structs; list.splice(list.indexOf(b), 1);
  sinkers.push({ mesh: b.mesh, t: 1.2 });
  if (enemySide) {
    const rw = b.type === 'castle' ? 10000 : 2500; gold += rw;
    flashMsg((b.type === 'castle' ? 'Enemy castle destroyed' : 'Enemy house destroyed') + '. +' + fmt(rw) + ' gold');
  } else flashMsg('Your ' + b.type + ' was destroyed!');
}

// ---------- update ----------
function update(dt) {
  if (shopOpen) return;
  if (state === 'play') {
    gameT += dt; player.hurt -= dt; player.comboT = Math.max(0, player.comboT - dt); player.spinCd -= dt;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -fz, rz = fx;
    if (player.dead) {
      player.respawn -= dt; say('You fell. Respawning at the keep in ' + Math.max(1, Math.ceil(player.respawn)) + '...');
      if (player.respawn <= 0) { Object.assign(player, { dead: false, hp: player.max, x: KEEP.x - 14, z: 0, vy: 0, swing: null }); player.y = heightAt(player.x, 0); camera.rotation.z = 0; say(''); }
    } else {
      const ix = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0), iz = (keys.arrowup || keys.w ? 1 : 0) - (keys.arrowdown || keys.s ? 1 : 0);
      let moving = false;
      if (ix || iz) {
        const dx0 = fx * iz + rx * ix, dz0 = fz * iz + rz * ix, l = Math.hypot(dx0, dz0), sp = 9 * (inWater(player) ? 0.55 : 1) * (charging ? 0.6 : 1) * dt;
        player.x = Math.max(-HALF, Math.min(HALF, player.x + dx0 / l * sp)); player.z = Math.max(-HALF, Math.min(HALF, player.z + dz0 / l * sp)); moving = true; bobT += dt * 9;
      }
      if (player.dash > 0) { player.dash -= dt; player.x += fx * 26 * dt; player.z += fz * 26 * dt; }
      collide(player, 0.7, true);
      const gy = heightAt(player.x, player.z);
      if (keys[' '] && player.y <= gy + 0.05) player.vy = 9;
      player.vy -= 26 * dt; player.y += player.vy * dt; if (player.y < gy) { player.y = gy; player.vy = 0; }
      if (keys.q) yaw += 2 * dt; if (keys.e) yaw -= 2 * dt;
      if (charging) chargeT = Math.min(1.5, chargeT + dt);
      // swing
      const sg = player.swing;
      if (sg) {
        sg.t += dt; const p = Math.min(1, sg.t / sg.dur);
        if (!sg.hit && p >= sg.at) { sg.hit = true; swingDamage(sg.type); }
        if (p >= 1) { player.swing = null; player.comboT = 0.7; if (queued) { queued = false; comboSwing(); } }
      }
      player.moving = moving;
    }
    // enemy houses spawn soldiers
    const rate = 1 + gameT / 240;
    for (const b of eBuild) {
      if (!alive(b)) continue;
      b.t -= dt * rate;
      if (b.t <= 0) {
        if (b.type === 'house') { if (enemies.length < CAP) spawnEnemy(b.x + 3.5, b.z + (Math.random() - .5) * 4, pickType()); b.t = 14 + Math.random() * 6; }
        else { if (enemies.length < CAP) spawnEnemy(b.x + 6, b.z, 'brute'); b.t = 35; }
      }
    }
    // enemies
    for (const e of enemies) {
      if (e.dying) continue;
      e.cd -= dt; const d = e.d, r = 0.6 * d.s;
      const t = nearest(e, [...(player.dead ? [] : [player]), ...soldiers.filter(s => !s.dying)], 14);
      let tx, tz, moving = true, sp = d.speed * (inWater(e) && !d.swim ? 0.55 : 1);
      if (t) { tx = t.e.x; tz = t.e.z; }
      else {
        const bank = nearest(e, structs.filter(s => s.type === 'bank' && alive(s)), 30);
        if (bank) { tx = bank.e.x; tz = bank.e.z; } else { tx = KEEP.x - 2; tz = KEEP.z + e.tz; }
      }
      const dx = tx - e.x, dz = tz - e.z, dist = Math.hypot(dx, dz) || 1;
      if (t && t.d < 1.9 * d.s + 0.6) {
        moving = false; face(e, dx, dz);
        if (e.cd <= 0) { e.cd = 0.9; e.c.atk = 0.3; t.e.hp -= d.dmg; t.e.c ? (t.e.c.flash = 0.12) : 0; if (t.e === player) player.hurt = 0.25; }
      } else {
        e.x += dx / dist * sp * dt; e.z += dz / dist * sp * dt; face(e, dx, dz);
        const w = collide(e, r, false);
        if (w) { moving = false; w.hp -= d.dmg * 1.2 * (e.type === 'brute' ? 2 : 1) * dt; w.flash = 0.1; if (e.cd <= 0) { e.cd = 0.5; e.c.atk = 0.3; } }
      }
      e.y = heightAt(e.x, e.z); animChar(e.c, dt, moving, sp / 4.5);
    }
    // soldiers and gods
    for (const s of soldiers) {
      if (s.dying) continue;
      s.cd -= dt; const g = s.god, range = g ? GOD_RANGE[g.kind] : s.ranged ? 20 : 2.3;
      let t = nearest(s, enemies, (g ? range : s.ranged ? 20 : 12) + 14), isB = false;
      if (!t && army === 'attack') { const b = nearest(s, eBuild.filter(alive), 1e9); if (b) { t = b; isB = true; } }
      let moving = false;
      if (t) {
        const dx = t.e.x - s.x, dz = t.e.z - s.z; face(s, dx, dz);
        const eff = t.d - (isB ? t.e.r : 0);
        if (eff > range) { s.x += dx / t.d * s.speed * dt; s.z += dz / t.d * s.speed * dt; moving = true; collide(s, g ? 1.2 : 0.6, true); }
        else if (s.cd <= 0) {
          if (g) godAttack(s, t.e, isB);
          else {
            s.cd = s.ranged ? 1.1 : 0.7; s.c.atk = 0.3; const dm = 10 + swordLvl * 2;
            hurtT(t.e, dm);
            if (s.ranged) tracer(new THREE.Vector3(s.x, s.y + 2, s.z), new THREE.Vector3(t.e.x, (t.e.y || 0) + 2, t.e.z));
          }
        }
      }
      s.y = heightAt(s.x, s.z); animChar(s.c, dt, moving, 1.2);
    }
    // buildings: flash, destruction
    for (const list of [structs, eBuild]) for (const b of [...list]) {
      b.flash = Math.max(0, b.flash - dt); for (const m of b.mats) m.emissive.setHex(b.flash > 0 ? 0x661111 : 0);
      if (b.hp <= 0 && b.type !== 'keep') destroyStruct(b, list === eBuild);
    }
    // economy
    gold += 40 * structs.filter(s => s.type === 'bank').length * dt;
    // deaths
    for (const e of enemies) if (e.hp <= 0 && !e.dying) { e.dying = 0.7; gold += e.d.reward; }
    for (const s of soldiers) if (s.hp <= 0 && !s.dying) s.dying = 0.7;
    if (player.hp <= 0 && !player.dead) { player.dead = true; player.respawn = 5; player.swing = null; charging = false; }
    if (structs[0].hp <= 0) endGame(false, 'The keep was overrun.');
    else if (!eBuild.length) endGame(true);
  }

  for (const list of [enemies, soldiers]) for (const e of list) if (e.dying > 0) {
    e.dying -= dt; const p = 1 - Math.max(0, e.dying) / 0.7; e.c.root.rotation.x = -Math.PI / 2 * Math.min(1, p * 1.6);
    if (e.dying <= 0) { scene.remove(e.c.root); e.gone = true; }
  }
  enemies = enemies.filter(e => !e.gone); soldiers = soldiers.filter(s => !s.gone);
  for (const f of effects) { f.t -= dt; if (f.grow) { const k = 1 - f.t / f.dur; f.obj.scale.setScalar(Math.max(0.1, f.grow * k)); f.obj.material.opacity = 0.8 * (1 - k); } }
  effects = effects.filter(f => { if (f.t <= 0) scene.remove(f.obj); return f.t > 0; });
  for (const s of sinkers) { s.t -= dt; s.mesh.position.y -= dt * 3; if (s.t <= 0) scene.remove(s.mesh); }
  sinkers = sinkers.filter(s => s.t > 0);
  for (const e of [...enemies, ...soldiers]) { e.c.root.position.set(e.x, e.y, e.z); if (!e.dying) e.c.root.rotation.x = 0; }
  updateViewmodel(dt);
}
function endGame(won, why) {
  state = won ? 'won' : 'lost'; $('over').hidden = false;
  $('overTitle').textContent = won ? 'VICTORY' : 'KEEP LOST';
  $('overTitle').style.color = won ? '#7fe07f' : '#ff6b6b';
  $('overText').textContent = won ? 'The enemy kingdom has fallen after ' + Math.floor(gameT / 60) + ' minutes.' : why + ' You lasted ' + Math.floor(gameT / 60) + ' minutes.';
}
function updateViewmodel(dt) {
  vm.visible = !player.dead;
  let pose;
  const sg = player.swing;
  if (sg) {
    const p = Math.min(1, sg.t / sg.dur), e = 1 - (1 - p) * (1 - p);
    if (sg.type === 'spin') pose = { px: 0.1, py: -0.35, pz: -0.5, rx: 0.2, ry: -p * Math.PI * 4, rz: 0 };
    else pose = mixP(POSES[sg.type][0], POSES[sg.type][1], e);
    FX.arcT = Math.max(0, FX.dur * (1 - p));
  } else if (charging && chargeT > 0.12) {
    pose = mixP(REST, POSES.lunge[0], Math.min(1, chargeT / 0.6));
    pose.px += (Math.random() - .5) * 0.01 * Math.min(1, chargeT / 0.6);
  } else { pose = Object.assign({}, REST); pose.py += Math.sin(bobT) * 0.012 * (player.moving ? 1 : 0); pose.px += Math.cos(bobT * .5) * 0.008 * (player.moving ? 1 : 0); FX.arcT = 0; }
  setPose(pose);
  const sgt = sg ? sg.type : null, on = FX.arcT > 0 ? 0.7 * Math.min(1, FX.arcT / FX.dur + 0.2) : 0;
  arcM.opacity = sgt && sgt !== 'spin' ? on : 0; ringM.opacity = sgt === 'spin' ? on : 0;
  if (sgt === 'slashA' || sgt === 'slashB') { arc.rotation.z = -0.85 * Math.PI; arc.scale.set(sgt === 'slashA' ? 1.3 : -1.3, 0.45, 1); }
  else if (sgt === 'overhead') { arc.rotation.z = -0.35 * Math.PI; arc.scale.set(0.45, 1.3, 1); }
  else if (sgt === 'lunge') { arc.rotation.z = -0.35 * Math.PI; arc.scale.set(0.25, 0.3, 1); }
  fullRing.scale.set(1.4, 0.5, 1); fullRing.rotation.z += dt * 10;
}

// ---------- render ----------
function render() {
  const eye = player.y + 1.85 - (player.dead ? 1.4 : 0);
  camera.position.set(player.x, eye, player.z);
  camera.rotation.y = yaw + Math.PI; camera.rotation.x = pitch; if (player.dead) camera.rotation.z = Math.min(1.3, camera.rotation.z + 0.05);
  sun.position.set(player.x + 30, 55, player.z + 20); sun.target.position.set(player.x, 0, player.z);
  renderer.render(scene, camera);
  $('hp').style.width = Math.max(0, player.hp / player.max * 100) + '%';
  const keep = structs[0]; $('keep').style.width = Math.max(0, keep.hp / keep.max * 100) + '%';
  const banks = structs.filter(s => s.type === 'bank').length, houses = eBuild.filter(b => b.type === 'house').length, castle = eBuild.some(b => b.type === 'castle');
  $('stats').textContent = 'Gold ' + fmt(gold) + '  (+' + banks * 40 + '/s, ' + banks + ' bank' + (banks === 1 ? '' : 's') + ')   Sword Lv ' + swordLvl + '   Army ' + soldiers.length;
  const tgt = nearest(player, eBuild.filter(alive), 1e9);
  if (tgt) {
    let rel = Math.atan2(tgt.e.x - player.x, tgt.e.z - player.z) - yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const a = Math.abs(rel) < Math.PI / 4 ? '↑' : Math.abs(rel) > 3 * Math.PI / 4 ? '↓' : rel > 0 ? '←' : '→';
    $('goal').textContent = 'Enemy kingdom ' + a + ' ' + Math.round(tgt.d) + ' m   Houses ' + houses + '/7   Castle ' + (castle ? 'standing' : 'down');
  }
  $('hurt').style.opacity = player.hurt > 0 ? 0.35 : 0;
  $('chargeBar').parentElement.style.opacity = charging && chargeT > 0.12 ? 1 : 0;
  $('chargeBar').style.width = Math.min(1, chargeT / 0.6) * 100 + '%'; $('chargeBar').style.background = chargeT >= 0.6 ? '#ffd24a' : '#8cf';
}

// ---------- input ----------
const cv = renderer.domElement;
const locked = () => document.pointerLockElement === cv;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => {
  if (shopOpen || state !== 'play') return;
  if (e.button === 2) { lookDrag = true; return; }
  if (!locked()) { try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) {} }
  charging = true; chargeT = 0;
});
window.addEventListener('mouseup', e => {
  if (e.button === 2) { lookDrag = false; return; }
  if (!charging) return; charging = false;
  if (player.dead || shopOpen) return;
  if (chargeT >= 0.6) { if (player.swing) queued = false; else startSwing('lunge'); } else comboSwing();
  chargeT = 0;
});
window.addEventListener('mousemove', e => {
  if (!locked() && !lookDrag) return;
  yaw -= e.movementX * 0.0025; pitch = Math.max(-1.4, Math.min(1.4, pitch - e.movementY * 0.0025));
});
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
  if (k === 'b' && state === 'play') setShop(!shopOpen);
  if (k === 'escape' && shopOpen) setShop(false);
  if (shopOpen) return;
  if (k === 't' && state === 'play') setArmy(army === 'defend' ? 'attack' : 'defend');
  if (k === 'f' && player.spinCd <= 0 && !player.swing && !player.dead && state === 'play') { startSwing('spin'); player.spinCd = 1.5; }
  if (k === 'r' && state !== 'play') init();
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
$('btnShop').onclick = () => { if (state === 'play') setShop(!shopOpen); };
$('btnArmy').onclick = () => { if (state === 'play') setArmy(army === 'defend' ? 'attack' : 'defend'); };
$('shopClose').onclick = () => setShop(false);
$('again').onclick = init;

function resize() { const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(wrap); resize();

let last = performance.now();
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(loop); }
init(); requestAnimationFrame(loop);
