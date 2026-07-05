/* ============================================================
   EasyTax · Leistungen — 3D world (Three.js, UMD global THREE)
   Acht generative Objekte auf einer Marmor/Glas-Plattform.
   Scroll-getrieben: Objekte lösen sich in Splitter auf und
   formieren sich neu. Zeigt bei fehlendem WebGL / reduced-motion
   nichts an (CSS-Fallback übernimmt).
   Exponiert window.SvcScene = { setProgress, setPointer, resize }.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("svcCanvas");
  var THREE = window.THREE;

  // Public API stub so callers never crash even if 3D is disabled.
  var api = { setProgress: function () {}, setPointer: function () {}, resize: function () {}, enabled: false };
  window.SvcScene = api;

  if (!canvas || !THREE || reduce) return;

  var renderer, scene, camera, envTex;
  var objectRoot, platform, shards, shardData;
  var chapters = [];        // { group }
  var N = 8;
  var progress = 0, targetProgress = 0;
  var pointer = { x: 0, y: 0 }, ptr = { x: 0, y: 0 };
  var clock, running = true, visible = true;

  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 1.15, 7.4);

  clock = new THREE.Clock();

  /* ---------- Environment (soft studio reflections) ---------- */
  function makeEnv() {
    var c = document.createElement("canvas"); c.width = 128; c.height = 128;
    var g = c.getContext("2d");
    var grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, "#fffaf0"); grd.addColorStop(0.45, "#efe7d6");
    grd.addColorStop(0.7, "#cbbda2"); grd.addColorStop(1, "#8f8064");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    // warm highlight
    var h = g.createRadialGradient(40, 34, 4, 40, 34, 70);
    h.addColorStop(0, "rgba(255,246,224,.95)"); h.addColorStop(1, "rgba(255,246,224,0)");
    g.fillStyle = h; g.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    var pmrem = new THREE.PMREMGenerator(renderer);
    var env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose(); pmrem.dispose();
    return env;
  }
  envTex = makeEnv();
  scene.environment = envTex;

  /* ---------- Lights ---------- */
  var hemi = new THREE.HemisphereLight(0xfff3dd, 0x4a3f2e, 1.05); scene.add(hemi);
  var key = new THREE.DirectionalLight(0xfff2d6, 1.6); key.position.set(4, 6, 5); scene.add(key);
  var rim = new THREE.DirectionalLight(0xbfa06a, 0.7); rim.position.set(-5, 2, -3); scene.add(rim);
  var glow = new THREE.PointLight(0xffd98a, 0.0, 22, 2); glow.position.set(0, 1.5, 3.5); scene.add(glow);

  /* ---------- Material factories (fresh instances → independent fades) ---------- */
  function marble(col) { return new THREE.MeshStandardMaterial({ color: col || 0xefe7d6, roughness: 0.5, metalness: 0.0, envMapIntensity: 0.9, transparent: true, opacity: 1 }); }
  function darkMarble() { return new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.8, transparent: true, opacity: 1 }); }
  function gold() { return new THREE.MeshStandardMaterial({ color: 0xc79a4e, roughness: 0.26, metalness: 1.0, envMapIntensity: 1.2, emissive: 0x2a1c07, emissiveIntensity: 0.5, transparent: true, opacity: 1 }); }
  function glassy() { return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0.0, envMapIntensity: 1.4, transparent: true, opacity: 0.34 }); }
  function paper() { return new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.9, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 1 }); }
  function greenM() { return new THREE.MeshStandardMaterial({ color: 0x7c8a52, roughness: 0.7, metalness: 0, transparent: true, opacity: 1 }); }

  function edges(geo, mat) { return new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat); }

  /* ---------- Platform (shared) ---------- */
  function buildPlatform() {
    var g = new THREE.Group();
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.55, 0.34, 64), marble(0xe9e0cf));
    disc.position.y = -1.55; g.add(disc);
    var top = new THREE.Mesh(new THREE.CylinderGeometry(2.36, 2.36, 0.02, 64), marble(0xf3ecdd));
    top.position.y = -1.37; g.add(top);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.045, 16, 90), gold());
    ring.rotation.x = Math.PI / 2; ring.position.y = -1.38; g.add(ring);
    var halo = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64),
      new THREE.MeshBasicMaterial({ color: 0xffe6ad, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = -1.36; g.add(halo);
    return g;
  }

  /* ---------- Shards (used for shatter transitions) ---------- */
  function buildShards() {
    var count = 120;
    var geo = new THREE.IcosahedronGeometry(0.11, 0);
    var mesh = new THREE.InstancedMesh(geo, marble(0xe4d9c3), count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    var data = [];
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2 + (i * 0.13);
      var r = 1.3 + (i % 7) * 0.14;
      data.push({
        base: new THREE.Vector3(Math.cos(a) * r, -1.3 + (i % 5) * 0.06, Math.sin(a) * r),
        dir: new THREE.Vector3(Math.cos(a), 0.35 + (i % 5) * 0.12, Math.sin(a)).normalize(),
        spin: new THREE.Vector3((i % 3) - 1, (i % 4) - 1.5, (i % 5) - 2).multiplyScalar(0.5),
        scl: 0.5 + (i % 6) * 0.12
      });
    }
    return { mesh: mesh, data: data, count: count };
  }

  /* ==========================================================
     Eight generative service objects
     ========================================================== */
  var dummy = new THREE.Object3D();

  // 01 Buchhaltung — floating glass sheets + rising number-particles
  function objBuchhaltung() {
    var g = new THREE.Group();
    for (var i = 0; i < 5; i++) {
      var sh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 0.03), glassy());
      sh.position.set((i - 2) * 0.16, (i - 2) * 0.28, (i - 2) * 0.12);
      sh.rotation.set(0.02 * i, 0.14 * (i - 2), 0.03 * i);
      g.add(sh);
      var frame = edges(sh.geometry, gold());
      frame.position.copy(sh.position); frame.rotation.copy(sh.rotation);
      g.add(frame);
    }
    var m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), gold(), 46);
    var parts = [];
    for (var j = 0; j < 46; j++) parts.push({ x: (Math.sin(j * 12.9) ) * 1.2, z: (Math.cos(j * 7.7)) * 0.8, off: (j % 23) / 23, spd: 0.2 + (j % 5) * 0.05 });
    g.add(m);
    g.userData.update = function (t) {
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k]; var y = ((p.off + t * p.spd) % 1) * 2.4 - 1.2;
        dummy.position.set(p.x, y, p.z); dummy.rotation.set(y, y * 1.4, 0);
        var s = 0.6 + Math.sin((p.off + t * p.spd) * Math.PI) * 0.5; dummy.scale.setScalar(Math.max(0.15, s));
        dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    };
    return g;
  }

  // 02 Lohnverrechnung — classical column/figure + orbiting documents
  function objLohn() {
    var g = new THREE.Group();
    var col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 2.3, 40), marble(0xf1ead9));
    col.position.y = -0.15; g.add(col);
    // flutes
    for (var f = 0; f < 16; f++) {
      var fl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 8), marble(0xe6ddca));
      var a = (f / 16) * Math.PI * 2; fl.position.set(Math.cos(a) * 0.45, -0.15, Math.sin(a) * 0.45); g.add(fl);
    }
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 0.22, 40), marble(0xf3ecdd)); cap.position.y = 1.06; g.add(cap);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), marble(0xf4eee0)); head.position.y = 1.5; g.add(head);
    var docs = new THREE.Group();
    for (var d = 0; d < 5; d++) {
      var doc = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.68), paper());
      docs.add(doc);
    }
    g.add(docs);
    g.userData.update = function (t) {
      for (var i = 0; i < docs.children.length; i++) {
        var a = t * 0.5 + i * (Math.PI * 2 / 5);
        var doc = docs.children[i];
        doc.position.set(Math.cos(a) * 1.35, 0.2 + Math.sin(a * 1.3) * 0.5, Math.sin(a) * 1.35);
        doc.rotation.set(0, -a + Math.PI / 2, Math.sin(a) * 0.2);
      }
    };
    return g;
  }

  // 03 Bilanzierung — floating library, gold-edged books in an arc
  function objBilanz() {
    var g = new THREE.Group();
    var books = new THREE.Group();
    for (var i = 0; i < 9; i++) {
      var b = new THREE.Group();
      var body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.2, 0.82), darkMarble());
      var page = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.15, 0.86), gold());
      b.add(body); b.add(page);
      var a = -0.9 + i * 0.22; var r = 1.15;
      b.position.set(Math.cos(a) * r * 0.2, (i - 4) * 0.26, Math.sin(a) * r * 0.4 - 0.2);
      b.rotation.set(0.04 * (i - 4), a, 0.02 * (i - 4));
      books.add(b);
    }
    g.add(books);
    g.userData.update = function (t) { books.rotation.y = Math.sin(t * 0.2) * 0.08; books.position.y = Math.sin(t * 0.7) * 0.05; };
    return g;
  }

  // 04 Gründungsberatung — blueprint building rising + compass ring
  function objGruendung() {
    var g = new THREE.Group();
    var floors = new THREE.Group();
    for (var i = 0; i < 5; i++) {
      var w = 1.5 - i * 0.18;
      var box = new THREE.BoxGeometry(w, 0.5, w);
      var e = edges(box, gold());
      e.position.y = -1 + i * 0.55;
      floors.add(e);
    }
    g.add(floors);
    var compass = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.03, 12, 80), gold());
    compass.rotation.x = -Math.PI / 2; compass.position.y = -1.25; g.add(compass);
    var needle = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.9, 12), gold());
    needle.position.y = -1.25; needle.rotation.z = Math.PI / 2; g.add(needle);
    g.userData.update = function (t) {
      var n = Math.min(1, (t * 0.25) % 2);
      for (var i = 0; i < floors.children.length; i++) {
        var target = -1 + i * 0.55;
        floors.children[i].position.y = target;
        floors.children[i].scale.setScalar(0.6 + 0.4 * Math.min(1, Math.max(0, (Math.sin(t * 0.5 + i) + 1) / 2 + 0.3)));
      }
      needle.rotation.y = t * 0.6; floors.rotation.y = Math.sin(t * 0.15) * 0.15;
    };
    return g;
  }

  // 05 Steuerberatung — marble table with documents + a light beam
  function objSteuer() {
    var g = new THREE.Group();
    var top = new THREE.Mesh(new THREE.BoxGeometry(3, 0.16, 1.7), marble(0xeee6d4)); top.position.y = -0.3; g.add(top);
    for (var l = 0; l < 4; l++) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), darkMarble());
      leg.position.set((l < 2 ? -1.3 : 1.3), -0.9, (l % 2 ? -0.7 : 0.7)); g.add(leg);
    }
    for (var d = 0; d < 4; d++) {
      var doc = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.82), paper());
      doc.rotation.x = -Math.PI / 2; doc.rotation.z = (d - 1.5) * 0.2;
      doc.position.set((d - 1.5) * 0.62, -0.21, Math.sin(d) * 0.15); g.add(doc);
    }
    var seal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 24), gold()); seal.position.set(0.9, -0.16, -0.3); g.add(seal);
    var beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe7b0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 1.3; g.add(beam);
    g.userData.update = function (t) { beam.material.opacity = 0.09 + Math.sin(t * 0.8) * 0.04; };
    return g;
  }

  // 06 Krisenmanagement — broken column that re-aligns, gold kintsugi seams
  function objKrise() {
    var g = new THREE.Group();
    var segs = [];
    for (var i = 0; i < 6; i++) {
      var seg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.42, 36), marble(0xece3d1));
      seg.position.y = -1.2 + i * 0.46; segs.push(seg); g.add(seg);
      if (i > 0) { var seam = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 10, 40), gold()); seam.rotation.x = Math.PI / 2; seam.position.y = -1.2 + i * 0.46 - 0.23; g.add(seam); }
    }
    g.userData.update = function (t) {
      var heal = (Math.sin(t * 0.4) + 1) / 2; // 0 broken .. 1 aligned
      for (var i = 0; i < segs.length; i++) {
        var brokenX = Math.sin(i * 2.3) * 0.5 * (1 - heal);
        var brokenR = Math.sin(i * 1.7) * 0.25 * (1 - heal);
        segs[i].position.x = brokenX; segs[i].rotation.z = brokenR;
      }
    };
    return g;
  }

  clock.getDelta();

  /* ---------- assemble scene ---------- */
  objectRoot = new THREE.Group(); scene.add(objectRoot);
  platform = buildPlatform(); objectRoot.add(platform);
  var s = buildShards(); shards = s.mesh; shardData = s.data; objectRoot.add(shards);

  var builders = [objBuchhaltung, objLohn, objBilanz, objGruendung, objSteuer, objKrise, null, null];

  // 07 Restrukturierung (defined inline to keep instanced closure clean)
  builders[6] = function () {
    var g = new THREE.Group();
    var n = 27; var mat = marble(0xe9dfcb); var mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), mat, n);
    var pts = [];
    var idx = 0;
    for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
      pts.push({ home: new THREE.Vector3(x * 0.55, y * 0.55, z * 0.55), seed: idx * 1.7 }); idx++;
    }
    g.add(mesh);
    g.userData.update = function (t) {
      var order = (Math.sin(t * 0.35) + 1) / 2; // chaos..order
      for (var i = 0; i < n; i++) {
        var p = pts[i];
        var cx = Math.sin(p.seed + t * 0.5) * 1.4, cy = Math.cos(p.seed * 1.3 + t * 0.4) * 1.2, cz = Math.sin(p.seed * 0.7 + t) * 1.1;
        dummy.position.set(p.home.x * order + cx * (1 - order), p.home.y * order + cy * (1 - order), p.home.z * order + cz * (1 - order));
        dummy.rotation.set(t * 0.2 + p.seed, t * 0.15, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    return g;
  };

  // 08 Insolvenz — hourglass with falling sand + small plants
  builders[7] = function () {
    var g = new THREE.Group();
    var top = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.05, 40, 1, true), glassy()); top.position.y = 0.6; g.add(top);
    var bot = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.05, 40, 1, true), glassy()); bot.position.y = -0.6; bot.rotation.x = Math.PI; g.add(bot);
    var capT = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 40), gold()); capT.position.y = 1.12; g.add(capT);
    var capB = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 40), gold()); capB.position.y = -1.12; g.add(capB);
    var sand = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 6), gold(), 60);
    var sd = [];
    for (var i = 0; i < 60; i++) sd.push({ off: i / 60, spd: 0.35 + (i % 5) * 0.05, x: (Math.sin(i) * 0.06), z: (Math.cos(i) * 0.06) });
    g.add(sand);
    // plants
    var plants = new THREE.Group();
    for (var pI = 0; pI < 5; pI++) {
      var stem = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 8), greenM());
      var a = (pI / 5) * Math.PI * 2; stem.position.set(Math.cos(a) * 1.3, -1.2, Math.sin(a) * 1.3); plants.add(stem);
    }
    g.add(plants);
    g.userData.update = function (t) {
      for (var i = 0; i < 60; i++) {
        var p = sd[i]; var ph = (p.off + t * p.spd) % 1; var y = 0.9 - ph * 1.8;
        dummy.position.set(p.x * (1 - Math.abs(y)), y, p.z * (1 - Math.abs(y))); dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix(); sand.setMatrixAt(i, dummy.matrix);
      }
      sand.instanceMatrix.needsUpdate = true;
      for (var k = 0; k < plants.children.length; k++) {
        var gr = (Math.sin(t * 0.5 + k) + 1) / 2; plants.children[k].scale.set(1, 0.4 + gr, 1); plants.children[k].position.y = -1.2 + (0.4 + gr) * 0.2;
      }
    };
    return g;
  };

  for (var ci = 0; ci < N; ci++) {
    var grp = builders[ci] ? builders[ci]() : new THREE.Group();
    grp.visible = ci === 0;
    objectRoot.add(grp);
    chapters.push(grp);
  }

  /* ---------- opacity helper ---------- */
  function setOpacity(group, o) {
    group.visible = o > 0.01;
    group.traverse(function (n) {
      if (n.material) {
        var mats = Array.isArray(n.material) ? n.material : [n.material];
        for (var i = 0; i < mats.length; i++) {
          if (mats[i].userData._baseOp === undefined) mats[i].userData._baseOp = mats[i].opacity;
          mats[i].opacity = mats[i].userData._baseOp * o;
          mats[i].transparent = true;
        }
      }
    });
  }

  /* ---------- resize ---------- */
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // shift object left on wide screens so the glass panel (right) stays clear
    objectRoot.position.x = (w / h > 1.05) ? -1.15 : 0;
    objectRoot.position.y = (w / h > 1.05) ? 0.1 : 0.5;
    camera.position.z = (w / h < 0.75) ? 8.6 : 7.4;
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  /* ---------- visibility gating ---------- */
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; });
  var world = document.querySelector(".svc-world");
  if (world && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(world);
  }

  /* ---------- API ---------- */
  api.enabled = true;
  api.setProgress = function (p) { targetProgress = Math.max(0, Math.min(1, p || 0)); };
  api.setPointer = function (x, y) { pointer.x = x; pointer.y = y; };
  api.resize = resize;

  /* ---------- main loop ---------- */
  var lastActive = 0;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!visible) return;

    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;

    // smooth values
    progress += (targetProgress - progress) * Math.min(1, dt * 6);
    ptr.x += (pointer.x - ptr.x) * Math.min(1, dt * 4);
    ptr.y += (pointer.y - ptr.y) * Math.min(1, dt * 4);

    // chapter mapping
    var seg = progress * (N - 1);
    var i0 = Math.floor(seg); if (i0 > N - 1) i0 = N - 1; if (i0 < 0) i0 = 0;
    var f = seg - i0;
    var a = i0, b = Math.min(N - 1, i0 + 1);
    var blend = 0, burst = 0;
    if (a !== b) {
      blend = f < 0.6 ? 0 : (f - 0.6) / 0.4; blend = blend * blend * (3 - 2 * blend);
      if (f > 0.55) { var bt = Math.min(1, (f - 0.55) / 0.45); burst = Math.sin(Math.PI * bt); }
    }

    // fade objects
    for (var i = 0; i < N; i++) {
      var o = (i === a) ? (1 - blend) : (i === b && a !== b) ? blend : 0;
      if (o > 0.01) {
        setOpacity(chapters[i], o);
        if (chapters[i].userData.update) chapters[i].userData.update(t);
        var sc = (i === a) ? (1 - 0.18 * blend) : (0.82 + 0.18 * blend);
        chapters[i].scale.setScalar(sc);
        chapters[i].position.y = (i === a ? -0.25 * blend : 0.25 * (1 - blend));
        chapters[i].rotation.y = t * 0.12 + ptr.x * 0.25;
        chapters[i].rotation.x = ptr.y * 0.1;
      } else if (chapters[i].visible) {
        setOpacity(chapters[i], 0);
      }
    }

    // shatter shards
    var showShard = burst > 0.02;
    shards.visible = showShard;
    if (showShard) {
      for (var k = 0; k < shardData.length; k++) {
        var d = shardData[k];
        var m = burst * (0.6 + (k % 6) * 0.12);
        dummy.position.copy(d.base).addScaledVector(d.dir, m * 1.7);
        dummy.rotation.set(d.spin.x * burst * 4, d.spin.y * burst * 4, d.spin.z * burst * 4);
        dummy.scale.setScalar(d.scl * (0.4 + burst * 0.9));
        dummy.updateMatrix(); shards.setMatrixAt(k, dummy.matrix);
      }
      shards.instanceMatrix.needsUpdate = true;
    }

    // platform subtle breathing + tilt with pointer
    platform.rotation.y = t * 0.05;
    objectRoot.rotation.y = ptr.x * 0.12;
    objectRoot.rotation.x = -ptr.y * 0.06;

    // gold glow follows pointer + pulses on transition
    glow.position.x = ptr.x * 3.2; glow.position.y = 1.4 + ptr.y * 1.5;
    glow.intensity = 0.5 + burst * 2.2;

    camera.position.x += (ptr.x * 0.5 - camera.position.x) * Math.min(1, dt * 3);
    camera.lookAt(objectRoot.position.x * 0.5, 0.4, 0);

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  window.addEventListener("pagehide", function () { running = false; });
})();
