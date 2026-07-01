/* ============================================================
   EasyTax · interactions
   reveals · counters · menu · 3D tilt · parallax · form
   All motion is GPU-friendly and disabled for reduced-motion / touch.
   ============================================================ */
(function () {
  "use strict";

  /* ---- Config: email delivery -----------------------------------------
     Default: opens a prefilled mail to office@easytax.eu (Betreff
     "Anfrage von Webseite"). For true background delivery add a free
     Web3Forms key: https://web3forms.com  →  WEB3FORMS_KEY below.
  ---------------------------------------------------------------------- */
  var RECIPIENT     = "office@easytax.eu";
  var SUBJECT       = "Anfrage von Webseite";
  var WEB3FORMS_KEY = "";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer  = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var isDesktop    = window.matchMedia("(min-width: 981px)").matches;
  var fx = finePointer && isDesktop && !reduceMotion;

  /* ---- Header scroll state ---- */
  var header = document.getElementById("header");
  function onScroll() {
    if (window.scrollY > 24) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  var toggle = document.getElementById("navToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    header.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Reveal + rise on scroll ---- */
  var revealEls = document.querySelectorAll(".reveal, .rise");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- Animated counters ---- */
  var counters = document.querySelectorAll(".trust-item strong[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var target = parseInt(el.getAttribute("data-count"), 10);
        var suffix = el.getAttribute("data-suffix") || "";
        if (reduceMotion) { el.textContent = target + suffix; cio.unobserve(el); return; }
        var start = null, dur = 1500;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        cio.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---- 3D tilt on cards (desktop, fine pointer only) ---- */
  if (fx) {
    document.querySelectorAll(".card, .svc-group, .testi").forEach(function (el) {
      var raf = 0;
      el.style.willChange = "transform";
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          el.style.transform =
            "rotateX(" + (-py * 4.5).toFixed(2) + "deg) rotateY(" + (px * 5.5).toFixed(2) +
            "deg) translateY(-5px)";
        });
      });
      el.addEventListener("pointerleave", function () {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = "";
      });
    });
  }

  /* ---- Hero mouse parallax (decor depth layers) ---- */
  if (fx) {
    var hero = document.querySelector(".hero");
    var depthEls = hero ? hero.querySelectorAll("[data-depth]") : [];
    if (hero && depthEls.length) {
      var hraf = 0;
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var cx = (e.clientX - r.left) / r.width - 0.5;
        var cy = (e.clientY - r.top) / r.height - 0.5;
        if (hraf) cancelAnimationFrame(hraf);
        hraf = requestAnimationFrame(function () {
          depthEls.forEach(function (l) {
            var d = parseFloat(l.getAttribute("data-depth")) || 10;
            l.style.transform = "translate3d(" + (-cx * d).toFixed(1) + "px," + (-cy * d).toFixed(1) + "px,0)";
          });
        });
      });
    }
  }

  /* ---- Scroll parallax (decor slabs) ---- */
  if (fx) {
    var slabs = document.querySelectorAll("[data-parallax]");
    if (slabs.length) {
      var sraf = 0;
      var applyParallax = function () {
        var y = window.scrollY;
        slabs.forEach(function (el) {
          var speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
          var rot = el.getAttribute("data-rot") || "0deg";
          el.style.transform = "translate3d(0," + (-y * speed).toFixed(1) + "px,0) rotate(" + rot + ")";
        });
        sraf = 0;
      };
      window.addEventListener("scroll", function () {
        if (!sraf) sraf = requestAnimationFrame(applyParallax);
      }, { passive: true });
      applyParallax();
    }
  }

  /* ---- Service deep-links: preselect chips ---- */
  var serviceMap = {
    "Laufende Betreuung": ["Steuerberatung", "Buchhaltung", "Lohnverrechnung", "Bilanzierung / Jahresabschluss"],
    "Wachstum & Aufbau":  ["Unternehmensgründung"],
    "Krise & Wende":      ["Restrukturierung", "Krisenmanagement", "Insolvenzberatung"]
  };
  document.querySelectorAll(".svc-link[data-service]").forEach(function (link) {
    link.addEventListener("click", function () {
      var values = serviceMap[link.getAttribute("data-service")] || [];
      document.querySelectorAll('input[name="service"]').forEach(function (cb) {
        cb.checked = values.indexOf(cb.value) !== -1;
      });
    });
  });

  /* ---- Toast ---- */
  var toastEl = document.getElementById("toast");
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 4200);
  }

  /* ---- Build message body ---- */
  function buildBody(data) {
    var lines = [];
    lines.push("Neue Anfrage über die EasyTax-Webseite");
    lines.push("=====================================");
    lines.push("");
    lines.push("Name:        " + (data.name || "-"));
    lines.push("Unternehmen: " + (data.company || "-"));
    lines.push("E-Mail:      " + (data.email || "-"));
    lines.push("Telefon:     " + (data.phone || "-"));
    lines.push("");
    lines.push("Gewünschte Leistungen:");
    lines.push(data.services.length ? "  - " + data.services.join("\n  - ") : "  (keine ausgewählt)");
    lines.push("");
    lines.push("Nachricht:");
    lines.push(data.message ? data.message : "  (keine Nachricht)");
    return lines.join("\n");
  }

  /* ---- Form submit ---- */
  var form = document.getElementById("requestForm");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();

      var nameEl  = form.querySelector('[name="name"]');
      var emailEl = form.querySelector('[name="email"]');
      var valid = true;
      [nameEl, emailEl].forEach(function (el) {
        if (!el.value.trim() || (el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value))) {
          el.classList.add("invalid"); valid = false;
        } else { el.classList.remove("invalid"); }
      });
      if (!valid) { toast("Bitte Name und eine gültige E-Mail angeben."); return; }

      var services = Array.prototype.map.call(
        form.querySelectorAll('input[name="service"]:checked'),
        function (cb) { return cb.value; }
      );
      var data = {
        name:    nameEl.value.trim(),
        company: form.querySelector('[name="company"]').value.trim(),
        email:   emailEl.value.trim(),
        phone:   form.querySelector('[name="phone"]').value.trim(),
        message: form.querySelector('[name="message"]').value.trim(),
        services: services
      };

      if (WEB3FORMS_KEY) {
        var btn = form.querySelector('button[type="submit"]');
        var orig = btn.textContent; btn.textContent = "Wird gesendet …"; btn.disabled = true;
        fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: SUBJECT,
            from_name: "EasyTax Webseite",
            email: data.email,
            name: data.name,
            message: buildBody(data)
          })
        })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.success) { form.reset(); toast("Danke! Ihre Anfrage wurde gesendet. Wir melden uns."); }
          else { fallbackMailto(data); }
        })
        .catch(function () { fallbackMailto(data); })
        .finally(function () { btn.textContent = orig; btn.disabled = false; });
        return;
      }

      fallbackMailto(data);
    });
  }

  function fallbackMailto(data) {
    var href = "mailto:" + RECIPIENT +
      "?subject=" + encodeURIComponent(SUBJECT) +
      "&body=" + encodeURIComponent(buildBody(data));
    window.location.href = href;
    toast("Ihr E-Mail-Programm öffnet sich – bitte nur noch auf „Senden“ klicken.");
  }

  /* ---- Footer year ---- */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
