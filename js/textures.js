'use strict';
// Procedural textures: everything is drawn at load time, no image assets.
(function () {
  const G = window.G;
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return [c, c.getContext('2d')]; };
  G.cv = cv;
  function tex(c, o) {
    o = o || {}; const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    if (o.rep) t.repeat.set(o.rep[0], o.rep[1]);
    if (o.srgb !== false) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = G.maxAniso || 4; return t;
  }
  G.mkTex = tex;
  function speckle(x, w, h, n, cols, s0, s1, a, r) { for (let i = 0; i < n; i++) { x.globalAlpha = a * (0.4 + r() * 0.6); x.fillStyle = cols[(r() * cols.length) | 0]; const s = s0 + r() * (s1 - s0); x.fillRect(r() * w, r() * h, s, s); } x.globalAlpha = 1; }
  function blotch(x, w, h, n, col, r0, r1, a, r) { for (let i = 0; i < n; i++) { const cx = r() * w, cy = r() * h, rad = r0 + r() * (r1 - r0); const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = a * (0.4 + r() * 0.6); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); } x.globalAlpha = 1; }
  function normalMap(src, strength) {
    const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data; const [c, x] = cv(w, h); const o = x.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      const g = (px, py) => d[(((py + h) % h) * w + ((px + w) % w)) * 4];
      let nx = (g(xx - 1, y) - g(xx + 1, y)) / 255 * strength, ny = (g(xx, y - 1) - g(xx, y + 1)) / 255 * strength; const l = Math.hypot(nx, ny, 1); const i = (y * w + xx) * 4;
      o.data[i] = (nx / l * 0.5 + 0.5) * 255; o.data[i + 1] = (-ny / l * 0.5 + 0.5) * 255; o.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; o.data[i + 3] = 255;
    }
    x.putImageData(o, 0, 0); return c;
  }
  const BN = ['বিসমিল্লাহ স্টোর', 'মা ফার্মেসী', 'ঢাকা বিরিয়ানি', 'ভাই ভাই টেলিকম', 'নিউ ফ্যাশন', 'আল-আমিন হোটেল', 'জনতা টেইলার্স', 'মদিনা ইলেকট্রিক', 'রূপসী বাংলা', 'চা ও নাস্তা', 'কাচ্চি ঘর', 'স্টেশনারি', 'মোবাইল সার্ভিসিং', 'ক্যান্টনমেন্ট বেকারি', 'সোনালী জুয়েলার্স', 'হক হার্ডওয়্যার'];

  function facade(style) {
    const S = 512, B = 128; const [c, x] = cv(S, S), [e, ex] = cv(S, S); const r = G.rng(1000 + style * 77);
    ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
    const base = ['#ebe8e1', '#587a90', '#8d9698', '#f0e7d0', '#a8523a', '#8498a8', '#f5f3eb', '#383838', '#dbd6ca'][style];
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    if (style === 0 || style === 3 || style === 6 || style === 8) speckle(x, S, S, 5000, ['#ffffff', '#cfc9bd', '#bdb7ab'], 1, 3, 0.18, r);
    if (style === 4) { // brick field
      for (let y = 0; y < S; y += 8) for (let bx = -20; bx < S; bx += 20) { const o = (y / 8) % 2 ? 10 : 0; x.fillStyle = ['#a14e35', '#93452f', '#ab5a3e', '#8a3f2b', '#b0603f'][(r() * 5) | 0]; x.fillRect(bx + o + 1, y + 1, 18, 6); }
      x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#bcab98'; x.fillRect(0, 0, S, S); x.globalCompositeOperation = 'source-over';
    }
    if (style === 2 || style === 5) { // corrugated sheet
      const step = style === 2 ? 8 : 16;
      for (let px = 0; px < S; px += step) { const g = x.createLinearGradient(px, 0, px + step, 0); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.5, 'rgba(0,0,0,0.0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)'); x.fillStyle = g; x.fillRect(px, 0, step, S); }
      blotch(x, S, S, style === 2 ? 60 : 18, 'rgba(120,62,25,1)', 10, 46, 0.5, r);
      for (let y = 0; y < S; y += 128) { x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, y + 126, S, 2); }
    }
    for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) {
      const X = bx * B, Y = by * B, q = r(), q2 = r(), q3 = r();
      const lit = (px, py, w, h, cool) => { if (q2 < 0.34) { ex.globalAlpha = 0.55 + q3 * 0.45; ex.fillStyle = cool ? '#cfe2ff' : (q3 < 0.15 ? '#9fc4ff' : ['#ffd27a', '#ffc35c', '#ffe2a6', '#fff0cf'][(q3 * 4) | 0]); ex.fillRect(px, py, w, h); ex.globalAlpha = 1; } };
      if (style === 0 || style === 4) {
        x.fillStyle = style === 0 ? '#cdc8bc' : '#c9c2b4'; x.fillRect(X, Y + B - 7, B, 7);
        const balc = q < 0.3 && style === 0;
        const wx = X + (balc ? 26 : 30), wy = Y + (balc ? 22 : 34), ww = balc ? 76 : 68, wh = balc ? B - 30 : 58;
        x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(wx - 6, wy - 9, ww + 12, 6);
        x.fillStyle = style === 4 ? '#e8e2d2' : '#f7f6f1'; x.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
        const g = x.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#46586a'); g.addColorStop(1, '#1f2a33'); x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
        if (q3 > 0.4) { x.globalAlpha = 0.6; x.fillStyle = ['#c9b79c', '#8fa7b8', '#b98a8a', '#e6dfc8', '#7f9a7a'][(q3 * 5) | 0]; x.fillRect(wx, wy, ww * (0.35 + q2 * 0.3), wh); x.globalAlpha = 1; }
        x.strokeStyle = 'rgba(215,215,215,0.75)'; x.lineWidth = 1; x.beginPath(); for (let k = 1; k < 6; k++) { x.moveTo(wx + ww * k / 6, wy); x.lineTo(wx + ww * k / 6, wy + wh); } for (let k = 1; k < 5; k++) { x.moveTo(wx, wy + wh * k / 5); x.lineTo(wx + ww, wy + wh * k / 5); } x.stroke();
        x.fillStyle = '#f7f6f1'; x.fillRect(wx + ww / 2 - 1.5, wy, 3, wh);
        lit(wx, wy, ww, wh);
        if (balc) { x.fillStyle = 'rgba(40,40,40,0.9)'; x.fillRect(X + 12, Y + B - 54, 104, 4); for (let k = 0; k <= 13; k++) x.fillRect(X + 12 + k * 8, Y + B - 54, 2, 47); x.fillStyle = '#b9b4a8'; x.fillRect(X + 10, Y + B - 9, 108, 9);
          if (q2 > 0.4) for (let k = 0; k < 4; k++) { x.fillStyle = ['#c0392b', '#2e86c1', '#f1c40f', '#ecf0f1', '#27ae60', '#e67e22'][(r() * 6) | 0]; x.fillRect(X + 18 + k * 24, Y + B - 50, 16 + r() * 5, 22 + r() * 14); } }
        else if (q > 0.82) { x.fillStyle = '#d5d5d0'; x.fillRect(X + 6, Y + B - 34, 22, 18); x.strokeStyle = '#888'; x.beginPath(); x.arc(X + 17, Y + B - 25, 6, 0, 7); x.stroke(); }
      } else if (style === 1) {
        x.fillStyle = '#31475a'; x.fillRect(X, Y + B - 24, B, 24);
        for (let k = 0; k < 2; k++) { const px = X + k * 64; const g = x.createLinearGradient(0, Y, 0, Y + B - 24); const t = r() * 20 | 0; g.addColorStop(0, `rgb(${140 + t},${182 + t},${205 + t})`); g.addColorStop(1, `rgb(${52 + t},${86 + t},${110 + t})`); x.fillStyle = g; x.fillRect(px, Y, 64, B - 24);
          if (r() < 0.4) { ex.globalAlpha = 0.35 + r() * 0.5; ex.fillStyle = '#d6e6ff'; ex.fillRect(px + 2, Y + 2, 60, B - 28); ex.globalAlpha = 1; } }
        x.fillStyle = '#1c2932'; x.fillRect(X, Y, 3, B); x.fillRect(X + 63, Y, 2, B); x.fillRect(X, Y + B - 25, B, 2); x.fillRect(X, Y + B - 2, B, 2);
      } else if (style === 2) {
        if (q < 0.14) { x.fillStyle = '#2a2622'; x.fillRect(X + 40, Y + 36, 40, B - 36); } else if (q < 0.25) { x.fillStyle = 'rgba(30,90,170,0.8)'; x.fillRect(X + 10, Y + 20, 90, 50); }
      } else if (style === 3) {
        x.fillStyle = '#8f3d2b'; x.fillRect(X, Y + B - 9, B, 9); x.fillStyle = '#d9cfb4'; x.fillRect(X, Y + 22, B, 7); x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(X, Y + 29, B, 5);
        for (let k = 0; k < 2; k++) { const wx = X + 16 + k * 60, wy = Y + 38; x.fillStyle = '#5c3b22'; x.fillRect(wx - 3, wy - 3, 42, 62); const g = x.createLinearGradient(0, wy, 0, wy + 56); g.addColorStop(0, '#4a5f6e'); g.addColorStop(1, '#222d36'); x.fillStyle = g; x.fillRect(wx, wy, 36, 56); x.fillStyle = '#5c3b22'; x.fillRect(wx + 17, wy, 2, 56); x.fillRect(wx, wy + 20, 36, 2); if (k === 0 || q > 0.5) lit(wx, wy, 36, 56); }
      } else if (style === 5) {
        x.fillStyle = 'rgba(210,230,240,0.55)'; x.fillRect(X + 10, Y + 14, B - 20, 18); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(X, Y + B - 10, B, 10);
        if (q2 < 0.2) { ex.globalAlpha = 0.6; ex.fillStyle = '#e8f0ff'; ex.fillRect(X + 10, Y + 14, B - 20, 18); ex.globalAlpha = 1; }
      } else if (style === 6) {
        x.fillStyle = '#1d6b4f'; x.fillRect(X, Y + B - 8, B, 8); x.fillRect(X, Y, B, 5);
        const wx = X + 40, wy = Y + 30, ww = 48, wh = 74; const arch = (cx2, inset) => { cx2.beginPath(); cx2.moveTo(wx + inset, wy + wh - inset); cx2.lineTo(wx + inset, wy + 24); cx2.arc(wx + ww / 2, wy + 24, ww / 2 - inset, Math.PI, 0); cx2.lineTo(wx + ww - inset, wy + wh - inset); cx2.closePath(); };
        x.fillStyle = '#1d6b4f'; arch(x, -4); x.fill(); x.fillStyle = '#173c3a'; arch(x, 0); x.fill();
        x.strokeStyle = 'rgba(230,220,170,0.7)'; x.beginPath(); for (let k = 1; k < 4; k++) { x.moveTo(wx + ww * k / 4, wy + 6); x.lineTo(wx + ww * k / 4, wy + wh); } x.stroke();
        if (q2 < 0.6) { ex.globalAlpha = 0.8; ex.fillStyle = '#ffe1a0'; arch(ex, 0); ex.fill(); ex.globalAlpha = 1; }
      } else if (style === 7) {
        x.fillStyle = '#a3a39e'; x.fillRect(X, Y + B - 13, B, 13); x.fillStyle = '#93938e'; x.fillRect(X, Y, 13, B); x.fillRect(X + B - 3, Y, 3, B);
        if (q < 0.45) { for (let yy = Y + 40; yy < Y + B - 13; yy += 8) for (let xx = X + 13; xx < X + B - 3; xx += 20) { x.fillStyle = ['#a5553a', '#96492f'][(r() * 2) | 0]; x.fillRect(xx + ((yy / 8) % 2 ? 8 : 0), yy + 1, 18, 6); } }
        x.strokeStyle = '#b3893f'; x.lineWidth = 3; x.beginPath(); x.moveTo(X + 50 + q * 30, Y); x.lineTo(X + 50 + q * 30, Y + B); x.moveTo(X, Y + 60 + q2 * 20); x.lineTo(X + B, Y + 60 + q2 * 20); x.stroke();
        if (q3 < 0.25) { x.fillStyle = 'rgba(40,120,60,0.45)'; x.fillRect(X, Y, B, B); }
      } else if (style === 8) {
        const sc = ['#c0392b', '#1f5fa8', '#1e8449', '#d4a017', '#6c3483', '#117a65', '#ba4a00', '#283747'][(q * 8) | 0];
        x.fillStyle = sc; x.fillRect(X + 3, Y + 6, B - 6, 34); x.fillStyle = q2 > 0.5 ? '#ffffff' : '#ffe680'; x.font = 'bold 17px "Nirmala UI","Vrinda","Noto Sans Bengali",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(BN[(q3 * BN.length) | 0], X + B / 2, Y + 24, B - 12);
        ex.globalAlpha = 0.75; ex.drawImage(c, X + 3, Y + 6, B - 6, 34, X + 3, Y + 6, B - 6, 34); ex.globalAlpha = 1;
        const open = q2 < 0.62;
        if (!open) { x.fillStyle = ['#8e9aa3', '#5d7f9a', '#6c8f6f', '#9a9a9a'][(q3 * 4) | 0]; x.fillRect(X + 6, Y + 44, B - 12, B - 50); x.fillStyle = 'rgba(0,0,0,0.25)'; for (let yy = Y + 46; yy < Y + B - 6; yy += 6) x.fillRect(X + 6, yy, B - 12, 2); }
        else { x.fillStyle = '#1b1a18'; x.fillRect(X + 6, Y + 44, B - 12, B - 50); for (let s = 0; s < 3; s++) { x.fillStyle = '#6b5a45'; x.fillRect(X + 10, Y + 58 + s * 20, B - 50, 3); for (let k = 0; k < 9; k++) { x.fillStyle = `hsl(${(r() * 360) | 0},70%,${45 + r() * 25}%)`; x.fillRect(X + 11 + k * 8, Y + 47 + s * 20, 6, 11); } }
          x.fillStyle = 'rgba(160,200,220,0.35)'; x.fillRect(X + B - 38, Y + 46, 30, B - 54); ex.globalAlpha = 0.5; ex.fillStyle = '#ffe9b8'; ex.fillRect(X + 6, Y + 44, B - 12, B - 50); ex.globalAlpha = 1; }
        x.fillStyle = '#9b958a'; x.fillRect(X, Y + B - 6, B, 6);
      }
    }
    // rain streaks and grime
    if (style !== 1 && style !== 8) { for (let i = 0; i < 70; i++) { const sx = r() * S, sy = r() * S, l = 30 + r() * 120; const g = x.createLinearGradient(0, sy, 0, sy + l); g.addColorStop(0, 'rgba(40,36,28,0.16)'); g.addColorStop(1, 'rgba(40,36,28,0)'); x.fillStyle = g; x.fillRect(sx, sy, 2 + r() * 5, l); } }
    return { map: tex(c), em: tex(e) };
  }

  G.initTextures = function () {
    const T = G.T = {}; const r = G.rng(42);
    // asphalt
    const [ac, ax] = cv(512); ax.fillStyle = '#39393b'; ax.fillRect(0, 0, 512, 512);
    speckle(ax, 512, 512, 52000, ['#4c4c4e', '#2c2c2e', '#5a5a5c', '#333335', '#66665f'], 1, 2.4, 0.55, r);
    blotch(ax, 512, 512, 26, 'rgba(22,22,24,1)', 20, 80, 0.4, r); blotch(ax, 512, 512, 14, 'rgba(110,108,100,1)', 20, 70, 0.22, r);
    ax.strokeStyle = 'rgba(15,15,15,0.55)'; ax.lineWidth = 1.2; for (let i = 0; i < 9; i++) { let px = r() * 512, py = r() * 512; ax.beginPath(); ax.moveTo(px, py); for (let k = 0; k < 9; k++) { px += (r() - 0.5) * 60; py += (r() - 0.5) * 60; ax.lineTo(px, py); } ax.stroke(); }
    T.asphaltCanvas = ac;
    const [rc, rx] = cv(256); rx.fillStyle = '#dadada'; rx.fillRect(0, 0, 256, 256); speckle(rx, 256, 256, 9000, ['#ffffff', '#b8b8b8', '#cfcfcf'], 1, 3, 0.5, r); blotch(rx, 256, 256, 9, 'rgba(70,70,70,1)', 18, 52, 0.9, r);
    T.roadRough = tex(rc, { srgb: false, rep: [1, 1] });
    const [hc, hx] = cv(256); hx.fillStyle = '#808080'; hx.fillRect(0, 0, 256, 256); speckle(hx, 256, 256, 26000, ['#a0a0a0', '#606060', '#c0c0c0', '#404040'], 1, 2.5, 0.6, r);
    T.roadNormal = tex(normalMap(hc, 1.6), { srgb: false });
    function road(kind) {
      const [c, x] = cv(256, 512); x.drawImage(ac, 0, 0, 256, 512);
      const line = (u, w, dash, col) => { x.fillStyle = col || '#e9e7df'; x.globalAlpha = 0.86; if (!dash) x.fillRect(u * 256 - w / 2, 0, w, 512); else { x.fillRect(u * 256 - w / 2, 20, w, 100); x.fillRect(u * 256 - w / 2, 276, w, 100); } x.globalAlpha = 1; };
      const curb = () => { for (let y = 0; y < 512; y += 64) { x.fillStyle = (y / 64) % 2 ? '#e8e8e2' : '#1c1c1c'; x.fillRect(0, y, 7, 64); x.fillRect(249, y, 7, 64); } };
      if (kind === 'two') { line(0.5, 6, true); line(0.075, 5); line(0.925, 5); curb(); }
      if (kind === 'one') { line(0.36, 5, true); line(0.64, 5, true); line(0.075, 5); line(0.925, 5, false, '#e5c33a'); curb(); }
      if (kind === 'moto') { line(0.5, 5, true); line(0.06, 6); line(0.94, 6, false, '#e5c33a'); }
      if (kind === 'minor') { x.fillStyle = 'rgba(120,112,98,0.28)'; x.fillRect(0, 0, 256, 512); blotch(x, 256, 512, 16, 'rgba(25,25,25,1)', 14, 50, 0.5, r); x.fillStyle = 'rgba(150,140,120,0.5)'; x.fillRect(0, 0, 9, 512); x.fillRect(247, 0, 9, 512); }
      if (kind === 'lane') { x.fillStyle = '#9d9a92'; x.fillRect(0, 0, 256, 512); speckle(x, 256, 512, 12000, ['#b3b0a8', '#87847c', '#a6a39b', '#77746c'], 1, 3, 0.5, r); x.fillStyle = 'rgba(40,40,40,0.5)'; for (let y = 0; y < 512; y += 128) x.fillRect(0, y, 256, 2); x.fillRect(127, 0, 2, 512); blotch(x, 256, 512, 12, 'rgba(60,50,40,1)', 14, 50, 0.3, r); }
      if (kind === 'foot') { for (let y = 0; y < 512; y += 32) for (let px = 0; px < 256; px += 32) { x.fillStyle = ((px + y) / 32) % 2 ? '#b0624f' : '#c9c1ae'; x.fillRect(px, y, 32, 32); x.strokeStyle = 'rgba(0,0,0,0.25)'; x.strokeRect(px + 0.5, y + 0.5, 31, 31); } speckle(x, 256, 512, 5000, ['#000', '#fff'], 1, 3, 0.08, r); }
      if (kind === 'steps') { for (let y = 0; y < 512; y += 16) { x.fillStyle = (y / 16) % 2 ? '#a9a59c' : '#6e6b64'; x.fillRect(0, y, 256, 16); } }
      if (kind === 'runway') { x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, 256, 512); x.fillStyle = '#e9e7df'; x.fillRect(126, 40, 4, 200); x.fillRect(8, 0, 3, 512); x.fillRect(245, 0, 3, 512); }
      if (kind === 'plain') { /* junction filler */ }
      return tex(c);
    }
    T.road = {}; for (const k of ['two', 'one', 'moto', 'minor', 'lane', 'foot', 'steps', 'runway', 'plain']) T.road[k] = road(k);
    // sidewalk
    { const [c, x] = cv(256); x.fillStyle = '#a9a59b'; x.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let px = 0; px < 256; px += 32) { x.fillStyle = ['#aaa69c', '#b3aea3', '#9e9a90', '#b98f80'][(r() * 4) | 0]; x.fillRect(px + 1, y + 1, 30, 30); } speckle(x, 256, 256, 6000, ['#000', '#fff', '#6b5f4a'], 1, 3, 0.1, r); T.sidewalk = tex(c); }
    // ground
    { const [c, x] = cv(512); x.fillStyle = '#7d7562'; x.fillRect(0, 0, 512, 512); speckle(x, 512, 512, 60000, ['#6d6654', '#8f876f', '#847c67', '#625c4c', '#99907a'], 1, 3, 0.5, r); blotch(x, 512, 512, 40, 'rgba(70,92,48,1)', 16, 60, 0.35, r); blotch(x, 512, 512, 20, 'rgba(60,52,40,1)', 20, 70, 0.3, r); speckle(x, 512, 512, 900, ['#5d5a52', '#c2bba6'], 2, 5, 0.6, r); T.ground = tex(c); }
    { const [c, x] = cv(256); x.fillStyle = '#4d7436'; x.fillRect(0, 0, 256, 256); speckle(x, 256, 256, 30000, ['#5f8c40', '#3e642b', '#6d9a49', '#456f30', '#7a8f45'], 1, 3, 0.55, r); blotch(x, 256, 256, 14, 'rgba(120,110,60,1)', 10, 40, 0.25, r); T.grass = tex(c); }
    { const [c, x] = cv(256); x.fillStyle = '#4f7d38'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; x.fillRect(i * 32, 0, 32, 256); } speckle(x, 256, 256, 16000, ['#5f8c40', '#3e642b', '#6d9a49'], 1, 2, 0.4, r); T.pitch = tex(c); }
    { const [c, x] = cv(256); x.fillStyle = '#c9b88c'; x.fillRect(0, 0, 256, 256); speckle(x, 256, 256, 26000, ['#d8c9a0', '#b5a377', '#c0ae82', '#a3916a'], 1, 2, 0.5, r); T.sand = tex(c); }
    { const [c, x] = cv(256); x.fillStyle = '#8b8a86'; x.fillRect(0, 0, 256, 256); speckle(x, 256, 256, 20000, ['#9c9b97', '#74736f', '#a8a7a2', '#666560'], 1, 3, 0.5, r); blotch(x, 256, 256, 16, 'rgba(40,40,36,1)', 14, 50, 0.3, r); x.strokeStyle = 'rgba(30,30,30,0.4)'; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(r() * 256, r() * 256); x.lineTo(r() * 256, r() * 256); x.stroke(); } T.roof = tex(c); T.concrete = T.roof; }
    // facades
    T.facade = []; for (let s = 0; s < 9; s++) T.facade.push(facade(s));
    // water normal
    { const [c, x] = cv(256); const im = x.createImageData(256, 256); const W = []; for (let i = 0; i < 14; i++) W.push([(1 + (r() * 6 | 0)) * (r() < 0.5 ? -1 : 1), (1 + (r() * 6 | 0)) * (r() < 0.5 ? -1 : 1), r() * 6.28, 0.4 + r() * 0.6]);
      for (let y = 0; y < 256; y++) for (let px = 0; px < 256; px++) { let h = 0; for (const w of W) h += Math.sin((px * w[0] + y * w[1]) / 256 * 6.2832 + w[2]) * w[3]; const v = 128 + h * 14; const i = (y * 256 + px) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      x.putImageData(im, 0, 0); T.waterNormal = tex(normalMap(c, 3.2), { srgb: false }); }
    // foliage detail
    { const [c, x] = cv(128); x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, 128, 128); speckle(x, 128, 128, 2600, ['#ffffff', '#8a8a8a', '#5c5c5c', '#b5b5b5', '#3e3e3e'], 2, 6, 0.6, r); T.leaf = tex(c); }
    // rail track
    { const [c, x] = cv(128); x.fillStyle = '#6d675d'; x.fillRect(0, 0, 128, 128); speckle(x, 128, 128, 5000, ['#857e72', '#57524a', '#948d80', '#4a453e'], 2, 4, 0.7, r); x.fillStyle = '#5a4634'; for (let y = 6; y < 128; y += 32) x.fillRect(14, y, 100, 12); x.fillStyle = '#b9b9b9'; x.fillRect(30, 0, 5, 128); x.fillRect(93, 0, 5, 128); x.fillStyle = '#7a4a2a'; x.fillRect(29, 0, 1, 128); x.fillRect(98, 0, 1, 128); T.track = tex(c); }
    // soft sprites
    { const [c, x] = cv(64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); T.soft = tex(c, { clamp: true }); }
    { const [c, x] = cv(64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,240,200,0.9)'); g.addColorStop(0.5, 'rgba(255,225,160,0.28)'); g.addColorStop(1, 'rgba(255,220,150,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); T.pool = tex(c, { clamp: true }); }
    // lungi / sari cloth check
    { const [c, x] = cv(64); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 5, 64); x.fillRect(0, i, 64, 5); } T.check = tex(c); }
    // licence plates
    T.plates = []; const dig = '০১২৩৪৫৬৭৮৯';
    for (let i = 0; i < 6; i++) { const [c, x] = cv(256, 128); const green = i >= 4; x.fillStyle = green ? '#1d7a3a' : '#f4f4f0'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#111'; x.lineWidth = 6; x.strokeRect(4, 4, 248, 120); x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 44px "Nirmala UI","Vrinda",sans-serif'; x.fillText('ঢাকা মেট্রো-' + 'গখঘচথ'[i % 5], 128, 38, 230); let num = ''; for (let k = 0; k < 6; k++) { num += dig[(r() * 10) | 0]; if (k === 1) num += '-'; } x.font = 'bold 58px "Nirmala UI","Vrinda",sans-serif'; x.fillText(num, 128, 92, 230); T.plates.push(tex(c, { clamp: true })); }
  };
})();
