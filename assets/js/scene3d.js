/* ============================================================
   EasyTax · Real 3D world (three.js) — clean geometric marble field
   A bright, weightless field of polished, veined white-marble forms
   drifting in soft ivory mist. The camera glides and zooms through as you
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

  var marbleTex = null, started = false;
  function build() {
  if (started) return; started = true;
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

    scene.add(new THREE.HemisphereLight(0xffffff, 0xe2dacd, 1.4));
    var key = new THREE.DirectionalLight(0xfff4e2, 1.3); key.position.set(6, 10, 8); scene.add(key);
    var rim = new THREE.DirectionalLight(0xd9bc86, 0.45); rim.position.set(-8, -3, -7); scene.add(rim);

    /* ---- Polished marble: veins run THROUGH the solid ----------------
       A pre-rendered Calacatta texture is projected through each form in
       object space (tri-planar), so the veining wraps every face without
       UV seams and stays fixed to the stone as it turns. Three texture
       reads per pixel — far cheaper than computing noise on the GPU, so
       it stays fluid on phones. Gold veins pick up a metallic glint. */
    var M_HEAD = "varying vec3 vMPos;\nvarying vec3 vMNrm;\nuniform vec4 uMarble;\nuniform sampler2D uMarbleTex;\n";
    var M_COLOR =
      "vec3 mW = pow(abs(normalize(vMNrm)), vec3(6.0)); mW /= (mW.x + mW.y + mW.z);\n" +
      "vec3 mQ = vMPos * 0.15 + uMarble.xyz;\n" +
      "vec3 mTex = texture2D(uMarbleTex, mQ.yz).rgb * mW.x + texture2D(uMarbleTex, mQ.zx + 0.37).rgb * mW.y + texture2D(uMarbleTex, mQ.xy + 0.71).rgb * mW.z;\n" +
      "float mVein = clamp((0.86 - mTex.g) * 2.2, 0.0, 1.0);\n" +
      "float mGold = clamp((mTex.r - mTex.b) * 5.0 - 0.35, 0.0, 1.0);\n" +
      "diffuseColor.rgb *= mTex * 1.06;\n";

    function marbleMat(hex, rough, seedVec) {
      var m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0.0, envMapIntensity: 1.0 });
      m.onBeforeCompile = function (sh) {
        sh.uniforms.uMarble = { value: seedVec };
        sh.uniforms.uMarbleTex = { value: marbleTex };
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vMPos;\nvarying vec3 vMNrm;\nuniform vec4 uMarble;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMPos = position * uMarble.w;\nvMNrm = normal;");
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\n" + M_HEAD)
          .replace("#include <color_fragment>", "#include <color_fragment>\n" + M_COLOR)
          .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + mVein * 0.2 - mGold * 0.14, 0.06, 1.0);")
          .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = max(metalnessFactor, mGold * 0.8);");
      };
      m.customProgramCacheKey = function () { return "etx-marble-tex"; };
      return m;
    }
    var gold = new THREE.MeshStandardMaterial({ color: 0xC9A96A, roughness: 0.22, metalness: 1.0, envMapIntensity: 1.15 });

    var geos = [
      new THREE.BoxGeometry(1, 2.6, 1),
      new THREE.BoxGeometry(1.7, 1.0, 0.6),
      new THREE.IcosahedronGeometry(0.95, 0),
      new THREE.BoxGeometry(0.7, 3.4, 0.7),
      new THREE.OctahedronGeometry(0.95, 0),
      new THREE.BoxGeometry(2.1, 2.9, 0.16),            // polished slab
      new THREE.SphereGeometry(0.82, small ? 28 : 40, small ? 18 : 26),
      new THREE.TetrahedronGeometry(1.1, 0)
    ];
    var ringGeo = new THREE.TorusGeometry(0.95, 0.055, 12, 46);

    var group = new THREE.Group(); scene.add(group);
    var items = [];
    var seed = 20240705; function rnd() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }
    var seed2 = 977; function rnd2() { seed2 = (seed2 * 1664525 + 1013904223) & 0x7fffffff; return seed2 / 0x7fffffff; }

    var N = small ? 20 : 34;
    var STEP = small ? 5.4 : 6.0;
    for (var i = 0; i < N; i++) {
      var mesh, isRing = rnd() < 0.18, gi = 0, light = true;
      if (!isRing) { gi = (rnd() * geos.length) | 0; light = rnd() < 0.5; }
      var ang = rnd() * Math.PI * 2, rad = 3.8 + rnd() * 8.5;
      var px = Math.cos(ang) * rad, py = (rnd() - 0.5) * 12, pz = 8 - i * STEP - rnd() * 3;
      var sc = 0.6 + rnd() * 2.1;
      if (isRing) {
        mesh = new THREE.Mesh(ringGeo, gold);
      } else {
        var sv = new THREE.Vector4(rnd2() * 40, rnd2() * 40, rnd2() * 40, sc);   // own slice of the stone
        mesh = new THREE.Mesh(geos[gi], marbleMat(light ? 0xfbf8f3 : 0xf2ede4, light ? 0.3 : 0.42, sv));
      }
      mesh.position.set(px, py, pz);
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
    var docH = 1;
    function measure() { docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }

    var dprNow = DPR, DPR_MIN = small ? 0.7 : 0.75;
    function applySize() {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
      renderer.setPixelRatio(dprNow);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
    var rsT = 0;
    window.addEventListener("resize", function () { clearTimeout(rsT); rsT = setTimeout(function () { measure(); applySize(); }, 120); }, { passive: true });
    window.addEventListener("load", measure);
    if ("ResizeObserver" in window) { try { new ResizeObserver(measure).observe(document.body); } catch (roErr) {} }
    measure();

    /* frame-rate independent easing: the same glide at 30, 60 or 120 Hz */
    function k(rate, dt) { return 1 - Math.exp(-rate * dt); }

    function draw(t, dt) {
      // pointer + scroll follow (smooth, lively)
      var kp = k(5.0, dt), ks = k(5.4, dt);
      ptx += (tptx - ptx) * kp; pty += (tpty - pty) * kp;
      scr += (tScr - scr) * ks;

      // scroll-velocity zoom: a gentle "punch" while scrolling, easing back
      vScroll *= Math.exp(-9.0 * dt);
      var kick = Math.min(Math.abs(vScroll) / 55, 1);
      zoom += (kick - zoom) * k(7.6, dt);
      var fov = BASE_FOV - zoom * 9;                 // zoom in while moving
      if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

      // continuous whisper of forward drift keeps it alive at rest
      var drift = (t * 0.00018) % 1;
      camera.position.x += (ptx * 3.6 - camera.position.x) * ks;
      camera.position.y += (pty * 2.4 - camera.position.y) * ks;
      camera.position.z = 16 - (scr * FLY) - zoom * 2.2 - drift * 0.6;
      camera.lookAt(ptx * 1.6, camera.position.y * 0.35, camera.position.z - 12);

      var rot = dt * 1.2;
      for (var i = 0; i < items.length; i++) {
        var m = items[i], u = m.userData;
        m.rotation.x += u.rx * rot; m.rotation.y += u.ry * rot; m.rotation.z += u.rz * rot;
        m.position.y = u.y0 + Math.sin(t * 0.0007 + u.ph) * u.amp;
        m.position.x = u.x0 + Math.sin(t * 0.0004 + u.swph) * u.sway;
        if (u.breathe) { var s = u.s0 * (1 + Math.sin(t * 0.0009 + u.ph) * u.breathe); m.scale.setScalar(s); }
      }
      group.rotation.y = Math.sin(t * 0.00012) * 0.1;
      renderer.render(scene, camera);
    }

    canvas.classList.add("on");

    if (reduce) {
      draw(0, 0); // single static frame, no motion
    } else {
      window.addEventListener("pointermove", function (e) {
        tptx = e.clientX / window.innerWidth - 0.5;
        tpty = -(e.clientY / window.innerHeight - 0.5);
      }, { passive: true });
      window.addEventListener("scroll", function () {
        var y = window.scrollY;
        vScroll += (y - lastY); lastY = y;
        tScr = Math.min(Math.max(y / docH, 0), 1);
      }, { passive: true });

      /* Quality governor: if this device can't hold a smooth frame rate, lower
         the render resolution step by step (the scene is soft mist anyway)
         instead of letting the whole page stutter. Never oscillates upward. */
      var run = true, prev = 0, born = 0, accT = 0, accN = 0, slowWins = 0;
      document.addEventListener("visibilitychange", function () { run = !document.hidden; prev = 0; accT = 0; accN = 0; if (run) requestAnimationFrame(loop); });
      function loop(ts) {
        if (!run) return;
        if (!born) born = ts;
        var raw = prev ? (ts - prev) / 1000 : 0.016; prev = ts;
        draw(ts, Math.min(raw, 0.1));
        if (ts - born > 3500 && raw < 0.25) {
          accT += raw; accN++;
          if (accN >= 50) {
            var avg = accT / accN; accT = 0; accN = 0;
            if (avg > 0.024) slowWins++; else slowWins = 0;
            if (slowWins >= 2 && dprNow > DPR_MIN + 0.01) { slowWins = 0; dprNow = Math.max(DPR_MIN, dprNow * 0.82); applySize(); }
          }
        }
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    }
  } catch (err) {
    if (window.console && console.warn) console.warn("3D world failed, using ambient fallback:", err);
    try { renderer.dispose(); } catch (e) {}
    fallback();
  }
  }

  /* Decode the marble texture first (small, cached) — then build the world.
     If it can't load, the forms simply stay plain polished stone. */
  function plainTex() {
    var c = document.createElement("canvas"); c.width = c.height = 2;
    var x = c.getContext("2d"); x.fillStyle = "#f4f1ea"; x.fillRect(0, 0, 2, 2);
    return new THREE.CanvasTexture(c);
  }
  function useTex(t) {
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 1;
    t.needsUpdate = true; marbleTex = t; build();
  }
  var img = new Image();
  img.decoding = "async";
  img.onload = function () { useTex(new THREE.Texture(img)); };
  img.onerror = function () { useTex(plainTex()); };
  setTimeout(function () { if (!started) useTex(plainTex()); }, 4000);   // never wait forever
  img.src = "assets/img/marble-tile.jpg";
})();
