/* ============================================================
   EasyTax · Leistungen — interaction layer
   Scroll-Fortschritt → 3D-Welt, Reveal-Animationen, Accordion,
   Atmosphären-Wechsel, vorbereitete E-Mail pro Leistung, Cursor-
   Licht. Ohne Speicherung, ohne externe Requests. Failsafe: bei
   Fehlern wird alles sichtbar (kein leerer Screen).
   ============================================================ */
(function () {
  "use strict";

  var HTML = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  function failsafe() {
    HTML.className = HTML.className.replace(/\bjs\b/, "");
  }

  try {
    var main = document.getElementById("svcMain");
    var sections = Array.prototype.slice.call(document.querySelectorAll(".svc"));
    var progressBar = document.getElementById("svcProgress");
    var lightEl = document.getElementById("svcLight");

    /* ---------- Reveal on view ---------- */
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.28 });
      document.querySelectorAll(".svc, .svc-outro, .reveal, [data-reveal]").forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll(".svc, .svc-outro, .reveal, [data-reveal]").forEach(function (el) { el.classList.add("in"); });
    }

    /* ---------- Accordion ---------- */
    document.querySelectorAll(".svc-acc-toggle").forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        if (panel) panel.classList.toggle("open", !open);
      });
    });

    /* ---------- Prepared e-mail per service ---------- */
    function mailtoFor(service) {
      var subject = "Anfrage – " + service;
      var body =
        "Sehr geehrtes EasyTax-Team,\n\n" +
        "ich interessiere mich für Ihre Leistung „" + service + "“ und würde gerne mehr erfahren.\n\n" +
        "Kurz zu mir:\n" +
        "• Unternehmen: \n" +
        "• Telefon für einen Rückruf: \n" +
        "• Mein Anliegen: \n\n" +
        "Ich freue mich über Ihre Rückmeldung.\n\n" +
        "Mit freundlichen Grüßen";
      if (window.EasyTaxContact && window.EasyTaxContact.buildMailto) {
        return window.EasyTaxContact.buildMailto(subject, body);
      }
      return "mailto:office@easytax.eu?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }
    document.querySelectorAll("[data-mailto]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var svc = btn.getAttribute("data-mailto");
        var toast = document.getElementById("toast");
        if (toast) { toast.textContent = "E-Mail für „" + svc + "“ wird geöffnet …"; toast.classList.add("show"); setTimeout(function () { toast.classList.remove("show"); }, 3200); }
        window.location.href = mailtoFor(svc);
      });
    });

    /* ---------- Scroll: progress + 3D + atmosphere ---------- */
    var lastAtmo = "";
    function computeProgress() {
      if (!main) return 0;
      var rect = main.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var scrolled = -rect.top;
      var p = total > 0 ? scrolled / total : 0;
      return Math.max(0, Math.min(1, p));
    }

    function activeIndex() {
      var mid = window.innerHeight * 0.5, best = 0, bestD = Infinity;
      for (var i = 0; i < sections.length; i++) {
        var r = sections[i].getBoundingClientRect();
        var c = r.top + r.height / 2;
        var d = Math.abs(c - mid);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    /* Chapter float aligned to section centers: object i is fully formed
       exactly when chapter i sits in the viewport centre; transitions (and
       the shard shatter) happen while scrolling between two centres. */
    function chapterFloat() {
      var n = sections.length; if (!n) return 0;
      var Y = window.scrollY + window.innerHeight / 2;
      var centers = [];
      for (var i = 0; i < n; i++) {
        var r = sections[i].getBoundingClientRect();
        centers.push(window.scrollY + r.top + r.height / 2);
      }
      if (Y <= centers[0]) return 0;
      if (Y >= centers[n - 1]) return n - 1;
      for (var j = 0; j < n - 1; j++) {
        if (Y >= centers[j] && Y <= centers[j + 1]) {
          var span = centers[j + 1] - centers[j] || 1;
          return j + (Y - centers[j]) / span;
        }
      }
      return 0;
    }

    var ticking = false, N = sections.length;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        if (progressBar) progressBar.style.width = (computeProgress() * 100).toFixed(2) + "%";
        var cf = chapterFloat();
        if (window.SvcScene && window.SvcScene.setProgress) window.SvcScene.setProgress(N > 1 ? cf / (N - 1) : 0);
        var idx = Math.round(cf);
        var atmo = sections[idx] ? sections[idx].getAttribute("data-atmo") : "";
        if (atmo && atmo !== lastAtmo) { HTML.setAttribute("data-atmo", atmo); lastAtmo = atmo; }
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();

    /* ---------- Header state ---------- */
    var header = document.getElementById("header");
    window.addEventListener("scroll", function () {
      if (header) header.classList.toggle("scrolled", window.scrollY > 40);
    }, { passive: true });

    /* ---------- Cursor light + 3D pointer parallax ---------- */
    if (fine && !reduce) {
      window.addEventListener("pointermove", function (e) {
        var nx = (e.clientX / window.innerWidth) * 2 - 1;
        var ny = (e.clientY / window.innerHeight) * 2 - 1;
        if (lightEl) lightEl.style.transform = "translate3d(" + e.clientX + "px," + e.clientY + "px,0)";
        if (window.SvcScene && window.SvcScene.setPointer) window.SvcScene.setPointer(nx, -ny);
      }, { passive: true });
    } else if (lightEl) {
      lightEl.style.opacity = "0";
    }

    /* ---------- year ---------- */
    var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();

    window.__svcReady = true;
  } catch (err) {
    failsafe();
  }
})();
