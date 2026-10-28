/* BatteryIQ studio: the 12 lead-acid machines, built from parts.js. Front faces +z. */
(function () {
  const M = P.M, C = P.PAINT;
  const models = (P.models = {});
  const base = (g, w, d) => P.box(g, w, 0.2, d, 0, 0.1, 0, M.paint(0x242b36), { b: 0.03 });
  const sign = (g, code, name, x, z) => P.sign(g, x == null ? -3.7 : x, 2.3, z == null ? 2.3 : z, code, name);
  const post = (g, x, z, h, color) => P.box(g, 0.14, h, 0.14, x, h / 2 + 0.2, z, M.paint(color || C.dark), { b: 0.02 });
  const fan = (g, x, y, z, blades, speed, r) => {
    const f = new THREE.Group(); f.position.set(x, y, z); g.add(f);
    for (let b = 0; b < blades; b++) { const bl = P.box(f, r, 0.02, r * 0.22, 0, 0, 0, M.steel(), { b: 0 }); bl.rotation.y = (b * Math.PI * 2) / blades; bl.position.set(Math.cos((b * Math.PI * 2) / blades) * r * 0.45, 0, -Math.sin((b * Math.PI * 2) / blades) * r * 0.45); }
    P.spin(f, 'y', speed);
  };
  const cartPaste = (g, x, y, z) => {
    P.box(g, 1.0, 0.5, 0.8, x, y + 0.45, z, M.paint(C.grey));
    P.box(g, 0.9, 0.12, 0.7, x, y + 0.76, z, M.paste(), { b: 0.02 });
    [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]].forEach(a => P.cyl(g, 0.1, 0.08, x + a[0], y + 0.1, z + a[1], M.rubber(), { axis: 'z', seg: 14 }));
  };

  // 1. Grid casting: melting pot, hydraulic book mould, grid stack
  models['GC-01'] = g => {
    base(g, 8.4, 4.2);
    P.cyl(g, 1.15, 1.7, -2.7, 1.05, 0, M.paint(C.dark), { seg: 36 });
    P.cyl(g, 1.2, 0.9, -2.7, 0.75, 0, M.paint(C.orange), { seg: 36 });
    P.torus(g, 1.15, 0.07, -2.7, 1.9, 0, M.steel());
    const melt = M.glow(0xff6a10, 1.1); P.cyl(g, 1.0, 0.05, -2.7, 1.88, 0, melt, { seg: 32 }); P.pulse(melt, 0.9, 0.7, 2);
    P.cyl(g, 1.5, 1.1, -2.7, 3.2, 0, M.steel(), { rTop: 0.4, seg: 24, open: true });
    P.pipe(g, [-2.7, 3.7, 0], [-2.7, 5.2, 0], 0.32, M.steel(), { flanges: true });
    P.gauge(g, -1.55, 1.2, 0.6);
    P.pipePath(g, [[-1.8, 1.85, 0.2], [-1.1, 2.5, 0.2], [0.1, 2.35, 0.3]], 0.11, M.paint(C.orange));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(a => P.cyl(g, 0.12, 3.0, 0.9 + a[0] * 1.15, 1.7, a[1] * 0.75, M.steel(), { seg: 14 }));
    P.box(g, 2.9, 0.5, 2.0, 0.9, 1.15, 0, M.paint(C.dark));
    P.box(g, 2.6, 0.12, 1.7, 0.9, 1.5, 0, M.steel(), { b: 0.02 });
    const up = new THREE.Group(); up.position.set(0.9, 2.2, 0); g.add(up);
    P.box(up, 2.6, 0.5, 1.7, 0, 0, 0, M.steel(), { b: 0.04 });
    P.box(up, 2.2, 0.08, 1.4, 0, -0.28, 0, M.paint(0x5a6270), { b: 0.01 });
    P.bob(up.position, 2.2, 0.35, 2.4);
    P.box(g, 3.1, 0.35, 2.2, 0.9, 3.55, 0, M.paint(C.dark));
    P.cyl(g, 0.3, 0.9, 0.9, 4.15, 0, M.steel(), { seg: 20 });
    const plate = P.gridPlate(); plate.position.set(2.6, 1.28, 0); g.add(plate);
    P.anim.push(t => { if (P.running) { const u = (t * 0.4) % 1; plate.position.x = 2.4 + u * 1.2; plate.visible = u < 0.95; } });
    P.box(g, 1.3, 0.14, 1.3, 3.5, 0.27, 0, M.paint(0x9a7b4f));
    for (let i = 0; i < 7; i++) { const s = P.gridPlate(); s.position.set(3.5, 0.36 + i * 0.07, 0); g.add(s); }
    P.box(g, 1.6, 0.8, 1.0, -0.8, 0.6, -1.6, M.paint(C.teal)); P.motor(g, -0.1, 1.2, -1.6, 0.9, 0.28, 'x', C.blue);
    P.pipePath(g, [[0.2, 0.4, -1.1], [0.2, 1.6, -1.2], [2.1, 1.6, -1.1]], 0.07, M.blue());
    P.cabinet(g, 3.5, 0.2, -1.7, 1.2, 2.2, 0.7, 'GC-01'); sign(g, 'GC-01', 'Grid casting');
    P.hazard(g, 2.0, 0.3, -2.7, 0.21, 1.6, 0);
  };

  // 2. Lead oxide mill: Barton pot, cyclone, baghouse, silo
  models['OM-01'] = g => {
    base(g, 8.4, 4.2);
    P.tank(g, 1.15, 3.1, -1.0, 0.6, 0, M.paint(0xb9c0c8), { legs: false });
    P.torus(g, 1.17, 0.05, -1.0, 2.6, 0, M.paint(C.teal)); P.torus(g, 1.17, 0.05, -1.0, 1.4, 0, M.paint(C.teal));
    P.gauge(g, -1.0, 2.0, 1.2); P.gauge(g, -0.2, 1.0, 1.12);
    P.box(g, 0.9, 0.7, 0.9, -1.0, 4.45, 0, M.paint(C.blue)); P.motor(g, -1.0, 5.1, 0, 0.9, 0.3, 'y', C.blue);
    const shaft = P.cyl(g, 0.09, 0.5, -1.0, 4.0, 0, M.steel(), { seg: 12 }); P.box(shaft, 0.4, 0.05, 0.05, 0, 0, 0, M.red(), { b: 0 }); P.spin(shaft, 'y', 5);
    P.hopper(g, 0.75, 0.25, 0.9, -3.4, 1.6, 0.0);
    for (let i = 0; i < 6; i++) P.box(g, 0.34, 0.14, 0.18, -3.65 + (i % 3) * 0.36, 2.55, -0.15 + Math.floor(i / 3) * 0.3, M.lead(), { b: 0.02 });
    P.cyl(g, 0.17, 1.9, -2.5, 1.65, 0, M.steel(), { axis: 'x', seg: 16 }); P.motor(g, -3.5, 1.2, 0, 0.7, 0.22, 'x', C.teal);
    post(g, -3.4, 0.5, 1.6); post(g, -3.4, -0.5, 1.6);
    P.cyl(g, 0.6, 0.55, 0.5, 0.65, 1.7, M.paint(C.orange), { axis: 'z', seg: 24 }); P.motor(g, 0.5, 0.65, 2.3, 0.8, 0.3, 'z', C.blue);
    P.pipePath(g, [[0.5, 1.25, 1.7], [0.5, 1.25, 1.1], [-0.2, 1.25, 0.5], [-1.0, 1.25, 0.3]], 0.2, M.steel());
    P.cyl(g, 0.7, 1.0, 1.9, 3.1, -0.2, M.steel(), { seg: 28 });
    P.cyl(g, 0.14, 1.5, 1.9, 1.85, -0.2, M.steel(), { rTop: 0.7, seg: 28 });
    P.pipePath(g, [[-1.0, 4.2, 0], [-1.0, 4.7, 0.0], [1.2, 4.7, -0.2], [1.2, 3.4, -0.2]], 0.22, M.steel());
    P.box(g, 2.0, 2.6, 1.7, 3.3, 1.5, -1.1, M.paint(C.cream)); P.box(g, 1.8, 0.4, 1.5, 3.3, 3.0, -1.1, M.paint(C.grey));
    for (let i = 0; i < 4; i++) P.cyl(g, 0.1, 0.3, 2.8 + i * 0.33, 3.35, -1.1, M.paint(C.teal), { seg: 12 });
    P.cyl(g, 0.12, 0.8, 3.3, 0.55, -1.1, M.steel(), { rTop: 0.7, seg: 20 });
    P.tank(g, 0.75, 2.5, 3.4, 0.9, 1.3, M.paint(0xc9d1da), { sight: true, level: 0.55, liquid: M.paint(0x9a8a60) });
    P.cabinet(g, -3.5, 0.2, -1.7, 1.2, 2.2, 0.7, 'OM-01'); sign(g, 'OM-01', 'Lead oxide mill');
  };

  // 3. Paste mixer: bowl with rotating blades, acid dosing, paste cart
  models['PM-01'] = g => {
    base(g, 8.4, 4.2);
    P.cyl(g, 1.55, 1.3, 0, 0.85, 0, M.steel(), { seg: 40 }); P.torus(g, 1.55, 0.07, 0, 1.5, 0, M.paint(C.dark));
    P.cyl(g, 1.45, 0.06, 0, 1.45, 0, M.paste(), { seg: 40 });
    [0, 1, 2, 3].forEach(i => P.cyl(g, 0.1, 0.6, Math.cos(i * 1.57 + 0.8) * 1.3, 0.4, Math.sin(i * 1.57 + 0.8) * 1.3, M.paint(C.dark), { seg: 8 }));
    P.box(g, 0.6, 4.2, 0.6, 0, 2.3, -1.9, M.paint(C.blue)); P.box(g, 0.6, 0.6, 2.6, 0, 4.0, -0.8, M.paint(C.blue));
    P.box(g, 1.2, 0.7, 1.2, 0, 4.0, 0.2, M.paint(C.teal)); P.motor(g, 0, 4.9, 0.2, 1.0, 0.33, 'y', C.blue);
    const rot = new THREE.Group(); rot.position.set(0, 1.55, 0.2); g.add(rot);
    P.cyl(rot, 0.1, 2.3, 0, 1.1, 0, M.steel(), { seg: 12 });
    P.box(rot, 2.3, 0.14, 0.26, 0, 0.05, 0, M.steel(), { b: 0.02 });
    [-1, 1].forEach(s => P.box(rot, 0.2, 0.5, 0.5, s * 1.0, 0.0, 0, M.steel(), { b: 0.02 }));
    P.spin(rot, 'y', 1.6);
    P.tank(g, 0.7, 1.9, -3.1, 0.55, -0.6, M.paint(0xf1f3f5), { sight: true, level: 0.6, liquid: M.paint(0xc9d45a) });
    P.hazard(g, 1.3, 0.28, -3.1, 0.75, 0.2, 0);
    P.cyl(g, 0.3, 0.3, -2.9, 0.55, 1.2, M.paint(C.orange), { axis: 'z', seg: 18 }); P.motor(g, -2.9, 0.55, 1.75, 0.6, 0.22, 'z', C.blue);
    P.pipePath(g, [[-2.6, 0.8, 1.2], [-2.0, 3.4, 1.0], [-0.4, 3.4, 0.9], [-0.1, 2.0, 0.6]], 0.07, M.pvc());
    P.pipePath(g, [[-2.2, 4.6, -1.8], [-0.7, 4.6, -1.0], [-0.5, 2.1, 0.0]], 0.06, M.blue());
    P.cyl(g, 0.2, 0.5, 1.7, 0.85, 0.2, M.steel(), { rTop: 0.45, seg: 18 }); cartPaste(g, 2.7, 0.2, 0.2);
    P.cabinet(g, 3.4, 0.2, -1.7, 1.2, 2.2, 0.7, 'PM-01'); sign(g, 'PM-01', 'Paste mixing');
  };

  // 4. Pasting and parting: paste hopper, rolls, flash dryer, parting knife
  models['PP-01'] = g => {
    base(g, 9.0, 3.6);
    P.conveyor(g, 8.6, 1.3, 0, 1.05, 0, { speed: 0.9, items: 6, factory: () => P.gridPlate(), scale: 1 });
    P.hopper(g, 0.95, 0.5, 1.0, -2.6, 1.8, 0, M.paint(C.cream)); P.box(g, 1.6, 0.18, 1.6, -2.6, 2.85, 0, M.paint(C.grey), { b: 0.02 });
    P.cyl(g, 0.9, 0.06, -2.6, 2.8, 0, M.paste(), { seg: 24 });
    const r1 = P.roll(g, 0.22, 1.5, -2.9, 1.42, 0, M.steel(), 'z'), r2 = P.roll(g, 0.22, 1.5, -2.3, 1.42, 0, M.steel(), 'z');
    P.spin(r1.userData.body, 'y', 3); P.spin(r2.userData.body, 'y', -3);
    [[-3.3, 0.8], [-3.3, -0.8], [-1.9, 0.8], [-1.9, -0.8]].forEach(p => post(g, p[0], p[1], 2.4));
    P.box(g, 2.8, 1.5, 1.9, 0.9, 1.9, 0, M.paint(C.grey)); P.box(g, 2.5, 0.12, 1.4, 0.9, 2.7, 0, M.paint(C.dark));
    [-0.4, 0.4, 1.2].forEach(x => P.cyl(g, 0.22, 0.7, 0.9 + x * 0.8, 3.0, 0.3, M.steel(), { seg: 14 }));
    const heat = M.glow(0xff7a1a, 0.9); P.box(g, 2.2, 0.06, 0.1, 0.9, 1.45, 0.96, heat, { b: 0 }); P.pulse(heat, 0.5, 0.5, 1.8);
    P.pipePath(g, [[1.4, 3.3, 0.3], [1.4, 4.0, 0.3], [3.0, 4.0, -0.8]], 0.16, M.steel());
    const kn = P.roll(g, 0.34, 1.3, 3.0, 1.6, 0, M.steel(), 'z'); P.spin(kn.userData.body, 'y', 4);
    [[2.6, 0.8], [3.4, 0.8], [2.6, -0.8], [3.4, -0.8]].forEach(p => post(g, p[0], p[1], 1.8));
    P.guard(g, 1.0, 1.0, 3.0, 1.7, 0.95, 0);
    P.motor(g, -3.8, 0.55, 1.2, 0.9, 0.3, 'x', C.blue); P.gearbox(g, -3.0, 0.55, 1.2, 0.8, 0.7, 0.7, C.teal);
    P.cabinet(g, 4.2, 0.2, -1.4, 1.1, 2.2, 0.7, 'PP-01'); sign(g, 'PP-01', 'Pasting and parting', -4.0, 1.8);
  };

  // 5. Curing chamber: insulated box, doors, roof fans, steam
  models['CC-01'] = g => {
    base(g, 9.0, 4.6);
    P.box(g, 6.6, 4.0, 3.6, 0.4, 2.2, 0, M.paint(0xe7ebef), { b: 0.06 });
    for (let i = 0; i < 9; i++) P.box(g, 0.06, 3.9, 0.04, -2.6 + i * 0.75, 2.2, 1.83, M.paint(0xc5cbd2), { b: 0 });
    [-1, 1].forEach(s => {
      P.box(g, 1.6, 3.0, 0.1, 0.4 + s * 0.82, 1.9, 1.86, M.paint(0xd7dce2), { b: 0.02 });
      P.box(g, 0.06, 0.7, 0.1, 0.4 + s * 0.2, 1.9, 1.95, M.steel(), { b: 0.01 });
      [0.8, 2.9].forEach(y => P.cyl(g, 0.06, 0.2, 0.4 + s * 1.55, y, 1.9, M.dark(), { seg: 8 }));
    });
    P.box(g, 0.9, 0.7, 0.04, 0.4, 3.3, 1.93, M.glass(), { b: 0 });
    [-1.6, 0.4, 2.4].forEach((x, i) => { P.cyl(g, 0.55, 0.35, x, 4.4, 0, M.paint(C.dark), { seg: 24 }); fan(g, x, 4.62, 0, 4, 9 + i, 0.85); P.steam(g, x, 4.9, 0, 4); });
    P.pipePath(g, [[-3.5, 0.5, 2.1], [-3.5, 3.3, 2.1], [3.0, 3.3, 2.1]], 0.1, M.paint(C.orange));
    [-2.4, -0.2, 2.0].forEach(x => { P.pipe(g, [x, 3.3, 2.1], [x, 3.9, 1.8], 0.06, M.paint(C.orange)); P.torus(g, 0.12, 0.02, x, 3.55, 2.1, M.red(), { axis: 'z' }); });
    P.tank(g, 0.6, 1.4, -4.1, 0.4, -1.4, M.paint(C.cream), { legs: false });
    P.box(g, 1.3, 0.1, 1.0, 3.9, 0.35, 1.7, M.paint(C.dark));
    for (let i = 0; i < 4; i++) { P.box(g, 1.1, 0.05, 0.9, 3.9, 0.55 + i * 0.35, 1.7, M.paint(C.grey), { b: 0.01 }); P.box(g, 0.9, 0.18, 0.7, 3.9, 0.7 + i * 0.35, 1.7, M.paste(), { b: 0.02 }); }
    [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]].forEach(a => P.cyl(g, 0.1, 0.07, 3.9 + a[0], 0.12, 1.7 + a[1], M.rubber(), { axis: 'z', seg: 12 }));
    P.cabinet(g, -4.1, 0.2, 1.2, 1.0, 2.1, 0.6, 'CC-01'); sign(g, 'CC-01', 'Curing and drying', 4.1, -1.9);
  };

  // 6. Cast-on-strap: indexing table with strap moulds, lead pot, light curtains
  models['CS-01'] = g => {
    base(g, 8.2, 4.4);
    P.cyl(g, 0.6, 1.1, 0, 0.75, 0, M.paint(C.dark), { seg: 24 });
    const table = new THREE.Group(); table.position.set(0, 1.35, 0); g.add(table);
    P.cyl(table, 1.9, 0.25, 0, 0, 0, M.paint(C.grey), { seg: 36 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, m = new THREE.Group(); m.position.set(Math.cos(a) * 1.35, 0.3, Math.sin(a) * 1.35); m.rotation.y = -a; table.add(m);
      P.box(m, 0.9, 0.35, 0.55, 0, 0, 0, M.steel(), { b: 0.03 });
      P.box(m, 0.6, 0.7, 0.3, 0, 0.55, 0, M.paint(0x7a828e), { b: 0.02 });
      P.box(m, 0.55, 0.12, 0.28, 0, 0.18, 0, M.lead(), { b: 0.01 });
    }
    P.anim.push(t => { if (P.running) { const u = t / 1.8, k = Math.floor(u), f = u - k, e = f < 0.7 ? 0 : (f - 0.7) / 0.3; table.rotation.y = -(k + e * e * (3 - 2 * e)) * Math.PI / 3; } });
    P.cyl(g, 0.85, 1.3, -3.0, 0.9, 0, M.paint(C.dark), { seg: 28 }); P.cyl(g, 0.9, 0.5, -3.0, 0.65, 0, M.paint(C.orange), { seg: 28 });
    const melt = M.glow(0xff6a10, 1.1); P.cyl(g, 0.72, 0.05, -3.0, 1.52, 0, melt, { seg: 24 }); P.pulse(melt, 0.9, 0.6, 2.4);
    P.pipePath(g, [[-2.5, 1.5, 0], [-1.9, 3.0, 0], [-0.4, 3.0, 0], [-0.2, 2.5, 0]], 0.1, M.paint(C.orange));
    const dp = P.cyl(g, 0.06, 0.5, 0.0, 2.2, 0, M.glow(0xffa030, 1.5), { seg: 8 }); P.anim.push(t => { if (P.running) dp.visible = ((t * 0.55) % 1) < 0.35; });
    P.box(g, 0.3, 3.2, 0.3, 0.0, 2.0, -1.3, M.paint(C.blue)); P.box(g, 0.3, 0.3, 1.7, 0.0, 3.5, -0.5, M.paint(C.blue));
    P.tank(g, 0.4, 0.9, 2.7, 0.2, -1.2, M.paint(C.cream), { legs: false });
    [-3.6, 3.4].forEach(x => { P.box(g, 0.12, 2.2, 0.12, x, 1.3, 1.6, M.yellow(), { b: 0.01 }); P.box(g, 0.02, 1.9, 0.02, x, 1.3, 1.6, M.glow(0xff2a2a, 0.7), { b: 0 }); });
    P.box(g, 6.8, 1.8, 0.01, -0.1, 1.3, 1.6, new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.06, depthWrite: false }), { b: 0 });
    P.cabinet(g, 3.4, 0.2, 0.4, 1.1, 2.2, 0.7, 'CS-01'); sign(g, 'CS-01', 'Cast-on-strap', -3.8, 2.1);
  };

  // 7. Inter-cell welder: gantry, electrodes, transformer, sparks
  models['IW-01'] = g => {
    base(g, 8.6, 3.6);
    P.conveyor(g, 8.2, 1.3, 0, 0.95, 0, { speed: 0.5, items: 2 });
    [[-1.9, 0.9], [-1.9, -0.9], [1.9, 0.9], [1.9, -0.9]].forEach(p => P.box(g, 0.4, 3.6, 0.4, p[0], 2.1, p[1], M.paint(C.teal)));
    P.box(g, 4.4, 0.5, 2.2, 0, 3.9, 0, M.paint(C.teal));
    const head = new THREE.Group(); head.position.set(0, 2.9, 0); g.add(head);
    P.bob(head.position, 2.9, 0.7, 3.2);
    P.cyl(head, 0.13, 0.9, 0, 0.5, 0, M.steel(), { seg: 14 });
    P.box(head, 3.0, 0.3, 0.7, 0, -0.1, 0, M.paint(C.dark));
    [-1.1, 0, 1.1].forEach(x => { P.cyl(head, 0.09, 0.6, x, -0.55, 0, M.copper(), { seg: 10 }); P.cyl(head, 0.13, 0.25, x, -0.28, 0, M.steel(), { seg: 12 }); });
    [-1.1, 0, 1.1].forEach(x => P.cyl(g, 0.11, 0.55, x, 3.5, 0, M.steel(), { seg: 12 }));
    P.sparks(g, 0, 1.55, 0.2); P.sparks(g, 1.1, 1.55, 0.2); P.sparks(g, -1.1, 1.55, 0.2);
    P.box(g, 1.6, 1.4, 1.2, 3.4, 0.9, -1.2, M.paint(C.blue));
    for (let i = 0; i < 6; i++) P.box(g, 1.5, 0.04, 1.14, 3.4, 0.35 + i * 0.22, -1.2, M.paint(0x1c4aa0), { b: 0 });
    P.pipePath(g, [[3.0, 1.6, -1.2], [2.4, 3.0, -0.8], [1.0, 3.6, -0.3], [0.2, 3.0, 0.0]], 0.07, M.copper());
    P.pipePath(g, [[3.0, 1.0, -1.7], [2.2, 1.3, -1.9], [-1.0, 2.8, -0.9], [-1.1, 3.0, 0]], 0.06, M.copper());
    P.guard(g, 3.4, 1.8, 0, 1.9, 1.2, 0);
    P.cabinet(g, -3.7, 0.2, -1.2, 1.1, 2.2, 0.7, 'IW-01'); sign(g, 'IW-01', 'Inter-cell welding', 3.9, 1.9);
  };

  // 8. Heat sealer: guide columns, cylinder, heated platen on a moving head
  models['HS-01'] = g => {
    base(g, 8.6, 3.8);
    P.conveyor(g, 8.2, 1.4, 0, 0.95, 0, { speed: 0.5, items: 3 });
    P.box(g, 2.8, 0.45, 2.2, 0, 1.25, 0, M.paint(C.dark));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(a => P.cyl(g, 0.11, 3.2, a[0] * 1.3, 2.7, a[1] * 0.95, M.steel(), { seg: 16 }));
    P.box(g, 3.1, 0.4, 2.4, 0, 4.4, 0, M.paint(C.teal));
    P.cyl(g, 0.38, 0.9, 0, 4.95, 0, M.steel(), { seg: 22 });
    const head = new THREE.Group(); head.position.set(0, 2.9, 0); g.add(head);
    P.bob(head.position, 2.9, 0.75, 2.6);
    P.cyl(head, 0.13, 1.4, 0, 0.7, 0, M.steel(), { seg: 14 });
    P.box(head, 2.6, 0.35, 1.9, 0, 0.0, 0, M.paint(0x9aa3ae), { b: 0.03 });
    const hot = M.glow(0xff4a1a, 0.9); P.box(head, 2.2, 0.12, 1.5, 0, -0.24, 0, hot, { b: 0.02 }); P.pulse(hot, 0.7, 0.5, 2.2);
    [-0.7, 0, 0.7].forEach(z => P.cyl(head, 0.05, 2.9, 0, 0.0, z, M.paint(C.orange), { axis: 'x', seg: 8 }));
    P.box(g, 1.0, 0.9, 0.8, -3.3, 1.9, 1.0, M.paint(C.grey));
    for (let i = 0; i < 4; i++) P.box(g, 0.9, 0.06, 0.7, -3.3, 1.55 + i * 0.12, 1.0, M.paint(0x15181d), { b: 0.01 });
    P.box(g, 1.2, 1.3, 1.0, 3.3, 1.0, -1.3, M.paint(C.cream)); P.gauge(g, 3.3, 1.4, -0.78);
    P.pipePath(g, [[3.0, 1.4, -0.8], [2.2, 1.8, 0.0], [1.4, 1.5, 0.3]], 0.05, M.blue());
    P.guard(g, 3.6, 2.2, 0, 0.9, 1.7, 0);
    P.cabinet(g, 3.5, 0.2, 1.3, 1.1, 2.2, 0.7, 'HS-01'); sign(g, 'HS-01', 'Cover heat sealing', -3.9, 2.0);
  };

  // 9. Acid filling: manifold with nozzles, acid tank, vacuum pump
  models['AF-01'] = g => {
    base(g, 8.6, 3.8);
    P.conveyor(g, 8.2, 1.4, 0, 0.95, 0, { speed: 0.4, items: 3 });
    [[-1.4, 0.9], [-1.4, -0.9], [1.4, 0.9], [1.4, -0.9]].forEach(p => P.box(g, 0.25, 3.6, 0.25, p[0], 2.0, p[1], M.paint(C.blue)));
    P.box(g, 3.1, 0.3, 2.2, 0, 3.9, 0, M.paint(C.blue));
    const man = new THREE.Group(); man.position.set(0, 2.7, 0); g.add(man); P.bob(man.position, 2.7, 0.55, 2.0);
    P.box(man, 2.1, 0.3, 0.8, 0, 0, 0, M.paint(C.cream), { b: 0.03 });
    for (let i = 0; i < 6; i++) P.cyl(man, 0.06, 0.5, -0.85 + i * 0.34, -0.38, 0, M.paint(0xd8c64a), { seg: 8 });
    P.cyl(man, 0.12, 0.9, 0, 0.6, 0, M.steel(), { seg: 14 });
    P.pipePath(g, [[0, 3.4, 0.2], [0.6, 3.5, 0.8], [2.2, 3.5, 0.8], [3.2, 2.0, 1.0]], 0.09, M.pvc());
    P.tank(g, 0.95, 2.4, 3.3, 0.6, 0.9, M.paint(0xf1f3f5), { sight: true, level: 0.7, liquid: M.paint(0xc9d45a) });
    P.hazard(g, 1.6, 0.3, 3.3, 0.9, 1.9, 0); P.gauge(g, 3.3, 2.7, 1.95);
    P.cyl(g, 0.5, 0.6, -3.2, 0.65, 1.2, M.paint(C.orange), { axis: 'z', seg: 22 }); P.motor(g, -3.2, 0.65, 1.8, 0.8, 0.3, 'z', C.blue);
    P.pipePath(g, [[-3.2, 1.0, 1.0], [-2.2, 2.4, 0.6], [-0.4, 3.0, 0.3]], 0.08, M.blue());
    P.box(g, 2.8, 0.1, 1.5, 0, 0.25, 0, M.paint(0x202830), { b: 0.01 });
    P.cabinet(g, -3.6, 0.2, -1.3, 1.1, 2.2, 0.7, 'AF-01'); sign(g, 'AF-01', 'Acid filling', 3.9, -1.9);
  };

  // 10. Formation bath: water bath with batteries, busbar and leads, chiller, rectifier
  models['FB-01'] = g => {
    base(g, 9.2, 4.2);
    P.box(g, 7.2, 1.2, 2.6, 0.4, 0.8, 0, M.steel(), { b: 0.05 });
    const water = M.water(); P.box(g, 6.9, 0.04, 2.3, 0.4, 1.42, 0, water, { b: 0 });
    P.anim.push(t => { water.opacity = 0.5 + 0.08 * Math.sin(t * 2); });
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { const b = P.battery(); b.scale.setScalar(0.85); b.position.set(-2.6 + i * 1.12 + 0.4, 1.0, -0.62 + r * 1.24); g.add(b); }
    P.box(g, 7.0, 0.18, 0.3, 0.4, 3.0, 0, M.copper(), { b: 0.02 }); [-3.0, 3.8].forEach(x => P.box(g, 0.2, 2.8, 0.2, x, 1.6, 0, M.paint(C.dark)));
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { const x = -2.6 + i * 1.12 + 0.4 + 0.35, z = -0.62 + r * 1.24 + 0.17; P.pipe(g, [x, 3.0, 0], [x, 1.9, z], 0.04, M.copper()); }
    for (let i = 0; i < 12; i++) { const led = M.glow(0x34d399, 1.2); P.box(g, 0.1, 0.1, 0.05, -2.6 + i * 0.6, 3.35, 0.2, led, { b: 0 }); P.anim.push(t => { if (P.running) led.emissiveIntensity = 0.5 + 0.9 * (0.5 + 0.5 * Math.sin(t * 3 + i)); }); }
    P.pipePath(g, [[-4.0, 0.6, 1.3], [-4.0, 0.6, 1.9], [4.1, 0.6, 1.9], [4.1, 0.6, 1.3]], 0.09, M.blue());
    P.box(g, 1.8, 1.6, 1.3, -4.3, 1.0, -1.3, M.paint(C.blue));
    [-0.4, 0.4].forEach(dx => { P.cyl(g, 0.4, 0.1, -4.3 + dx, 1.85, -1.3, M.paint(C.dark), { seg: 20 }); fan(g, -4.3 + dx, 1.95, -1.3, 3, 12, 0.6); });
    P.cabinet(g, 4.2, 0.2, -1.4, 1.3, 2.4, 0.8, 'FB-01'); sign(g, 'FB-01', 'Formation bath', -4.3, 2.0);
  };

  // 11. High-rate tester and terminal burner: load bank, clamps, torches, fume hood
  models['HR-01'] = g => {
    base(g, 8.4, 4.0);
    P.box(g, 2.2, 0.9, 1.5, 0, 0.65, 0, M.paint(C.grey));
    const bat = P.battery(); bat.position.set(0, 1.1, 0); bat.scale.setScalar(1.2); g.add(bat);
    [[-1.7, 1.2], [1.7, 1.2], [-1.7, -1.2], [1.7, -1.2]].forEach(p => P.box(g, 0.14, 3.0, 0.14, p[0], 1.7, p[1], M.paint(C.teal)));
    P.box(g, 3.6, 0.2, 2.6, 0, 3.3, 0, M.paint(C.teal)); P.guard(g, 3.3, 2.6, 0, 0.2, 1.25, 0); P.guard(g, 2.4, 2.6, 1.75, 0.2, 0, Math.PI / 2);
    [-0.45, 0.45].forEach(x => { P.box(g, 0.28, 0.25, 0.3, x, 1.9, 0.2, M.copper(), { b: 0.02 }); P.cyl(g, 0.09, 0.8, x, 2.4, 0.2, M.steel(), { seg: 10 }); P.cyl(g, 0.07, 0.6, x, 3.0, 0.2, M.paint(C.dark), { seg: 10 }); P.flame(g, x, 1.65, 0.2, 1); });
    P.pipePath(g, [[-0.45, 2.5, 0.35], [-1.2, 2.6, 1.0], [-3.0, 2.4, 1.0]], 0.13, M.copper());
    P.pipePath(g, [[0.45, 2.5, 0.35], [1.0, 2.9, 0.0], [-2.9, 3.2, -0.6]], 0.13, M.copper());
    P.box(g, 1.8, 2.4, 1.3, -3.4, 1.4, 0, M.paint(C.dark));
    for (let i = 0; i < 8; i++) P.box(g, 1.5, 0.04, 0.02, -3.4, 0.7 + i * 0.22, 0.67, M.steel(), { b: 0 });
    [-0.45, 0.45].forEach(dx => { P.cyl(g, 0.38, 0.1, -3.4 + dx, 2.65, 0, M.paint(C.grey), { seg: 20 }); fan(g, -3.4 + dx, 2.75, 0, 3, 13, 0.55); });
    [3.2, 3.7].forEach((x, i) => { const col = i ? 0x2f6fd6 : 0xc8232b; P.cyl(g, 0.22, 1.4, x, 0.9, 1.3, M.paint(col), { seg: 20 }); P.dome(g, 0.22, x, 1.6, 1.3, M.paint(col)); });
    P.pipePath(g, [[3.2, 1.5, 1.1], [1.5, 1.4, 0.9], [0.45, 1.8, 0.3]], 0.035, M.paint(C.orange));
    P.cyl(g, 1.2, 0.8, 0, 3.9, 0, M.steel(), { rTop: 0.3, seg: 24, open: true }); P.pipe(g, [0, 4.3, 0], [0, 5.4, 0], 0.3, M.steel(), { flanges: true });
    P.cabinet(g, 3.5, 0.2, -1.4, 1.1, 2.2, 0.7, 'HR-01'); sign(g, 'HR-01', 'High-rate tester', -3.9, 2.0);
  };

  // 12. Labelling and packing: applicator, printer, scanner arch, shrink tunnel, pallet
  models['LB-01'] = g => {
    base(g, 9.2, 4.0);
    P.conveyor(g, 8.8, 1.4, -0.2, 0.95, 0, { speed: 0.6, items: 4 });
    [-2.9, -2.0].forEach(x => { post(g, x, 0.95, 3.0); post(g, x, -0.95, 3.0); });
    P.box(g, 1.1, 0.14, 2.0, -2.45, 3.0, 0, M.paint(C.dark));
    P.box(g, 1.4, 1.6, 0.35, -2.45, 2.2, -1.2, M.paint(C.cream));
    const reel1 = P.roll(g, 0.5, 0.12, -2.8, 2.5, -0.98, M.paint(C.white), 'z'), reel2 = P.roll(g, 0.38, 0.12, -2.1, 1.85, -0.98, M.paint(C.white), 'z');
    P.spin(reel1.userData.body, 'y', 1.5); P.spin(reel2.userData.body, 'y', -2);
    P.box(g, 0.9, 0.04, 0.6, -2.45, 1.4, 0.2, M.paint(0xf7f7f2), { b: 0 }); P.box(g, 0.1, 0.3, 1.0, -2.45, 1.3, 0.6, M.steel(), { b: 0.01 });
    P.box(g, 1.2, 0.9, 0.9, -1.0, 1.9, -1.2, M.paint(C.white)); P.box(g, 0.9, 0.35, 0.03, -1.0, 2.05, -0.74, M.glow(0x34d399, 0.7), { b: 0 });
    P.box(g, 0.14, 2.6, 0.14, 0.6, 1.6, 0.95, M.paint(C.teal)); P.box(g, 0.14, 2.6, 0.14, 0.6, 1.6, -0.95, M.paint(C.teal)); P.box(g, 0.2, 0.3, 2.0, 0.6, 2.95, 0, M.paint(C.teal));
    const beam = new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.35, depthWrite: false }); P.box(g, 0.02, 1.4, 1.7, 0.6, 1.9, 0, beam, { b: 0 }); P.anim.push(t => { beam.opacity = 0.2 + 0.25 * Math.abs(Math.sin(t * 6)); });
    P.box(g, 2.4, 1.5, 1.8, 2.5, 1.9, 0, M.paint(C.grey)); P.box(g, 2.3, 0.1, 1.5, 2.5, 2.7, 0, M.paint(C.dark));
    const hot = M.glow(0xff7a1a, 0.6); P.box(g, 1.8, 0.05, 0.06, 2.5, 1.35, 0.92, hot, { b: 0 }); P.pulse(hot, 0.4, 0.4, 2);
    [1.3, 3.7].forEach(x => P.box(g, 0.03, 1.0, 1.5, x, 1.5, 0, M.paint(0x15181d), { b: 0 }));
    P.box(g, 1.8, 0.2, 1.6, 4.0, 0.3, 1.2, M.paint(0x9a7b4f));
    for (let l = 0; l < 3; l++) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { const bt = P.battery(); bt.scale.setScalar(0.72); bt.position.set(3.65 + a * 0.75, 0.4 + l * 0.52, 0.9 + b * 0.62); g.add(bt); }
    P.cabinet(g, 4.2, 0.2, -1.4, 1.1, 2.2, 0.7, 'LB-01'); sign(g, 'LB-01', 'Labelling and packing', -4.2, 2.0);
  };
})();
