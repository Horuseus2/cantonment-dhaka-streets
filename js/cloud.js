'use strict';
// Firebase Realtime Database connection, plus Boys Club accounts (password + security question) and cloud saves.
// Everything here falls back to this device's local storage when the database cannot be reached.
(function () {
  const G = window.G;
  // Web config of the Firebase project. These values are public identifiers, not secrets.
  G.FB = {
    apiKey: 'AIzaSyC4m7-FMxY6TH4pXRVQ0EBaGSp91yChY2U',
    projectId: 'gaming-boys-futsal',
    appId: '1:938178160228:web:ff4f8823d421c752922171',
    databaseURL: 'https://gaming-boys-futsal-default-rtdb.asia-southeast1.firebasedatabase.app'
  };
  // The database may have been created in another region; these are checked in order.
  const DB_URLS = [G.FB.databaseURL, 'https://gaming-boys-futsal-default-rtdb.firebaseio.com', 'https://gaming-boys-futsal-default-rtdb.europe-west1.firebasedatabase.app'];
  const probe = url => fetch(url + '/rooms/probe/m.json?shallow=true', { cache: 'no-store' }).then(r => r.ok ? url : Promise.reject(new Error('no'))).catch(() => Promise.reject(new Error('no')));
  const firstOk = ps => new Promise(res => { let left = ps.length; ps.forEach(p => p.then(res, () => { if (--left === 0) res(null); })); });
  const C = G.cloud = { db: null, online: false, offset: 0, state: 'idle' };
  const q = new URLSearchParams(location.search);

  // ---------- SHA-256 (synchronous, so it also works from file://) ----------
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  C.sha = function (str) {
    const s = unescape(encodeURIComponent(str)), l = s.length, w = new Uint32Array(64), n = ((l + 8) >> 6) + 1, m = new Uint32Array(n * 16);
    for (let i = 0; i < l; i++) m[i >> 2] |= s.charCodeAt(i) << (24 - (i % 4) * 8); m[l >> 2] |= 0x80 << (24 - (l % 4) * 8); m[n * 16 - 1] = l * 8;
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19; const r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let b = 0; b < n; b++) { for (let i = 0; i < 16; i++) w[i] = m[b * 16 + i]; for (let i = 16; i < 64; i++) { const a = w[i - 15], c = w[i - 2]; w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + w[i - 7] + (r(c, 17) ^ r(c, 19) ^ (c >>> 10))) | 0; }
      let a = h0, bb = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0; }
      h0 = (h0 + a) | 0; h1 = (h1 + bb) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0; }
    return [h0, h1, h2, h3, h4, h5, h6, h7].map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  };
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  C.uid = (() => { let u = store.get('ds_uid'); if (!u || q.get('uid')) { u = q.get('uid') || 'u' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set('ds_uid', u); } return u; })();
  C.now = () => Date.now() + C.offset;

  // ---------- connection ----------
  let readyP = null;
  C.connect = function () { // resolves true when the database answers, false when it cannot be reached
    if (readyP) return readyP;
    readyP = new Promise(async res => {
      if (typeof firebase === 'undefined' || q.get('offline')) { C.state = 'unavailable'; return res(false); }
      try {
        const emu = q.get('fbemu'), cfg = Object.assign({}, G.FB); if (emu) cfg.databaseURL = 'http://' + emu + '/?ns=' + (q.get('fbns') || 'bta-test');
        else { C.state = 'connecting'; const url = await Promise.race([firstOk(DB_URLS.map(probe)), new Promise(r => setTimeout(() => r(null), 7000))]); if (!url) { C.state = 'unreachable'; return res(false); } cfg.databaseURL = url; }
        firebase.initializeApp(cfg); C.db = firebase.database(); C.TS = firebase.database.ServerValue.TIMESTAMP; C.state = 'connecting';
        let done = false; const t = setTimeout(() => { if (!done) { done = true; C.state = 'unreachable'; res(false); } }, 8000);
        C.db.ref('.info/serverTimeOffset').on('value', s => { C.offset = s.val() || 0; });
        C.db.ref('.info/connected').on('value', s => { C.online = !!s.val(); if (C.online && !done) { done = true; clearTimeout(t); C.state = 'online'; res(true); } if (C.onStatus) C.onStatus(C.online); });
      } catch (e) { console.warn('cloud init failed', e); C.state = 'unavailable'; res(false); }
    });
    return readyP;
  };
  const tmo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms || 8000))]);

  // ---------- Boys Club accounts ----------
  // Each member sets a personal password the first time, with a security question for recovery.
  // The database never hands out the hashes: its rules compare what the client sends against what is stored.
  const ph = (i, pw) => C.sha('bta|pw|' + i + '|' + pw), ah = (i, a) => C.sha('bta|ans|' + i + '|' + a.trim().toLowerCase().replace(/\s+/g, ' '));
  const B = G.boyAuth = { session: store.get('ds_boysess') || {} };
  const keep = (i, h) => { B.session[i] = h; store.set('ds_boysess', B.session); };
  B.status = async function (i) { // {claimed, q, cloud}
    if (await C.connect()) { try { const s = await tmo(C.db.ref('boysAuth/' + i + '/q').once('value')); return { claimed: s.exists(), q: s.val(), cloud: true }; } catch (e) { } }
    const l = store.get('ds_boyauth_' + i); return { claimed: !!l, q: l && l.q, cloud: false };
  };
  B.create = async function (i, pw, question, answer) {
    const rec = { ph: ph(i, pw), ah: ah(i, answer), q: question.slice(0, 120) };
    if (await C.connect()) { try { await tmo(C.db.ref('boysAuth/' + i).set(Object.assign({ t: C.TS }, rec))); keep(i, rec.ph); return { ok: true }; } catch (e) { return { ok: false, why: /denied/i.test(e.message || e.code || '') ? 'This character already has a password.' : 'Could not reach the server. Try again.' }; } }
    if (store.get('ds_boyauth_' + i)) return { ok: false, why: 'This character already has a password on this device.' }; store.set('ds_boyauth_' + i, rec); keep(i, rec.ph); return { ok: true, local: true };
  };
  B.login = async function (i, pw, hash) {
    const h = hash || ph(i, pw);
    if (await C.connect()) { try { await tmo(C.db.ref('boysLogin/' + i + '/last').set({ ph: h, t: C.TS })); keep(i, h); return { ok: true }; } catch (e) { if (/denied/i.test(e.message || e.code || '')) { if (hash) { delete B.session[i]; store.set('ds_boysess', B.session); } return { ok: false, why: 'Wrong password.' }; } return { ok: false, why: 'Could not reach the server. Try again.' }; } }
    const l = store.get('ds_boyauth_' + i); if (l && l.ph === h) { keep(i, h); return { ok: true, local: true }; } return { ok: false, why: 'Wrong password.' };
  };
  B.reset = async function (i, answer, newPw) {
    const a = ah(i, answer), h = ph(i, newPw);
    if (await C.connect()) { try { const qs = await tmo(C.db.ref('boysAuth/' + i + '/q').once('value')); await tmo(C.db.ref('boysAuth/' + i).set({ ph: h, ah: a, q: qs.val() || '', t: C.TS })); keep(i, h); return { ok: true }; } catch (e) { return { ok: false, why: /denied/i.test(e.message || e.code || '') ? 'That answer is not right.' : 'Could not reach the server. Try again.' }; } }
    const l = store.get('ds_boyauth_' + i); if (l && l.ah === a) { l.ph = h; store.set('ds_boyauth_' + i, l); keep(i, h); return { ok: true, local: true }; } return { ok: false, why: 'That answer is not right.' };
  };
  B.logout = function (i) { delete B.session[i]; store.set('ds_boysess', B.session); };
  // ---------- saves: local copy always, cloud copy when signed in ----------
  B.loadSave = async function (i) {
    const local = store.get('ds_boysave_' + i); let cloud = null;
    if (C.online) { try { const s = await tmo(C.db.ref('boysSave/' + i).once('value'), 6000); if (s.exists()) cloud = { t: s.val().t || 0, d: JSON.parse(s.val().d) }; } catch (e) { } }
    if (cloud && (!local || cloud.t >= (local.t || 0))) return cloud.d; return local ? local.d : null;
  };
  // every member's latest save, for the analytics page (saves are readable by anyone with the game)
  B.allSaves = async function () {
    const n = G.BOYS.length, saves = []; for (let i = 0; i < n; i++) saves.push(store.get('ds_boysave_' + i));
    if (!(await C.connect())) return { cloud: false, saves };
    const got = await Promise.all(saves.map((_, i) => tmo(C.db.ref('boysSave/' + i).once('value'), 7000).then(s => s.exists() ? { t: s.val().t || 0, d: JSON.parse(s.val().d) } : null).catch(() => undefined)));
    let ok = false; got.forEach((c, i) => { if (c !== undefined) ok = true; if (c && (!saves[i] || c.t >= (saves[i].t || 0))) saves[i] = c; });
    return { cloud: ok, saves };
  };
  let saveT = 0;
  B.putSave = function (i, data, force) {
    const t = Date.now(); store.set('ds_boysave_' + i, { t, d: data });
    if (!C.online || !B.session[i]) return; if (!force && t - saveT < 15000) return; saveT = t;
    const up = {}; up['boysLogin/' + i + '/last'] = { ph: B.session[i], t: C.TS }; up['boysSave/' + i] = { t: C.TS, d: JSON.stringify(data) };
    C.db.ref().update(up).catch(e => console.warn('cloud save failed', e.code || e.message));
  };
})();
