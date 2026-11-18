/* ============================================================
   EasyTax · motion engine
   intro · reveals · scroll parallax (monolith) · counters
   cursor light · magnetic · 3D tilt · form
   One rAF scroll loop. Guards for reduced-motion / touch.
   ============================================================ */
(function () {
  "use strict";

  /* Safari/older-browser insurance: NodeList.forEach */
  if (window.NodeList && !NodeList.prototype.forEach) { NodeList.prototype.forEach = Array.prototype.forEach; }

  var HTML = document.documentElement;
  function failsafe() {
    try { HTML.className = HTML.className.replace(/\bjs\b/, ""); } catch (e) {}
    var i = document.getElementById("intro"); if (i) i.style.display = "none";
    var els = document.querySelectorAll(".reveal,.reveal-line,.reveal-lines,.mega,.num,.scene-panel,.step");
    for (var k = 0; k < els.length; k++) { els[k].className += " in on"; }
    var sp = document.querySelectorAll(".line>span,.reveal-line>span");
    for (var j = 0; j < sp.length; j++) { sp[j].style.transform = "none"; }
  }

  try {

  var RECIPIENT     = "office@easytax.eu";
  var SUBJECT       = "Anfrage von Webseite";
  var WEB3FORMS_KEY = "";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine   = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var big    = window.matchMedia("(min-width: 861px)").matches;
  var fx     = fine && big && !reduce;   // pointer-driven effects (cursor, magnet, tilt): desktop only
  var motion = !reduce;                  // scroll-driven cinematic effects (scenes, panels): every device
  var lerp = function (a, b, n) { return a + (b - a) * n; };

  /* Translate a JS-side message into the current site language (DE source). */
  function tt(de) {
    try {
      var l = window.EasyTaxI18n && window.EasyTaxI18n.get(), e = window.__I18N__ && window.__I18N__[de];
      return (l && l !== "de" && e && e[l]) || de;
    } catch (e2) { return de; }
  }

  /* ---- Intro curtain ---- */
  var intro = document.getElementById("intro");
  function dropIntro() {
    if (!intro || intro.classList.contains("done")) return;
    intro.classList.add("done");
    setTimeout(function () { intro.classList.add("gone"); }, 2000);   // remove the full-screen layer
  }
  if (reduce) dropIntro(); else { window.addEventListener("load", function () { setTimeout(dropIntro, 2200); }); setTimeout(dropIntro, 3400); }

  /* ---- Header + mobile menu ---- */
  var header = document.getElementById("header");
  var toggle = document.getElementById("navToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    header.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () { header.classList.remove("menu-open"); toggle.setAttribute("aria-expanded", "false"); });
    });
  }

  /* ---- Reveals ---- */
  var revealEls = document.querySelectorAll(".reveal, .reveal-line, .reveal-lines, .mega, .num");
  if ("IntersectionObserver" in window) {
    /* Reveal when 16 % is visible — but a block taller than the screen can
       never show 16 % of itself (e.g. a long legal text on a phone), so tall
       blocks reveal on first contact, and anything already scrolled past
       (fast flick, anchor jump) is revealed too. Nothing can stay hidden. */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var rootH = (e.rootBounds && e.rootBounds.height) || window.innerHeight;
        var tall = e.boundingClientRect.height > rootH * 0.9;
        var passed = !e.isIntersecting && e.boundingClientRect.bottom < rootH * 0.5;
        if ((e.isIntersecting && (e.intersectionRatio >= 0.16 || tall)) || passed) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: [0, 0.16], rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else { revealEls.forEach(function (el) { el.classList.add("in"); }); }

  /* ---- Counters ---- */
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, target = parseInt(el.getAttribute("data-count"), 10), suffix = el.getAttribute("data-suffix") || "";
        if (reduce) { el.textContent = target + suffix; cio.unobserve(el); return; }
        var s = null;
        function step(ts) { if (!s) s = ts; var p = Math.min((ts - s) / 1700, 1); var e2 = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(e2 * target) + suffix; if (p < 1) requestAnimationFrame(step); }
        requestAnimationFrame(step); cio.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---- Single scroll loop: header, progress, monolith, parallax ---- */
  var progress = document.querySelector(".scroll-progress");
  var monolith = document.querySelector("[data-monolith]");
  var parallaxEls = document.querySelectorAll("[data-parallax]:not([data-tilt])");

  /* pinned photo scenes */
  var scenes = [];
  document.querySelectorAll("[data-scene]").forEach(function (el) {
    scenes.push({ el: el, img: el.querySelector("[data-scene-img]"), panels: el.querySelectorAll(".scene-panel") });
  });

  /* Layout is measured once (and again only when the page really changes
     size) — the per-frame scroll work is then pure arithmetic + transforms,
     so scrolling never forces a synchronous layout. */
  var pxItems = [];
  parallaxEls.forEach(function (el) { pxItems.push({ el: el, speed: parseFloat(el.getAttribute("data-parallax")) || 0.1, mid: 0, last: "" }); });
  scenes.forEach(function (s) {
    s.top = 0; s.h = 0; s.lastImg = "";
    s.pans = Array.prototype.map.call(s.panels, function (pan) {
      var to = parseFloat(pan.getAttribute("data-to"));
      return { el: pan, from: parseFloat(pan.getAttribute("data-from")) || 0, to: isNaN(to) ? 1.01 : to, on: null };
    });
  });
  var vh = window.innerHeight, docH = 0, progressOwned = progress && progress.id !== "svcProgress";
  function measure() {
    var y = window.scrollY;
    vh = window.innerHeight;
    docH = document.documentElement.scrollHeight - vh;
    pxItems.forEach(function (it) {
      var prev = it.el.style.transform; it.el.style.transform = "";
      var r = it.el.getBoundingClientRect(); it.mid = r.top + y + r.height / 2;
      it.el.style.transform = prev;
    });
    scenes.forEach(function (s) { var r = s.el.getBoundingClientRect(); s.top = r.top + y; s.h = r.height; });
  }

  var ticking = false, headerScrolled = null, lastProg = -1;
  function onScrollFrame() {
    ticking = false;
    var y = window.scrollY;
    var sc = y > 24;
    if (header && sc !== headerScrolled) { headerScrolled = sc; header.classList.toggle("scrolled", sc); }
    if (progressOwned) {
      var pr = docH > 0 ? Math.min(Math.max(y / docH, 0), 1) : 0;
      if (Math.abs(pr - lastProg) > 0.0005) { lastProg = pr; progress.style.transform = "scaleX(" + pr.toFixed(4) + ")"; }
    }
    if (fx && monolith) {
      monolith.style.transform = "translate3d(0," + (-y * 0.06).toFixed(1) + "px,0) rotate(" + (-9 + y * 0.0035).toFixed(2) + "deg)";
    }
    if (fx) {
      for (var i = 0; i < pxItems.length; i++) {
        var it = pxItems[i];
        if (it.mid - y < -vh || it.mid - y > vh * 2) continue;           // far off-screen
        var tf = "translate3d(0," + ((it.mid - y - vh / 2) * -it.speed).toFixed(1) + "px,0)";
        if (tf !== it.last) { it.last = tf; it.el.style.transform = tf; }
      }
    }
    if (motion) {
      for (var k = 0; k < scenes.length; k++) {
        var s = scenes[k], top = s.top - y;
        if (top > vh * 1.5 || top + s.h < -vh * 0.5) continue;           // not near the viewport
        var denom = s.h - vh;
        var p = denom > 0 ? Math.min(Math.max(-top / denom, 0), 1) : 0;
        if (s.img) {
          var itf = "scale(" + (1.06 + p * 0.16).toFixed(3) + ") translate3d(0," + (p * -4).toFixed(2) + "%,0)";
          if (itf !== s.lastImg) { s.lastImg = itf; s.img.style.transform = itf; }
        }
        for (var j = 0; j < s.pans.length; j++) {
          var pan = s.pans[j], on = p >= pan.from && p < pan.to;
          if (on !== pan.on) { pan.on = on; pan.el.classList.toggle("on", on); }
        }
      }
    }
  }
  function requestFrame() { if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); } }
  function remeasure() { measure(); requestFrame(); }
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", remeasure, { passive: true });
  window.addEventListener("load", remeasure);
  if ("ResizeObserver" in window) { try { new ResizeObserver(remeasure).observe(document.body); } catch (roErr) {} }
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(remeasure);
  measure(); onScrollFrame();

  /* ---- Cursor light + magnetic + tilt (desktop, fine pointer) ---- */
  if (fx) { try {
    document.documentElement.classList.add("has-cursor");
    var dot = document.querySelector(".cursor");
    var glow = document.querySelector(".cursor-light");
    /* Soft ambient light glow follows the pointer — only where the element
       exists. The native mouse cursor stays visible everywhere. */
    if (glow) {
      var mx = window.innerWidth / 2, my = window.innerHeight / 2;
      var gx = mx, gy = my, seen = false;
      var glowRun = false;
      function glowLoop() {
        gx = lerp(gx, mx, 0.14); gy = lerp(gy, my, 0.14);
        glow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
        if (Math.abs(mx - gx) + Math.abs(my - gy) > 0.4) requestAnimationFrame(glowLoop); else glowRun = false;   // sleep when settled
      }
      window.addEventListener("pointermove", function (e) {
        mx = e.clientX; my = e.clientY;
        if (!seen) { seen = true; glow.classList.add("on"); }
        if (!glowRun) { glowRun = true; requestAnimationFrame(glowLoop); }
      }, { passive: true });
    }

    /* magnetic */
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.28;
        var y = (e.clientY - r.top - r.height / 2) * 0.4;
        el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });

    /* 3D tilt */
    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      var base = el.classList.contains("hero-plate") ? "translateY(-46%) " : "";
      var raf = 0;
      el.style.willChange = "transform";
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          el.style.transform = base + "perspective(1100px) rotateX(" + (-py * 5).toFixed(2) + "deg) rotateY(" + (px * 6).toFixed(2) + "deg) translateY(-4px)";
        });
      });
      el.addEventListener("pointerleave", function () { if (raf) cancelAnimationFrame(raf); el.style.transform = base; });
    });
  } catch (ptrErr) { if (window.console && console.warn) console.warn("pointer fx skipped:", ptrErr); } }

  /* ---- Toast ---- */
  var toastEl = document.getElementById("toast"), toastTimer;
  function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 4200); }

  /* ---- Service line → preselect chip + jump to form ---- */
  document.querySelectorAll(".svc-lines li[data-service]").forEach(function (li) {
    li.addEventListener("click", function () {
      var val = li.getAttribute("data-service");
      var boxes = document.querySelectorAll('input[name="service"]');
      var matched = false;
      boxes.forEach(function (cb) { cb.checked = (cb.value === val); if (cb.value === val) matched = true; });
      var anchor = document.getElementById("anfrage");
      if (anchor) anchor.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      if (!matched) toast(tt("Wir beraten Sie gern zu:") + " " + val);
    });
  });

  /* ---- Form ---- */
  function buildBody(data) {
    var l = [];
    l.push("Neue Anfrage über die EasyTax-Webseite"); l.push("=====================================" ); l.push("");
    l.push("Name:        " + (data.name || "-")); l.push("Unternehmen: " + (data.company || "-"));
    l.push("E-Mail:      " + (data.email || "-")); l.push("Telefon:     " + (data.phone || "-")); l.push("");
    l.push("Gewünschte Leistungen:"); l.push(data.services.length ? "  - " + data.services.join("\n  - ") : "  (keine ausgewählt)"); l.push("");
    l.push("Nachricht:"); l.push(data.message ? data.message : "  (keine Nachricht)");
    return l.join("\n");
  }
  function fallbackMailto(data) {
    window.location.href = "mailto:" + RECIPIENT + "?subject=" + encodeURIComponent(SUBJECT) + "&body=" + encodeURIComponent(buildBody(data));
    toast(tt("Ihr E-Mail-Programm öffnet sich – bitte nur noch auf „Senden“ klicken."));
  }
  var form = document.getElementById("requestForm");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var nameEl = form.querySelector('[name="name"]'), emailEl = form.querySelector('[name="email"]'), valid = true;
      [nameEl, emailEl].forEach(function (el) {
        if (!el.value.trim() || (el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value))) { el.classList.add("invalid"); valid = false; }
        else el.classList.remove("invalid");
      });
      if (!valid) { toast(tt("Bitte Name und eine gültige E-Mail angeben.")); return; }
      var services = Array.prototype.map.call(form.querySelectorAll('input[name="service"]:checked'), function (cb) { return cb.value; });
      var data = { name: nameEl.value.trim(), company: form.querySelector('[name="company"]').value.trim(),
        email: emailEl.value.trim(), phone: form.querySelector('[name="phone"]').value.trim(),
        message: form.querySelector('[name="message"]').value.trim(), services: services };
      /* Spam trap: a hidden box no human ever ticks. Bots get a silent "ok". */
      var hp = form.querySelector('[name="botcheck"]');
      if (hp && hp.checked) { showSent(); return; }

      /* Automatic delivery (no mail program needed) once a form key is set.
         Any failure — offline, timeout, service down — falls back to the
         prepared e-mail, so an enquiry is never lost. */
      if (WEB3FORMS_KEY && window.fetch) {
        if (sending) return; sending = true;
        var btn = form.querySelector('button[type="submit"]'), label = btn.querySelector("span"), node = label && label.firstChild;
        var orig = node ? node.nodeValue : "";
        if (node) node.nodeValue = tt("Wird gesendet …");
        btn.disabled = true;
        var ctrl = window.AbortController ? new AbortController() : null;
        var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
        fetch("https://api.web3forms.com/submit", {
          method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
          signal: ctrl ? ctrl.signal : undefined,
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY, subject: SUBJECT + " – " + data.name, from_name: "EasyTax Webseite",
            name: data.name, email: data.email, replyto: data.email,
            Unternehmen: data.company || "-", Telefon: data.phone || "-",
            Leistungen: data.services.length ? data.services.join(", ") : "-",
            message: data.message || "(keine Nachricht)", botcheck: ""
          })
        })
          .then(function (r) { return r.json(); })
          .then(function (res) { if (res && res.success) { form.reset(); showSent(); } else fallbackMailto(data); })
          .catch(function () { fallbackMailto(data); })
          .then(function () { clearTimeout(timer); sending = false; btn.disabled = false; if (node) node.nodeValue = orig; });
        return;
      }
      fallbackMailto(data);
    });
    var again = document.getElementById("formAgain");
    if (again) again.addEventListener("click", function () { form.classList.remove("sent"); });
  }
  var sending = false;
  function showSent() {
    if (!form) return;
    form.classList.add("sent");
    var ok = document.getElementById("formSuccess");
    if (ok) { try { ok.focus({ preventScroll: true }); } catch (fe) {} ok.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); }
  }

  var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();

  window.__etReady = true;
  } catch (err) { failsafe(); if (window.console && console.error) console.error("EasyTax init error:", err); }
})();
