/* ============================================================
   EasyTax · Leistungen — Marble Gallery (Three.js, global THREE)
   Eine ruhige griechische Marmorgalerie: Kolonnade, Podest,
   warmes Morgenlicht und God-Rays. Pro Leistung EIN ikonisches
   Marmor-Symbol, das langsam erscheint und sich beim Wechsel weich
   in Marmorstaub + Licht auflöst. Langsame Kamerafahrt, dezente
   Maus-Reaktion. Instancing, Sichtbarkeits-Gating, reduced-motion.
   Exponiert window.SvcScene = { setProgress, setPointer, pulse, resize }.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("svcCanvas");
  var THREE = window.THREE;

  var api = { setProgress: function () {}, setPointer: function () {}, pulse: function () {}, resize: function () {}, enabled: false };
  window.SvcScene = api;
  if (!canvas || !THREE) return;

  var mobile = Math.min(window.innerWidth, window.innerHeight) < 720;

  var renderer, scene, camera, clock, envTex, marbleTex;
  var N = 8, chapters = [], symbolRoot, pedestal, floor, dust, dustData, colGroup, cols = [], rays = [];
  var progress = 0, targetProgress = 0;
  var pointer = { x: 0, y: 0 }, ptr = { x: 0, y: 0 };
  var running = true, visible = true, pulseT = 0;
  var dummy = new THREE.Object3D();

  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !mobile, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  var SHADOWS = !mobile && !reduce;
  if (SHADOWS) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
  camera.position.set(0, 2.25, 9);
  clock = new THREE.Clock();

  /* ---------- procedural Carrara marble texture ---------- */
  function makeMarble() {
    var c = document.createElement("canvas"); c.width = c.height = 512;
    var g = c.getContext("2d");
    g.fillStyle = "#f5f1ea"; g.fillRect(0, 0, 512, 512);
    // soft warm wash
    var wash = g.createLinearGradient(0, 0, 512, 512);
    wash.addColorStop(0, "rgba(255,252,245,.6)"); wash.addColorStop(1, "rgba(232,224,210,.5)");
    g.fillStyle = wash; g.fillRect(0, 0, 512, 512);
    // fine veins (deterministic, no Math.random dependency issues)
    g.lineCap = "round";
    for (var i = 0; i < 22; i++) {
      var x0 = ((i * 97) % 512), y0 = ((i * 53) % 512);
      g.beginPath(); g.moveTo(x0, y0);
      var x = x0, y = y0;
      for (var s = 0; s < 6; s++) {
        x += Math.sin(i * 1.3 + s) * 60 + 30; y += Math.cos(i * 0.7 + s * 1.4) * 70 + 10;
        g.quadraticCurveTo(x - 24, y - 30, x, y);
      }
      g.strokeStyle = "rgba(150,140,120," + (0.05 + (i % 4) * 0.02) + ")";
      g.lineWidth = 0.6 + (i % 3) * 0.5; g.stroke();
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  marbleTex = makeMarble();

  /* ---------- environment (warm bright studio) ---------- */
  function makeEnv() {
    var c = document.createElement("canvas"); c.width = 128; c.height = 128;
    var g = c.getContext("2d");
    var grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, "#fffdf7"); grd.addColorStop(0.5, "#f3ecdf"); grd.addColorStop(1, "#d8cdb8");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    var h = g.createRadialGradient(46, 30, 4, 46, 30, 90);
    h.addColorStop(0, "rgba(255,248,228,.95)"); h.addColorStop(1, "rgba(255,248,228,0)");
    g.fillStyle = h; g.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
    var pm = new THREE.PMREMGenerator(renderer); var env = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose(); return env;
  }
  envTex = makeEnv(); scene.environment = envTex;

  /* ---------- materials ---------- */
  function marbleMat(tint) {
    return new THREE.MeshStandardMaterial({ color: tint || 0xf3ede2, map: marbleTex, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.85, transparent: true, opacity: 1 });
  }
  function marblePlain(tint, rough) {
    return new THREE.MeshStandardMaterial({ color: tint || 0xf1eadd, roughness: rough == null ? 0.5 : rough, metalness: 0.0, envMapIntensity: 0.8, transparent: true, opacity: 1 });
  }
  function goldMat() {
    return new THREE.MeshStandardMaterial({ color: 0xcaa25a, roughness: 0.3, metalness: 1.0, envMapIntensity: 1.1, emissive: 0x231703, emissiveIntensity: 0.35, transparent: true, opacity: 1 });
  }

  /* ---------- lights: warm morning ---------- */
  var hemi = new THREE.HemisphereLight(0xfff5e6, 0xcabfa8, 1.0); scene.add(hemi);
  var key = new THREE.DirectionalLight(0xfff0d6, 2.0);
  key.position.set(6, 9, 4);
  if (SHADOWS) {
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1; key.shadow.camera.far = 40;
    key.shadow.camera.left = -10; key.shadow.camera.right = 10; key.shadow.camera.top = 10; key.shadow.camera.bottom = -10;
    key.shadow.bias = -0.0008; key.shadow.radius = 4;
  }
  scene.add(key);
  var fill = new THREE.DirectionalLight(0xe9ddc6, 0.5); fill.position.set(-6, 3, -4); scene.add(fill);
  var warm = new THREE.PointLight(0xffe6b0, 0.0, 26, 2); warm.position.set(0, 3.2, 1); scene.add(warm);

  /* ---------- marble floor ---------- */
  var floorMat = new THREE.MeshStandardMaterial({ color: 0xefe8da, map: marbleTex.clone(), roughness: 0.28, metalness: 0.0, envMapIntensity: 1.0 });
  floorMat.map.repeat.set(8, 8); floorMat.map.needsUpdate = true;
  floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0; if (SHADOWS) floor.receiveShadow = true;
  scene.add(floor);

  /* soft contact shadow under the pedestal */
  (function () {
    var c = document.createElement("canvas"); c.width = c.height = 128; var g = c.getContext("2d");
    var rg = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    rg.addColorStop(0, "rgba(60,48,30,.34)"); rg.addColorStop(1, "rgba(60,48,30,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, 0.02, -1.6); scene.add(m);
  })();

  /* ---------- colonnade (instanced) ---------- */
  var COLS_PER_SIDE = mobile ? 4 : 6, SPACING = 4.4;
  var shaftGeo = new THREE.CylinderGeometry(0.3, 0.34, 4.2, mobile ? 16 : 24, 1, true);
  var baseGeo = new THREE.BoxGeometry(0.72, 0.4, 0.72);
  var capGeo = new THREE.BoxGeometry(0.8, 0.36, 0.8);
  var total = COLS_PER_SIDE * 2;
  var shaftIM = new THREE.InstancedMesh(shaftGeo, marbleMat(0xf1eadd), total);
  var baseIM = new THREE.InstancedMesh(baseGeo, marblePlain(0xece3d2, 0.55), total);
  var capIM = new THREE.InstancedMesh(capGeo, marblePlain(0xf3ecde, 0.5), total);
  [shaftIM, baseIM, capIM].forEach(function (m) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); if (SHADOWS) m.castShadow = true; });
  colGroup = new THREE.Group(); colGroup.add(shaftIM, baseIM, capIM); scene.add(colGroup);
  for (var s = 0; s < COLS_PER_SIDE; s++) {
    cols.push({ x: -3.7, z: 2 - s * SPACING });
    cols.push({ x: 3.7, z: 2 - s * SPACING });
  }
  function layoutColumns() {
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i];
      dummy.position.set(c.x, 2.3, c.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      shaftIM.setMatrixAt(i, dummy.matrix);
      dummy.position.set(c.x, 0.2, c.z); dummy.updateMatrix(); baseIM.setMatrixAt(i, dummy.matrix);
      dummy.position.set(c.x, 4.42, c.z); dummy.updateMatrix(); capIM.setMatrixAt(i, dummy.matrix);
    }
    shaftIM.instanceMatrix.needsUpdate = baseIM.instanceMatrix.needsUpdate = capIM.instanceMatrix.needsUpdate = true;
  }
  layoutColumns();

  /* ---------- god-ray shafts ---------- */
  (function () {
    var c = document.createElement("canvas"); c.width = 64; c.height = 256; var g = c.getContext("2d");
    var grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, "rgba(255,244,214,.5)"); grd.addColorStop(1, "rgba(255,244,214,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 64, 256);
    var tex = new THREE.CanvasTexture(c);
    var n = mobile ? 2 : 3;
    for (var i = 0; i < n; i++) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 9),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.set(-3 + i * 3, 4.2, -3 - i); m.rotation.set(0.32, 0.2, 0.16);
      scene.add(m); rays.push(m);
    }
  })();

  /* ---------- pedestal (stepped marble base) ---------- */
  pedestal = new THREE.Group();
  var p1 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.34, 3.0), marbleMat(0xece4d3)); p1.position.y = 0.17;
  var p2 = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.3, 2.3), marbleMat(0xf0e9dc)); p2.position.y = 0.5;
  var p3 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.55, 48), marbleMat(0xf3ecdf)); p3.position.y = 0.9;
  [p1, p2, p3].forEach(function (m) { if (SHADOWS) { m.castShadow = true; m.receiveShadow = true; } pedestal.add(m); });
  pedestal.position.set(0, 0, -1.6); scene.add(pedestal);

  var PLINTH_Y = 1.2; // top of pedestal — symbols sit here

  /* ---------- marble dust (shared, calm) ---------- */
  (function () {
    var count = mobile ? 60 : 100;
    dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xf6efe1, roughness: 1, metalness: 0, transparent: true, opacity: 0.9 }), count);
    dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    dustData = [];
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2 * 3;
      dustData.push({ a: a, r: 0.3 + (i % 9) * 0.12, y: (i % 13) / 13, spd: 0.03 + (i % 5) * 0.012, sw: 0.2 + (i % 7) * 0.05 });
    }
    dust.position.set(0, 0, -1.6); scene.add(dust);
  })();

  /* ==========================================================
     Eight iconic marble symbols — one per service
     ========================================================== */
  function fadeGroup(g, o) {
    g.visible = o > 0.008;
    g.traverse(function (n) {
      if (n.material) {
        var mats = Array.isArray(n.material) ? n.material : [n.material];
        for (var i = 0; i < mats.length; i++) {
          if (mats[i].userData._b === undefined) mats[i].userData._b = mats[i].opacity;
          mats[i].opacity = mats[i].userData._b * o;
        }
      }
    });
  }

  // 01 Buchhaltung — ordered marble tokens rising from a floating tablet
  function symBuchhaltung() {
    var g = new THREE.Group();
    var tablet = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 1.15), marbleMat(0xf2ebde)); tablet.position.y = 0.1;
    if (SHADOWS) tablet.castShadow = true; g.add(tablet);
    // engraved grid lines (thin gold inlays)
    for (var i = -1; i <= 1; i++) {
      var ln = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.014, 0.02), goldMat()); ln.position.set(0, 0.17, i * 0.3); g.add(ln);
    }
    // ordered tokens (few, calm) — instanced
    var tk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.24, 0.16), marblePlain(0xf4eee2, 0.4), 12);
    var td = [];
    for (var r = 0; r < 3; r++) for (var col = 0; col < 4; col++) td.push({ x: -0.55 + col * 0.36, z: -0.3 + r * 0.3, ph: (r * 4 + col) / 12 });
    g.add(tk);
    g.userData.update = function (t, ap) {
      for (var k = 0; k < td.length; k++) {
        var d = td[k]; var rise = Math.min(1, ap * 1.4 - d.ph * 0.5);
        var y = 0.28 + Math.max(0, rise) * 0.14 + Math.sin(t * 0.5 + k) * 0.008;
        dummy.position.set(d.x, y, d.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(Math.max(0.02, rise));
        dummy.updateMatrix(); tk.setMatrixAt(k, dummy.matrix);
      }
      tk.instanceMatrix.needsUpdate = true;
    };
    return g;
  }

  // 02 Lohnverrechnung — a balanced Greek scale
  function symWaage() {
    var g = new THREE.Group();
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.5, 20), marbleMat(0xf1eadd)); post.position.y = 0.75;
    if (SHADOWS) post.castShadow = true; g.add(post);
    var beamPivot = new THREE.Group(); beamPivot.position.y = 1.45; g.add(beamPivot);
    var beam = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 0.07), marbleMat(0xf3ecdf)); beamPivot.add(beam);
    var knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), goldMat()); knob.position.y = 0.04; beamPivot.add(knob);
    function pan(x) {
      var pg = new THREE.Group(); pg.position.set(x, 0, 0);
      var rodA = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.62, 6), goldMat()); rodA.position.set(-0.16, -0.3, 0); rodA.rotation.z = 0.5;
      var rodB = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.62, 6), goldMat()); rodB.position.set(0.16, -0.3, 0); rodB.rotation.z = -0.5;
      var dish = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.06, 28), marblePlain(0xf4eee2, 0.4)); dish.position.y = -0.58;
      if (SHADOWS) dish.castShadow = true;
      pg.add(rodA, rodB, dish); return pg;
    }
    beamPivot.add(pan(-0.9)); beamPivot.add(pan(0.9));
    g.userData.update = function (t) { beamPivot.rotation.z = Math.sin(t * 0.5) * 0.03; };
    return g;
  }

  // 03 Bilanzierung — open marble book with fine gold lines
  function symBuch() {
    var g = new THREE.Group();
    var spine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 1.2), marbleMat(0xece3d2)); spine.position.y = 0.2; g.add(spine);
    function page(sign) {
      var pg = new THREE.Group();
      var leaf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 1.2), marbleMat(0xf5efe4));
      leaf.position.set(sign * 0.52, 0.22, 0); leaf.rotation.z = sign * -0.16;
      if (SHADOWS) leaf.castShadow = true; pg.add(leaf);
      for (var i = 0; i < 4; i++) {
        var gl = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.008, 0.02), goldMat());
        gl.position.set(sign * 0.52, 0.25, -0.35 + i * 0.24); gl.rotation.z = sign * -0.16;
        pg.add(gl);
      }
      return pg;
    }
    g.add(page(-1)); g.add(page(1));
    g.userData.update = function (t) { g.rotation.y = Math.sin(t * 0.16) * 0.06; };
    return g;
  }

  // 04 Gründungsberatung — marble compass with fine gold rose
  function symKompass() {
    var g = new THREE.Group();
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.1, 48), marbleMat(0xf1eadd)); disc.position.y = 0.12;
    if (SHADOWS) disc.castShadow = true; g.add(disc);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.02, 12, 60), goldMat()); ring.rotation.x = Math.PI / 2; ring.position.y = 0.18; g.add(ring);
    // compass rose (4 gold points)
    for (var i = 0; i < 4; i++) {
      var pt = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.8, 4), goldMat());
      pt.position.y = 0.18; pt.rotation.x = Math.PI / 2; pt.rotation.z = i * Math.PI / 2; g.add(pt);
    }
    var needle = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.7, 8), goldMat()); needle.position.y = 0.22; needle.rotation.x = Math.PI / 2;
    g.add(needle);
    var arc = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.012, 8, 48, Math.PI * 1.2), goldMat()); arc.rotation.x = Math.PI / 2; arc.position.y = 0.2; g.add(arc);
    g.userData.update = function (t) { needle.rotation.z = t * 0.25; g.rotation.y = Math.sin(t * 0.12) * 0.1; };
    return g;
  }

  // 05 Steuerberatung — the Owl of Athena (sculptural marble)
  function symEule() {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.52, 30, 24), marbleMat(0xf3ecdf));
    body.scale.set(0.92, 1.3, 0.82); body.position.y = 0.62; if (SHADOWS) body.castShadow = true; g.add(body);
    // facial disc (shallow, tilted slightly up)
    var face = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32), marblePlain(0xf7f1e6, 0.4));
    face.rotation.x = Math.PI / 2 - 0.12; face.position.set(0, 0.82, 0.34); g.add(face);
    // folded wings (curved, flattened) on each side
    function wing(sx) {
      var w = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14, 0, Math.PI), marbleMat(0xf1eadd));
      w.scale.set(0.55, 1.15, 0.4); w.position.set(sx * 0.42, 0.6, 0.05); w.rotation.set(0, sx * -0.5, sx * 0.15);
      if (SHADOWS) w.castShadow = true; return w;
    }
    g.add(wing(-1)); g.add(wing(1));
    // eyes — refined, closer together
    function eye(x) {
      var e = new THREE.Group(); e.position.set(x, 0.9, 0.5); e.rotation.x = -0.12;
      var white = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 24), marblePlain(0xfbf7ee, 0.3)); white.rotation.x = Math.PI / 2; e.add(white);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 10, 30), goldMat()); e.add(ring);
      var pup = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 12), marblePlain(0x2b2620, 0.5)); pup.position.z = 0.02; e.add(pup);
      return e;
    }
    g.add(eye(-0.15)); g.add(eye(0.15));
    // brow arc joining the eyes
    var brow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 24, Math.PI), goldMat());
    brow.position.set(0, 0.95, 0.52); brow.rotation.set(-0.12, 0, 0); g.add(brow);
    // small beak
    var beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), goldMat()); beak.position.set(0, 0.78, 0.55); beak.rotation.x = Math.PI / 2; g.add(beak);
    // ear tufts (pronounced, angled)
    function tuft(x) { var c = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 12), marbleMat(0xf1eadd)); c.position.set(x, 1.2, 0.16); c.rotation.set(0.25, 0, x * 0.55); if (SHADOWS) c.castShadow = true; return c; }
    g.add(tuft(-0.24)); g.add(tuft(0.24));
    // small plinth
    var plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.14, 32), marbleMat(0xece4d3)); plinth.position.y = 0.07; g.add(plinth);
    g.userData.update = function (t) { g.rotation.y = Math.sin(t * 0.12) * 0.1; g.position.y = Math.sin(t * 0.4) * 0.015; };
    return g;
  }

  // 06 Krisenmanagement — broken column that heals with gold kintsugi
  function symSaeule() {
    var g = new THREE.Group();
    var segs = [], seams = [];
    for (var i = 0; i < 5; i++) {
      var seg = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.5, 28), marbleMat(0xf1eadd));
      seg.position.y = 0.35 + i * 0.5; if (SHADOWS) seg.castShadow = true; segs.push(seg); g.add(seg);
      if (i > 0) { var sm = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.018, 10, 36), goldMat()); sm.rotation.x = Math.PI / 2; sm.position.y = 0.35 + i * 0.5 - 0.25; seams.push(sm); g.add(sm); }
    }
    var cap = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 1.0), marbleMat(0xf3ecdf)); cap.position.y = 0.35 + 5 * 0.5 - 0.1; g.add(cap);
    g.userData.update = function (t, ap) {
      var heal = Math.min(1, ap * 1.2); // form == healed
      var breakF = 1 - heal;
      for (var i = 0; i < segs.length; i++) {
        segs[i].position.x = Math.sin(i * 2.1) * 0.35 * breakF;
        segs[i].rotation.z = Math.sin(i * 1.6) * 0.18 * breakF;
      }
      for (var s = 0; s < seams.length; s++) seams[s].material.emissiveIntensity = 0.2 + heal * 0.6;
    };
    return g;
  }

  // 07 Restrukturierung — marble blocks ordering into a clean arch
  function symArch() {
    var g = new THREE.Group();
    var blocks = [], homes = [
      [-0.9, 0.3, 0, 0], [-0.78, 0.9, 0, 0.35], [-0.4, 1.35, 0, 0.7], [0, 1.5, 0, 0],
      [0.4, 1.35, 0, -0.7], [0.78, 0.9, 0, -0.35], [0.9, 0.3, 0, 0]
    ];
    for (var i = 0; i < homes.length; i++) {
      var b = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.6), marbleMat(0xf1eadd));
      if (SHADOWS) b.castShadow = true; g.add(b); blocks.push(b);
    }
    g.userData.update = function (t, ap) {
      var order = Math.min(1, ap * 1.3); order = order * order * (3 - 2 * order);
      for (var i = 0; i < blocks.length; i++) {
        var h = homes[i];
        var cx = Math.sin(i * 2.3 + t * 0.2) * 1.3, cy = 0.6 + Math.cos(i * 1.7) * 0.9, cz = Math.sin(i) * 0.8;
        blocks[i].position.set(h[0] * order + cx * (1 - order), h[1] * order + cy * (1 - order), h[2] * order + cz * (1 - order));
        blocks[i].rotation.z = h[3] * order + (1 - order) * Math.sin(i + t * 0.15);
        blocks[i].rotation.y = (1 - order) * (i + t * 0.1);
      }
    };
    return g;
  }

  // 08 Insolvenz — laurel wreath that disperses and regrows
  function symLorbeer() {
    var g = new THREE.Group();
    var R = 0.85, leaves = mobile ? 22 : 34;
    var im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.26, 6), marbleMat(0xf1eadd), leaves);
    if (SHADOWS) im.castShadow = true;
    var ld = [];
    for (var i = 0; i < leaves; i++) { var a = (i / leaves) * Math.PI * 2; ld.push({ a: a, side: i % 2 ? 1 : -1, seed: (i * 1.7) % 6.28 }); }
    g.add(im); g.position.y = 0.9;
    var band = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 8, 80), goldMat()); band.rotation.x = Math.PI / 2; g.add(band);
    g.userData.update = function (t, ap) {
      var grow = Math.min(1, ap * 1.25); grow = grow * grow * (3 - 2 * grow);
      band.material.opacity = (band.material.userData._b || 1) * ap;
      for (var i = 0; i < leaves; i++) {
        var d = ld[i];
        var scatter = (1 - grow) * (0.6 + Math.sin(d.seed) * 0.4);
        var rr = R + scatter * 1.4;
        var yy = Math.sin(d.seed + t * 0.2) * scatter * 0.9;
        dummy.position.set(Math.cos(d.a) * rr, yy, Math.sin(d.a) * rr);
        dummy.rotation.set(Math.PI / 2, d.a + d.side * 0.6, d.a);
        dummy.scale.setScalar(0.5 + grow * 0.8);
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    };
    return g;
  }

  var builders = [symBuchhaltung, symWaage, symBuch, symKompass, symEule, symSaeule, symArch, symLorbeer];
  symbolRoot = new THREE.Group(); symbolRoot.position.set(0, PLINTH_Y, -1.6); scene.add(symbolRoot);
  for (var ci = 0; ci < N; ci++) {
    var grp = builders[ci] ? builders[ci]() : new THREE.Group();
    grp.visible = ci === 0; symbolRoot.add(grp); chapters.push(grp);
  }

  /* ---------- resize ---------- */
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize, { passive: true }); resize();

  /* ---------- visibility gating (tab only — the world is fixed) ---------- */
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; });

  /* ---------- API ---------- */
  api.enabled = true;
  api.setProgress = function (p) { targetProgress = Math.max(0, Math.min(1, p || 0)); if (reduce) { progress = targetProgress; renderFrame(0.016, true); } };
  api.setPointer = function (x, y) { pointer.x = x; pointer.y = y; };
  api.pulse = function () { pulseT = 1; };
  api.resize = resize;

  /* ---------- render ---------- */
  function updateDust(amount, t) {
    for (var i = 0; i < dustData.length; i++) {
      var d = dustData[i];
      var yy = (d.y + t * d.spd) % 1;
      var r = d.r + Math.sin(t * d.sw + d.a) * 0.15;
      var op = 0.15 + amount * 0.85;
      dummy.position.set(Math.cos(d.a + t * 0.05) * r, 0.4 + yy * 2.6, Math.sin(d.a + t * 0.05) * r);
      dummy.scale.setScalar((0.5 + (i % 5) * 0.12) * (0.4 + amount));
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); dust.setMatrixAt(i, dummy.matrix);
    }
    dust.instanceMatrix.needsUpdate = true;
    dust.material.opacity = 0.2 + amount * 0.7;
  }

  function renderFrame(rawdt, force) {
    var t = clock.elapsedTime;
    var dt = Math.min(rawdt, 0.05);          // animation step (stable)
    // frame-rate independent smoothing: converge in ~`sec` real seconds
    function ease(sec) { return Math.min(1, rawdt / sec); }
    progress += (targetProgress - progress) * ease(0.7);
    ptr.x += (pointer.x - ptr.x) * ease(0.6);
    ptr.y += (pointer.y - ptr.y) * ease(0.6);

    // which symbol + gentle crossfade
    var seg = progress * (N - 1);
    var i0 = Math.floor(seg); if (i0 > N - 1) i0 = N - 1; if (i0 < 0) i0 = 0;
    var f = seg - i0, a = i0, b = Math.min(N - 1, i0 + 1);
    var blend = 0, trans = 0;
    if (a !== b) {
      blend = f < 0.62 ? 0 : (f - 0.62) / 0.38; blend = blend * blend * (3 - 2 * blend);
      if (f > 0.5) { var tt = Math.min(1, (f - 0.5) / 0.5); trans = Math.sin(Math.PI * tt); } // soft dust swell
    }
    for (var i = 0; i < N; i++) {
      var o = (i === a) ? (1 - blend) : (i === b && a !== b) ? blend : 0;
      var g = chapters[i];
      if (o > 0.008) {
        fadeGroup(g, o);
        if (g.userData.update) g.userData.update(t, o);
        g.scale.setScalar(0.9 + 0.1 * o);
        g.rotation.y = 0; // symbols manage their own gentle rotation
      } else if (g.visible) fadeGroup(g, 0);
    }
    updateDust(trans, t);

    // slow "walking" colonnade — driven mostly by scroll, a whisper of drift
    var walk = progress * (COLS_PER_SIDE * SPACING) + t * 0.06;
    for (var c = 0; c < cols.length; c++) {
      var base = 2 - Math.floor(c / 2) * SPACING;
      var z = base + (walk % SPACING);
      if (z > 4) z -= COLS_PER_SIDE * SPACING;
      var col = cols[c];
      dummy.position.set(col.x, 2.3, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); shaftIM.setMatrixAt(c, dummy.matrix);
      dummy.position.set(col.x, 0.2, z); dummy.updateMatrix(); baseIM.setMatrixAt(c, dummy.matrix);
      dummy.position.set(col.x, 4.42, z); dummy.updateMatrix(); capIM.setMatrixAt(c, dummy.matrix);
    }
    shaftIM.instanceMatrix.needsUpdate = baseIM.instanceMatrix.needsUpdate = capIM.instanceMatrix.needsUpdate = true;

    // pulse (accordion open): soft warm bloom only — stays calm
    if (pulseT > 0.001) pulseT = Math.max(0, pulseT - dt * 1.2);
    var pulse = pulseT * pulseT * (3 - 2 * pulseT);
    warm.intensity = 0.35 + trans * 0.5 + pulse * 1.0;
    warm.position.x = ptr.x * 2.2;
    rays.forEach(function (r, i) { r.material.opacity = 0.13 + trans * 0.1 + ptr.x * 0.03 * (i - 1); });

    // extremely gentle camera — a slow architectural glide.
    // On wide screens we look left of the pedestal so the marble symbol
    // rests to the right of the text, not behind it.
    var wide = window.innerWidth / window.innerHeight > 1.05;
    var lookX = wide ? -1.25 : 0;
    var camZ = 9 - progress * 1.4;
    camera.position.z += (camZ - camera.position.z) * ease(1.6);
    camera.position.x += ((ptr.x * 0.5) - camera.position.x) * ease(1.4);
    camera.position.y += ((2.25 + ptr.y * 0.25 + Math.sin(t * 0.1) * 0.05) - camera.position.y) * ease(1.4);
    camera.lookAt(lookX + ptr.x * 0.3, 1.5, -1.6);

    renderer.render(scene, camera);
  }

  if (reduce) { renderFrame(0.016, true); return; }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    if (!visible) return;
    renderFrame(clock.getDelta());
  }
  requestAnimationFrame(loop);
  window.addEventListener("pagehide", function () { running = false; });
})();
