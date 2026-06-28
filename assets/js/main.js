/* ============================================================
   EasyTax · interactions
   ============================================================ */
(function () {
  "use strict";

  /* ---- Config ----------------------------------------------------------
     EMPFÄNGER & VERSAND
     Standard: öffnet eine vorausgefüllte E-Mail an office@easytax.eu
               (Betreff "Anfrage von Webseite") – funktioniert sofort,
               ohne Backend.
     Upgrade:  Für echten serverlosen Versand OHNE Mailprogramm einen
               kostenlosen Web3Forms-Key auf https://web3forms.com holen
               und unten WEB3FORMS_KEY eintragen. Dann wird die Mail
               direkt im Hintergrund an office@easytax.eu zugestellt.
  ---------------------------------------------------------------------- */
  var RECIPIENT      = "office@easytax.eu";
  var SUBJECT        = "Anfrage von Webseite";
  var WEB3FORMS_KEY  = ""; // <- hier optional den Access-Key eintragen

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

  /* ---- Reveal on scroll ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
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
        var start = null, dur = 1400;
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

  /* ---- Service deep-links: preselect chips when "Anfragen" clicked ---- */
  var serviceMap = {
    "Laufende Betreuung": ["Steuerberatung", "Buchhaltung", "Lohnverrechnung", "Bilanzierung / Jahresabschluss"],
    "Wachstum & Aufbau":  ["Unternehmensgründung"],
    "Krise & Wende":      ["Restrukturierung", "Krisenmanagement", "Insolvenzberatung"]
  };
  document.querySelectorAll(".svc-link[data-service]").forEach(function (link) {
    link.addEventListener("click", function () {
      var group = link.getAttribute("data-service");
      var values = serviceMap[group] || [];
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

  /* ---- Build the message body from form ---- */
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

      /* --- Path A: serverless via Web3Forms (no mail client) --- */
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

      /* --- Path B (default): pre-filled email to office@easytax.eu --- */
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
