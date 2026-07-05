/* ============================================================
   EasyTax · Real 3D world (three.js) — calm marble colonnade
   A quiet gallery of white Carrara columns in soft morning light.
   The camera glides slowly forward as you scroll, as if walking
   through a museum. A few marble slabs and arches float almost
   weightlessly; sparse champagne-gold rings catch the light. All
   bright, airy, elegant — a background behind the editorial content.

   Graceful degradation:
     three.js + WebGL ok   -> full 3D world
     else, WebGL2 ok       -> ambient shader (window.EasyTaxAmbient)
     else                  -> CSS marble background
   Reduced-motion          -> one static 3D frame, no animation
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("ambient");
  if (!canvas) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fallback() { if (window.EasyTaxAmbient) { try { window.EasyTaxAmbient(canvas); } catch (e) {} } }
  if (!window.THREE) { fallback(); return; }

  var THREE = window.THREE, renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (e) { fallback(); return; }
  if (!renderer || !renderer.getContext()) { fallback(); return; }

  try {
    var small = window.matchMedia("(max-width: 860px)").matches;
    var DPR = Math.min(window.devicePixelRatio || 1, small ? 1.0 : 1.35);
    renderer.setPixelRatio(DPR);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearAlpha(0);
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf2ecdf, 0.021);   // bright ivory mist, gentle

    var camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 240);
    camera.position.set(0, 0.6, 16);

    /* soft warm studio environment → reflections & marble sheen */
    (function () {
      var c = document.createElement("canvas"); c.width = 8; c.height = 64;
      var x = c.getContext("2d");
      var g = x.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, "#fffdf6"); g.addColorStop(0.55, "#f1eadd"); g.addColorStop(1, "#d3c8b3");
      x.fillStyle = g; x.fillRect(0, 0, 8, 64);
      var tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      var pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromEquirectangular(tex).texture;
      tex.dispose(); pm.dispose();
    })();

    scene.add(new THREE.HemisphereLight(0xfff7ea, 0xb7ac96, 1.15));
    var key = new THREE.DirectionalLight(0xfff2dd, 1.5); key.position.set(7, 11, 6); scene.add(key);
    var rim = new THREE.DirectionalLight(0xd6b98a, 0.4); rim.position.set(-8, 2, -7); scene.add(rim);

    var marbleA = new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 0.5, metalness: 0.0, envMapIntensity: 0.85 });
    var marbleB = new THREE.MeshStandardMaterial({ color: 0xece4d5, roughness: 0.62, metalness: 0.0, envMapIntensity: 0.8 });
    var gold    = new THREE.MeshStandardMaterial({ color: 0xC9A96A, roughness: 0.26, metalness: 1.0, envMapIntensity: 1.1 });

    var group = new THREE.Group(); scene.add(group);
    var items = [];
    var seed = 20240705; function rnd() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }

    /* ---- colonnade: two rows of columns receding into the mist ---- */
    var shaftGeo = new THREE.CylinderGeometry(0.34, 0.4, 6.2, small ? 14 : 20, 1, true);
    var baseGeo = new THREE.BoxGeometry(0.9, 0.4, 0.9);
    var capGeo = new THREE.BoxGeometry(1.0, 0.4, 1.0);
    var PER_SIDE = small ? 6 : 9, GAP = 7.2;
    function column(x, z) {
      var g = new THREE.Group();
      var mat = rnd() < 0.5 ? marbleA : marbleB;
      var shaft = new THREE.Mesh(shaftGeo, mat); shaft.position.y = 0; g.add(shaft);
      var base = new THREE.Mesh(baseGeo, marbleB); base.position.y = -3.3; g.add(base);
      var cap = new THREE.Mesh(capGeo, marbleA); cap.position.y = 3.3; g.add(cap);
      g.position.set(x, -1.5 + (rnd() - 0.5) * 0.6, z);
      g.userData = { y0: g.position.y, ph: rnd() * Math.PI * 2, amp: 0.1 + rnd() * 0.12 };
      group.add(g); items.push(g);
    }
    for (var s = 0; s < PER_SIDE; s++) {
      var z = 6 - s * GAP;
      column(-5.6 - (rnd() - 0.5) * 0.6, z);
      column(5.6 + (rnd() - 0.5) * 0.6, z);
    }

    /* ---- a few floating marble slabs (very subtle, high/far) ---- */
    var slabGeo = new THREE.BoxGeometry(3.4, 0.28, 2.2);
    for (var q = 0; q < (small ? 2 : 4); q++) {
      var slab = new THREE.Mesh(slabGeo, rnd() < 0.5 ? marbleA : marbleB);
      slab.position.set((rnd() - 0.5) * 7, 3.5 + rnd() * 3, -6 - q * 12 - rnd() * 4);
      slab.rotation.set((rnd() - 0.5) * 0.3, rnd() * Math.PI, (rnd() - 0.5) * 0.2);
      slab.userData = { y0: slab.position.y, ph: rnd() * Math.PI * 2, amp: 0.14 + rnd() * 0.2, rot: (rnd() - 0.5) * 0.02 };
      group.add(slab); items.push(slab);
    }

    /* ---- two arches far back ---- */
    var archGeo = new THREE.TorusGeometry(2.4, 0.28, 10, 40, Math.PI);
    for (var w = 0; w < 2; w++) {
      var arch = new THREE.Mesh(archGeo, marbleA);
      arch.position.set((w ? 1 : -1) * 2.2, -1.4, -34 - w * 20);
      arch.userData = { y0: arch.position.y, ph: rnd() * Math.PI * 2, amp: 0.1 };
      group.add(arch); items.push(arch);
    }

    /* ---- sparse champagne-gold rings ---- */
    var ringGeo = new THREE.TorusGeometry(0.9, 0.05, 12, 44);
    for (var r = 0; r < 3; r++) {
      var ring = new THREE.Mesh(ringGeo, gold);
      ring.position.set((rnd() - 0.5) * 9, (rnd() - 0.4) * 5, -10 - r * 16 - rnd() * 6);
      ring.rotation.set(rnd() * Math.PI, rnd() * Math.PI, 0);
      ring.userData = { y0: ring.position.y, ph: rnd() * Math.PI * 2, amp: 0.2 + rnd() * 0.2, rot: (rnd() - 0.5) * 0.015 };
      group.add(ring); items.push(ring);
    }

    /* ---- soft marble floor (grounds the colonnade) ---- */
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0xefe8db, roughness: 0.4, metalness: 0.0, envMapIntensity: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -4.9; group.add(floor);

    var FLY = PER_SIDE * GAP * 0.62;   // how far the camera drifts forward
    var scr = 0, tScr = 0, ptx = 0, pty = 0, tptx = 0, tpty = 0;

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
    window.addEventListener("resize", onResize, { passive: true });

    function draw(t) {
      // slow, frame-rate-agnostic-ish easing (calm)
      ptx += (tptx - ptx) * 0.03; pty += (tpty - pty) * 0.03;
      scr += (tScr - scr) * 0.04;
      camera.position.x += (ptx * 2.2 - camera.position.x) * 0.035;
      camera.position.y += (0.6 + pty * 1.2 - camera.position.y) * 0.035;
      camera.position.z = 16 - scr * FLY;
      camera.lookAt(ptx * 0.8, 0.6, camera.position.z - 14);
      for (var i = 0; i < items.length; i++) {
        var m = items[i], u = m.userData;
        m.position.y = u.y0 + Math.sin(t * 0.00022 + u.ph) * u.amp;   // gentle float
        if (u.rot) m.rotation.z += u.rot * 0.01;
      }
      group.rotation.y = Math.sin(t * 0.00004) * 0.03;
      renderer.render(scene, camera);
    }

    canvas.classList.add("on");

    if (reduce) {
      draw(0);
    } else {
      window.addEventListener("pointermove", function (e) {
        tptx = e.clientX / window.innerWidth - 0.5;
        tpty = -(e.clientY / window.innerHeight - 0.5);
      }, { passive: true });
      window.addEventListener("scroll", function () {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        tScr = h > 0 ? window.scrollY / h : 0;
      }, { passive: true });

      var run = true;
      document.addEventListener("visibilitychange", function () { run = !document.hidden; if (run) requestAnimationFrame(loop); });
      function loop(ts) { if (!run) return; draw(ts); requestAnimationFrame(loop); }
      requestAnimationFrame(loop);
    }
  } catch (err) {
    if (window.console && console.warn) console.warn("3D world failed, using ambient fallback:", err);
    try { renderer.dispose(); } catch (e) {}
    fallback();
  }
})();
