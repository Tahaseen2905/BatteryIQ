/* BatteryIQ studio: reusable industrial parts (three.js r128, no modules).
 * Every helper takes a parent group and CENTRE positions, y up, machine front toward +z. */
(function () {
  const P = (window.P = { anim: [], running: true, lamps: [], t: 0 });
  const cache = {};
  const mk = (k, f) => cache[k] || (cache[k] = f());
  const std = (k, color, rough, metal, extra) => mk('m' + k, () => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, extra || {})));

  P.M = {
    paint: c => std('p' + c, c, 0.42, 0.3),
    steel: () => std('steel', 0xb4bdc8, 0.32, 0.9),
    dark: () => std('dark', 0x2b323d, 0.55, 0.6),
    rubber: () => std('rub', 0x14171c, 0.95, 0),
    glass: () => std('glass', 0xa8d8f0, 0.08, 0.1, { transparent: true, opacity: 0.25, depthWrite: false }),
    lead: () => std('lead', 0x8a929d, 0.28, 0.95),
    copper: () => std('cu', 0xb8733a, 0.3, 0.9),
    white: () => std('white', 0xe9eef3, 0.5, 0.1),
    yellow: () => std('yel', 0xf2c230, 0.45, 0.2),
    red: () => std('red', 0xc8232b, 0.5, 0.1),
    blue: () => std('blue', 0x2f6fd6, 0.45, 0.3),
    hdpe: () => std('hdpe', 0xe3e7eb, 0.6, 0),
    pvc: () => std('pvc', 0xd8c64a, 0.5, 0),
    water: () => std('water', 0x3aa0d8, 0.1, 0.1, { transparent: true, opacity: 0.55, depthWrite: false }),
    paste: () => std('paste', 0x6b5a4a, 0.95, 0),
    concrete: () => std('conc', 0x3b4350, 0.9, 0.05),
    glow: (hex, i) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: i || 1.2, roughness: 0.5 }),
  };
  const PAINT = { grey: 0x7d8794, blue: 0x2f6fd6, teal: 0x20a58a, orange: 0xe08a2e, cream: 0xd9d4c4, dark: 0x3a424e, green: 0x3f8f5a, red: 0xc8232b };
  P.PAINT = PAINT;

  function place(g, m, x, y, z, o) {
    m.position.set(x, y, z);
    if (o && o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    m.castShadow = !(m.material && m.material.transparent);
    m.receiveShadow = true;
    g.add(m);
    return m;
  }

  P.box = (g, w, h, d, x, y, z, mat, o) => {
    o = o || {};
    const b = Math.min(o.b == null ? 0.045 : o.b, Math.min(w, h, d) * 0.22);
    const geo = b > 0.004 ? mk(`b${w}|${h}|${d}|${b}`, () => {
      const sw = w - 2 * b, sh = h - 2 * b, s = new THREE.Shape();
      s.moveTo(-sw / 2, -sh / 2); s.lineTo(sw / 2, -sh / 2); s.lineTo(sw / 2, sh / 2); s.lineTo(-sw / 2, sh / 2); s.closePath();
      const e = new THREE.ExtrudeGeometry(s, { depth: Math.max(d - 2 * b, 0.001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 1 });
      e.translate(0, 0, -(d - 2 * b) / 2);
      return e;
    }) : mk(`B${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
    return place(g, new THREE.Mesh(geo, mat), x, y, z, o);
  };

  P.cyl = (g, r, h, x, y, z, mat, o) => {
    o = o || {};
    const seg = o.seg || 28, rt = o.rTop == null ? r : o.rTop;
    const geo = mk(`c${r}|${rt}|${h}|${seg}|${o.open ? 1 : 0}`, () => new THREE.CylinderGeometry(rt, r, h, seg, 1, !!o.open));
    const m = new THREE.Mesh(geo, mat);
    if (o.axis === 'x') m.rotation.z = Math.PI / 2;
    if (o.axis === 'z') m.rotation.x = Math.PI / 2;
    return place(g, m, x, y, z);
  };

  P.sphere = (g, r, x, y, z, mat, o) => {
    o = o || {};
    const m = new THREE.Mesh(mk(`s${r}`, () => new THREE.SphereGeometry(r, 20, 14)), mat);
    if (o.scale) m.scale.set(o.scale[0], o.scale[1], o.scale[2]);
    return place(g, m, x, y, z);
  };

  P.dome = (g, r, x, y, z, mat) => { // upper half of a sphere, flattened
    const m = new THREE.Mesh(mk(`d${r}`, () => new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat);
    m.scale.y = 0.42;
    return place(g, m, x, y, z);
  };

  P.torus = (g, R, r, x, y, z, mat, o) => {
    o = o || {};
    const m = new THREE.Mesh(mk(`t${R}|${r}`, () => new THREE.TorusGeometry(R, r, 8, 28)), mat);
    if (o.axis !== 'z') m.rotation.x = Math.PI / 2;
    return place(g, m, x, y, z);
  };

  /** Straight pipe between two points. */
  P.pipe = (g, a, b, r, mat, o) => {
    const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]), d = B.clone().sub(A), len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat || P.M.steel());
    m.position.copy(A).add(d.clone().multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m.castShadow = true;
    g.add(m);
    if (o && o.flanges) [A, B].forEach(p => { const f = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.6, r * 1.6, r * 0.5, 14), P.M.dark()); f.position.copy(p); f.quaternion.copy(m.quaternion); g.add(f); });
    return m;
  };
  /** Pipe through several points, with a ball at each bend. */
  P.pipePath = (g, pts, r, mat) => {
    for (let i = 0; i < pts.length - 1; i++) P.pipe(g, pts[i], pts[i + 1], r, mat);
    for (let i = 1; i < pts.length - 1; i++) P.sphere(g, r * 1.05, pts[i][0], pts[i][1], pts[i][2], mat || P.M.steel());
  };

  // ---------- textures ----------
  const canvasTex = (w, h, draw, repeat) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  };
  P.canvasTex = canvasTex;
  P.gridTex = () => mk('gridTex', () => canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#8f98a4'; x.fillRect(0, 0, w, h); x.strokeStyle = '#4a525e'; x.lineWidth = 3;
    for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 16); x.lineTo(w, i * 16); x.stroke(); }
  }));
  P.stripeTex = () => mk('stripeTex', () => canvasTex(64, 8, (x, w, h) => { x.fillStyle = '#1b1f26'; x.fillRect(0, 0, w, h); x.fillStyle = '#2b323d'; for (let i = 0; i < 8; i++) x.fillRect(i * 8, 0, 3, h); }, true));
  P.hazardTex = () => mk('hazTex', () => canvasTex(128, 32, (x, w, h) => {
    x.fillStyle = '#f2c230'; x.fillRect(0, 0, w, h); x.fillStyle = '#111'; for (let i = -2; i < 10; i++) { x.beginPath(); x.moveTo(i * 20, h); x.lineTo(i * 20 + 10, h); x.lineTo(i * 20 + 30, 0); x.lineTo(i * 20 + 20, 0); x.fill(); }
  }, true));
  const screenTex = (code, lines) => canvasTex(160, 100, (x, w, h) => {
    x.fillStyle = '#06201b'; x.fillRect(0, 0, w, h); x.fillStyle = '#34d399'; x.font = 'bold 20px monospace'; x.fillText(code, 8, 24);
    x.font = '13px monospace'; (lines || ['RUN  AUTO', 'OPC UA  OK', 'CYCLE  OK']).forEach((l, i) => x.fillText(l, 8, 48 + i * 18));
    x.strokeStyle = '#0f7f66'; x.strokeRect(2, 2, w - 4, h - 4);
  });

  // ---------- frames, cabinets, rails ----------
  /** Four posts and a top rail frame. y0 = floor level. */
  P.frame = (g, w, h, d, x, y0, z, color, t) => {
    t = t || 0.12; const m = P.M.paint(color || PAINT.dark);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(a => P.box(g, t, h, t, x + a[0] * (w / 2 - t / 2), y0 + h / 2, z + a[1] * (d / 2 - t / 2), m, { b: 0.02 }));
    [y0 + t / 2, y0 + h - t / 2].forEach(yy => {
      P.box(g, w, t, t, x, yy, z - d / 2 + t / 2, m, { b: 0.02 }); P.box(g, w, t, t, x, yy, z + d / 2 - t / 2, m, { b: 0.02 });
      P.box(g, t, t, d, x - w / 2 + t / 2, yy, z, m, { b: 0.02 }); P.box(g, t, t, d, x + w / 2 - t / 2, yy, z, m, { b: 0.02 });
    });
  };

  P.handrail = (g, w, d, x, y0, z, h) => {
    h = h || 1; const y = P.M.yellow();
    const nw = Math.max(1, Math.round(w / 1.3)), nd = Math.max(1, Math.round(d / 1.3));
    for (let i = 0; i <= nw; i++) [-d / 2, d / 2].forEach(zz => P.box(g, 0.05, h, 0.05, x - w / 2 + (i * w) / nw, y0 + h / 2, z + zz, y, { b: 0.01 }));
    for (let i = 1; i < nd; i++) [-w / 2, w / 2].forEach(xx => P.box(g, 0.05, h, 0.05, x + xx, y0 + h / 2, z - d / 2 + (i * d) / nd, y, { b: 0.01 }));
    [h, h * 0.5].forEach(yy => { [-d / 2, d / 2].forEach(zz => P.box(g, w, 0.04, 0.04, x, y0 + yy, z + zz, y, { b: 0.01 })); [-w / 2, w / 2].forEach(xx => P.box(g, 0.04, 0.04, d, x + xx, y0 + yy, z, y, { b: 0.01 })); });
  };

  P.ladder = (g, x, y0, z, h) => {
    const m = P.M.yellow(); P.box(g, 0.05, h, 0.05, x - 0.2, y0 + h / 2, z, m, { b: 0.01 }); P.box(g, 0.05, h, 0.05, x + 0.2, y0 + h / 2, z, m, { b: 0.01 });
    for (let i = 1; i < h / 0.3; i++) P.cyl(g, 0.02, 0.4, x, y0 + i * 0.3, z, P.M.steel(), { axis: 'x', seg: 8 });
  };

  /** Stack light tower. Registers its lamps so the studio can colour them by machine state. */
  P.stackLight = (g, x, y, z) => {
    P.cyl(g, 0.04, 0.7, x, y + 0.35, z, P.M.dark(), { seg: 10 });
    const cols = [0xe24b4a, 0xf2a93b, 0x34d399];
    cols.forEach((c, i) => {
      const m = P.M.glow(c, 0.15); m.userData = { color: c, i };
      P.cyl(g, 0.1, 0.14, x, y + 0.78 + i * 0.16, z, m, { seg: 14 });
      P.lamps.push(m);
    });
    P.cyl(g, 0.11, 0.04, x, y + 1.28, z, P.M.dark(), { seg: 14 });
  };
  P.setLamps = status => { // green when running, amber on attention, red when stopped
    P.lamps.forEach(m => { const on = (status === 'stopped' && m.userData.i === 0) || (status === 'attention' && m.userData.i === 1) || (status !== 'stopped' && status !== 'attention' && m.userData.i === 2); m.emissiveIntensity = on ? 1.6 : 0.08; });
  };

  /** Control cabinet with door, louvres, a glowing screen and a stack light. */
  P.cabinet = (g, x, y0, z, w, h, d, code, o) => {
    o = o || {}; const body = P.M.paint(o.color || PAINT.cream);
    P.box(g, w, h, d, x, y0 + h / 2, z, body, { b: 0.05 });
    P.box(g, w * 0.92, h * 0.92, 0.03, x, y0 + h / 2, z + d / 2 + 0.01, P.M.paint(0xc9c4b3), { b: 0.01 });
    P.box(g, 0.05, 0.25, 0.05, x + w * 0.4, y0 + h * 0.5, z + d / 2 + 0.05, P.M.steel(), { b: 0.01 });
    for (let i = 0; i < 4; i++) P.box(g, w * 0.5, 0.03, 0.02, x - w * 0.12, y0 + h * 0.12 + i * 0.07, z + d / 2 + 0.03, P.M.dark(), { b: 0.005 });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.55, w * 0.34), new THREE.MeshBasicMaterial({ map: screenTex(code, o.lines) }));
    scr.position.set(x - w * 0.08, y0 + h * 0.66, z + d / 2 + 0.035); g.add(scr);
    [[0xe24b4a, -0.28], [0xf2a93b, 0], [0x34d399, 0.28]].forEach(a => P.cyl(g, 0.045, 0.05, x + w * 0.3, y0 + h * 0.84 + a[1] * 0.2, z + d / 2 + 0.05, P.M.glow(a[0], 0.6), { axis: 'z', seg: 12 }));
    if (!o.noLight) P.stackLight(g, x, y0 + h, z);
  };

  P.motor = (g, x, y, z, len, rad, axis, color) => {
    const grp = new THREE.Group(); grp.position.set(x, y, z);
    if (axis === 'x') grp.rotation.z = Math.PI / 2; else if (axis === 'z') grp.rotation.x = Math.PI / 2;
    const body = P.M.paint(color || PAINT.blue);
    P.cyl(grp, rad, len, 0, 0, 0, body, { seg: 28 });
    for (let i = 0; i < 8; i++) P.cyl(grp, rad + 0.03, 0.03, 0, -len * 0.4 + (len * 0.8 * i) / 7, 0, P.M.dark(), { seg: 28 });
    P.cyl(grp, rad * 0.82, 0.16, 0, len / 2 + 0.08, 0, body, { rTop: rad * 0.95, seg: 24 });
    P.cyl(grp, 0.05 + rad * 0.12, 0.32, 0, -len / 2 - 0.16, 0, P.M.steel(), { seg: 12 });
    P.box(grp, rad * 0.7, rad * 0.45, rad * 0.8, rad + 0.1, len * 0.15, 0, body);
    g.add(grp);
    return grp;
  };

  P.gearbox = (g, x, y, z, w, h, d, color) => {
    const m = P.M.paint(color || PAINT.blue);
    P.box(g, w, h, d, x, y, z, m);
    P.box(g, w + 0.08, 0.08, d + 0.08, x, y - h / 2 + 0.05, z, P.M.dark());
    for (let i = 1; i < 4; i++) P.box(g, 0.05, h * 0.85, d + 0.04, x - w / 2 + (w * i) / 4, y, z, P.M.dark(), { b: 0.01 });
    P.box(g, w * 0.5, 0.2, d * 0.55, x, y + h / 2 + 0.1, z, m);
  };

  P.gauge = (g, x, y, z, label) => {
    P.cyl(g, 0.17, 0.08, x, y, z, P.M.steel(), { axis: 'z', seg: 20 });
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = '#f4f4f0'; c.beginPath(); c.arc(32, 32, 30, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 2;
      for (let i = 0; i < 9; i++) { const a = Math.PI * 0.8 + i * (Math.PI * 1.4 / 8); c.beginPath(); c.moveTo(32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24); c.lineTo(32 + Math.cos(a) * 29, 32 + Math.sin(a) * 29); c.stroke(); }
      c.strokeStyle = '#d33'; c.lineWidth = 3; c.beginPath(); c.moveTo(32, 32); c.lineTo(32 + Math.cos(Math.PI * 1.5) * 20, 32 + Math.sin(Math.PI * 1.5) * 20); c.stroke();
    }) }));
    face.position.set(x, y, z + 0.045); g.add(face);
  };

  P.sign = (g, x, y, z, code, name) => {
    P.cyl(g, 0.04, y, x, y / 2, z, P.M.dark(), { seg: 8 });
    const t = canvasTex(256, 96, (c, w, h) => {
      c.fillStyle = '#0f7f66'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 40px sans-serif'; c.fillText(code, 12, 44);
      c.font = '17px sans-serif'; c.fillText((name || '').slice(0, 26), 12, 76);
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.56), new THREE.MeshBasicMaterial({ map: t }));
    p.position.set(x, y + 0.1, z + 0.05); g.add(p);
    P.box(g, 1.56, 0.62, 0.04, x, y + 0.1, z, P.M.dark(), { b: 0.01 });
  };

  P.hazard = (g, w, h, x, y, z, rotY) => {
    const t = P.hazardTex().clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(w * 2)), 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(x, y, z); if (rotY) m.rotation.y = rotY; g.add(m);
  };

  /** Safety guard: clear panel in a yellow frame. */
  P.guard = (g, w, h, x, y0, z, rotY) => {
    const grp = new THREE.Group(); grp.position.set(x, y0, z); if (rotY) grp.rotation.y = rotY;
    P.box(grp, w, h, 0.03, 0, h / 2, 0, P.M.glass(), { b: 0 });
    const y = P.M.yellow();
    P.box(grp, w, 0.06, 0.06, 0, 0.03, 0, y, { b: 0.01 }); P.box(grp, w, 0.06, 0.06, 0, h - 0.03, 0, y, { b: 0.01 });
    P.box(grp, 0.06, h, 0.06, -w / 2 + 0.03, h / 2, 0, y, { b: 0.01 }); P.box(grp, 0.06, h, 0.06, w / 2 - 0.03, h / 2, 0, y, { b: 0.01 });
    g.add(grp); return grp;
  };

  // ---------- tanks and hoppers ----------
  P.tank = (g, r, h, x, y0, z, mat, o) => {
    o = o || {}; mat = mat || P.M.steel();
    P.cyl(g, r, h, x, y0 + h / 2, z, mat, { seg: 36 });
    P.dome(g, r, x, y0 + h, z, mat);
    for (let i = 1; i < 4; i++) P.torus(g, r + 0.015, 0.025, x, y0 + (h * i) / 4, z, P.M.dark());
    if (o.legs !== false) [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + Math.PI / 4; P.cyl(g, 0.06, 0.5, x + Math.cos(a) * r * 0.85, y0 - 0.25 + 0.0, z + Math.sin(a) * r * 0.85, P.M.dark(), { seg: 8 }); });
    if (o.sight) { P.box(g, 0.12, h * 0.6, 0.06, x, y0 + h * 0.5, z + r + 0.02, P.M.glass(), { b: 0 }); P.box(g, 0.1, h * 0.6 * (o.level || 0.6), 0.05, x, y0 + h * 0.2 + h * 0.3 * (o.level || 0.6), z + r + 0.025, o.liquid || P.M.water(), { b: 0 }); }
  };

  P.hopper = (g, rTop, rBot, h, x, y0, z, mat) => {
    mat = mat || P.M.paint(PAINT.cream);
    P.cyl(g, rBot, h, x, y0 + h / 2, z, mat, { rTop, seg: 24 });
    P.torus(g, rTop, 0.04, x, y0 + h, z, P.M.dark());
  };

  // ---------- animation ----------
  P.spin = (obj, axis, speed) => P.anim.push((t, dt) => { if (P.running) obj.rotation[axis] += speed * dt; });
  P.osc = (obj, prop, axis, base, amp, speed, phase) => P.anim.push((t) => { if (P.running) obj[prop][axis] = base + amp * Math.sin(t * speed + (phase || 0)); });
  P.bob = (v, base, amp, speed) => P.anim.push(t => { if (P.running) v.y = base + amp * Math.sin(t * speed); });
  P.pulse = (mat, base, amp, speed) => P.anim.push((t) => { if (P.running) mat.emissiveIntensity = base + amp * (0.5 + 0.5 * Math.sin(t * speed)); });
  P.update = (t, dt) => { P.t = t; P.anim.forEach(f => f(t, dt)); };

  // ---------- batteries and conveyors ----------
  P.battery = (mat) => {
    const g = new THREE.Group();
    P.box(g, 1.1, 0.7, 0.62, 0, 0.35, 0, mat || P.M.paint(PAINT.red), { b: 0.04 });
    P.box(g, 1.04, 0.1, 0.56, 0, 0.74, 0, P.M.paint(0x15181d), { b: 0.02 });
    [-0.4, 0.4].forEach(x => P.cyl(g, 0.055, 0.1, x, 0.84, 0.2, P.M.lead(), { seg: 10 }));
    for (let i = 0; i < 6; i++) P.cyl(g, 0.04, 0.04, -0.4 + i * 0.16, 0.8, -0.12, P.M.white(), { seg: 8 });
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.34), new THREE.MeshBasicMaterial({ map: canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#f7f7f2'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8232b'; c.fillRect(0, 0, w, 18); c.fillStyle = '#111'; c.font = 'bold 14px sans-serif'; c.fillText('EXIDE', 6, 14); c.font = '10px monospace'; c.fillText('12V  74Ah', 6, 38); c.fillRect(70, 26, 50, 26); }) }));
    lab.position.set(0, 0.36, 0.315); g.add(lab);
    return g;
  };

  /** A belt conveyor along x with moving slats and batteries riding on it. Returns the belt top height. */
  P.conveyor = (g, len, w, x, y, z, o) => {
    o = o || {}; const grp = new THREE.Group(); grp.position.set(x, 0, z); g.add(grp);
    P.box(grp, len, 0.18, 0.1, 0, y - 0.15, -w / 2, P.M.paint(PAINT.dark), { b: 0.02 });
    P.box(grp, len, 0.18, 0.1, 0, y - 0.15, w / 2, P.M.paint(PAINT.dark), { b: 0.02 });
    const tex = P.stripeTex().clone(); tex.needsUpdate = true; tex.repeat.set(len * 2, 1);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, w - 0.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    belt.position.set(0, y - 0.05, 0); belt.receiveShadow = true; grp.add(belt);
    P.anim.push((t, dt) => { if (P.running) tex.offset.x -= (o.speed || 0.5) * dt * 0.45; });
    [-len / 2, len / 2].forEach(xx => P.cyl(grp, 0.12, w - 0.05, xx, y - 0.08, 0, P.M.steel(), { axis: 'z', seg: 16 }));
    for (let i = 0; i < len / 1.6; i++) { const lx = -len / 2 + 0.6 + i * 1.6; P.box(grp, 0.1, y - 0.2, 0.1, lx, (y - 0.2) / 2, -w / 2, P.M.paint(PAINT.dark), { b: 0.01 }); P.box(grp, 0.1, y - 0.2, 0.1, lx, (y - 0.2) / 2, w / 2, P.M.paint(PAINT.dark), { b: 0.01 }); }
    const items = [];
    const n = o.items == null ? Math.max(2, Math.floor(len / 2)) : o.items;
    for (let i = 0; i < n; i++) { const b = o.factory ? o.factory() : P.battery(o.itemMat); b.position.set(0, y, 0); b.scale.setScalar(o.scale || 0.8); grp.add(b); items.push({ b, u: i / n }); }
    P.anim.push((t, dt) => { if (!P.running) return; items.forEach(it => { it.u = (it.u + dt * (o.speed || 0.5) * 0.12) % 1; it.b.position.x = -len / 2 + 0.5 + it.u * (len - 1); }); });
    return grp;
  };

  /** A roller whose axis runs along x or z. Spin it with P.spin(roll.userData.body, 'y', speed). */
  P.roll = (g, r, len, x, y, z, mat, axis) => {
    const grp = new THREE.Group(); grp.position.set(x, y, z);
    if (axis === 'x') grp.rotation.z = Math.PI / 2; else grp.rotation.x = Math.PI / 2;
    const body = P.cyl(grp, r, len, 0, 0, 0, mat || P.M.steel(), { seg: 24 });
    P.cyl(grp, r * 0.35, len + 0.3, 0, 0, 0, P.M.dark(), { seg: 10 });
    P.box(body, r * 0.2, len * 0.9, 0.02, r * 0.97, 0, 0, P.M.dark(), { b: 0 });
    grp.userData.body = body; g.add(grp); return grp;
  };

  /** A flat lead-alloy battery grid. */
  P.gridPlate = () => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 1.1), new THREE.MeshStandardMaterial({ map: P.gridTex(), roughness: 0.4, metalness: 0.8 }));
    m.position.y = 0.02; m.castShadow = true; g.add(m);
    P.box(g, 0.2, 0.04, 0.12, 0.2, 0.05, -0.6, P.M.lead(), { b: 0.005 });
    return g;
  };

  /** Flame sprite that flickers (for burners). */
  P.flame = (g, x, y, z, s) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.1 * s, 0.4 * s, 10), new THREE.MeshBasicMaterial({ color: 0xffa31a, transparent: true, opacity: 0.85 }));
    m.position.set(x, y, z); m.rotation.x = Math.PI; g.add(m);
    P.anim.push((t) => { if (P.running) { m.scale.y = 0.8 + 0.4 * Math.sin(t * 22 + x * 9); m.material.opacity = 0.65 + 0.3 * Math.sin(t * 17 + z * 5); } });
    return m;
  };
  /** Steam puffs rising. */
  P.steam = (g, x, y, z, n) => {
    const mats = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false }));
      m.position.set(x, y, z); g.add(m); mats.push(m);
    }
    P.anim.push((t) => { if (!P.running) return; mats.forEach((m, i) => { const u = ((t * 0.35 + i / n) % 1); m.position.y = y + u * 1.6; m.position.x = x + Math.sin(t + i) * 0.15 * u; m.scale.setScalar(0.6 + u * 1.4); m.material.opacity = 0.35 * (1 - u); }); });
  };
  /** Weld sparks. */
  P.sparks = (g, x, y, z) => {
    const pts = []; const geo = new THREE.BufferGeometry(); const n = 14; const pos = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pm = new THREE.PointsMaterial({ color: 0xffd36b, size: 0.09, transparent: true, opacity: 0.95, depthWrite: false });
    const p = new THREE.Points(geo, pm); g.add(p);
    const seed = Array.from({ length: n }, (_, i) => [Math.sin(i * 12.9) * 0.5, Math.cos(i * 7.7) * 0.5, i / n]);
    P.anim.push((t) => { if (!P.running) return; for (let i = 0; i < n; i++) { const u = (t * 3 + seed[i][2]) % 1; pos[i * 3] = x + seed[i][0] * u * 0.9; pos[i * 3 + 1] = y + u * 0.5 - u * u * 0.7; pos[i * 3 + 2] = z + seed[i][1] * u * 0.9; } geo.attributes.position.needsUpdate = true; });
  };
})();
