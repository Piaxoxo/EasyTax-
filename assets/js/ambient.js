/* ============================================================
   EasyTax · Ambient shader (tier-2 fallback for the 3D world)
   Exposes window.EasyTaxAmbient(canvas): a slow volumetric field of
   soft light through marble mist. Called by scene3d.js only when the
   full WebGL 3D world can't run. Self-contained, no libraries.
   ============================================================ */
window.EasyTaxAmbient = function (canvas) {
  "use strict";
  if (!canvas) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var gl = canvas.getContext("webgl2", { antialias: false, alpha: true, powerPreference: "low-power" });
  if (!gl) return;

  var DPR = Math.min(window.devicePixelRatio || 1, 1.4);
  if (window.matchMedia("(max-width: 860px)").matches) DPR = Math.min(DPR, 1.1);

  var VERT = "#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }";
  var FRAG =
    "#version 300 es\nprecision highp float;\nout vec4 o;\n" +
    "uniform vec2 u_res; uniform float u_t; uniform vec2 u_ptr; uniform float u_scroll;\n" +
    "float hash(vec2 x){ return fract(sin(dot(x, vec2(127.1,311.7)))*43758.5453); }\n" +
    "float noise(vec2 x){ vec2 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);\n" +
    " float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));\n" +
    " return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }\n" +
    "float fbm(vec2 x){ float v=0.0,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);\n" +
    " for(int i=0;i<6;i++){ v+=a*noise(x); x=m*x; a*=0.5; } return v; }\n" +
    "void main(){ vec2 uv=gl_FragCoord.xy/u_res.xy; vec2 st=(gl_FragCoord.xy-0.5*u_res.xy)/u_res.y;\n" +
    " float t=u_t*0.018;\n" +
    " vec2 q=vec2(fbm(st*1.4+vec2(0.0,t)), fbm(st*1.4+vec2(5.2,-t)));\n" +
    " vec2 r=vec2(fbm(st*1.4+3.0*q+vec2(1.7,9.2)+t*0.6), fbm(st*1.4+3.0*q+vec2(8.3,2.8)-t*0.4));\n" +
    " float f=smoothstep(-0.1,1.05,fbm(st*1.4+3.2*r+u_scroll*0.15));\n" +
    " vec3 paper=vec3(0.945,0.917,0.878), light=vec3(0.985,0.965,0.925), champ=vec3(0.812,0.717,0.545), shade=vec3(0.792,0.760,0.706);\n" +
    " vec3 col=mix(shade,paper,smoothstep(0.15,0.6,f)); col=mix(col,light,smoothstep(0.62,0.98,f));\n" +
    " float vein=smoothstep(0.72,0.88,length(q))*(1.0-f); col=mix(col,champ,vein*0.16);\n" +
    " vec2 pc=u_ptr; pc.x*=u_res.x/u_res.y; vec2 sc=st; sc.x*=u_res.x/u_res.y;\n" +
    " float d=distance(sc,pc); col+=light*(0.06*exp(-d*d*2.2));\n" +
    " col+=0.04*smoothstep(0.9,0.0,uv.y); col*=1.0-0.10*smoothstep(0.55,1.25,length(uv-0.5));\n" +
    " o=vec4(col,1.0); }";

  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(prog, "u_res"), uT = gl.getUniformLocation(prog, "u_t"),
      uPtr = gl.getUniformLocation(prog, "u_ptr"), uScr = gl.getUniformLocation(prog, "u_scroll");
  var W = 0, H = 0;
  function resize() { var w = Math.floor(innerWidth*DPR), h = Math.floor(innerHeight*DPR); if (w===W&&h===H) return; W=w;H=h;canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h); }
  addEventListener("resize", resize, { passive: true }); resize();
  canvas.classList.add("on");
  var px=0,py=0,tx=0,ty=0,scr=0;
  addEventListener("pointermove", function (e) { tx=e.clientX/innerWidth-0.5; ty=-(e.clientY/innerHeight-0.5); }, { passive: true });
  addEventListener("scroll", function () { var h=document.documentElement.scrollHeight-innerHeight; scr=h>0?scrollY/h:0; }, { passive: true });
  var start=null, run=true;
  document.addEventListener("visibilitychange", function () { run=!document.hidden; if (run) requestAnimationFrame(frame); });
  function frame(ts) { if (!run) return; if (start===null) start=ts; var t=(ts-start)*0.001; px+=(tx-px)*0.04; py+=(ty-py)*0.04;
    gl.uniform2f(uRes,W,H); gl.uniform1f(uT,t); gl.uniform2f(uPtr,px,py); gl.uniform1f(uScr,scr); gl.drawArrays(gl.TRIANGLES,0,3); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
};
