'use strict';
// Vehicles: procedural detailed models (cars, SUV, bus, truck, CNG, rickshaw, bike, specials) + arcade physics.
(function () {
  const G = window.G, GB = G.GB, W = G.world;
  const V = G.Veh = { list: [], geos: {} };
  const WHITE = [1, 1, 1], col = G.col;
  // id: [name, kind, params...]
  const car = (o) => Object.assign({ kind: 'car', L: 4.5, W: 1.76, H: 1.45, gc: 0.2, belt: 0.92, hood: 0.82, deck: 0.9, wsB: 0.75, wsT: 0.2, rwT: -0.75, rwB: -1.45, wr: 0.32, wb: 2.65, ww: 0.22, max: 42, acc: 6.5, brake: 14, grip: 1.05, hp: 1000, mass: 1300, seats: 4, price: 900000, colors: ['#e8e8e8', '#1b1b1d', '#8a8f94', '#6e1f1f', '#1f3a5f', '#d8d2c0', '#3b4a3a', '#b9bcc0'] }, o);
  V.DEFS = {
    sedan: car({ name: 'Allure Sedan' }),
    taxi: car({ name: 'City Taxi', colors: ['#e8b619'], taxi: 1, price: 700000 }),
    hatch: car({ name: 'Vista Hatchback', L: 3.9, W: 1.68, H: 1.5, deck: 0.96, wsB: 0.6, wsT: 0.1, rwT: -1.25, rwB: -1.78, wb: 2.45, max: 38, acc: 6, mass: 1050, price: 650000, colors: ['#c0392b', '#e8e8e8', '#2980b9', '#f1c40f', '#8a8f94', '#1b1b1d'] }),
    suv: car({ name: 'Monarch SUV', L: 4.8, W: 1.92, H: 1.85, gc: 0.3, belt: 1.1, hood: 1.02, deck: 1.1, wsB: 0.8, wsT: 0.35, rwT: -1.95, rwB: -2.22, wr: 0.39, wb: 2.8, ww: 0.27, max: 44, acc: 6.2, mass: 2100, hp: 1300, price: 4500000, x: { rack: 1 }, colors: ['#e8e8e8', '#1b1b1d', '#5c5f63', '#2c3e50'] }),
    sports: car({ name: 'Falcon GT', L: 4.4, W: 1.9, H: 1.2, gc: 0.14, belt: 0.78, hood: 0.66, deck: 0.82, wsB: 0.55, wsT: -0.15, rwT: -0.8, rwB: -1.6, wr: 0.34, wb: 2.6, ww: 0.28, max: 68, acc: 11, grip: 1.3, seats: 2, price: 9500000, x: { spoiler: 1 }, colors: ['#c0392b', '#f39c12', '#2980b9', '#1b1b1d', '#27ae60'] }),
    pickup: car({ name: 'Tufan Pickup', L: 5.1, W: 1.86, H: 1.75, gc: 0.3, belt: 1.05, hood: 0.98, deck: 0.74, wsB: 0.95, wsT: 0.5, rwT: -0.3, rwB: -0.36, wr: 0.38, wb: 3.1, ww: 0.26, max: 40, acc: 5.8, mass: 1900, hp: 1200, price: 3200000, x: { bed: 1 }, colors: ['#e8e8e8', '#8a8f94', '#1f3a5f', '#6e1f1f'] }),
    van: car({ name: 'Noor Microbus', L: 4.7, W: 1.72, H: 1.95, gc: 0.22, belt: 1.05, hood: 1.0, deck: 1.05, wsB: 2.02, wsT: 1.6, rwT: -2.18, rwB: -2.28, wr: 0.33, wb: 2.6, max: 36, acc: 5, mass: 1700, seats: 8, price: 2800000, x: { vanNose: 1 }, colors: ['#e8e8e8', '#b9bcc0', '#d8d2c0'] }),
    ambulance: car({ name: 'Ambulance', L: 4.9, W: 1.8, H: 2.05, gc: 0.22, belt: 1.05, hood: 1.0, deck: 1.05, wsB: 2.12, wsT: 1.7, rwT: -2.28, rwB: -2.38, wr: 0.34, wb: 2.75, max: 40, acc: 5.5, mass: 1900, price: 3000000, x: { vanNose: 1, amb: 1, bar: 1 }, colors: ['#f4f4f4'] }),
    police: car({ name: 'Police Patrol', L: 5.1, W: 1.86, H: 1.75, gc: 0.3, belt: 1.05, hood: 0.98, deck: 0.74, wsB: 0.95, wsT: 0.5, rwT: -0.3, rwB: -0.36, wr: 0.38, wb: 3.1, ww: 0.26, max: 50, acc: 8, mass: 1900, hp: 1500, price: 0, x: { bed: 1, bar: 1, police: 1 }, colors: ['#1f2f5c'] }),
    mpjeep: { kind: 'jeep', name: 'Army Jeep', L: 3.9, W: 1.7, H: 1.85, wr: 0.38, wb: 2.4, ww: 0.25, max: 40, acc: 7, brake: 13, grip: 1.0, hp: 1500, mass: 1500, seats: 4, price: 0, colors: ['#4b5a32'] },
    bus: { kind: 'bus', name: 'City Bus', L: 10.4, W: 2.5, H: 3.15, wr: 0.5, wb: 5.6, ww: 0.3, max: 26, acc: 2.6, brake: 9, grip: 0.8, hp: 3000, mass: 9000, seats: 40, price: 6000000, colors: ['#b8322a', '#1f6f4a', '#1f4f8f', '#d8c23a', '#e8e8e8'] },
    truck: { kind: 'truck', name: 'Cargo Truck', L: 7.2, W: 2.4, H: 3.0, wr: 0.5, wb: 4.2, ww: 0.3, max: 24, acc: 2.4, brake: 9, grip: 0.8, hp: 2800, mass: 8000, seats: 2, price: 4000000, colors: ['#d8a219', '#1f6fb8', '#2e8b57', '#c0392b'] },
    cng: { kind: 'cng', name: 'CNG Auto-rickshaw', L: 2.7, W: 1.32, H: 1.75, wr: 0.2, wb: 1.9, ww: 0.12, max: 17, acc: 3.6, brake: 9, grip: 0.9, hp: 500, mass: 400, seats: 3, price: 350000, colors: ['#1e7a3c'] },
    rickshaw: { kind: 'rickshaw', name: 'Rickshaw', L: 2.3, W: 1.1, H: 1.6, wr: 0.34, wb: 1.5, ww: 0.04, max: 5.5, acc: 1.6, brake: 6, grip: 0.9, hp: 250, mass: 120, seats: 3, price: 40000, colors: ['#c0392b', '#1f6fb8', '#d8a219', '#27ae60'] },
    bike: { kind: 'bike', name: 'Bajra 150', L: 2.0, W: 0.72, H: 1.1, wr: 0.3, wb: 1.35, ww: 0.1, max: 40, acc: 8.5, brake: 12, grip: 1.1, hp: 400, mass: 150, seats: 2, price: 180000, colors: ['#1b1b1d', '#c0392b', '#1f3a5f', '#e8e8e8'] },
    sportbike: { kind: 'bike', name: 'Yamraj R15', L: 2.05, W: 0.72, H: 1.12, wr: 0.3, wb: 1.38, ww: 0.13, max: 58, acc: 12, brake: 14, grip: 1.2, hp: 400, mass: 160, seats: 2, price: 550000, colors: ['#1f4fd8', '#c0392b', '#1b1b1d'], fairing: 1 },
    // ----- Boys Club specials -----
    boyswhip: car({ name: 'Boys Whip', L: 5.55, W: 2.0, H: 1.48, gc: 0.17, belt: 0.98, hood: 0.92, deck: 0.92, wsB: 1.0, wsT: 0.38, rwT: -1.0, rwB: -1.8, wr: 0.39, wb: 3.3, ww: 0.29, max: 78, acc: 12.5, grip: 1.35, hp: 4000, mass: 2400, price: 0, special: 1, x: { whip: 1, grille: 'big' }, colors: ['#0b0b0d'] }),
    pajero: car({ name: 'Military Pajero', L: 4.9, W: 1.95, H: 1.9, gc: 0.32, belt: 1.12, hood: 1.04, deck: 1.12, wsB: 0.82, wsT: 0.38, rwT: -2.0, rwB: -2.26, wr: 0.41, wb: 2.8, ww: 0.29, max: 52, acc: 8, mass: 2300, hp: 2600, price: 0, special: 1, x: { rack: 1, bull: 1, spare: 1, army: 1 }, colors: ['#3f4a2b'] }),
    lambo: car({ name: 'Lamborghini', L: 4.65, W: 2.03, H: 1.13, gc: 0.12, belt: 0.72, hood: 0.56, deck: 0.86, wsB: 1.02, wsT: 0.15, rwT: -0.5, rwB: -1.55, wr: 0.35, wb: 2.7, ww: 0.32, max: 88, acc: 15, grip: 1.45, seats: 2, hp: 1200, price: 0, special: 1, x: { wedge: 1, spoiler: 1 }, colors: ['#f2c200'] }),
    bmw: car({ name: 'BMW M Sport', L: 4.75, W: 1.86, H: 1.42, gc: 0.16, belt: 0.92, hood: 0.84, deck: 0.92, wsB: 0.7, wsT: 0.12, rwT: -0.85, rwB: -1.6, wr: 0.35, wb: 2.85, ww: 0.27, max: 70, acc: 11.5, grip: 1.32, hp: 1300, price: 0, special: 1, x: { grille: 'kidney' }, colors: ['#1f4f9f'] }),
    mustang: car({ name: 'Mustang GT', L: 4.8, W: 1.92, H: 1.36, gc: 0.15, belt: 0.88, hood: 0.84, deck: 0.88, wsB: 0.3, wsT: -0.32, rwT: -1.0, rwB: -1.95, wr: 0.36, wb: 2.75, ww: 0.29, max: 72, acc: 12, grip: 1.25, hp: 1300, price: 0, special: 1, x: { stripes: 1, scoop: 1 }, colors: ['#b3201a'] }),
    hyper: car({ name: 'Abid Hyper RS', L: 4.6, W: 2.05, H: 1.1, gc: 0.11, belt: 0.7, hood: 0.54, deck: 0.84, wsB: 1.0, wsT: 0.12, rwT: -0.55, rwB: -1.6, wr: 0.36, wb: 2.72, ww: 0.33, max: 96, acc: 17, grip: 1.5, seats: 2, hp: 1200, price: 0, special: 1, x: { wedge: 1, spoiler: 1, stripes: 1 }, colors: ['#e8e8e8'] }),
    gtcoupe: car({ name: 'Abid GT Coupe', L: 4.7, W: 1.95, H: 1.28, gc: 0.14, belt: 0.84, hood: 0.74, deck: 0.86, wsB: 0.45, wsT: -0.2, rwT: -0.95, rwB: -1.8, wr: 0.36, wb: 2.75, ww: 0.3, max: 80, acc: 13.5, grip: 1.4, hp: 1300, price: 0, special: 1, x: { spoiler: 1 }, colors: ['#7a1420'] }),
    limo: car({ name: 'Abid Royale', L: 5.4, W: 1.98, H: 1.5, gc: 0.18, belt: 0.98, hood: 0.92, deck: 0.94, wsB: 0.95, wsT: 0.35, rwT: -1.0, rwB: -1.75, wr: 0.38, wb: 3.2, ww: 0.28, max: 66, acc: 9.5, grip: 1.2, hp: 1800, mass: 2300, price: 0, special: 1, x: { grille: 'big' }, colors: ['#d9d9d6'] }),
    luxsuv: car({ name: 'Abid Baron SUV', L: 5.0, W: 2.0, H: 1.85, gc: 0.28, belt: 1.12, hood: 1.04, deck: 1.12, wsB: 0.85, wsT: 0.38, rwT: -2.0, rwB: -2.3, wr: 0.42, wb: 2.95, ww: 0.3, max: 66, acc: 10, grip: 1.2, hp: 2000, mass: 2500, price: 0, special: 1, x: { rack: 1, grille: 'big' }, colors: ['#101820'] })
    ,i8: car({ name: 'BMW i8', L: 4.7, W: 1.95, H: 1.29, gc: 0.12, belt: 0.78, hood: 0.62, deck: 0.84, wsB: 0.85, wsT: 0.0, rwT: -0.75, rwB: -1.7, wr: 0.37, wb: 2.8, ww: 0.27, max: 80, acc: 14.5, grip: 1.44, seats: 2, hp: 1300, price: 0, special: 1, x: { wedge: 1, i8: 1 }, colors: ['#e9edf0'] }),
    rangerover: car({ name: 'Range Rover', L: 5.0, W: 2.0, H: 1.87, gc: 0.28, belt: 1.14, hood: 1.06, deck: 1.14, wsB: 0.9, wsT: 0.45, rwT: -2.0, rwB: -2.32, wr: 0.43, wb: 2.95, ww: 0.3, max: 68, acc: 10.5, grip: 1.22, hp: 2400, mass: 2500, price: 0, special: 1, x: { rover: 1 }, colors: ['#0d0f12'] }),
    boat: { kind: 'boat', name: 'Navy Patrol Boat', L: 8.4, W: 2.9, H: 2.7, wr: 0.3, wb: 4, ww: 0.2, max: 19, acc: 5.2, brake: 5, grip: 1, hp: 3000, mass: 4000, seats: 4, price: 0, special: 1, colors: ['#8a949b'] }
  };
  for (const id in V.DEFS) V.DEFS[id].id = id;

  // ---------- shared materials ----------
  V.initMats = function () {
    const T = G.T; V.paints = {};
    V.glass = new THREE.MeshPhysicalMaterial({ color: 0x0a1116, roughness: 0.03, metalness: 0.6, transparent: true, opacity: 0.74, envMapIntensity: 1.7 });
    V.trim = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.3 });
    V.wheelMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.25 });
    V.headOn = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1cf, emissiveIntensity: 6 }); V.headOff = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.1, metalness: 0.7 });
    V.tailOff = new THREE.MeshStandardMaterial({ color: 0x7a0c0c, roughness: 0.25 }); V.tailOn = new THREE.MeshStandardMaterial({ color: 0x7a0c0c, emissive: 0xff1a0a, emissiveIntensity: 1.6 }); V.tailBrake = new THREE.MeshStandardMaterial({ color: 0x7a0c0c, emissive: 0xff1a0a, emissiveIntensity: 7 });
    V.barA = new THREE.MeshStandardMaterial({ color: 0x551111, emissive: 0xff1010, emissiveIntensity: 0 }); V.barB = new THREE.MeshStandardMaterial({ color: 0x111155, emissive: 0x1040ff, emissiveIntensity: 0 });
    V.wreck = new THREE.MeshStandardMaterial({ color: 0x141312, roughness: 0.95 });
    V.plates = T.plates.map(t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
    V.beam = new THREE.MeshBasicMaterial({ map: T.pool, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, color: 0xfff0d0, fog: false });
    const [c, x] = G.cv(256, 64); x.fillStyle = '#f4f1e4'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#b3201a'; x.font = 'bold 34px "Nirmala UI","Vrinda",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ক্যান্টনমেন্ট ⇄ বনানী', 128, 34, 240); V.busBoard = new THREE.MeshStandardMaterial({ map: G.mkTex(c, { clamp: true }), emissive: 0xffffff, emissiveMap: G.mkTex(c, { clamp: true }), emissiveIntensity: 0.25 });
    const [c2, x2] = G.cv(256, 128); x2.fillStyle = '#0b0b0d'; x2.fillRect(0, 0, 256, 128); x2.strokeStyle = '#c9a227'; x2.lineWidth = 8; x2.strokeRect(6, 6, 244, 116); x2.fillStyle = '#c9a227'; x2.font = 'bold 70px Georgia,serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText('BOYS 69', 128, 68, 230); V.whipPlate = new THREE.MeshStandardMaterial({ map: G.mkTex(c2, { clamp: true }), roughness: 0.4 });
  };
  V.paint = function (hex, special) { const k = hex + (special ? 's' : ''); return V.paints[k] || (V.paints[k] = new THREE.MeshPhysicalMaterial({ color: hex, roughness: special ? 0.2 : 0.34, metalness: special ? 0.5 : 0.42, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: special ? 1.5 : 1.15 })); };

  // ---------- geometry ----------
  function wheelGeo(r, w, gold) {
    const gb = new GB(), TIRE = col('#121212'), RIM = col(gold ? '#c9a227' : '#b8bcc0'), DK = col('#2a2c2e');
    gb.cyl(0, 0, 0, r, w, TIRE, 18, 0, 0, Math.PI / 2); gb.cyl(0, 0, 0, r * 0.985, w * 0.6, col('#1c1c1c'), 18, 0, 0, Math.PI / 2);
    if (w > 0.06) { gb.cyl(0, 0, 0, r * 0.64, w + 0.012, DK, 14, 0, 0, Math.PI / 2); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; for (const s of [-1, 1]) gb.box(s * (w / 2 + 0.008), Math.cos(a) * r * 0.33, Math.sin(a) * r * 0.33, 0.012, r * 0.6, r * 0.13, RIM, 0, a, 0); } for (const s of [-1, 1]) { gb.cyl(s * (w / 2 + 0.01), 0, 0, r * 0.16, 0.014, RIM, 10, 0, 0, Math.PI / 2); gb.cyl(s * (w / 2 + 0.004), 0, 0, r * 0.66, 0.006, RIM, 16, 0, 0, Math.PI / 2, r * 0.6); } }
    else { for (let i = 0; i < 8; i++) { const a = i / 8 * 3.1416; gb.box(0, 0, 0, 0.012, r * 1.9, 0.012, RIM, 0, a, 0); } gb.cyl(0, 0, 0, 0.04, w + 0.05, RIM, 8, 0, 0, Math.PI / 2); }
    return gb.build(true);
  }
  function plateQuad(gb, x, y, z, back, w, h) { const i = gb.vc, s = back ? -1 : 1; w = w || 0.5; h = h || 0.25; gb.v(x - s * w / 2, y - h / 2, z, 0, 0, s, 0, 0, WHITE); gb.v(x + s * w / 2, y - h / 2, z, 0, 0, s, 1, 0, WHITE); gb.v(x + s * w / 2, y + h / 2, z, 0, 0, s, 1, 1, WHITE); gb.v(x - s * w / 2, y + h / 2, z, 0, 0, s, 0, 1, WHITE); gb.i.push(i, i + 1, i + 2, i, i + 2, i + 3); }
  function extrude(shape, width, bevel) { const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 2, curveSegments: 7 }); g.translate(0, 0, -(width - bevel * 2) / 2); g.rotateY(-Math.PI / 2); return g; }

  function buildCar(d) {
    const h = d.L / 2, Wd = d.W, x = d.x || {}, paint = new GB(), glass = new GB(), trim = new GB(), head = new GB(), tail = new GB(), plate = new GB(), bar = [new GB(), new GB()];
    const BLK = col('#101112'), DG = col('#26282b'), CH = col('#c9ced2'), GOLD = col('#c9a227');
    const ra = d.wr + 0.07, zf = d.wb / 2, zr = -d.wb / 2, wy = d.wr, gc = d.gc;
    const hs = h - 0.066;
    const s = new THREE.Shape();
    s.moveTo(-hs + 0.05, gc + 0.05); s.lineTo(-hs, gc + 0.28); s.lineTo(-hs + 0.03, d.deck - 0.08); s.quadraticCurveTo(-hs + 0.04, d.deck, -hs + 0.22, d.deck);
    if (x.bed) { s.lineTo(d.rwB - 0.12, d.deck); s.lineTo(d.rwB - 0.1, d.belt); } else s.lineTo(d.rwB, d.belt);
    s.lineTo(d.wsB, d.belt);
    if (x.vanNose) { s.lineTo(hs - 0.1, d.hood - 0.1); s.quadraticCurveTo(hs, d.hood - 0.2, hs, d.hood - 0.45); }
    else if (x.wedge) { s.lineTo(hs - 0.45, d.hood); s.quadraticCurveTo(hs - 0.05, d.hood - 0.06, hs, d.hood - 0.2); }
    else { s.lineTo(hs - 0.3, d.hood); s.quadraticCurveTo(hs - 0.02, d.hood - 0.02, hs, d.hood - 0.26); }
    s.lineTo(hs - 0.02, gc + 0.2); s.lineTo(hs - 0.1, gc);
    s.lineTo(zf + ra, gc); s.lineTo(zf + ra, wy); s.absarc(zf, wy, ra, 0, Math.PI, false); s.lineTo(zf - ra, gc); s.lineTo(zr + ra, gc); s.lineTo(zr + ra, wy); s.absarc(zr, wy, ra, 0, Math.PI, false); s.lineTo(zr - ra, gc); s.lineTo(-hs + 0.05, gc + 0.05);
    paint.add(extrude(s, Wd, 0.08), null, WHITE);
    // cabin glass
    const cs = new THREE.Shape(); cs.moveTo(d.rwB, d.belt - 0.03); cs.lineTo(d.rwT, d.H); cs.lineTo(d.wsT, d.H); cs.lineTo(d.wsB, d.belt - 0.03); cs.lineTo(d.rwB, d.belt - 0.03);
    const cw = Wd - 0.2; glass.add(extrude(cs, cw, 0.05), null, WHITE);
    // roof + pillars
    paint.box(0, d.H + 0.012, (d.rwT + d.wsT) / 2, cw - 0.04, 0.04, d.wsT - d.rwT + 0.1, WHITE);
    const pil = (z0, y0, z1, y1, th) => { const dz = z1 - z0, dy = y1 - y0, l = Math.hypot(dz, dy), a = Math.atan2(-dy, dz); for (const sx of [-1, 1]) paint.box(sx * (cw / 2 - 0.02), (y0 + y1) / 2, (z0 + z1) / 2, 0.065, th || 0.07, l + 0.04, WHITE, 0, a); };
    pil(d.wsB, d.belt, d.wsT, d.H); pil(d.rwB, d.belt, d.rwT, d.H, 0.09);
    const cabLen = d.wsT - d.rwT; const nB = cabLen > 2.2 ? 2 : 1; for (let i = 1; i <= nB; i++) { const z = d.wsT - cabLen * i / (nB + 1) - 0.05; for (const sx of [-1, 1]) paint.box(sx * (cw / 2 - 0.015), (d.belt + d.H) / 2, z, 0.06, d.H - d.belt, 0.1, WHITE); }
    // trim
    trim.box(0, gc + 0.14, h - 0.02, Wd - 0.12, 0.2, 0.16, DG); trim.box(0, gc + 0.14, -h + 0.03, Wd - 0.12, 0.2, 0.14, DG);
    for (const sx of [-1, 1]) { trim.box(sx * (Wd / 2 - 0.02), gc + 0.06, 0, 0.06, 0.1, d.wb - ra * 2, DG); trim.box(0, wy + 0.05, sx > 0 ? zf : zr, Wd - 0.52, ra * 1.5, ra * 2, BLK);
      trim.box(sx * (Wd / 2 + 0.08), d.belt + 0.06, d.wsB - 0.12, 0.16, 0.1, 0.08, DG); trim.box(sx * (Wd / 2 + 0.03), d.belt + 0.02, d.wsB - 0.12, 0.08, 0.03, 0.04, DG);
      const doorF = Math.min(d.wsB - 0.05, zf - ra - 0.02), doorR = d.rwB + (x.bed ? 0.05 : 0.5), mid = (doorF + doorR) / 2; for (const z of (d.seats > 2 && !x.bed ? [doorF, mid, doorR] : [doorF, doorR])) trim.box(sx * (Wd / 2 + 0.003), (gc + d.belt) / 2 + 0.08, z, 0.008, d.belt - gc - 0.22, 0.014, BLK);
      trim.box(sx * (Wd / 2 + 0.012), d.belt - 0.12, doorF - 0.75, 0.02, 0.025, 0.13, x.whip ? GOLD : CH); if (d.seats > 2 && !x.bed) trim.box(sx * (Wd / 2 + 0.012), d.belt - 0.12, mid - 0.25, 0.02, 0.025, 0.13, x.whip ? GOLD : CH);
      if (x.whip) { trim.box(sx * (Wd / 2 + 0.006), d.belt - 0.03, 0.1, 0.012, 0.025, d.L - 0.9, GOLD); trim.box(sx * (Wd / 2 + 0.006), gc + 0.2, 0, 0.012, 0.04, d.wb - ra * 2, GOLD); }
      if (x.army) trim.box(sx * (Wd / 2 + 0.006), d.belt - 0.3, 0.2, 0.012, 0.28, 0.28, col('#e8e8e8'));
      if (x.police) trim.box(sx * (Wd / 2 + 0.006), d.belt - 0.25, 0.6, 0.012, 0.14, 1.3, col('#f4f4f4'));
      if (x.amb) trim.box(sx * (Wd / 2 + 0.006), d.belt - 0.15, -0.3, 0.012, 0.16, 3.4, col('#c0392b'));
    }
    const gy = (d.hood + gc) / 2 + 0.06;
    if (x.grille === 'big') { trim.box(0, gy + 0.04, h + 0.01, Wd * 0.42, 0.42, 0.06, x.whip ? GOLD : CH); for (let i = 0; i < 9; i++) trim.box(-Wd * 0.18 + i * Wd * 0.045, gy + 0.04, h + 0.045, 0.02, 0.36, 0.02, BLK); if (x.whip) { trim.cyl(0, d.hood + 0.07, h - 0.35, 0.02, 0.14, GOLD, 6); trim.sph(0, d.hood + 0.16, h - 0.35, 0.045, 0.045, 0.045, GOLD, 1); } }
    else if (x.grille === 'kidney') { for (const sx of [-1, 1]) { trim.box(sx * 0.2, gy + 0.08, h + 0.012, 0.34, 0.22, 0.05, CH); trim.box(sx * 0.2, gy + 0.08, h + 0.04, 0.28, 0.16, 0.02, BLK); } }
    else if (x.rover) { }
    else if (!x.wedge) { trim.box(0, gy + 0.05, h + 0.005, Wd * 0.5, 0.16, 0.05, BLK); trim.box(0, gy + 0.14, h + 0.02, Wd * 0.52, 0.02, 0.03, CH); }
    else { for (const sx of [-1, 1]) trim.box(sx * Wd * 0.3, gc + 0.2, h + 0.01, Wd * 0.26, 0.16, 0.05, BLK); }
    trim.box(0, gc + 0.3, h + 0.035, 0.56, 0.3, 0.02, BLK); trim.box(0, gc + 0.34, -h - 0.012, 0.56, 0.3, 0.02, BLK);
    trim.cyl(Wd * 0.28, gc + 0.07, -h + 0.02, 0.04, 0.22, CH, 8, Math.PI / 2); if (d.max > 60) trim.cyl(-Wd * 0.28, gc + 0.07, -h + 0.02, 0.04, 0.22, CH, 8, Math.PI / 2);
    if (x.spoiler) { for (const sx of [-1, 1]) trim.box(sx * Wd * 0.34, d.deck + 0.12, -h + 0.22, 0.04, 0.22, 0.16, BLK); paint.box(0, d.deck + 0.24, -h + 0.2, Wd - 0.1, 0.035, 0.3, WHITE, 0, -0.12); }
    if (x.stripes) for (const sx of [-1, 1]) { trim.box(sx * 0.14, d.hood + 0.008, (h - 0.3 + d.wsB) / 2 + 0.05, 0.16, 0.012, h - 0.3 - d.wsB - 0.1, col('#f4f4f4'), 0, Math.atan2(d.belt - d.hood, h - 0.3 - d.wsB)); trim.box(sx * 0.14, d.H + 0.036, (d.rwT + d.wsT) / 2, 0.16, 0.01, d.wsT - d.rwT, col('#f4f4f4')); }
    if (x.scoop) trim.box(0, d.hood + 0.05, d.wsB + 0.6, 0.5, 0.07, 0.6, BLK);
    if (x.i8) { const BL = col('#1f7ae0'); for (const sx of [-1, 1]) { trim.box(sx * (Wd / 2 + 0.006), gc + 0.16, 0, 0.012, 0.05, d.wb - ra * 2 + 0.3, BL); trim.box(sx * (Wd / 2 + 0.004), d.belt - 0.06, -0.35, 0.012, 0.16, 2.3, BLK); trim.box(sx * 0.22, gc + 0.34, h + 0.012, 0.3, 0.07, 0.03, BL); trim.box(sx * (Wd / 2 - 0.2), d.deck + 0.03, -h + 0.5, 0.12, 0.05, 0.9, BLK, 0, 0, 0); } trim.box(0, d.hood + 0.012, d.wsB + 0.55, 0.7, 0.012, 0.9, BLK, 0, Math.atan2(d.belt - d.hood, h - 0.45 - d.wsB)); trim.box(0, d.H + 0.037, (d.rwT + d.wsT) / 2, cw - 0.16, 0.012, d.wsT - d.rwT, BLK); trim.box(0, gc + 0.12, -h - 0.01, Wd - 0.5, 0.05, 0.03, BL); }
    if (x.rover) { trim.box(0, d.H + 0.038, (d.rwT + d.wsT) / 2, cw - 0.02, 0.014, d.wsT - d.rwT + 0.12, BLK); for (const sx of [-1, 1]) { trim.box(sx * (cw / 2 - 0.005), (d.belt + d.H) / 2 + 0.02, (d.rwT + d.wsT) / 2, 0.02, d.H - d.belt - 0.06, d.wsT - d.rwT + 0.5, BLK); trim.box(sx * (Wd / 2 + 0.006), d.belt - 0.4, d.wsB + 0.25, 0.012, 0.3, 0.07, CH); } trim.box(0, gy + 0.1, h + 0.012, Wd * 0.56, 0.3, 0.05, BLK); for (let i = 0; i < 3; i++) trim.box(0, gy + 0.0 + i * 0.1, h + 0.04, Wd * 0.52, 0.03, 0.02, CH); trim.box(0, d.hood + 0.004, h - 0.42, 0.9, 0.012, 0.09, CH); trim.box(0, d.deck - 0.02, -h - 0.01, 0.9, 0.05, 0.03, CH); }
    if (x.rack) for (const sx of [-1, 1]) { trim.box(sx * (cw / 2 - 0.12), d.H + 0.08, (d.rwT + d.wsT) / 2, 0.035, 0.035, d.wsT - d.rwT - 0.2, x.whip ? GOLD : CH); for (const z of [d.wsT - 0.3, d.rwT + 0.3]) trim.box(sx * (cw / 2 - 0.12), d.H + 0.05, z, 0.035, 0.07, 0.035, BLK); }
    if (x.bull) { for (const sx of [-1, 1]) trim.cyl(sx * 0.42, gc + 0.4, h + 0.12, 0.035, 0.75, BLK, 8); trim.cyl(0, gc + 0.72, h + 0.12, 0.035, 1.0, BLK, 8, 0, 0, Math.PI / 2); trim.cyl(0, gc + 0.38, h + 0.12, 0.035, 1.0, BLK, 8, 0, 0, Math.PI / 2); trim.cyl(Wd / 2 - 0.2, d.hood + 0.5, d.wsB + 0.1, 0.012, 1.3, BLK, 5); }
    if (x.spare) { trim.cyl(0, d.belt - 0.12, -h - 0.1, 0.4, 0.22, col('#3f4a2b'), 16, Math.PI / 2); trim.cyl(0, d.belt - 0.12, -h - 0.22, 0.2, 0.02, CH, 12, Math.PI / 2); }
    if (x.bed) { for (const sx of [-1, 1]) paint.box(sx * (Wd / 2 - 0.05), d.deck + 0.18, (d.rwB - h) / 2 + 0.02, 0.07, 0.4, d.rwB + h - 0.25, WHITE); paint.box(0, d.deck + 0.18, -h + 0.06, Wd - 0.1, 0.4, 0.07, WHITE); trim.box(0, d.deck + 0.02, (d.rwB - h) / 2, Wd - 0.2, 0.04, d.rwB + h - 0.3, DG); if (x.police) { for (const sx of [-1, 1]) trim.box(sx * (Wd / 2 - 0.3), d.deck + 0.3, (d.rwB - h) / 2, 0.35, 0.08, d.rwB + h - 0.5, col('#3a3a3a')); trim.box(0, d.H - 0.25, d.rwB - 0.25, Wd - 0.3, 0.05, 0.05, BLK); } }
    if (x.bar) { trim.box(0, d.H + 0.07, d.wsT - 0.35, 1.0, 0.05, 0.3, BLK); bar[0].box(-0.28, d.H + 0.14, d.wsT - 0.35, 0.4, 0.1, 0.24, WHITE); bar[1].box(0.28, d.H + 0.14, d.wsT - 0.35, 0.4, 0.1, 0.24, WHITE); }
    if (d.taxi) { trim.box(0, d.H + 0.1, 0, 0.5, 0.14, 0.2, col('#f4f4f4')); }
    // lights
    const lw = x.wedge ? 0.42 : 0.36;
    for (const sx of [-1, 1]) { head.box(sx * (Wd / 2 - 0.32), d.hood - (x.wedge ? 0.08 : 0.15), h - (x.wedge ? 0.2 : 0.05), lw, x.wedge ? 0.07 : 0.14, 0.12, WHITE, -sx * 0.2); tail.box(sx * (Wd / 2 - 0.3), d.deck - 0.15, -h + 0.02, 0.42, x.wedge ? 0.08 : 0.14, 0.07, WHITE, sx * 0.12); trim.box(sx * (Wd / 2 - 0.1), d.hood - 0.3, h - 0.08, 0.14, 0.05, 0.06, col('#e08a1a')); }
    if (x.whip || x.grille === 'big') tail.box(0, d.deck - 0.16, -h + 0.02, Wd - 0.9, 0.035, 0.05, WHITE);
    plateQuad(plate, 0, gc + 0.3, h + 0.048, false); plateQuad(plate, 0, gc + 0.34, -h - 0.024, true);
    // interior
    const seatY = gc + 0.22, INT = col(x.whip ? '#6b1f1f' : '#2b2b2e'), fz = d.wsT - 0.25;
    trim.box(0, d.belt - 0.12, d.wsB - 0.28, cw - 0.12, 0.2, 0.4, DG); trim.box(0, gc + 0.08, (d.wsB + d.rwB) / 2, cw - 0.1, 0.06, d.wsB - d.rwB, BLK);
    const seat = (sx, z) => { trim.box(sx, seatY + 0.06, z, 0.5, 0.14, 0.5, INT); trim.box(sx, seatY + 0.42, z - 0.27, 0.5, 0.66, 0.12, INT, 0, -0.12); trim.box(sx, seatY + 0.82, z - 0.32, 0.26, 0.16, 0.1, INT); };
    seat(-0.38, fz - 0.45); seat(0.38, fz - 0.45); if (d.seats > 2 && !x.bed) { trim.box(0, seatY + 0.06, fz - 1.4, cw - 0.2, 0.14, 0.5, INT); trim.box(0, seatY + 0.42, fz - 1.67, cw - 0.2, 0.66, 0.12, INT, 0, -0.12); }
    trim.cyl(-0.38, d.belt - 0.06, d.wsB - 0.5, 0.17, 0.03, BLK, 12, 1.15); trim.cyl(-0.38, d.belt - 0.12, d.wsB - 0.4, 0.025, 0.25, BLK, 6, 1.15);
    const seats = [[-0.38, seatY - 0.76, fz - 0.42], [0.38, seatY - 0.76, fz - 0.42]]; if (d.seats > 2 && !x.bed) seats.push([-0.38, seatY - 0.76, fz - 1.35], [0.38, seatY - 0.76, fz - 1.35]);
    const tx = Wd / 2 - d.ww / 2 - 0.015;
    return { paint: paint.build(true), glass: glass.build(true), trim: trim.build(true), head: head.build(true), tail: tail.build(true), plate: plate.build(), bar: x.bar ? [bar[0].build(true), bar[1].build(true)] : null, wheel: wheelGeo(d.wr, d.ww, x.whip), wheels: [[tx, wy, zf, 1], [-tx, wy, zf, 1], [tx, wy, zr, 0], [-tx, wy, zr, 0]], seats, plateMat: x.whip ? V.whipPlate : null };
  }
  function buildBus(d) {
    const h = d.L / 2, Wd = d.W, paint = new GB(), glass = new GB(), trim = new GB(), head = new GB(), tail = new GB(), plate = new GB(), BLK = col('#101112'), DG = col('#2a2c2e'), WT = col('#e8e6dc');
    const s = new THREE.Shape(); s.moveTo(-h, 0.55); s.lineTo(-h, 2.95); s.quadraticCurveTo(-h, 3.15, -h + 0.2, 3.15); s.lineTo(h - 0.5, 3.15); s.quadraticCurveTo(h - 0.1, 3.1, h, 2.2); s.lineTo(h, 0.55); s.lineTo(-h, 0.55);
    paint.add(extrude(s, Wd, 0.1), null, WHITE);
    for (const sx of [-1, 1]) { for (let i = 0; i < 8; i++) { const z = h - 1.9 - i * 1.05; if (sx > 0 && i === 0) continue; glass.box(sx * (Wd / 2 + 0.005), 2.15, z, 0.02, 0.85, 0.95, WHITE); } trim.box(sx * (Wd / 2 + 0.004), 1.5, -0.3, 0.012, 0.22, d.L - 1.2, WT); trim.box(sx * (Wd / 2 + 0.004), 1.25, -0.3, 0.012, 0.08, d.L - 1.2, col('#d8c23a')); trim.box(sx * (Wd / 2 + 0.01), 0.75, 0, 0.03, 0.3, d.L - 0.4, DG);
      for (const z of [d.wb / 2, -d.wb / 2]) trim.box(sx * (Wd / 2 - 0.2), 0.62, z, 0.5, 0.75, 1.25, BLK); trim.box(sx * (Wd / 2 + 0.14), 2.3, h - 0.25, 0.25, 0.3, 0.08, BLK); trim.box(sx * (Wd / 2 - 0.1), 3.2, -0.5, 0.05, 0.08, d.L - 2.5, DG); }
    trim.box(Wd / 2 + 0.006, 1.6, h - 1.9, 0.025, 2.0, 0.9, BLK); glass.box(Wd / 2 + 0.012, 2.0, h - 1.9, 0.02, 1.0, 0.7, WHITE); trim.box(Wd / 2 + 0.05, 0.42, h - 1.9, 0.3, 0.08, 0.9, DG);
    glass.box(0, 2.25, h + 0.005, Wd - 0.3, 1.0, 0.03, WHITE, 0, -0.16); glass.box(0, 2.3, -h - 0.005, Wd - 0.5, 0.75, 0.03, WHITE);
    trim.box(0, 0.6, h + 0.04, Wd, 0.32, 0.16, DG); trim.box(0, 0.6, -h - 0.04, Wd, 0.32, 0.14, DG); trim.box(0, 1.2, h + 0.03, 1.4, 0.4, 0.04, BLK);
    for (const sx of [-1, 1]) { head.box(sx * (Wd / 2 - 0.4), 1.05, h + 0.04, 0.4, 0.2, 0.08, WHITE); tail.box(sx * (Wd / 2 - 0.3), 1.2, -h - 0.04, 0.3, 0.4, 0.06, WHITE); }
    plateQuad(plate, 0, 0.82, h + 0.125, false, 0.6, 0.3); plateQuad(plate, 0, 0.9, -h - 0.115, true, 0.6, 0.3);
    const board = new GB(); plateQuad(board, 0, 2.95, h - 0.12, false, 1.9, 0.34); board.n.fill(0); for (let i = 0; i < 4; i++) { board.n[i * 3 + 2] = 1; board.p[i * 3 + 2] = h + (i < 2 ? -0.02 : -0.2); }
    const tx = Wd / 2 - 0.2; const seats = [[-0.7, 0.35, h - 1.3]];
    for (let i = 0; i < 6; i++) { seats.push([-0.75, 0.35, h - 3 - i * 1.0], [0.75, 0.35, h - 3 - i * 1.0]); }
    return { paint: paint.build(true), glass: glass.build(true), trim: trim.build(true), head: head.build(true), tail: tail.build(true), plate: plate.build(), board: board.build(), wheel: wheelGeo(d.wr, d.ww), wheels: [[tx, d.wr, d.wb / 2, 1], [-tx, d.wr, d.wb / 2, 1], [tx, d.wr, -d.wb / 2, 0], [-tx, d.wr, -d.wb / 2, 0]], seats, opaqueGlass: true, door: [Wd / 2 + 0.9, h - 1.9] };
  }
  function buildTruck(d) {
    const h = d.L / 2, Wd = d.W, paint = new GB(), glass = new GB(), trim = new GB(), head = new GB(), tail = new GB(), plate = new GB(), BLK = col('#101112'), DG = col('#2a2c2e');
    paint.box(0, 1.6, h - 0.95, Wd - 0.1, 1.9, 1.8, WHITE); paint.box(0, 2.85, h - 0.75, Wd, 0.55, 1.5, WHITE, 0, 0.12);
    glass.box(0, 2.0, h - 0.04, Wd - 0.4, 0.8, 0.03, WHITE); for (const sx of [-1, 1]) glass.box(sx * (Wd / 2 - 0.045), 2.0, h - 0.8, 0.02, 0.7, 0.9, WHITE);
    const ART = ['#c0392b', '#f1c40f', '#27ae60', '#2980b9', '#e84393', '#f39c12'];
    for (let i = 0; i < 8; i++) trim.box(-Wd / 2 + 0.2 + i * (Wd - 0.4) / 7, 2.9, h + 0.03, 0.26, 0.4, 0.03, col(ART[i % 6]), 0, 0.12); trim.box(0, 3.16, h - 0.1, Wd, 0.08, 0.08, col('#f1c40f'));
    trim.box(0, 0.75, -0.6, Wd - 0.5, 0.3, d.L - 1.0, DG); trim.box(0, 1.0, -h + 2.55, Wd, 0.14, d.L - 2.0, col('#6a4a2e'));
    for (const sx of [-1, 1]) { for (let i = 0; i < 5; i++) trim.box(sx * (Wd / 2 - 0.03), 1.6, -h + 0.55 + i * 1.02, 0.06, 1.1, 0.98, col(ART[(i + (sx > 0 ? 0 : 3)) % 6])); trim.box(sx * (Wd / 2 - 0.03), 2.2, -h + 2.6, 0.08, 0.1, d.L - 2.1, col('#f1c40f')); trim.box(sx * (Wd / 2 + 0.16), 2.2, h - 0.2, 0.28, 0.4, 0.08, BLK); }
    trim.box(0, 1.6, -h + 0.03, Wd, 1.1, 0.06, col('#1f6fb8')); trim.box(0, 1.6, -h + 5.15, Wd, 1.1, 0.06, col('#6a4a2e')); trim.sph(0, 2.3, -h + 2.6, Wd / 2 - 0.15, 0.55, 2.4, col('#5a6b4a'), 8);
    trim.box(0, 0.62, h + 0.03, Wd, 0.34, 0.14, DG); trim.box(0, 1.1, h + 0.02, 1.3, 0.5, 0.04, BLK);
    for (const sx of [-1, 1]) { head.box(sx * (Wd / 2 - 0.35), 0.95, h + 0.03, 0.34, 0.2, 0.08, WHITE); tail.box(sx * (Wd / 2 - 0.25), 0.9, -h - 0.02, 0.26, 0.2, 0.06, WHITE); }
    plateQuad(plate, 0, 0.7, h + 0.105, false, 0.6, 0.3); plateQuad(plate, 0, 0.72, -h - 0.02, true, 0.6, 0.3);
    const tx = Wd / 2 - 0.2;
    return { paint: paint.build(true), glass: glass.build(true), trim: trim.build(true), head: head.build(true), tail: tail.build(true), plate: plate.build(), wheel: wheelGeo(d.wr, d.ww), wheels: [[tx, d.wr, d.wb / 2, 1], [-tx, d.wr, d.wb / 2, 1], [tx, d.wr, -d.wb / 2 - 0.3, 0], [-tx, d.wr, -d.wb / 2 - 0.3, 0]], seats: [[-0.6, 0.55, h - 1.0], [0.6, 0.55, h - 1.0]] };
  }
  function buildJeep(d) {
    const h = d.L / 2, Wd = d.W, paint = new GB(), glass = new GB(), trim = new GB(), head = new GB(), tail = new GB(), plate = new GB(), BLK = col('#101112'), CV = col('#3a4426');
    paint.box(0, 0.78, -0.2, Wd, 0.62, d.L - 0.5, WHITE); paint.box(0, 0.95, h - 0.75, Wd - 0.25, 0.3, 1.3, WHITE); for (const sx of [-1, 1]) paint.box(sx * (Wd / 2 - 0.14), 0.72, h - 0.75, 0.3, 0.2, 1.1, WHITE);
    glass.box(0, 1.42, 0.58, Wd - 0.15, 0.55, 0.03, WHITE, 0, -0.15); for (const sx of [-1, 1]) trim.box(sx * (Wd / 2 - 0.06), 1.42, 0.58, 0.05, 0.62, 0.05, CV, 0, -0.15); trim.box(0, 1.72, 0.54, Wd - 0.1, 0.05, 0.05, CV);
    trim.box(0, 1.75, -0.75, Wd - 0.06, 0.07, 2.2, CV); for (const sx of [-1, 1]) { trim.box(sx * (Wd / 2 - 0.05), 1.4, -1.5, 0.04, 0.65, 0.7, CV); trim.box(sx * (Wd / 2 - 0.05), 1.4, -0.45, 0.05, 0.7, 0.05, BLK); } trim.box(0, 1.4, -h + 0.28, Wd - 0.1, 0.65, 0.04, CV);
    trim.box(0, 0.55, h + 0.02, Wd + 0.06, 0.16, 0.14, BLK); trim.box(0, 0.55, -h + 0.02, Wd + 0.06, 0.16, 0.12, BLK); for (let i = 0; i < 7; i++) trim.box(-0.3 + i * 0.1, 0.92, h - 0.09, 0.05, 0.28, 0.03, BLK);
    trim.cyl(0, 1.0, -h - 0.04, 0.38, 0.22, BLK, 14, Math.PI / 2); trim.box(Wd / 2 - 0.25, 1.0, -h + 0.02, 0.2, 0.42, 0.14, col('#4b5a32')); trim.cyl(-Wd / 2 + 0.1, 1.9, -h + 0.4, 0.012, 1.6, BLK, 5);
    const INT = col('#3a3d33'); for (const sx of [-0.4, 0.4]) { trim.box(sx, 0.9, -0.1, 0.46, 0.12, 0.46, INT); trim.box(sx, 1.22, -0.34, 0.46, 0.6, 0.1, INT); } trim.box(0, 0.9, -1.2, Wd - 0.3, 0.12, 0.5, INT); trim.cyl(-0.4, 1.2, 0.3, 0.17, 0.03, BLK, 12, 1.1);
    for (const sx of [-1, 1]) { head.cyl(sx * (Wd / 2 - 0.3), 0.95, h - 0.08, 0.1, 0.06, WHITE, 10, Math.PI / 2); tail.box(sx * (Wd / 2 - 0.15), 0.85, -h + 0.04, 0.14, 0.14, 0.05, WHITE); }
    plateQuad(plate, 0, 0.55, h + 0.095, false, 0.45, 0.2); plateQuad(plate, -0.5, 0.75, -h - 0.045, true, 0.4, 0.2);
    const tx = Wd / 2 - 0.1;
    return { paint: paint.build(true), glass: glass.build(true), trim: trim.build(true), head: head.build(true), tail: tail.build(true), plate: plate.build(), wheel: wheelGeo(d.wr, d.ww), wheels: [[tx, d.wr, d.wb / 2, 1], [-tx, d.wr, d.wb / 2, 1], [tx, d.wr, -d.wb / 2, 0], [-tx, d.wr, -d.wb / 2, 0]], seats: [[-0.4, 0.02, -0.08], [0.4, 0.02, -0.08], [-0.4, 0.02, -1.15], [0.4, 0.02, -1.15]] };
  }
  function buildCng(d) {
    const h = d.L / 2, Wd = d.W, paint = new GB(), glass = new GB(), trim = new GB(), head = new GB(), tail = new GB(), plate = new GB(), BLK = col('#101112'), CAN = col('#18191b');
    const s = new THREE.Shape(); s.moveTo(-h, 0.3); s.lineTo(-h, 1.0); s.lineTo(h - 0.75, 1.0); s.lineTo(h - 0.7, 0.95); s.quadraticCurveTo(h - 0.1, 0.9, h, 0.5); s.lineTo(h - 0.05, 0.3); s.lineTo(-h, 0.3);
    paint.add(extrude(s, Wd - 0.1, 0.06), null, WHITE);
    glass.box(0, 1.3, h - 0.72, Wd - 0.3, 0.6, 0.02, WHITE, 0, -0.3);
    trim.box(0, 1.7, -0.25, Wd - 0.08, 0.06, d.L - 0.9, CAN); trim.box(0, 1.35, -h + 0.03, Wd - 0.1, 0.72, 0.04, CAN); for (const sx of [-1, 1]) { trim.box(sx * (Wd / 2 - 0.07), 1.35, -h + 0.5, 0.03, 0.72, 0.9, CAN); for (let i = 0; i < 7; i++) trim.box(sx * (Wd / 2 - 0.07), 1.35, -0.2 + i * 0.1, 0.02, 0.7, 0.012, col('#3a3a3a')); trim.box(sx * (Wd / 2 - 0.07), 1.35, 0.55, 0.035, 0.75, 0.035, BLK); }
    trim.box(0, 0.95, 0.35, 0.5, 0.1, 0.4, col('#3a2a22')); trim.box(0, 1.2, 0.14, 0.5, 0.45, 0.06, col('#3a2a22')); trim.box(0, 0.9, -0.75, Wd - 0.3, 0.1, 0.45, col('#5a2a22')); trim.box(0, 1.2, -1.0, Wd - 0.3, 0.5, 0.08, col('#5a2a22'));
    trim.cyl(0, 1.12, 0.72, 0.012, 0.5, BLK, 5, 0.5); trim.box(0, 1.3, 0.62, 0.5, 0.03, 0.03, BLK); trim.box(0, 0.42, h - 0.02, 0.5, 0.2, 0.1, BLK);
    head.cyl(0, 0.78, h - 0.08, 0.09, 0.06, WHITE, 10, Math.PI / 2); for (const sx of [-1, 1]) tail.box(sx * (Wd / 2 - 0.2), 0.75, -h - 0.005, 0.12, 0.1, 0.03, WHITE);
    plateQuad(plate, 0, 0.5, h + 0.035, false, 0.3, 0.15); plateQuad(plate, 0, 0.5, -h - 0.012, true, 0.36, 0.18);
    return { paint: paint.build(true), glass: glass.build(true), trim: trim.build(true), head: head.build(true), tail: tail.build(true), plate: plate.build(), wheel: wheelGeo(d.wr, d.ww), wheels: [[0, d.wr, h - 0.45, 1], [Wd / 2 - 0.1, d.wr, -h + 0.5, 0], [-Wd / 2 + 0.1, d.wr, -h + 0.5, 0]], seats: [[0, 0.1, 0.38], [-0.25, 0.05, -0.7], [0.25, 0.05, -0.7]], greenPlate: true };
  }
  function buildRickshaw(d) {
    const paint = new GB(), trim = new GB(), FR = col('#2a2a2a'), CH = col('#b8bcc0'), ART = ['#c0392b', '#f1c40f', '#27ae60', '#2980b9', '#e84393'];
    trim.cyl(0, 0.62, 0.35, 0.02, 1.0, FR, 6, 1.2); trim.cyl(0, 0.75, 0.95, 0.02, 0.9, FR, 6, -0.35); trim.cyl(0, 0.5, -0.2, 0.02, 1.0, FR, 6, Math.PI / 2); trim.box(0, 1.15, 0.82, 0.5, 0.025, 0.025, CH); trim.box(0, 0.98, 0.1, 0.2, 0.06, 0.26, col('#3a2a22'));
    trim.cyl(0, 0.34, -0.75, 0.02, d.W - 0.1, FR, 6, 0, 0, Math.PI / 2); trim.box(0, 0.45, -0.3, 0.7, 0.03, 0.4, col('#6a4a2e'));
    paint.box(0, 0.72, -0.75, 0.82, 0.12, 0.5, WHITE); paint.box(0, 1.0, -1.02, 0.82, 0.5, 0.08, WHITE, 0, -0.15);
    for (const sx of [-1, 1]) { trim.box(sx * 0.42, 0.85, -0.75, 0.03, 0.3, 0.5, col(ART[1])); }
    for (let i = 0; i < 4; i++) { const a = 0.5 + i * 0.28; trim.box(0, 1.05 + Math.sin(a) * 0.55, -1.0 + Math.cos(a) * 0.4, 0.9, 0.03, 0.2, col(ART[i % 5]), 0, a - 1.2); }
    trim.box(0, 0.6, -1.12, 0.8, 0.3, 0.02, col(ART[3])); trim.box(0, 0.6, -1.135, 0.5, 0.2, 0.01, col(ART[1]));
    return { paint: paint.build(true), glass: null, trim: trim.build(true), head: null, tail: null, plate: null, wheel: wheelGeo(d.wr, d.ww), wheels: [[0, d.wr, 0.95, 1], [d.W / 2 - 0.05, d.wr, -0.75, 0], [-d.W / 2 + 0.05, d.wr, -0.75, 0]], seats: [[0, 0.1, 0.12], [-0.2, -0.12, -0.72], [0.2, -0.12, -0.72]], pose: 'pedal' };
  }
  function buildBike(d) {
    const paint = new GB(), trim = new GB(), head = new GB(), tail = new GB(), plate = new GB(), FR = col('#1c1c1e'), CH = col('#b8bcc0');
    paint.sph(0, 0.82, 0.18, 0.15, 0.13, 0.3, WHITE, 8); paint.box(0, 0.7, -0.62, 0.16, 0.08, 0.36, WHITE, 0, 0.15); paint.box(0, 0.66, 0.74, 0.11, 0.03, 0.34, WHITE, 0, -0.2);
    if (d.fairing) { paint.box(0, 0.78, 0.6, 0.34, 0.36, 0.42, WHITE, 0, -0.25); paint.box(0, 0.5, 0.22, 0.3, 0.3, 0.6, WHITE); trim.box(0, 1.02, 0.66, 0.26, 0.2, 0.03, col('#0c1218'), 0, -0.6); }
    trim.box(0, 0.8, -0.3, 0.24, 0.08, 0.62, col('#15151a')); trim.box(0, 0.48, 0.08, 0.24, 0.3, 0.4, col('#3a3d40')); trim.cyl(0, 0.42, 0.1, 0.11, 0.26, CH, 10, 0, 0, Math.PI / 2);
    for (const sx of [-1, 1]) { trim.cyl(sx * 0.07, 0.62, 0.78, 0.022, 0.75, CH, 6, -0.38); trim.cyl(sx * 0.09, 0.45, -0.5, 0.018, 0.5, FR, 6, 1.0); trim.box(sx * 0.28, 1.02, 0.5, 0.2, 0.03, 0.03, FR); trim.box(sx * 0.36, 1.08, 0.48, 0.08, 0.06, 0.02, FR); trim.box(sx * 0.1, 0.32, -0.1, 0.06, 0.03, 0.12, FR); }
    trim.box(0, 1.0, 0.5, 0.5, 0.03, 0.03, FR); trim.cyl(0.13, 0.36, -0.42, 0.04, 0.66, CH, 8, 1.45); trim.box(0, 0.62, -0.72, 0.13, 0.02, 0.3, FR, 0, 0.3);
    head.sph(0, 0.92, 0.72, 0.085, 0.085, 0.06, WHITE, 8); tail.box(0, 0.74, -0.83, 0.1, 0.05, 0.03, WHITE);
    plateQuad(plate, 0, 0.6, -0.9, true, 0.2, 0.14);
    return { paint: paint.build(true), glass: null, trim: trim.build(true), head: head.build(true), tail: tail.build(true), plate: plate.build(), wheel: wheelGeo(d.wr, d.ww), wheels: [[0, d.wr, d.wb / 2, 1], [0, d.wr, -d.wb / 2, 0]], seats: [[0, -0.13, -0.28], [0, -0.1, -0.62]], pose: 'bike' };
  }
  function buildBoat(d) {
    const h = d.L / 2, Wd = d.W, paint = new GB(), glass = new GB(), trim = new GB(), head = new GB(), tail = new GB(), DK = col('#3d464d'), DECK = col('#5d666c'), BLK = col('#15181b'), WH = col('#e8eaec'), RED = col('#7a1f1f');
    const s = new THREE.Shape(); s.moveTo(-Wd * 0.44, -h); s.lineTo(Wd * 0.44, -h); s.lineTo(Wd / 2, -h + 1.0); s.lineTo(Wd / 2, h * 0.3); s.quadraticCurveTo(Wd * 0.42, h * 0.78, 0, h); s.quadraticCurveTo(-Wd * 0.42, h * 0.78, -Wd / 2, h * 0.3); s.lineTo(-Wd / 2, -h + 1.0); s.lineTo(-Wd * 0.44, -h);
    const hull = new THREE.ExtrudeGeometry(s, { depth: 0.78, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 1, curveSegments: 8 }); hull.rotateX(Math.PI / 2); hull.translate(0, 0.92, 0); paint.add(hull, null, WHITE);
    const s2 = new THREE.Shape(); s2.moveTo(-Wd * 0.38, -h + 0.25); s2.lineTo(Wd * 0.38, -h + 0.25); s2.lineTo(Wd * 0.42, h * 0.28); s2.quadraticCurveTo(Wd * 0.34, h * 0.7, 0, h - 0.5); s2.quadraticCurveTo(-Wd * 0.34, h * 0.7, -Wd * 0.42, h * 0.28); s2.lineTo(-Wd * 0.38, -h + 0.25);
    const dk = new THREE.ShapeGeometry(s2, 8); dk.rotateX(Math.PI / 2); dk.scale(1, -1, 1); dk.translate(0, 1.0, 0); dk.computeVertexNormals(); { const N = dk.attributes.normal; for (let i = 0; i < N.count; i++) N.setXYZ(i, 0, 1, 0); const ix = dk.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } } trim.add(dk, null, DECK);
    for (const sx of [-1, 1]) { trim.box(sx * (Wd / 2 + 0.035), 0.16, -0.9, 0.03, 0.18, d.L * 0.62, RED); for (let i = 0; i < 6; i++) trim.cyl(sx * (Wd / 2 - 0.1), 1.25, -h + 0.6 + i * 1.02, 0.02, 0.62, WH, 5); trim.box(sx * (Wd / 2 - 0.1), 1.56, -h + 3.15, 0.035, 0.035, 5.2, WH); for (let i = 0; i < 3; i++) trim.sph(sx * (Wd / 2 + 0.1), 0.62, -h + 1.4 + i * 1.9, 0.11, 0.22, 0.11, col('#e06a1a'), 8); }
    paint.box(0, 1.75, 0.15, 1.9, 1.62, 2.3, WHITE); trim.box(0, 2.6, 0.2, 2.2, 0.08, 2.75, DK);
    glass.box(0, 2.05, 1.31, 1.7, 0.7, 0.03, WHITE, 0, -0.14); for (const sx of [-1, 1]) glass.box(sx * 0.96, 2.05, 0.2, 0.03, 0.66, 1.7, WHITE); glass.box(0, 2.05, -1.01, 1.4, 0.6, 0.03, WHITE);
    trim.box(0, 1.5, -1.02, 0.7, 1.1, 0.04, DK); trim.cyl(0, 3.3, -0.3, 0.035, 1.4, DK, 6); trim.box(0, 3.75, -0.3, 0.9, 0.06, 0.12, WH); trim.box(0, 3.45, -0.3, 0.5, 0.04, 0.04, DK); trim.cyl(0.5, 2.95, -0.75, 0.012, 0.9, BLK, 4);
    trim.cyl(0, 1.2, h - 2.0, 0.14, 0.55, DK, 8); trim.box(0, 1.55, h - 2.0, 0.26, 0.24, 0.5, BLK); trim.cyl(0, 1.6, h - 1.45, 0.035, 0.95, BLK, 6, Math.PI / 2); trim.box(0, 1.42, h - 2.25, 0.5, 0.3, 0.05, DK);
    for (const sx of [-0.55, 0.55]) { trim.box(sx, 1.05, -h + 0.02, 0.42, 0.75, 0.5, BLK); trim.box(sx, 1.45, -h + 0.05, 0.36, 0.1, 0.4, col('#2b3138')); }
    trim.cyl(-Wd * 0.3, 1.7, -h + 0.5, 0.018, 1.5, WH, 5); trim.box(-Wd * 0.3 + 0.28, 2.25, -h + 0.5, 0.55, 0.32, 0.02, col('#0f6b47')); trim.cyl(-Wd * 0.3 + 0.26, 2.25, -h + 0.5, 0.1, 0.03, col('#e0242a'), 12, 0, 0, Math.PI / 2);
    trim.box(0, 1.0, 0.75, 0.5, 0.9, 0.3, DK); trim.cyl(0, 1.5, 0.58, 0.16, 0.03, BLK, 12, 1.2); trim.box(0, 0.98, -h + 1.6, 1.4, 0.36, 0.5, DK);
    head.sph(0, 2.8, 1.1, 0.14, 0.14, 0.12, WHITE, 8); tail.box(0, 1.5, -h - 0.02, 0.2, 0.08, 0.04, WHITE);
    return { paint: paint.build(true), glass: glass.build(true), trim: trim.build(true), head: head.build(true), tail: tail.build(true), plate: null, wheel: wheelGeo(0.3, 0.2), wheels: [], seats: [[0, 1.0, 0.25], [-0.5, 1.0 - 0.45, -h + 1.55], [0.5, 1.0 - 0.45, -h + 1.55], [0, 1.0, -1.6]], pose: 'helm', opaqueGlass: true };
  }
  const BUILD = { boat: buildBoat, car: buildCar, bus: buildBus, truck: buildTruck, jeep: buildJeep, cng: buildCng, rickshaw: buildRickshaw, bike: buildBike };
  V.geo = id => V.geos[id] || (V.geos[id] = BUILD[V.DEFS[id].kind](V.DEFS[id]));

  // ---------- vehicle instance ----------
  const P = { x: 0, z: 0 };
  class Vehicle {
    constructor(id, x, z, heading, opt) {
      opt = opt || {}; const d = this.def = V.DEFS[id], g = V.geo(id); this.id = id; this.geo = g;
      this.color = opt.color || G.pick(d.colors); this.x = x; this.z = z; this.y = opt.y || 0; this.h = heading || 0; this.vx = 0; this.vz = 0; this.vy = 0; this.speed = 0; this.steer = 0; this.om = 0; this.health = d.hp; this.slip = 0; this.gy = this.y;
      this.driver = null; this.passengers = []; this.ai = null; this.lights = false; this.siren = false; this.brake = false; this.sleep = true; this.age = 0; this.dead = false; this.spin = 0; this.roll = 0; this.pitch = 0; this.dmgT = 0; this.hornT = 0; this.R = d.L / 2 + 0.4;
      const grp = this.group = new THREE.Group(), body = this.body = new THREE.Group(); grp.add(body); grp.rotation.order = 'YXZ';
      const add = (geo, mat, shadow) => { if (!geo) return null; const m = new THREE.Mesh(geo, mat); m.castShadow = !!shadow; body.add(m); return m; };
      this.mPaint = add(g.paint, V.paint(this.color, d.special), true); this.mGlass = add(g.glass, g.opaqueGlass ? V.headOff : V.glass); if (g.opaqueGlass && this.mGlass) this.mGlass.material = V.glassDark || (V.glassDark = new THREE.MeshStandardMaterial({ color: 0x0c1216, roughness: 0.08, metalness: 0.8 }));
      this.mTrim = add(g.trim, V.trim, true); this.mHead = add(g.head, V.headOff); this.mTail = add(g.tail, V.tailOff);
      this.mPlate = add(g.plate, g.plateMat || V.plates[g.greenPlate || d.kind === 'bus' || d.kind === 'truck' || d.taxi ? 4 + (G.hash(x * 7 + z) % 2) : G.hash(x * 3 + z * 5) % 4]);
      if (g.board) add(g.board, V.busBoard); if (g.bar) { this.mBarA = add(g.bar[0], V.barA); this.mBarB = add(g.bar[1], V.barB); }
      this.wheels = g.wheels.map(w => { const piv = new THREE.Group(); piv.position.set(w[0], w[1], w[2]); const m = new THREE.Mesh(g.wheel, V.wheelMat); m.castShadow = true; piv.add(m); grp.add(piv); return { piv, m, front: w[3] }; });
      if (g.head) { const bm = this.beam = new THREE.Mesh(V.beamGeo || (V.beamGeo = new THREE.PlaneGeometry(7, 13).rotateX(-Math.PI / 2)), V.beam); bm.position.set(0, 0.06, d.L / 2 + 6); bm.renderOrder = 4; bm.visible = false; grp.add(bm); }
      this.sync(); (opt.scene || G.scene).add(grp); V.list.push(this);
    }
    sync() { const g = this.group; g.position.set(this.x, this.y, this.z); g.rotation.set(-this.pitch, this.h, 0); const bike = this.def.kind === 'bike'; this.body.rotation.z = this.roll; if (bike) for (const w of this.wheels) w.piv.rotation.z = this.roll; }
    get fx() { return Math.sin(this.h); } get fz() { return Math.cos(this.h); }
    seatWorld(i, out) { const s = this.geo.seats[Math.min(i, this.geo.seats.length - 1)], fx = this.fx, fz = this.fz; out.x = this.x + fx * s[2] + fz * s[0]; out.z = this.z + fz * s[2] - fx * s[0]; out.y = this.y + s[1]; return out; }
    setLights(on) { if (this.lights === on || this.dead) return; this.lights = on; if (this.mHead) this.mHead.material = on ? V.headOn : V.headOff; if (this.beam) this.beam.visible = on; }
    impact(v, px, pz) {
      if (v < 2.2) return; const dmg = (v - 2) * (this.def.kind === 'bike' ? 9 : 15); this.damage(dmg, true);
      if (G.audio && this.near < 70) G.audio.crash(Math.min(1, v / 14), this.near); if (G.fx && v > 5 && px !== undefined) G.fx.sparks(px, this.y + 0.6, pz, 5);
      if (this.driver === 'player' && G.player) G.player.onCrash(v, this);
    }
    damage(d, crash) { if (this.dead) return; if (this.def.special && !crash) d *= 0.35; this.health -= d; if (this.health <= 0) { this.health = 0; this.burn = this.burn || 4; } }
    explode() {
      if (this.dead) return; this.dead = true; this.health = 0; this.burn = 0; this.wreckT = 45;
      if (this.mPaint) this.mPaint.material = V.wreck; if (this.mTrim) this.mTrim.material = V.wreck; if (this.mGlass) this.mGlass.visible = false; this.setLightsOff(); this.vy = 5; this.y += 0.1;
      if (G.fx) G.fx.explosion(this.x, this.y + 0.8, this.z, 1, this);
    }
    setLightsOff() { this.lights = false; if (this.mHead) this.mHead.material = V.wreck; if (this.mTail) this.mTail.material = V.wreck; if (this.beam) this.beam.visible = false; if (this.mBarA) { this.mBarA.material = V.wreck; this.mBarB.material = V.wreck; } }
    boatUpdate(dt, c) {
      const d = this.def; c = c || IDLE; this.sleep = false; let h = this.h, fx = Math.sin(h), fz = Math.cos(h), rx = -fz, rz = fx, vf = this.vx * fx + this.vz * fz, vl = this.vx * rx + this.vz * rz;
      const afloat = W.inWaterRaw(this.x, this.z), thr = this.dead ? 0 : c.throttle;
      if (afloat) { let a = 0; if (thr > 0) a = d.acc * thr * Math.max(0, 1 - Math.pow(Math.max(0, vf) / d.max, 2)); else if (thr < 0) a = vf > 0.5 ? -d.brake : -d.acc * 0.5 * Math.max(0, 1 - Math.pow(Math.max(0, -vf) / (d.max * 0.3), 2)); a -= vf * 0.32; vf += a * dt; vl *= Math.exp(-1.7 * dt);
        this.steer = G.damp(this.steer, (c.steer || 0) * 0.6, 4, dt); const om = this.steer * 1.5 * G.clamp(Math.max(Math.abs(vf) / 5, Math.abs(thr) * 0.45), 0, 1) * (vf < -0.3 ? -1 : 1); h += om * dt; this.h = h; this.om = om; }
      else { vf *= Math.exp(-5 * dt); vl *= Math.exp(-5 * dt); this.om = 0; }
      const nfx = Math.sin(h), nfz = Math.cos(h); this.vx = nfx * vf - nfz * vl; this.vz = nfz * vf + nfx * vl; this.speed = vf; this.slip = 0;
      const nx = this.x + this.vx * dt, nz = this.z + this.vz * dt, lead = (vf >= 0 ? 1 : -1) * d.L * 0.45;
      if (afloat && (!W.inWaterRaw(nx + nfx * lead, nz + nfz * lead) || !W.inWaterRaw(nx + nfx * lead - nfz * d.W * 0.4, nz + nfz * lead + nfx * d.W * 0.4) || !W.inWaterRaw(nx + nfx * lead + nfz * d.W * 0.4, nz + nfz * lead - nfx * d.W * 0.4))) { if (Math.abs(vf) > 3) this.impact(Math.abs(vf) * 0.6, nx + nfx * lead, nz + nfz * lead); this.vx *= -0.08; this.vz *= -0.08;
        // nose towards open water so the boat glances off the bank instead of sticking to it
        if (thr !== 0) { const sg = vf >= 0 ? 1 : -1, free = a => W.inWaterRaw(this.x + Math.sin(h + a) * lead * 1.5, this.z + Math.cos(h + a) * lead * 1.5); const l = free(0.75 * sg), r = free(-0.75 * sg); if (l !== r) this.h += (l ? 1 : -1) * dt * 0.9; else if (!l) this.h += dt * 0.6; } }
      else { this.x = nx; this.z = nz; }
      const t = this.age * 1.4 + this.x * 0.1; this.y = 0.02 + Math.sin(t) * 0.035; this.gy = this.y; this.vy = 0; this.pitch = G.damp(this.pitch, Math.sin(t * 0.8) * 0.018 + G.clamp(vf * 0.006, -0.03, 0.09), 3, dt); this.roll = G.damp(this.roll, Math.sin(t * 0.63) * 0.03 - (this.om || 0) * vf * 0.012, 3, dt);
      this.brake = false; this.inWater = false; this.sync();
      if (G.fx && Math.abs(vf) > 2.5 && this.near < 160 && Math.random() < dt * Math.min(40, Math.abs(vf) * 3)) { const s = Math.random() < 0.5 ? -1 : 1; G.fx.splash(this.x - nfx * d.L * 0.48 - nfz * s * 0.6, 0.15, this.z - nfz * d.L * 0.48 + nfx * s * 0.6); }
    }
    update(dt, c) {
      const d = this.def; this.age += dt; if (this.remote) return;
      if (d.kind === 'boat' && !(this.burn > 0)) return this.boatUpdate(dt, c);
      if (this.burn > 0) { this.burn -= dt; if (G.fx && Math.random() < dt * 20) G.fx.fire(this.x + this.fx * d.L * 0.3, this.y + 1, this.z + this.fz * d.L * 0.3); if (this.burn <= 0) this.explode(); }
      else if (!this.dead && this.health < d.hp * 0.35 && this.near < 90 && G.fx && Math.random() < dt * (this.health < d.hp * 0.15 ? 14 : 6)) G.fx.smoke(this.x + this.fx * d.L * 0.36, this.y + d.hood || this.y + 0.9, this.z + this.fz * d.L * 0.36, this.health < d.hp * 0.15 ? 0.12 : 0.45);
      if (this.sleep && !c) return;
      c = c || IDLE; const wet = 1 - G.env.wet * 0.28;
      let h = this.h, fx = Math.sin(h), fz = Math.cos(h), rx = -fz, rz = fx, vf = this.vx * fx + this.vz * fz; const vl = this.vx * rx + this.vz * rz;
      const onG = this.y <= this.gy + 0.06, thr = this.dead ? 0 : c.throttle;
      if (onG) {
        let a = 0;
        if (thr > 0) { if (vf > -0.5) { const k = 1 - Math.pow(Math.max(0, vf) / d.max, 2); a = d.acc * thr * Math.max(0, k) * (this.health < d.hp * 0.25 ? 0.55 : 1); } else a = d.brake * thr; }
        else if (thr < 0) { if (vf > 0.5) a = d.brake * thr; else { const k = 1 - Math.pow(Math.max(0, -vf) / (d.max * 0.3), 2); a = d.acc * 0.7 * thr * Math.max(0, k); } }
        a -= Math.sign(vf) * (0.45 + (this.inWater ? 7 : 0)) + vf * Math.abs(vf) * 0.0009;
        if (c.handbrake || this.dead) a -= Math.sign(vf) * Math.min(Math.abs(vf) / dt, this.dead ? 5 : 9);
        vf += a * dt; if (thr === 0 && Math.abs(vf) < 0.5) vf *= Math.exp(-dt * 4);
        this.brake = (thr < 0 && vf > 0.5) || c.handbrake || (thr === 0 && c.braking);
      }
      this.vx = fx * vf + rx * vl; this.vz = fz * vf + rz * vl;
      const sp = Math.abs(vf), maxSt = G.lerp(0.62, 0.09, G.clamp(sp / (d.max * 0.85), 0, 1)); this.steer = G.damp(this.steer, (c.steer || 0) * maxSt, 9, dt);
      let om = vf / d.wb * Math.tan(this.steer); const maxLat = d.grip * 9.8 * wet; if (Math.abs(om * vf) > maxLat) om = Math.sign(om) * maxLat / Math.max(1, sp);
      if (c.handbrake && sp > 4) om *= 1.55;
      if (onG) { h += om * dt; this.h = h; fx = Math.sin(h); fz = Math.cos(h); rx = -fz; rz = fx;
        let vf2 = this.vx * fx + this.vz * fz; const vl2 = this.vx * rx + this.vz * rz, vl2n = vl2 * Math.exp(-(c.handbrake ? 1.5 : d.grip * 8.5 * wet) * dt);
        vf2 = (vf2 < 0 ? -1 : 1) * Math.sqrt(vf2 * vf2 + (vl2 * vl2 - vl2n * vl2n) * 0.8); this.vx = fx * vf2 + rx * vl2n; this.vz = fz * vf2 + rz * vl2n; this.slip = Math.abs(vl2n); vf = vf2; }
      this.om = om; this.speed = vf;
      this.x += this.vx * dt; this.z += this.vz * dt;
      // world collisions
      if (!this.noCol) { const offs = d.L > 6 ? [d.L * 0.4, d.L * 0.13, -d.L * 0.13, -d.L * 0.4] : d.L < 2.5 ? [0.3, -0.3] : [d.L * 0.32, 0, -d.L * 0.32], rad = d.W * 0.5;
        for (const o of offs) { P.x = this.x + fx * o; P.z = this.z + fz * o; const ox = P.x, oz = P.z; if (W.collide(P, rad, this.y)) { const dx = P.x - ox, dz = P.z - oz; this.x += dx; this.z += dz; const nx = W.hitNx, nz = W.hitNz, vn = this.vx * nx + this.vz * nz; if (vn < 0) { this.vx -= nx * vn * 1.2; this.vz -= nz * vn * 1.2; this.vx *= 0.97; this.vz *= 0.97; this.impact(-vn, P.x, P.z); } this.h += G.clamp((fz * dx - fx * dz) * o * 0.06, -0.06, 0.06); } } }
      const b = W.bounds; if (this.x < b.minX + 4) { this.x = b.minX + 4; this.vx = Math.abs(this.vx) * 0.3; } if (this.x > b.maxX - 4) { this.x = b.maxX - 4; this.vx = -Math.abs(this.vx) * 0.3; } if (this.z < b.minZ + 4) { this.z = b.minZ + 4; this.vz = Math.abs(this.vz) * 0.3; } if (this.z > b.maxZ - 4) { this.z = b.maxZ - 4; this.vz = -Math.abs(this.vz) * 0.3; }
      // ground
      const gy = W.groundY(this.x, this.z, this.y); this.gy = gy;
      if (this.y > gy + 0.03) { this.vy -= 22 * dt; this.y += this.vy * dt; if (this.y <= gy) { if (this.vy < -7) this.impact(-this.vy * 0.5, this.x, this.z); this.y = gy; this.vy = 0; } } else { this.y = gy; this.vy = 0; }
      let pt = 0; if (gy > 0.02 || this.y > 0.02) { const gF = W.groundY(this.x + fx * d.L * 0.32, this.z + fz * d.L * 0.32, this.y + 0.5), gR = W.groundY(this.x - fx * d.L * 0.32, this.z - fz * d.L * 0.32, this.y + 0.5); pt = Math.atan2(gF - gR, d.L * 0.64); }
      this.inWater = this.y < 0.3 && sp < 60 && (this.wt = (this.wt || 0) + dt) > 0.3 ? (this.wt = 0, W.inWater(this.x, this.z)) : this.inWater;
      this.pitch = G.damp(this.pitch, pt + G.clamp(-(vf - (this.pv || 0)) / dt * 0.004, -0.05, 0.05), 8, dt); this.pv = vf;
      const bike = d.kind === 'bike' || d.kind === 'rickshaw'; this.roll = G.damp(this.roll, d.kind === 'bike' ? G.clamp(-om * vf * 0.05, -0.65, 0.65) : G.clamp(om * vf * 0.011, -0.085, 0.085) * (bike ? 0.3 : 1), 7, dt);
      this.spin += vf / d.wr * dt; for (const w of this.wheels) { w.m.rotation.x = this.spin; if (w.front) w.piv.rotation.y = this.steer; }
      if (this.mTail && !this.dead) this.mTail.material = this.brake ? V.tailBrake : this.lights ? V.tailOn : V.tailOff;
      this.sync();
      if (!this.driver && !this.ai && sp < 0.05 && Math.abs(this.vy) < 0.01) { this.sleep = true; this.vx = this.vz = 0; }
    }
    remove() { const i = V.list.indexOf(this); if (i >= 0) V.list.splice(i, 1); if (this.group.parent) this.group.parent.remove(this.group); if (this.driverChar) { this.driverChar.dispose(); this.driverChar = null; } this.removed = true; }
  }
  const IDLE = { throttle: 0, steer: 0, handbrake: true };
  V.Vehicle = Vehicle;
  V.create = (id, x, z, h, opt) => new Vehicle(id, x, z, h, opt);

  // vehicle vs vehicle
  function circles(v, out) { const d = v.def, fx = v.fx, fz = v.fz, o = d.L > 6 ? [0.4, 0.13, -0.13, -0.4] : d.L < 2.5 ? [0.2, -0.2] : [0.32, 0, -0.32]; out.length = 0; for (const k of o) out.push(v.x + fx * d.L * k, v.z + fz * d.L * k); return d.W * 0.5; }
  const ca = [], cb = [];
  V.collideAll = function () {
    const L = V.list;
    for (let i = 0; i < L.length; i++) { const a = L[i]; if (a.near > 110) continue;
      for (let j = i + 1; j < L.length; j++) { const b = L[j]; if (a.sleep && b.sleep) continue; const dx = b.x - a.x, dz = b.z - a.z, R = a.R + b.R; if (dx * dx + dz * dz > R * R || Math.abs(a.y - b.y) > 2.2) continue;
        const ra = circles(a, ca), rb = circles(b, cb);
        for (let p = 0; p < ca.length; p += 2) for (let q = 0; q < cb.length; q += 2) { let ex = cb[q] - ca[p], ez = cb[q + 1] - ca[p + 1]; const dist = Math.hypot(ex, ez), min = ra + rb; if (dist >= min || dist < 1e-4) continue; ex /= dist; ez /= dist; const pen = min - dist, ma = a.def.mass, mb = b.def.mass, wa = mb / (ma + mb), wb = ma / (ma + mb);
          a.x -= ex * pen * wa; a.z -= ez * pen * wa; b.x += ex * pen * wb; b.z += ez * pen * wb; for (let k = 0; k < ca.length; k += 2) { ca[k] -= ex * pen * wa; ca[k + 1] -= ez * pen * wa; } for (let k = 0; k < cb.length; k += 2) { cb[k] += ex * pen * wb; cb[k + 1] += ez * pen * wb; }
          const rv = (b.vx - a.vx) * ex + (b.vz - a.vz) * ez; if (rv < 0) { const imp = -rv * 1.25; a.vx -= ex * imp * wa; a.vz -= ez * imp * wa; b.vx += ex * imp * wb; b.vz += ez * imp * wb; const hx = (ca[p] + cb[q]) / 2, hz = (ca[p + 1] + cb[q + 1]) / 2; a.impact(-rv * wa * 1.4, hx, hz); b.impact(-rv * wb * 1.4, hx, hz); a.sleep = b.sleep = false; a.hitBy = b; b.hitBy = a; a.hitT = b.hitT = 0;
            const oa = (ca[p] - a.x) * a.fx + (ca[p + 1] - a.z) * a.fz, ob = (cb[q] - b.x) * b.fx + (cb[q + 1] - b.z) * b.fz; a.h += G.clamp((a.fz * -ex - a.fx * -ez) * oa * imp * wa * 0.012, -0.08, 0.08); b.h += G.clamp((b.fz * ex - b.fx * ez) * ob * imp * wb * 0.012, -0.08, 0.08); } } } }
  };
  V.updateShared = function (t, night) { const on = Math.floor(t * 5) % 2; V.barA.emissiveIntensity = V.sirenAny ? (on ? 9 : 0.2) : 0; V.barB.emissiveIntensity = V.sirenAny ? (on ? 0.2 : 9) : 0; V.beam.opacity = night * 0.5; };
})();
