'use strict';
// Boys Club: password locked roster of playable characters, their homes and cars.
(function () {
  const G = window.G;
  const army = (hair, skin, h, extra) => Object.assign({ sex: 'm', skin, hair, hairCol: 0, beard: 0, top: 'army', hat: 'beret', hatCol: '#3a4a26', height: h, build: 1.04, fat: 0, glasses: 0, shoes: '#141414', bottom: 'trousers', botCol: '#4b5a32', topCol: '#4b5a32' }, extra || {});
  const suit = (col, tie, skin, hair, h, extra) => Object.assign({ sex: 'm', skin, hair, hairCol: 0, beard: 0, top: 'suit', topCol: col, tieCol: tie, bottom: 'trousers', botCol: col, shoes: '#141414', hat: 'none', glasses: 0, height: h, build: 1, fat: 0 }, extra || {});
  G.BOYS = [
    { name: 'Mubtasim Munir', role: 'International Relations Professional and Diplomat', cars: [], app: suit('#1f2a44', '#8f1d1d', 2, 2, 1.01, { glasses: 1 }) },
    { name: 'Ahnaf Tajwar Evan', role: 'Millionaire, Business CEO of Unilever', cars: ['limo'], app: suit('#2b2b2e', '#c9a227', 2, 1, 0.99, { fat: 0.85, build: 1.08 }) },
    { name: 'Etmam Zaman', role: 'Army Officer', army: 1, cars: ['pajero'], app: army(7, 2, 1.03) },
    { name: 'Ishmam Saad', role: 'Army Officer', army: 1, cars: ['pajero'], app: army(1, 3, 1.02, { beard: 3 }) },
    { name: 'Irtiza Sowailim', role: 'Navy Officer', cars: [], app: { sex: 'm', skin: 2, hair: 7, hairCol: 0, beard: 0, top: 'navy', topCol: '#f4f4f0', bottom: 'trousers', botCol: '#f4f4f0', shoes: '#f2f2f2', hat: 'peaked', glasses: 0, height: 1.03, build: 1.02, fat: 0 } },
    { name: 'Labib Khan', role: 'CSE Professional at Apple, lives in USA', cars: ['lambo'], app: { sex: 'm', skin: 1, hair: 2, hairCol: 0, beard: 1, top: 'hoodie', topCol: '#d8d8d8', bottom: 'jeans', botCol: '#1f2a44', shoes: '#f2f2f2', hat: 'none', glasses: 1, height: 1.0, build: 1, fat: 0 } },
    { name: 'Abrar Hossain Siam', role: 'Cyber Security Professional, lives in Australia', cars: ['bmw'], app: { sex: 'm', skin: 2, hair: 3, hairCol: 0, beard: 1, top: 'hoodie', topCol: '#151517', bottom: 'cargo', botCol: '#2b2b2e', shoes: '#1a1a1a', hat: 'cap', hatCol: '#151517', glasses: 0, height: 1.02, build: 1, fat: 0 } },
    { name: 'Ibm Rakin Afnan', role: 'Army Officer', army: 1, cars: ['pajero'], app: army(7, 1, 1.05, { glasses: 2 }) },
    { name: 'Abrar Kabir Zaime', role: 'Army Officer', army: 1, cars: ['pajero'], app: army(1, 3, 1.0, { hat: 'cap' }) },
    { name: 'Abid Hasan', role: 'Car Dealership Owner and Professional Racer', cars: ['hyper', 'gtcoupe', 'limo', 'luxsuv', 'sports'], app: { sex: 'm', skin: 2, hair: 3, hairCol: 0, beard: 1, top: 'jacket', topCol: '#b3201a', bottom: 'jeans', botCol: '#1a1a1a', shoes: '#f2f2f2', hat: 'none', glasses: 2, height: 1.01, build: 1.02, fat: 0 } },
    { name: 'Nuhin Yaser Khan', role: 'Rich Chartered Accountant', cars: ['luxsuv'], app: suit('#56606a', '#1f4f9f', 1, 2, 0.99, { glasses: 1, fat: 0.15 }) },
    { name: 'Sadman Tajwar', role: 'Agency Owner and CEO for International Clients', cars: ['gtcoupe'], app: suit('#34495e', '#16a085', 2, 3, 1.02, { beard: 1 }) },
    { name: 'Jawwad Jaheen', role: 'Army Officer', army: 1, cars: ['pajero'], app: army(7, 2, 1.04, { beard: 0, hatCol: '#8f1d1d' }) },
    { name: 'Zawad Zarir Pasha', role: 'Game Developer, Company Owner and CEO. Very rich', cars: ['hyper'], app: { sex: 'm', skin: 1, hair: 6, hairCol: 0, beard: 2, top: 'jacket', topCol: '#151517', bottom: 'jeans', botCol: '#2c3e50', shoes: '#c0392b', hat: 'none', glasses: 1, height: 1.0, build: 1.03, fat: 0.1 } },
    { name: 'Sifar Mahfuz Adnan', role: 'CEO of Procter and Gamble UK', cars: ['mustang'], app: suit('#151517', '#b3201a', 2, 2, 1.03, { beard: 1 }) }
  ];
  const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); };
  const hash2 = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(16); };
  G.boys = {
    tryUnlock(pw) { if (hash(pw) === '47071190' && hash2(pw) === 'dfd1a4f4') { G.boysUnlocked = true; try { localStorage.setItem('ds_boys', '1'); } catch (e) { } if (G.props) G.props.refreshSigns(); return true; } return false; },
    load() { try { G.boysUnlocked = localStorage.getItem('ds_boys') === '1'; } catch (e) { G.boysUnlocked = false; } },
    house(i) { return G.world.pois.find(p => p.c === 'vip' && +p.n === i); },
    // park the character's cars + the Boys Whip on the road outside their house
    spawnCars(i) {
      const b = G.BOYS[i], p = G.boys.house(i); if (!p || p.rx === null) return; const ids = ['boyswhip'].concat(b.cars);
      for (const v of G.Veh.list.slice()) if (v.boyCar !== undefined && v.driver !== 'player') v.remove();
      const W = G.world, nr = W.nearestRoad(p.rx, p.rz, 30, 7, 0, {}); if (!nr) return; const rd = W.roads[nr.ri], A = rd.k[nr.i], B = rd.k[nr.i + 1]; let dx = W.nx[B] - W.nx[A], dz = W.nz[B] - W.nz[A]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      ids.forEach((id, k) => { const o = (k - (ids.length - 1) / 2) * 6.4, d = G.Veh.DEFS[id], side = rd.w / 2 - d.W / 2 + 0.5; const x = nr.x + dx * o + dz * side, z = nr.z + dz * o - dx * side; if (W.buildingAt(x, z) >= 0) return; const v = G.Veh.create(id, x, z, Math.atan2(dx, dz), { y: nr.y }); v.keep = true; v.boyCar = i; v.owned = true; });
    }
  };
})();
