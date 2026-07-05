/* ============================================================
   EasyTax · Ambient WebGL world
   A slow, volumetric field of soft light through marble mist.
   Self-contained (no libraries, no CDN). Calm, trustworthy, original.
   Falls back silently to the CSS background if WebGL is unavailable,
   reduced-motion is requested, or the device is low-power.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("ambient");
  if (!canvas || reduce) return;

  var gl = canvas.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl) return; // fallback: CSS .bg-field stays visible

  var DPR = Math.min(window.devicePixelRatio || 1, 1.4);
  var small = window.matchMedia("(max-width: 860px)").matches;
  if (small) DPR = Math.min(DPR, 1.1);

  var VERT =
    "#version 300 es\n" +
    "in vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }";

  /* Domain-warped fbm -> soft marble mist with a warm light that
     drifts with time, scroll and pointer. Low contrast, calm palette. */
  var FRAG =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "out vec4 o;\n" +
    "uniform vec2 u_res; uniform float u_t; uniform vec2 u_ptr; uniform float u_scroll;\n" +
    "float hash(vec2 x){ return fract(sin(dot(x, vec2(127.1,311.7)))*43758.5453); }\n" +
    "float noise(vec2 x){ vec2 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);\n" +
    "  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));\n" +
    "  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }\n" +
    "float fbm(vec2 x){ float v=0.0, a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);\n" +
    "  for(int i=0;i<6;i++){ v+=a*noise(x); x=m*x; a*=0.5; } return v; }\n" +
    "void main(){\n" +
    "  vec2 uv = gl_FragCoord.xy / u_res.xy;\n" +
    "  vec2 st = (gl_FragCoord.xy - 0.5*u_res.xy) / u_res.y;\n" +
    "  float t = u_t*0.018;\n" +
    "  vec2 q = vec2(fbm(st*1.4 + vec2(0.0, t)), fbm(st*1.4 + vec2(5.2, -t)));\n" +
    "  vec2 r = vec2(fbm(st*1.4 + 3.0*q + vec2(1.7, 9.2) + t*0.6),\n" +
    "                fbm(st*1.4 + 3.0*q + vec2(8.3, 2.8) - t*0.4));\n" +
    "  float f = fbm(st*1.4 + 3.2*r + u_scroll*0.15);\n" +
    "  f = smoothstep(-0.1, 1.05, f);\n" +
    "  // calm ivory / champagne / soft-ink palette\n" +
    "  vec3 paper = vec3(0.945, 0.917, 0.878);\n" +
    "  vec3 light = vec3(0.985, 0.965, 0.925);\n" +
    "  vec3 champ = vec3(0.812, 0.717, 0.545);\n" +
    "  vec3 shade = vec3(0.792, 0.760, 0.706);\n" +
    "  vec3 col = mix(shade, paper, smoothstep(0.15, 0.6, f));\n" +
    "  col = mix(col, light, smoothstep(0.62, 0.98, f));\n" +
    "  // subtle champagne veins where the field folds\n" +
    "  float vein = smoothstep(0.72, 0.88, length(q)) * (1.0 - f);\n" +
    "  col = mix(col, champ, vein*0.16);\n" +
    "  // warm light that follows the pointer, very soft\n" +
    "  vec2 pc = u_ptr; pc.x *= u_res.x/u_res.y;\n" +
    "  vec2 sc = st; sc.x *= u_res.x/u_res.y;\n" +
    "  float d = distance(sc, pc);\n" +
    "  col += light * (0.06 * exp(-d*d*2.2));\n" +
    "  // gentle top sheen + vignette for depth\n" +
    "  col += 0.04 * smoothstep(0.9, 0.0, uv.y);\n" +
    "  col *= 1.0 - 0.10*smoothstep(0.55, 1.25, length(uv-0.5));\n" +
    "  o = vec4(col, 1.0);\n" +
    "}";

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
    return s;
  }
  var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, "u_res");
  var uT   = gl.getUniformLocation(prog, "u_t");
  var uPtr = gl.getUniformLocation(prog, "u_ptr");
  var uScr = gl.getUniformLocation(prog, "u_scroll");

  var W = 0, H = 0;
  function resize() {
    var w = Math.floor(window.innerWidth * DPR), h = Math.floor(window.innerHeight * DPR);
    if (w === W && h === H) return;
    W = w; H = h; canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  /* reveal the canvas once ready (CSS keeps it at opacity 0 initially) */
  canvas.classList.add("on");

  var ptrX = 0, ptrY = 0, tgtX = 0, tgtY = 0, scr = 0;
  window.addEventListener("pointermove", function (e) {
    tgtX = (e.clientX / window.innerWidth - 0.5);
    tgtY = -(e.clientY / window.innerHeight - 0.5);
  }, { passive: true });
  window.addEventListener("scroll", function () {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    scr = h > 0 ? window.scrollY / h : 0;
  }, { passive: true });

  var start = null, running = true;
  document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(frame); });

  function frame(ts) {
    if (!running) return;
    if (start === null) start = ts;
    var t = (ts - start) * 0.001;
    ptrX += (tgtX - ptrX) * 0.04;
    ptrY += (tgtY - ptrY) * 0.04;
    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uT, t);
    gl.uniform2f(uPtr, ptrX, ptrY);
    gl.uniform1f(uScr, scr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
