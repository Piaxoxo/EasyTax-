/* ============================================================
   EasyTax · Real 3D world (three.js) — clean geometric marble field
   A bright, weightless field of pale geometric marble forms drifting
   in soft ivory mist. The camera glides through as you scroll; forms
   turn gently, sparse champagne-gold rings catch the light. Clean,
   white, alive — a calm pattern of shapes behind the editorial content.

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
    renderer.toneMappingExposure = 1.08;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xefe8dc, 0.027);   // bright ivory mist

    var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 220);
    camera.position.set(0, 0, 16);

    /* soft studio environment (vertical gradient) → reflections & sheen */
    (function () {
      var c = document.createElement("canvas"); c.width = 8; c.height = 64;
      var x = c.getContext("2d");
      var g = x.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, "#fffdf6"); g.addColorStop(0.55, "#f0e9db"); g.addColorStop(1, "#cec2ac");
      x.fillStyle = g; x.fillRect(0, 0, 8, 64);
      var tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      var pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromEquirectangular(tex).texture;
      tex.dispose(); pm.dispose();
    })();

    scene.add(new THREE.HemisphereLight(0xfff7ea, 0x9a8f7c, 1.15));
    var key = new THREE.DirectionalLight(0xfff1dc, 1.5); key.position.set(6, 10, 8); scene.add(key);
    var rim = new THREE.DirectionalLight(0xcdac72, 0.5); rim.position.set(-8, -3, -7); scene.add(rim);

    var marbleA = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.8 });
    var marbleB = new THREE.MeshStandardMaterial({ color: 0xeae3d5, roughness: 0.7, metalness: 0.0, envMapIntensity: 0.75 });
    var gold    = new THREE.MeshStandardMaterial({ color: 0xC9A96A, roughness: 0.25, metalness: 1.0, envMapIntensity: 1.1 });

    var geos = [
      new THREE.BoxGeometry(1, 2.6, 1),
      new THREE.BoxGeometry(1.7, 1.0, 0.6),
      new THREE.IcosahedronGeometry(0.95, 0),
      new THREE.BoxGeometry(0.7, 3.4, 0.7),
      new THREE.OctahedronGeometry(0.95, 0)
    ];
    var ringGeo = new THREE.TorusGeometry(0.95, 0.055, 12, 46);

    var group = new THREE.Group(); scene.add(group);
    var items = [];
    var seed = 20240705; function rnd() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }

    var N = small ? 16 : 26;
    var STEP = small ? 5.6 : 6.4;
    for (var i = 0; i < N; i++) {
      var mesh;
      if (rnd() < 0.17) {
        mesh = new THREE.Mesh(ringGeo, gold);
      } else {
        mesh = new THREE.Mesh(geos[(rnd() * geos.length) | 0], rnd() < 0.5 ? marbleA : marbleB);
      }
      var ang = rnd() * Math.PI * 2, rad = 4.2 + rnd() * 7.5;
      mesh.position.set(Math.cos(ang) * rad, (rnd() - 0.5) * 11, 7 - i * STEP - rnd() * 3);
      mesh.scale.setScalar(0.7 + rnd() * 1.8);
      mesh.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
      mesh.userData = { rx: (rnd() - 0.5) * 0.08, ry: (rnd() - 0.5) * 0.11, ph: rnd() * Math.PI * 2, amp: 0.18 + rnd() * 0.45, y0: mesh.position.y };
      group.add(mesh); items.push(mesh);
    }

    var FLY = N * STEP * 0.52;
    var scr = 0, tScr = 0, ptx = 0, pty = 0, tptx = 0, tpty = 0;

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
    window.addEventListener("resize", onResize, { passive: true });

    function draw(t) {
      // livelier + smoother following
      ptx += (tptx - ptx) * 0.075; pty += (tpty - pty) * 0.075;
      scr += (tScr - scr) * 0.08;
      camera.position.x += (ptx * 3.4 - camera.position.x) * 0.08;
      camera.position.y += (pty * 2.2 - camera.position.y) * 0.08;
      camera.position.z = 16 - scr * FLY;
      camera.lookAt(ptx * 1.4, camera.position.y * 0.35, camera.position.z - 12);
      for (var i = 0; i < items.length; i++) {
        var m = items[i], u = m.userData;
        m.rotation.x += u.rx * 0.02; m.rotation.y += u.ry * 0.02;
        m.position.y = u.y0 + Math.sin(t * 0.00065 + u.ph) * u.amp;
      }
      group.rotation.y = Math.sin(t * 0.0001) * 0.08;
      renderer.render(scene, camera);
    }

    canvas.classList.add("on");

    if (reduce) {
      draw(0); // single static frame, no motion
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
