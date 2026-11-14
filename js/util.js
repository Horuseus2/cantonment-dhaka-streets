'use strict';
// Core helpers, input, geometry builder
window.G = {};
(function () {
  const G = window.G;
  THREE.ColorManagement.legacyMode = false;

  G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
  G.smooth = (a, b, x) => { const t = G.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  G.wrapPi = a => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };
  G.angLerp = (a, b, t) => a + G.wrapPi(b - a) * t;
  G.hash = n => { let x = (n | 0) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return (x ^ (x >>> 16)) >>> 0; };
  G.h01 = n => G.hash(n) / 4294967296;
  G.rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  G.pick = (arr, r) => arr[Math.floor((r ? r() : Math.random()) * arr.length)];
  G.rand = (a, b) => a + Math.random() * (b - a);
  G.taka = n => '৳' + Math.round(n).toLocaleString('en-US');
  const colCache = new Map();
  G.col = hex => { let c = colCache.get(hex); if (!c) { const k = new THREE.Color(hex); c = [k.r, k.g, k.b]; colCache.set(hex, c); } return c; };
  G.frame = () => new Promise(r => requestAnimationFrame(r));

  // ---------- input ----------
  const I = G.input = { keys: {}, hit: {}, mdx: 0, mdy: 0, mb: {}, mhit: {}, wheel: 0, locked: false };
  const BLOCK = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F5', 'Quote', 'Slash']);
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (!I.keys[e.code]) I.hit[e.code] = true; I.keys[e.code] = true;
    if (BLOCK.has(e.code)) e.preventDefault();
  });
  addEventListener('keyup', e => { I.keys[e.code] = false; });
  addEventListener('blur', () => { I.keys = {}; I.mb = {}; });
  addEventListener('mousemove', e => { if (I.locked) { I.mdx += e.movementX || 0; I.mdy += e.movementY || 0; } });
  addEventListener('mousedown', e => { I.mb[e.button] = true; I.mhit[e.button] = true; });
  addEventListener('mouseup', e => { I.mb[e.button] = false; });
  addEventListener('wheel', e => { I.wheel += Math.sign(e.deltaY); }, { passive: true });
  addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerlockchange', () => { I.locked = !!document.pointerLockElement; });
  I.endFrame = () => { I.hit = {}; I.mhit = {}; I.mdx = 0; I.mdy = 0; I.wheel = 0; };

  // ---------- geometry builder (merges primitives with vertex colours) ----------
  const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
  class GB {
    constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
    get vc() { return this.p.length / 3; }
    v(x, y, z, nx, ny, nz, u, v, c) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.u.push(u, v); this.c.push(c[0], c[1], c[2]); return this.p.length / 3 - 1; }
    tri(a, b, c) { this.i.push(a, b, c); }
    // bake a THREE geometry with transform + colour
    add(geo, m4, col, mulVertexColor) {
      const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, C = geo.attributes.color, base = this.vc;
      if (m4) _nm.getNormalMatrix(m4);
      for (let i = 0; i < P.count; i++) {
        _v.fromBufferAttribute(P, i); if (m4) _v.applyMatrix4(m4);
        if (N) { _n.fromBufferAttribute(N, i); if (m4) _n.applyMatrix3(_nm).normalize(); } else _n.set(0, 1, 0);
        this.p.push(_v.x, _v.y, _v.z); this.n.push(_n.x, _n.y, _n.z);
        if (U) this.u.push(U.getX(i), U.getY(i)); else this.u.push(0, 0);
        if (C && mulVertexColor !== false) this.c.push(C.getX(i) * col[0], C.getY(i) * col[1], C.getZ(i) * col[2]); else this.c.push(col[0], col[1], col[2]);
      }
      if (geo.index) { const ix = geo.index; for (let i = 0; i < ix.count; i++) this.i.push(base + ix.getX(i)); }
      else for (let i = 0; i < P.count; i++) this.i.push(base + i);
      return this;
    }
    // primitive helpers: position (x,y,z), size, rotation
    xf(x, y, z, rx, ry, rz, sx, sy, sz) { _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz); return _m.compose(_p, _q, _s); }
    box(x, y, z, sx, sy, sz, col, ry, rx, rz) { return this.add(GB.unitBox, this.xf(x, y, z, rx, ry, rz, sx, sy, sz), col); }
    cyl(x, y, z, r, h, col, seg, rx, ry, rz, rTop) { const g = GB.cylGeo(seg || 10, rTop === undefined ? 1 : rTop / r); return this.add(g, this.xf(x, y, z, rx, ry, rz, r, h, r), col); }
    sph(x, y, z, sx, sy, sz, col, detail, ry) { return this.add(GB.sphGeo(detail || 1), this.xf(x, y, z, 0, ry, 0, sx, sy, sz), col); }
    geo(g, x, y, z, col, rx, ry, rz, sx, sy, sz) { return this.add(g, this.xf(x, y, z, rx, ry, rz, sx, sy, sz), col); }
    build(noUv) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      if (!noUv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.setIndex(this.vc > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    }
  }
  GB.unitBox = new THREE.BoxGeometry(1, 1, 1);
  const cylCache = {}, sphCache = {};
  GB.cylGeo = (seg, topRatio) => { const k = seg + '_' + topRatio; return cylCache[k] || (cylCache[k] = new THREE.CylinderGeometry(topRatio, 1, 1, seg)); };
  GB.sphGeo = d => sphCache[d] || (sphCache[d] = d >= 6 ? new THREE.SphereGeometry(1, d, Math.round(d * 0.7)) : new THREE.IcosahedronGeometry(1, d));
  G.GB = GB;

  // ribbon along a 3D polyline: pts = [[x,y,z],...]
  G.ribbon = function (gb, pts, hw, vTile, yOff, col, closedLoop) {
    const n = pts.length; if (n < 2) return;
    let len = 0; const base = gb.vc;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[Math.min(n - 1, i + 1)];
      let d1x = b[0] - a[0], d1z = b[2] - a[2], d2x = c[0] - b[0], d2z = c[2] - b[2];
      let l1 = Math.hypot(d1x, d1z), l2 = Math.hypot(d2x, d2z);
      if (l1 < 1e-6) { d1x = d2x; d1z = d2z; l1 = l2; } if (l2 < 1e-6) { d2x = d1x; d2z = d1z; l2 = l1; }
      if (l1 < 1e-6) { l1 = l2 = 1; d1x = d2x = 1; d1z = d2z = 0; }
      d1x /= l1; d1z /= l1; d2x /= l2; d2z /= l2;
      let fx = d1x + d2x, fz = d1z + d2z; const fl = Math.hypot(fx, fz); if (fl < 1e-4) { fx = d1x; fz = d1z; } else { fx /= fl; fz /= fl; }
      const rx = -fz, rz = fx; // right vector
      const m = 1 / Math.max(0.55, rx * -d1z + rz * d1x);
      if (i > 0) len += Math.hypot(b[0] - a[0], b[2] - a[2]);
      const v = len / vTile, y = b[1] + yOff;
      gb.v(b[0] - rx * hw * m, y, b[2] - rz * hw * m, 0, 1, 0, 0, v, col);
      gb.v(b[0] + rx * hw * m, y, b[2] + rz * hw * m, 0, 1, 0, 1, v, col);
    }
    for (let i = 0; i < n - 1; i++) { const a = base + i * 2; gb.i.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  };

  G.pip = function (x, z, r) { // r = flat array [x0,z0,x1,z1...]
    let c = false; const n = r.length;
    for (let i = 0, j = n - 2; i < n; j = i, i += 2) { const az = r[i + 1], bz = r[j + 1]; if ((az > z) !== (bz > z) && x < (r[j] - r[i]) * (z - az) / (bz - az) + r[i]) c = !c; }
    return c;
  };
  G.decodeRing = function (a, off) { const n = (a.length - off) / 2, o = new Float32Array(n * 2); let x = 0, z = 0; for (let i = 0; i < n; i++) { x += a[off + i * 2]; z += a[off + i * 2 + 1]; o[i * 2] = x / 10; o[i * 2 + 1] = z / 10; } return o; };

  // binary heap for A*
  G.Heap = class { constructor() { this.k = []; this.v = []; } get size() { return this.k.length; }
    push(key, val) { const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val); while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
    pop() { const k = this.k, v = this.v, top = v[0], lk = k.pop(), lv = v.pop(); const n = k.length; if (n) { let i = 0; for (;;) { let c = i * 2 + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; } return top; } };
})();
