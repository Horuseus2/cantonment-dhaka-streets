'use strict';
// Humanoid characters: procedural body, clothing, hair, uniforms, and pose-based animation.
(function () {
  const G = window.G, GB = G.GB;
  const C = G.Char = {};
  C.OPTS = {
    skin: ['#f1c9a5', '#e0ac7e', '#c98f62', '#b0764c', '#96603c', '#7a4a2c', '#5e3820'],
    hair: ['Bald', 'Short', 'Side Part', 'Spiky', 'Long', 'Bun', 'Curly', 'Fade'],
    hairCol: ['#15110e', '#2a1c12', '#4a2f1a', '#6e4a28', '#8a8a8a', '#d8d8d8', '#7a2a1a', '#c9a25a'],
    beard: ['Clean', 'Stubble', 'Full Beard', 'Moustache'],
    top: ['tshirt', 'shirt', 'polo', 'panjabi', 'hoodie', 'suit', 'jacket', 'kameez', 'sari', 'burqa', 'army', 'navy', 'police', 'rab', 'vest'],
    topName: { tshirt: 'T-Shirt', shirt: 'Formal Shirt', polo: 'Polo', panjabi: 'Panjabi', hoodie: 'Hoodie', suit: 'Suit & Tie', jacket: 'Leather Jacket', kameez: 'Salwar Kameez', sari: 'Sari', burqa: 'Burqa', army: 'Army Uniform', navy: 'Navy Uniform', police: 'Police Uniform', rab: 'Special Force', vest: 'Sando Vest' },
    bottom: ['jeans', 'trousers', 'shorts', 'lungi', 'cargo'],
    bottomName: { jeans: 'Jeans', trousers: 'Trousers', shorts: 'Shorts', lungi: 'Lungi', cargo: 'Cargo Pants' },
    hat: ['none', 'cap', 'tupi', 'helmet', 'beret', 'peaked', 'hijab', 'beanie'],
    hatName: { none: 'None', cap: 'Baseball Cap', tupi: 'Tupi', helmet: 'Bike Helmet', beret: 'Beret', peaked: 'Peaked Cap', hijab: 'Hijab', beanie: 'Beanie' },
    glasses: ['None', 'Glasses', 'Sunglasses'],
    colors: ['#f2f2f2', '#1a1a1a', '#2c3e50', '#7f8c8d', '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#16a085', '#2980b9', '#8e44ad', '#d35400', '#6d4c41', '#bdc3c7', '#34495e', '#e8d5b0', '#89a8c9', '#5d6d3a']
  };
  C.defaultApp = () => ({ sex: 'm', skin: 2, hair: 1, hairCol: 0, beard: 0, top: 'tshirt', topCol: '#2980b9', bottom: 'jeans', botCol: '#2c3e50', shoes: '#f2f2f2', hat: 'none', hatCol: '#c0392b', glasses: 0, height: 1, build: 1, fat: 0 });
  C.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 });

  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function camo(gb, from, cols) { for (let i = from; i < gb.vc; i++) { const h = G.hash(Math.round(gb.p[i * 3] * 9) * 73856093 ^ Math.round(gb.p[i * 3 + 1] * 9) * 19349663 ^ Math.round(gb.p[i * 3 + 2] * 9) * 83492791); const c = cols[h % cols.length]; gb.c[i * 3] = c[0]; gb.c[i * 3 + 1] = c[1]; gb.c[i * 3 + 2] = c[2]; } }
  const CAMO = { army: ['#4b5a32', '#5f6b3c', '#3a4426', '#6e6a48', '#2f3a22'], rab: ['#15171a', '#1c1e22', '#101214'] };

  function buildParts(a) {
    const skin = G.col(C.OPTS.skin[a.skin] || C.OPTS.skin[2]), hairC = G.col(C.OPTS.hairCol[a.hairCol] || '#15110e');
    const top = a.top, topC = G.col(top === 'army' ? '#4b5a32' : top === 'navy' ? '#f4f4f0' : top === 'police' ? '#5f7896' : top === 'rab' ? '#15171a' : top === 'burqa' ? '#141416' : a.topCol);
    const uni = top === 'army' || top === 'rab', botC = G.col(uni ? (top === 'army' ? '#4b5a32' : '#15171a') : top === 'navy' ? '#f4f4f0' : top === 'police' ? '#1f2a44' : a.botCol), shoeC = G.col(uni ? '#141414' : a.shoes);
    const female = a.sex === 'f', fat = a.fat || 0, longSleeve = ['shirt', 'panjabi', 'hoodie', 'suit', 'jacket', 'kameez', 'burqa', 'army', 'navy', 'police', 'rab'].includes(top), noSleeve = top === 'vest';
    const parts = {};
    // ----- torso (spine-local, y 0..0.57) -----
    let gb = new GB(); const shW = female ? 0.185 : 0.21, tsx = (1.18 + fat * 0.45) * (female ? 0.92 : 1), tsz = 0.82 + fat * 0.5;
    gb.geo(GB.sphGeo(8), 0, 0.02, 0, botC, 0, 0, 0, 0.165 + fat * 0.05 + (female ? 0.012 : 0), 0.115, 0.118 + fat * 0.05);
    const t0 = gb.vc;
    gb.geo(GB.cylGeo(10, 1.22), 0, 0.27, 0, topC, 0, 0, 0, 0.135 * tsx, 0.44, 0.135 * tsz);
    gb.geo(GB.sphGeo(8), 0, 0.465, 0, topC, 0, 0, 0, shW + 0.02 + fat * 0.03, 0.075, 0.115 + fat * 0.03);
    if (fat > 0.05) gb.geo(GB.sphGeo(8), 0, 0.2, 0.05 + fat * 0.05, topC, 0, 0, 0, 0.15 + fat * 0.1, 0.17 + fat * 0.06, 0.13 + fat * 0.1);
    if (female && top !== 'burqa') gb.geo(GB.sphGeo(8), 0, 0.36, 0.06, topC, 0, 0, 0, 0.13, 0.07, 0.07);
    if (uni) camo(gb, t0, CAMO[top].map(G.col));
    gb.cyl(0, 0.545, 0, 0.046, 0.09, skin, 8);
    const fz = 0.135 * tsz * 1.12 + (fat > 0.05 ? fat * 0.045 : 0);
    if (top === 'suit') { gb.box(0, 0.4, fz - 0.012, 0.075, 0.22, 0.02, G.col('#f4f4f4')); gb.box(0, 0.37, fz, 0.032, 0.2, 0.012, G.col(a.tieCol || '#8f1d1d')); gb.box(-0.07, 0.42, fz - 0.008, 0.05, 0.2, 0.02, mix(topC, [0, 0, 0], 0.25), 0, 0, 0.3); gb.box(0.07, 0.42, fz - 0.008, 0.05, 0.2, 0.02, mix(topC, [0, 0, 0], 0.25), 0, 0, -0.3); }
    if (top === 'shirt' || top === 'polo' || top === 'police' || top === 'navy' || top === 'army') { gb.box(0, 0.3, fz - 0.006, 0.02, 0.38, 0.012, mix(topC, [1, 1, 1], top === 'army' ? 0.05 : 0.25)); gb.box(-0.045, 0.5, fz - 0.03, 0.06, 0.035, 0.03, mix(topC, [1, 1, 1], 0.12), 0.4); gb.box(0.045, 0.5, fz - 0.03, 0.06, 0.035, 0.03, mix(topC, [1, 1, 1], 0.12), -0.4); }
    if (top === 'navy' || top === 'police' || top === 'army') { const ec = G.col(top === 'navy' ? '#101820' : top === 'army' ? '#2f3a22' : '#1f2a44'); gb.box(-shW + 0.03, 0.535, 0, 0.09, 0.015, 0.05, ec); gb.box(shW - 0.03, 0.535, 0, 0.09, 0.015, 0.05, ec); gb.box(0.07, 0.4, fz - 0.004, 0.06, 0.012, 0.01, G.col(top === 'army' ? '#1c1c1c' : '#d9b84a')); if (top !== 'army') gb.box(-0.07, 0.38, fz - 0.004, 0.035, 0.035, 0.01, G.col('#d9b84a')); }
    if (top === 'rab') { gb.box(0, 0.3, 0, 0.36, 0.3, 0.26, G.col('#0c0d0f')); gb.box(0, 0.36, fz + 0.02, 0.16, 0.05, 0.01, G.col('#d8d8d8')); }
    if (top === 'hoodie') gb.geo(GB.sphGeo(8), 0, 0.53, -0.07, topC, 0, 0, 0, 0.11, 0.09, 0.08);
    if (top === 'jacket') { gb.box(0, 0.3, fz - 0.004, 0.012, 0.4, 0.012, G.col('#b0b0b0')); gb.box(0, 0.06, 0, 0.34 * tsx / 1.18, 0.05, 0.25, mix(topC, [0, 0, 0], 0.3)); }
    if (top === 'vest') { gb.geo(GB.sphGeo(8), 0, 0.47, 0, skin, 0, 0, 0, shW + 0.022, 0.07, 0.1); }
    if (top === 'sari') gb.box(0.02, 0.33, 0.01, 0.1, 0.52, 0.31, G.col(a.botCol), 0, 0, 0.62);
    if (top === 'kameez') gb.box(0, 0.44, 0.02, 0.4, 0.035, 0.26, G.col(a.botCol), 0, 0.1, 0);
    if (['jeans', 'trousers', 'cargo'].includes(a.bottom) || uni || top === 'police' || top === 'navy') gb.cyl(0, 0.07, 0, 0.14 * tsx + fat * 0.02, 0.035, G.col(uni ? '#1c1c1c' : '#2a2018'), 10);
    parts.torso = gb.build(true);
    // ----- lower garment (lungi / long tops) -----
    const skirtLen = top === 'burqa' || top === 'sari' ? 0.86 : a.bottom === 'lungi' && !uni ? 0.78 : top === 'panjabi' || top === 'kameez' ? 0.5 : 0;
    if (skirtLen) { gb = new GB(); const sc = top === 'panjabi' || top === 'kameez' || top === 'burqa' ? topC : botC; gb.geo(GB.cylGeo(10, 0.8), 0, 0.95 - skirtLen / 2, 0, sc, 0, 0, 0, 0.2 + fat * 0.06, skirtLen, 0.17 + fat * 0.06); if (a.bottom === 'lungi' && skirtLen === 0.78) for (let i = 0; i < gb.vc; i++) { const s = (Math.round(gb.p[i * 3 + 1] * 14) + Math.round(Math.atan2(gb.p[i * 3], gb.p[i * 3 + 2]) * 3)) % 2 ? 1 : 0.72; gb.c[i * 3] *= s; gb.c[i * 3 + 1] *= s; gb.c[i * 3 + 2] *= s; } parts.skirt = gb.build(true); }
    // ----- head -----
    gb = new GB();
    gb.geo(GB.sphGeo(10), 0, 0.105, 0, skin, 0, 0, 0, 0.09 + fat * 0.012, 0.112, 0.1); gb.geo(GB.sphGeo(8), 0, 0.045, 0.012, a.beard === 1 ? mix(skin, hairC, 0.35) : skin, 0, 0, 0, 0.074 + fat * 0.018, 0.07, 0.082);
    gb.box(0, 0.088, 0.1, 0.022, 0.042, 0.028, mix(skin, [0, 0, 0], 0.08)); gb.geo(GB.sphGeo(1), -0.09, 0.098, 0, skin, 0, 0, 0, 0.012, 0.026, 0.018); gb.geo(GB.sphGeo(1), 0.09, 0.098, 0, skin, 0, 0, 0, 0.012, 0.026, 0.018);
    for (const s of [-1, 1]) { gb.geo(GB.sphGeo(1), s * 0.034, 0.117, 0.084, G.col('#f4f4f4'), 0, 0, 0, 0.016, 0.01, 0.008); gb.geo(GB.sphGeo(1), s * 0.034, 0.117, 0.09, G.col('#1a120c'), 0, 0, 0, 0.008, 0.008, 0.005); gb.box(s * 0.034, 0.138, 0.089, 0.036, 0.008, 0.012, hairC, 0, 0, -s * 0.12); }
    gb.box(0, 0.05, 0.089, 0.042, 0.009, 0.012, G.col(female ? '#a8433c' : '#7a3f36'));
    const hat = a.hat, covered = hat === 'helmet' || hat === 'hijab' || top === 'burqa';
    if (!covered) {
      const h = a.hair;
      if (h === 1 || h === 2 || h === 3 || h === 4 || h === 5) gb.geo(GB.sphGeo(10), 0, 0.128, -0.01, hairC, 0, 0, 0, 0.096, 0.104, 0.103);
      if (h === 2) gb.box(0.02, 0.2, 0.065, 0.13, 0.03, 0.07, hairC, 0, 0.3, 0.12);
      if (h === 3) for (let i = 0; i < 7; i++) gb.cyl(Math.cos(i * 0.9) * 0.04, 0.235, Math.sin(i * 0.9) * 0.04 - 0.005, 0.022, 0.06, hairC, 5, Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4, 0.002);
      if (h === 4) { gb.geo(GB.sphGeo(8), 0, 0.02, -0.065, hairC, 0, 0, 0, 0.1, 0.19, 0.065); }
      if (h === 5) gb.geo(GB.sphGeo(8), 0, 0.15, -0.115, hairC, 0, 0, 0, 0.05, 0.05, 0.05);
      if (h === 6) for (let i = 0; i < 12; i++) { const an = i / 12 * 6.28, r = i % 2 ? 0.06 : 0.035; gb.geo(GB.sphGeo(1), Math.cos(an) * r, 0.2 - (i % 3) * 0.02, Math.sin(an) * r - 0.01, hairC, 0, 0, 0, 0.05, 0.045, 0.05); }
      if (h === 7) gb.geo(GB.sphGeo(10), 0, 0.155, -0.006, hairC, 0, 0, 0, 0.089, 0.072, 0.098);
    }
    if (a.beard === 2) gb.geo(GB.sphGeo(8), 0, 0.028, 0.032, hairC, 0, 0, 0, 0.078, 0.068, 0.074); if (a.beard === 3 || a.beard === 2) gb.box(0, 0.068, 0.096, 0.052, 0.013, 0.012, hairC);
    const hc = G.col(hat === 'tupi' ? '#f4f4f0' : hat === 'peaked' ? (top === 'police' ? '#1f2a44' : top === 'army' ? '#4b5a32' : '#f4f4f0') : hat === 'beret' ? (a.hatCol || '#3a4a26') : a.hatCol || '#c0392b');
    if (hat === 'cap') { gb.geo(GB.sphGeo(10), 0, 0.15, -0.004, hc, 0, 0, 0, 0.099, 0.082, 0.106); gb.box(0, 0.158, 0.12, 0.13, 0.012, 0.1, hc, 0, 0.12); }
    if (hat === 'beanie') gb.geo(GB.sphGeo(10), 0, 0.155, -0.004, hc, 0, 0, 0, 0.1, 0.09, 0.106);
    if (hat === 'tupi') gb.cyl(0, 0.2, -0.005, 0.088, 0.065, hc, 12, -0.08, 0, 0, 0.082);
    if (hat === 'beret') { gb.geo(GB.sphGeo(10), 0.02, 0.2, -0.005, hc, 0, 0, 0.18, 0.12, 0.035, 0.115); gb.cyl(0, 0.178, 0, 0.094, 0.025, mix(hc, [0, 0, 0], 0.3), 12); gb.box(-0.045, 0.2, 0.09, 0.022, 0.022, 0.01, G.col('#d9b84a')); }
    if (hat === 'peaked') { gb.cyl(0, 0.205, -0.004, 0.118, 0.045, hc, 14, -0.1, 0, 0, 0.094); gb.cyl(0, 0.18, 0, 0.094, 0.03, G.col('#15171c'), 12); gb.box(0, 0.168, 0.115, 0.14, 0.01, 0.07, G.col('#101012'), 0, 0.2); gb.box(0, 0.205, 0.108, 0.03, 0.03, 0.01, G.col('#d9b84a')); }
    if (hat === 'helmet') { gb.geo(GB.sphGeo(10), 0, 0.115, -0.004, hc, 0, 0, 0, 0.118, 0.125, 0.128); gb.box(0, 0.115, 0.115, 0.15, 0.06, 0.03, G.col('#0c1218')); }
    if (hat === 'hijab' || top === 'burqa') { const c = top === 'burqa' ? G.col('#141416') : hc; gb.geo(GB.sphGeo(10), 0, 0.118, -0.016, c, 0, 0, 0, 0.104, 0.118, 0.106); gb.geo(GB.sphGeo(8), 0, -0.02, -0.005, c, 0, 0, 0, 0.115, 0.09, 0.105); }
    if (a.glasses) { const gc = G.col(a.glasses === 2 ? '#0a0a0a' : '#2a2a2a'); for (const s of [-1, 1]) { gb.box(s * 0.035, 0.117, 0.097, 0.045, a.glasses === 2 ? 0.028 : 0.024, 0.006, a.glasses === 2 ? gc : mix(gc, [0.6, 0.8, 1], 0.5)); gb.box(s * 0.075, 0.12, 0.05, 0.004, 0.006, 0.09, gc); } gb.box(0, 0.12, 0.097, 0.03, 0.005, 0.005, gc); }
    parts.head = gb.build(true);
    // ----- arms -----
    const armC = noSleeve ? skin : topC, foreC = longSleeve ? topC : skin, aw = 1 + fat * 0.35;
    for (const side of ['L', 'R']) {
      gb = new GB(); const u0 = gb.vc; gb.geo(GB.sphGeo(8), 0, -0.01, 0, armC, 0, 0, 0, 0.056 * aw, 0.056, 0.056 * aw); gb.cyl(0, -0.14, 0, 0.04 * aw, 0.28, top === 'tshirt' || top === 'polo' ? skin : armC, 8, 0, 0, 0, 0.05 * aw);
      if (top === 'tshirt' || top === 'polo') gb.cyl(0, -0.07, 0, 0.05 * aw, 0.15, topC, 8, 0, 0, 0, 0.054 * aw);
      if (uni) camo(gb, u0, CAMO[top].map(G.col)); parts['upper' + side] = gb.build(true);
      gb = new GB(); const f0 = gb.vc; gb.cyl(0, -0.13, 0, 0.031 * aw, 0.26, foreC, 8, 0, 0, 0, 0.04 * aw); if (uni) camo(gb, f0, CAMO[top].map(G.col));
      if (top === 'suit') gb.cyl(0, -0.25, 0, 0.034, 0.03, G.col('#f4f4f4'), 8);
      gb.geo(GB.sphGeo(8), 0, -0.3, 0.005, top === 'rab' ? G.col('#0c0d0f') : skin, 0, 0, 0, 0.033, 0.05, 0.028); parts['fore' + side] = gb.build(true);
    }
    // ----- legs -----
    const shorts = a.bottom === 'shorts' && !uni && top !== 'police' && top !== 'navy', lw = 1 + fat * 0.3, bare = skirtLen > 0.6;
    for (const side of ['L', 'R']) {
      gb = new GB(); const l0 = gb.vc; gb.cyl(0, -0.215, 0, 0.064 * lw, 0.43, bare ? skin : botC, 8, 0, 0, 0, 0.088 * lw); if (uni) camo(gb, l0, CAMO[top].map(G.col)); parts['thigh' + side] = gb.build(true);
      gb = new GB(); const s0 = gb.vc; gb.cyl(0, -0.2, 0, 0.044 * lw, 0.4, shorts || bare ? skin : botC, 8, 0, 0, 0, 0.062 * lw); if (uni) camo(gb, s0, CAMO[top].map(G.col));
      if (uni) gb.cyl(0, -0.33, 0, 0.055, 0.18, G.col('#141414'), 8);
      gb.box(0, -0.445, 0.045, 0.092, 0.09, 0.2, shoeC); gb.geo(GB.sphGeo(8), 0, -0.45, 0.135, shoeC, 0, 0, 0, 0.046, 0.042, 0.06); gb.box(0, -0.485, 0.05, 0.096, 0.02, 0.25, mix(shoeC, [0, 0, 0], 0.55));
      parts['shin' + side] = gb.build(true);
    }
    return parts;
  }

  const JOINTS = ['sLx', 'sLy', 'eL', 'sRx', 'sRy', 'eR', 'hL', 'kL', 'hR', 'kR', 'sp', 'spY', 'hdX', 'hdY', 'by', 'rx', 'hz', 'gx', 'gy'];
  class Character {
    constructor(app) {
      this.app = Object.assign(C.defaultApp(), app || {}); this.ph = Math.random() * 6; this.time = Math.random() * 10; this.j = {}; for (const k of JOINTS) this.j[k] = 0;
      const mk = () => { const m = new THREE.Mesh(undefined, C.mat); m.castShadow = true; return m; };
      const g = () => new THREE.Group();
      const root = this.root = g(), tilt = this.tilt = g(), body = this.body = g(), spine = this.spine = g(), head = this.head = g(); root.add(tilt); tilt.add(body); body.add(spine); spine.position.y = 0.95; spine.add(head); head.position.y = 0.57;
      this.m = { torso: mk(), head: mk(), skirt: mk() }; spine.add(this.m.torso); head.add(this.m.head); body.add(this.m.skirt);
      this.sh = {}; this.el = {}; this.hip = {}; this.kn = {};
      for (const s of ['L', 'R']) { const sg = s === 'L' ? 1 : -1;
        const sh = this.sh[s] = g(); sh.rotation.order = 'YXZ'; spine.add(sh); const el = this.el[s] = g(); el.position.y = -0.28; sh.add(el); this.m['upper' + s] = mk(); sh.add(this.m['upper' + s]); this.m['fore' + s] = mk(); el.add(this.m['fore' + s]);
        const hp = this.hip[s] = g(); hp.position.set(sg * 0.095, 0.93, 0); body.add(hp); const kn = this.kn[s] = g(); kn.position.y = -0.43; hp.add(kn); this.m['thigh' + s] = mk(); hp.add(this.m['thigh' + s]); this.m['shin' + s] = mk(); kn.add(this.m['shin' + s]); }
      this.hand = g(); this.hand.position.set(0, -0.3, 0.02); this.hand.rotation.x = Math.PI / 2; this.el.R.add(this.hand);
      this.gunMount = g(); this.gunMount.rotation.order = 'YXZ'; spine.add(this.gunMount);
      this.rebuild();
    }
    rebuild() {
      const a = this.app, p = buildParts(a);
      for (const k in this.m) { const m = this.m[k]; if (m.geometry) m.geometry.dispose(); if (p[k]) { m.geometry = p[k]; m.visible = true; } else { m.geometry = undefined; m.visible = false; } }
      const shW = a.sex === 'f' ? 0.185 : 0.21, f = a.fat || 0; this.sh.L.position.set(shW + f * 0.04, 0.47, 0); this.sh.R.position.set(-shW - f * 0.04, 0.47, 0);
      const h = a.height || 1, w = (a.build || 1); this.root.scale.set(h * w, h, h * w); this.h = h;
    }
    setApp(a) { this.app = Object.assign(C.defaultApp(), a); this.rebuild(); }
    setGun(mesh, long) { for (const hld of [this.hand, this.gunMount]) while (hld.children.length) hld.remove(hld.children[0]); this.gun = mesh; this.gunLong = !!long; if (mesh) (long ? this.gunMount : this.hand).add(mesh); }
    dispose() { for (const k in this.m) if (this.m[k].geometry) this.m[k].geometry.dispose(); if (this.root.parent) this.root.parent.remove(this.root); }
    // st: {speed, run, air, aim, pitch, pose:'drive'|'bike'|'sit'|'dead'|'handsup'|'cower'|'phone'|'pedal', punch(0..1), steer, armed}
    update(dt, st) {
      this.time += dt; const sp = st.speed || 0, T = {}; for (const k of JOINTS) T[k] = 0;
      const t = this.time; let k = 14;
      T.sLx = Math.sin(t * 1.3) * 0.03; T.sRx = -T.sLx; T.eL = T.eR = 0.14; T.sp = Math.sin(t * 1.7) * 0.012; T.gx = 0.75; T.gy = 0.55;
      const pose = st.pose;
      if (pose === 'dead') { T.rx = -1.52; T.sLx = -0.4; T.sRx = -0.6; T.sLy = 0.8; T.sRy = -0.9; T.hL = 0.2; T.kL = 0.3; T.by = 0.02; k = 6; }
      else if (pose === 'drive' || pose === 'sit') { T.hL = T.hR = 1.38; T.kL = T.kR = 1.3; if (pose === 'drive') { const s = (st.steer || 0) * 0.35; T.sLx = 1.05 + s; T.sRx = 1.05 - s; T.sLy = -0.22; T.sRy = 0.22; T.eL = T.eR = 0.4; } else { T.sLx = T.sRx = 0.35; T.eL = T.eR = 0.9; } }
      else if (pose === 'helm') { const st2 = (st.steer || 0) * 0.3; T.sLx = 0.95 + st2; T.sRx = 0.95 - st2; T.sLy = -0.2; T.sRy = 0.2; T.eL = T.eR = 0.35; T.kL = T.kR = 0.08; }
      else if (pose === 'bike') { T.hL = T.hR = 1.05; T.kL = T.kR = 1.25; T.hz = 0.3; T.sLx = T.sRx = 1.15; T.sLy = -0.1; T.sRy = 0.1; T.eL = T.eR = 0.25; T.sp = 0.3; T.hdX = -0.25; }
      else if (pose === 'pedal') { this.ph += dt * (2 + sp * 1.4); const p = this.ph; T.hL = 1.0 + Math.sin(p) * 0.35; T.hR = 1.0 - Math.sin(p) * 0.35; T.kL = 1.2 + Math.cos(p) * 0.35; T.kR = 1.2 - Math.cos(p) * 0.35; T.hz = 0.2; T.sLx = T.sRx = 1.1; T.eL = T.eR = 0.3; T.sp = 0.3; T.hdX = -0.2; k = 30; }
      else if (pose === 'handsup') { T.sLx = T.sRx = 2.75; T.sLy = 0.3; T.sRy = -0.3; T.eL = T.eR = 0.5; }
      else if (pose === 'cower') { T.sp = 0.75; T.hL = T.hR = 1.2; T.kL = T.kR = 1.9; T.sLx = T.sRx = 2.3; T.eL = T.eR = 1.9; T.by = -0.42; T.hdX = 0.3; }
      else {
        if (st.air) { T.hL = 0.55; T.hR = -0.25; T.kL = 0.9; T.kR = 0.5; T.sLx = -0.5; T.sRx = 0.6; T.eL = T.eR = 0.7; }
        else if (sp > 0.15) { const run = st.run; this.ph += dt * sp * (run ? 2.75 : 4.1); const p = this.ph, A = run ? 0.95 : G.clamp(0.25 + sp * 0.22, 0.25, 0.6);
          T.hL = Math.sin(p) * A; T.hR = -T.hL; T.kL = Math.max(0, Math.cos(p)) * A * 1.5 + 0.06; T.kR = Math.max(0, -Math.cos(p)) * A * 1.5 + 0.06; T.sLx = -T.hL * 0.85; T.sRx = -T.hR * 0.85; T.eL = T.eR = run ? 1.25 : 0.3; T.sp = run ? 0.2 : 0.05; T.by = Math.abs(Math.sin(p)) * (run ? 0.05 : 0.022) - (run ? 0.03 : 0); T.spY = Math.sin(p) * (run ? 0.12 : 0.06); k = 26; }
        if (pose === 'phone') { T.sRx = 0.5; T.sRy = 0.3; T.eR = 2.3; T.hdY = -0.15; }
        if (pose === 'crouch') { T.hL += 0.9; T.hR += 0.9; T.kL += 1.6; T.kR += 1.6; T.by -= 0.3; T.sp += 0.3; }
        if (st.armed === 1) { if (st.aim) { const pr = Math.PI / 2 + (st.pitch || 0); T.sRx = pr; T.sRy = 0.14; T.eR = 0.04; T.sLx = pr - 0.04; T.sLy = -0.5; T.eL = 0.3; T.sp = -(st.pitch || 0) * 0.25; T.spY = 0; k = 24; } else { T.sRx = Math.max(T.sRx, 0.1) * 0.4 + 0.1; T.eR = 0.3; } }
        else if (st.armed === 2) { T.sRx = 0.5; T.sRy = 0.5; T.eR = 1.55; T.sLx = 1.0; T.sLy = -0.55; T.eL = 0.65; if (st.aim) { T.gx = -(st.pitch || 0); T.gy = 0; T.sLx = 1.2 + (st.pitch || 0) * 0.6; T.sRx = 0.6 + (st.pitch || 0) * 0.5; T.sp = -(st.pitch || 0) * 0.3 + 0.05; T.spY = 0; T.hdX = -(st.pitch || 0) * 0.4; k = 24; } }
        else if (st.aim && st.fists) { T.sLx = 1.2; T.sRx = 1.1; T.eL = T.eR = 1.9; T.sLy = -0.3; T.sRy = 0.3; }
        if (st.punch > 0) { const q = Math.sin(st.punch * Math.PI); T.sRx = 0.4 + q * 1.25; T.eR = 1.7 * (1 - q); T.sRy = 0.25; T.spY = -q * 0.45; k = 40; }
        if (st.lookY) T.hdY = G.clamp(st.lookY, -1, 1);
      }
      const f = 1 - Math.exp(-k * dt), j = this.j; for (const n of JOINTS) j[n] += (T[n] - j[n]) * f;
      this.sh.L.rotation.set(-j.sLx, j.sLy, 0.06); this.sh.R.rotation.set(-j.sRx, j.sRy, -0.06); this.el.L.rotation.x = -j.eL; this.el.R.rotation.x = -j.eR;
      this.hip.L.rotation.set(-j.hL, 0, j.hz); this.hip.R.rotation.set(-j.hR, 0, -j.hz); this.kn.L.rotation.x = j.kL; this.kn.R.rotation.x = j.kR;
      this.spine.rotation.set(j.sp, j.spY, 0); this.head.rotation.set(j.hdX, j.hdY, 0); this.body.position.y = j.by; this.tilt.rotation.x = j.rx; this.tilt.position.y = -j.rx * 0.09;
      if (this.gunLong) { this.gunMount.position.set(-0.19 + j.gy * 0.12, 0.43 - j.gx * 0.08, 0.42 - j.gy * 0.14); this.gunMount.rotation.set(j.gx, j.gy, 0); }
    }
  }
  C.Character = Character;

  // ---------- random NPC looks ----------
  const SHIRT = ['#f2f2f2', '#89a8c9', '#2c3e50', '#c0392b', '#27ae60', '#e8d5b0', '#7f8c8d', '#d35400', '#34495e', '#8e44ad', '#16a085', '#f1c40f', '#bdc3c7', '#1a1a1a'], PANT = ['#2c3e50', '#1a1a1a', '#6d4c41', '#34495e', '#7f8c8d', '#3b3b3b', '#56606a'], LUNGI = ['#2f5f8f', '#7a2f2f', '#2f6f4f', '#55446f', '#6b6b6b'], SARI = ['#c0392b', '#8e44ad', '#d35400', '#16a085', '#f1c40f', '#2980b9', '#e84393'];
  C.randomApp = function (kind, r) {
    r = r || Math.random; const pk = a => a[Math.floor(r() * a.length)];
    const a = C.defaultApp(); a.skin = 1 + Math.floor(r() * 5); a.hairCol = r() < 0.85 ? 0 : (r() < 0.5 ? 1 : 4); a.height = 0.93 + r() * 0.12; a.build = 0.94 + r() * 0.14; a.fat = r() < 0.2 ? r() * 0.5 : 0; a.hair = pk([1, 1, 2, 3, 7, 6, 0]); a.beard = pk([0, 0, 0, 1, 2, 3]);
    a.topCol = pk(SHIRT); a.botCol = pk(PANT); a.shoes = pk(['#1a1a1a', '#6d4c41', '#f2f2f2', '#3b3b3b']); a.glasses = r() < 0.12 ? 1 : r() < 0.05 ? 2 : 0;
    if (kind === 'soldier') { a.top = 'army'; a.hat = r() < 0.6 ? 'beret' : 'cap'; a.hatCol = '#3a4a26'; a.beard = 0; a.hair = 7; a.fat = 0; a.height = 1 + r() * 0.06; a.glasses = 0; }
    else if (kind === 'mp') { a.top = 'army'; a.hat = 'beret'; a.hatCol = '#8f1d1d'; a.beard = 0; a.hair = 7; a.fat = 0; a.height = 1.02; a.glasses = r() < 0.3 ? 2 : 0; }
    else if (kind === 'police') { a.top = 'police'; a.hat = 'peaked'; a.beard = pk([0, 3]); a.fat = r() < 0.3 ? 0.3 : 0; }
    else if (kind === 'sec') { a.top = 'rab'; a.hat = 'cap'; a.hatCol = '#101214'; a.glasses = r() < 0.7 ? 2 : 0; a.fat = 0; a.beard = pk([0, 0, 1]); a.hair = 7; a.height = 1.02 + r() * 0.05; a.build = 1.05; }
    else if (kind === 'rab') { a.top = 'rab'; a.hat = 'beanie'; a.hatCol = '#101214'; a.glasses = 2; a.fat = 0; a.beard = 0; }
    else if (kind === 'female' || (kind === 'civ' && r() < 0.3)) { a.sex = 'f'; a.beard = 0; a.fat = r() < 0.15 ? 0.25 : 0; a.height = 0.88 + r() * 0.08; a.hair = pk([4, 5, 4]); const t = r(); if (t < 0.45) { a.top = 'kameez'; a.topCol = pk(SARI); a.botCol = pk(['#f2f2f2', '#f1c40f', '#1a1a1a', '#e8d5b0']); if (r() < 0.4) { a.hat = 'hijab'; a.hatCol = pk(['#2c3e50', '#6d4c41', '#e8d5b0', '#8e44ad', '#1a1a1a']); } } else if (t < 0.7) { a.top = 'sari'; a.topCol = pk(SARI); a.botCol = pk(SARI); } else if (t < 0.88) { a.top = 'burqa'; } else { a.top = 'shirt'; a.hat = r() < 0.5 ? 'hijab' : 'none'; a.hatCol = pk(SHIRT); } }
    else if (kind === 'worker') { a.top = pk(['vest', 'tshirt', 'shirt']); a.bottom = 'lungi'; a.botCol = pk(LUNGI); a.topCol = pk(['#f2f2f2', '#bdc3c7', '#e8d5b0', '#7f8c8d']); a.shoes = '#6d4c41'; a.hat = r() < 0.2 ? 'tupi' : 'none'; a.fat = 0; a.build = 0.92; }
    else if (kind === 'thug') { a.top = pk(['jacket', 'hoodie', 'tshirt']); a.topCol = pk(['#1a1a1a', '#2c3e50', '#6d4c41']); a.glasses = r() < 0.5 ? 2 : 0; a.hat = pk(['none', 'cap', 'beanie']); a.hatCol = '#1a1a1a'; }
    else { const t = r(); if (t < 0.3) a.top = 'shirt'; else if (t < 0.55) a.top = 'tshirt'; else if (t < 0.68) a.top = 'polo'; else if (t < 0.84) { a.top = 'panjabi'; a.topCol = pk(['#f2f2f2', '#e8d5b0', '#89a8c9', '#bdc3c7', '#16a085']); a.botCol = '#f2f2f2'; a.hat = r() < 0.5 ? 'tupi' : 'none'; a.beard = pk([2, 2, 1]); } else if (t < 0.92) { a.top = 'shirt'; a.bottom = 'lungi'; a.botCol = pk(LUNGI); } else { a.top = 'suit'; a.topCol = pk(['#1a1a1a', '#2c3e50', '#34495e']); a.botCol = a.topCol; a.shoes = '#1a1a1a'; } if (r() < 0.08) { a.hat = 'cap'; a.hatCol = pk(SHIRT); } }
    return a;
  };
})();
