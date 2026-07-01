/* ============================================================
   EasyTax · motion engine
   intro · reveals · scroll parallax (monolith) · counters
   cursor light · magnetic · 3D tilt · form
   One rAF scroll loop. Guards for reduced-motion / touch.
   ============================================================ */
(function () {
  "use strict";

  var RECIPIENT     = "office@easytax.eu";
  var SUBJECT       = "Anfrage von Webseite";
  var WEB3FORMS_KEY = "";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine   = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var big    = window.matchMedia("(min-width: 861px)").matches;
  var fx     = fine && big && !reduce;
  var lerp = function (a, b, n) { return a + (b - a) * n; };

  /* ---- Intro curtain ---- */
  var intro = document.getElementById("intro");
  function dropIntro() { if (intro) intro.classList.add("done"); }
  if (reduce) dropIntro(); else { window.addEventListener("load", function () { setTimeout(dropIntro, 1350); }); setTimeout(dropIntro, 2600); }

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
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
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

  var ticking = false;
  function onScrollFrame() {
    var y = window.scrollY;
    if (y > 24) header.classList.add("scrolled"); else header.classList.remove("scrolled");
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
    if (fx && monolith) {
      monolith.style.transform = "translate3d(0," + (-y * 0.06).toFixed(1) + "px,0) rotate(" + (-9 + y * 0.0035).toFixed(2) + "deg)";
    }
    if (fx) {
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
        var r = el.getBoundingClientRect();
        var off = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
      });
      scenes.forEach(function (s) {
        var r = s.el.getBoundingClientRect();
        var denom = r.height - vh;
        var p = denom > 0 ? Math.min(Math.max(-r.top / denom, 0), 1) : 0;
        if (s.img) s.img.style.transform = "scale(" + (1.06 + p * 0.16).toFixed(3) + ") translateY(" + (p * -4).toFixed(1) + "%)";
        s.panels.forEach(function (pan) {
          var from = parseFloat(pan.getAttribute("data-from")) || 0;
          var to = parseFloat(pan.getAttribute("data-to")); if (isNaN(to)) to = 1.01;
          if (p >= from && p < to) pan.classList.add("on"); else pan.classList.remove("on");
        });
      });
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); } }, { passive: true });
  onScrollFrame();

  /* ---- Cursor light + magnetic + tilt (desktop, fine pointer) ---- */
  if (fx) {
    document.documentElement.classList.add("has-cursor");
    var dot = document.querySelector(".cursor");
    var glow = document.querySelector(".cursor-light");
    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var dx = mx, dy = my, gx = mx, gy = my, seen = false;
    window.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!seen) { seen = true; dot.classList.add("on"); glow.classList.add("on"); }
    }, { passive: true });
    (function loop() {
      dx = lerp(dx, mx, 0.35); dy = lerp(dy, my, 0.35);
      gx = lerp(gx, mx, 0.12); gy = lerp(gy, my, 0.12);
      dot.style.transform = "translate3d(" + dx + "px," + dy + "px,0)";
      glow.style.transform = "translate3d(" + gx + "px," + gy + "px,0)";
      requestAnimationFrame(loop);
    })();

    document.querySelectorAll("a, button, [data-magnetic], .svc-lines li, .faq-item summary").forEach(function (el) {
      el.addEventListener("pointerenter", function () { dot.classList.add("grow"); });
      el.addEventListener("pointerleave", function () { dot.classList.remove("grow"); });
    });

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
  }

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
      if (!matched) toast("Wir beraten Sie gern zu: " + val);
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
    toast("Ihr E-Mail-Programm öffnet sich – bitte nur noch auf „Senden“ klicken.");
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
      if (!valid) { toast("Bitte Name und eine gültige E-Mail angeben."); return; }
      var services = Array.prototype.map.call(form.querySelectorAll('input[name="service"]:checked'), function (cb) { return cb.value; });
      var data = { name: nameEl.value.trim(), company: form.querySelector('[name="company"]').value.trim(),
        email: emailEl.value.trim(), phone: form.querySelector('[name="phone"]').value.trim(),
        message: form.querySelector('[name="message"]').value.trim(), services: services };
      if (WEB3FORMS_KEY) {
        var btn = form.querySelector('button[type="submit"]'), orig = btn.innerHTML; btn.innerHTML = "<span>Wird gesendet …</span>"; btn.disabled = true;
        fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject: SUBJECT, from_name: "EasyTax Webseite", email: data.email, name: data.name, message: buildBody(data) }) })
          .then(function (r) { return r.json(); })
          .then(function (res) { if (res.success) { form.reset(); toast("Danke! Ihre Anfrage wurde gesendet. Wir melden uns."); } else fallbackMailto(data); })
          .catch(function () { fallbackMailto(data); })
          .finally(function () { btn.innerHTML = orig; btn.disabled = false; });
        return;
      }
      fallbackMailto(data);
    });
  }

  var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();
})();
