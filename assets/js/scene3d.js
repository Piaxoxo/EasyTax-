/* ============================================================
   EasyTax · Real 3D world (three.js) — clean geometric marble field
   A bright, weightless field of pale geometric marble forms drifting
   in soft ivory mist. The camera glides and zooms through as you
   scroll; forms turn, sway and breathe, sparse champagne-gold rings
   catch the light. Clean, white, alive — a living pattern of shapes
   behind the content, on every page.

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
    scene.fog = new THREE.FogExp2(0xefe8dc, 0.026);   // bright ivory mist

    var BASE_FOV = 52;
    var camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 240);
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
      new THREE.OctahedronGeometry(0.95, 0),
      new THREE.TetrahedronGeometry(1.1, 0)
    ];
    var ringGeo = new THREE.TorusGeometry(0.95, 0.055, 12, 46);

    var group = new THREE.Group(); scene.add(group);
    var items = [];
    var seed = 20240705; function rnd() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }

    var N = small ? 20 : 34;
    var STEP = small ? 5.4 : 6.0;
    for (var i = 0; i < N; i++) {
      var mesh;
      if (rnd() < 0.18) {
        mesh = new THREE.Mesh(ringGeo, gold);
      } else {
        mesh = new THREE.Mesh(geos[(rnd() * geos.length) | 0], rnd() < 0.5 ? marbleA : marbleB);
      }
      var ang = rnd() * Math.PI * 2, rad = 3.8 + rnd() * 8.5;
      mesh.position.set(Math.cos(ang) * rad, (rnd() - 0.5) * 12, 8 - i * STEP - rnd() * 3);
      var sc = 0.6 + rnd() * 2.1;
      mesh.scale.setScalar(sc);
      mesh.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
      mesh.userData = {
        rx: (rnd() - 0.5) * 0.12, ry: (rnd() - 0.5) * 0.16, rz: (rnd() - 0.5) * 0.08,
        ph: rnd() * Math.PI * 2, amp: 0.2 + rnd() * 0.6, y0: mesh.position.y,
        x0: mesh.position.x, sway: 0.3 + rnd() * 0.8, swph: rnd() * Math.PI * 2,
        s0: sc, breathe: rnd() < 0.5 ? (0.04 + rnd() * 0.06) : 0
      };
      group.add(mesh); items.push(mesh);
    }

    var FLY = N * STEP * 0.6;              // deeper travel through the field
    var scr = 0, tScr = 0, ptx = 0, pty = 0, tptx = 0, tpty = 0;
    var vScroll = 0, lastY = (typeof window.scrollY === "number" ? window.scrollY : 0), zoom = 0;

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
    window.addEventListener("resize", onResize, { passive: true });

    function draw(t) {
      // pointer + scroll follow (smooth, lively)
      ptx += (tptx - ptx) * 0.08; pty += (tpty - pty) * 0.08;
      scr += (tScr - scr) * 0.085;

      // scroll-velocity zoom: a gentle "punch" while scrolling, easing back
      vScroll *= 0.86;
      var kick = Math.min(Math.abs(vScroll) / 55, 1);
      zoom += (kick - zoom) * 0.12;
      var fov = BASE_FOV - zoom * 9;                 // zoom in while moving
      if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

      // continuous whisper of forward drift keeps it alive at rest
      var drift = (t * 0.00018) % 1;
      camera.position.x += (ptx * 3.6 - camera.position.x) * 0.085;
      camera.position.y += (pty * 2.4 - camera.position.y) * 0.085;
      camera.position.z = 16 - (scr * FLY) - zoom * 2.2 - drift * 0.6;
      camera.lookAt(ptx * 1.6, camera.position.y * 0.35, camera.position.z - 12);

      for (var i = 0; i < items.length; i++) {
        var m = items[i], u = m.userData;
        m.rotation.x += u.rx * 0.02; m.rotation.y += u.ry * 0.02; m.rotation.z += u.rz * 0.02;
        m.position.y = u.y0 + Math.sin(t * 0.0007 + u.ph) * u.amp;
        m.position.x = u.x0 + Math.sin(t * 0.0004 + u.swph) * u.sway;
        if (u.breathe) { var s = u.s0 * (1 + Math.sin(t * 0.0009 + u.ph) * u.breathe); m.scale.setScalar(s); }
      }
      group.rotation.y = Math.sin(t * 0.00012) * 0.1;
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
        var y = window.scrollY;
        vScroll += (y - lastY); lastY = y;
        tScr = h > 0 ? y / h : 0;
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
