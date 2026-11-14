'use strict';
// All sound is synthesised with WebAudio: engines, guns, horns, rain, thunder, sirens, footsteps, UI.
(function () {
  const G = window.G;
  const A = G.audio = { vol: 0.8, ready: false };
  let ctx, master, nbuf;
  const noop = () => { };
  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = A.vol; const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; master.connect(comp); comp.connect(ctx.destination);
    nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const loopNoise = (type, f, q) => { const s = ctx.createBufferSource(); s.buffer = nbuf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(master); s.start(); return { g, fl }; };
    A.nRain = loopNoise('highpass', 1400); A.nRain2 = loopNoise('lowpass', 420); A.nSkid = loopNoise('bandpass', 1100, 3); A.nCity = loopNoise('lowpass', 170); A.nWind = loopNoise('bandpass', 380, 0.6);
    // engine: two oscillators through a lowpass
    const eg = A.eng = { g: ctx.createGain(), f: ctx.createBiquadFilter(), o1: ctx.createOscillator(), o2: ctx.createOscillator(), g2: ctx.createGain() }; eg.o1.type = 'sawtooth'; eg.o2.type = 'square'; eg.f.type = 'lowpass'; eg.f.frequency.value = 400; eg.g.gain.value = 0; eg.g2.gain.value = 0.5; eg.o1.connect(eg.f); eg.o2.connect(eg.g2); eg.g2.connect(eg.f); eg.f.connect(eg.g); eg.g.connect(master); eg.o1.start(); eg.o2.start();
    const sg = A.sir = { g: ctx.createGain(), o: ctx.createOscillator() }; sg.o.type = 'triangle'; sg.g.gain.value = 0; sg.o.connect(sg.g); sg.g.connect(master); sg.o.start();
    A.ready = true;
  };
  const T = () => ctx.currentTime;
  function tone(f, dur, type, gain, when, slide, dest) { if (!A.ready) return; const t = T() + (when || 0), o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05); }
  function noise(dur, type, f, gain, when, q, slide) { if (!A.ready) return; const t = T() + (when || 0), s = ctx.createBufferSource(); s.buffer = nbuf; s.playbackRate.value = 0.8 + Math.random() * 0.4; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (slide) fl.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur); fl.Q.value = q || 0.8; const g = ctx.createGain(); g.gain.setValueAtTime(Math.max(0.0002, gain), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); }
  const att = d => 1 / (1 + (d || 0) * 0.07);
  const SHOT = [[0.16, 1900, 0.5, 150], [0.24, 1300, 0.6, 110], [0.11, 2300, 0.42, 190], [0.2, 1500, 0.6, 120], [0.34, 900, 0.75, 80], [0.5, 1100, 0.8, 70], [0.6, 500, 0.7, 60], [0.12, 700, 0.15, 200]];
  A.shot = function (i, dist) { const s = SHOT[i] || SHOT[0], a = att(dist); if (a < 0.03) return; noise(s[0], 'lowpass', s[1] * (dist > 30 ? 0.5 : 1) * 3, s[2] * a, 0, 0.7, s[1] * 0.25); tone(s[3], s[0] * 0.8, 'triangle', s[2] * a * 0.9, 0, s[3] * 0.4); if (dist < 25) noise(s[0] * 2.5, 'bandpass', 700, s[2] * 0.12, 0.03, 0.5); };
  A.explosion = function (dist) { const a = att(dist * 0.5); noise(1.6, 'lowpass', 2400, 1.1 * a, 0, 0.6, 90); tone(70, 1.3, 'sine', 1.0 * a, 0, 28); noise(2.6, 'lowpass', 300, 0.5 * a, 0.1, 0.5, 60); };
  A.thunder = function (delay) { const d = delay || 0; noise(0.25, 'highpass', 1800, 0.25, d, 0.7); noise(3.6 + Math.random() * 2, 'lowpass', 260, 0.9, d + 0.05, 0.5, 50); tone(48, 2.6, 'sine', 0.5, d + 0.1, 30); };
  A.crash = function (i, dist) { const a = att(dist) * (0.3 + i * 0.7); noise(0.3, 'lowpass', 2600, 0.7 * a, 0, 0.8, 300); noise(0.22, 'bandpass', 2900, 0.3 * a, 0, 4); tone(95, 0.2, 'triangle', 0.5 * a, 0, 50); };
  A.horn = function (dist, kind) { const a = att(dist) * 0.34; if (a < 0.01) return; if (kind === 'rickshaw') { tone(2100, 0.18, 'sine', a, 0); tone(2100, 0.25, 'sine', a, 0.2); return; } const base = kind === 'bus' || kind === 'truck' ? 300 : kind === 'cng' || kind === 'bike' ? 620 : 430, dur = kind === 'stuck' ? 2.6 : kind === 'player' ? 0.5 : 0.18 + Math.random() * 0.5; tone(base, dur, 'square', a * 0.5, 0); tone(base * 1.26, dur, 'square', a * 0.4, 0); if (Math.random() < 0.4 && kind !== 'stuck' && kind !== 'player') { tone(base, 0.2, 'square', a * 0.5, dur + 0.1); tone(base * 1.26, 0.2, 'square', a * 0.4, dur + 0.1); } };
  A.ping = d => { tone(2600 + Math.random() * 1400, 0.09, 'sine', 0.12 * att(d), 0, 1200); noise(0.05, 'bandpass', 4000, 0.1 * att(d), 0, 3); };
  A.reload = () => { noise(0.05, 'bandpass', 2400, 0.25, 0, 3); noise(0.06, 'bandpass', 1500, 0.3, 0.32, 3); tone(900, 0.04, 'square', 0.08, 0.6); noise(0.05, 'bandpass', 3000, 0.25, 0.62, 3); };
  A.click = () => noise(0.03, 'bandpass', 3200, 0.2, 0, 4);
  A.whoosh = () => noise(0.22, 'bandpass', 500, 0.2, 0, 1.5, 1600);
  A.thud = () => { tone(110, 0.14, 'sine', 0.5, 0, 55); noise(0.08, 'lowpass', 700, 0.3); };
  A.pickup = () => { tone(880, 0.09, 'sine', 0.2); tone(1320, 0.14, 'sine', 0.2, 0.08); };
  A.buy = () => { tone(1250, 0.08, 'square', 0.1); tone(1880, 0.3, 'sine', 0.18, 0.07); noise(0.1, 'highpass', 5000, 0.08, 0.07); };
  A.blip = n => { const f = [660, 880, 440, 220, 1040][n || 0]; tone(f, 0.1, n === 3 ? 'square' : 'sine', 0.14); if (n === 2) { tone(f * 1.5, 0.12, 'sine', 0.14, 0.1); tone(f * 2, 0.2, 'sine', 0.14, 0.2); } };
  A.step = (wet, run) => { noise(0.06, 'lowpass', wet ? 1800 : 600 + Math.random() * 300, run ? 0.11 : 0.06, 0, 0.8); if (wet) noise(0.09, 'highpass', 3000, 0.03, 0.01); };
  A.door = () => { noise(0.12, 'lowpass', 500, 0.3); tone(140, 0.12, 'sine', 0.25, 0.02, 70); };
  A.cardoor = () => { noise(0.07, 'lowpass', 900, 0.35); tone(90, 0.1, 'sine', 0.3, 0, 50); };
  A.splash = () => noise(0.5, 'bandpass', 1400, 0.3, 0, 0.6, 500);
  A.mission = ok => { if (ok) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, i * 0.12)); else [392, 330, 262].forEach((f, i) => tone(f, 0.4, 'triangle', 0.16, i * 0.18)); };
  A.wasted = () => { tone(196, 1.6, 'sawtooth', 0.14, 0, 70); tone(147, 1.8, 'sine', 0.2, 0.1, 55); };
  let birdT = 3, hornT = 6;
  // continuous layers; called every frame
  A.update = function (dt, s) {
    if (!A.ready) return; const t = T(), set = (p, v, k) => p.setTargetAtTime(v, t, k || 0.08);
    master.gain.value = A.vol * (s.paused ? 0.25 : 1);
    // engine
    const e = A.eng; if (s.engine) { const r = s.rpm, kind = s.kind, base = kind === 'bike' ? 62 : kind === 'bus' || kind === 'truck' ? 30 : kind === 'cng' ? 70 : 42; set(e.o1.frequency, base + r * (kind === 'bike' ? 170 : 115), 0.05); set(e.o2.frequency, (base + r * (kind === 'bike' ? 170 : 115)) * 0.5, 0.05); set(e.f.frequency, 240 + r * 1500 + s.load * 500, 0.06); set(e.g.gain, kind === 'rickshaw' ? 0 : 0.085 + s.load * 0.06 + r * 0.03, 0.06); } else set(e.g.gain, 0, 0.1);
    set(A.nSkid.g.gain, G.clamp(s.skid || 0, 0, 1) * 0.22, 0.05);
    const rain = s.rain || 0, ind = s.indoors; set(A.nRain.g.gain, rain * (ind ? 0.02 : 0.2)); set(A.nRain2.g.gain, rain * (ind ? 0.2 : 0.14)); set(A.nWind.g.gain, ind ? 0 : Math.min(0.12, (s.wind || 0) * 0.025 + (s.speed || 0) * 0.0022));
    set(A.nCity.g.gain, ind ? 0.03 : 0.07 + (1 - s.night) * 0.05, 0.5);
    const sv = s.siren || 0; set(A.sir.g.gain, sv * 0.1, 0.1); if (sv > 0) A.sir.o.frequency.value = 760 + Math.sin(t * 5.5) * 260;
    if (!ind && !s.paused) {
      birdT -= dt; if (birdT <= 0) { if (s.night > 0.6) { birdT = 0.5 + Math.random() * 0.4; if (!rain) for (let i = 0; i < 3; i++) tone(4300 + Math.random() * 200, 0.04, 'sine', 0.012, i * 0.07); } else { birdT = 1.5 + Math.random() * 6; if (rain < 0.3) { const f = 2200 + Math.random() * 1800, n = 2 + (Math.random() * 4 | 0); if (Math.random() < 0.35) { for (let i = 0; i < 3; i++) tone(700 + Math.random() * 80, 0.16, 'sawtooth', 0.02, i * 0.28, 560); } else for (let i = 0; i < n; i++) tone(f, 0.07, 'sine', 0.025, i * 0.11, f * (1.2 + Math.random() * 0.4)); } } }
      hornT -= dt; if (hornT <= 0) { hornT = 2.5 + Math.random() * (s.night > 0.6 ? 14 : 6); A.horn(40 + Math.random() * 90, G.pick(['car', 'bus', 'cng', 'car', 'rickshaw', 'bike'])); }
    }
  };
  A.setVol = v => { A.vol = v; };
})();
