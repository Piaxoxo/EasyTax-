/* ============================================================
   EasyTax · kanzlei-assistant  (zweisprachig DE/EN)
   Dezenter, dauerhafter „Digitaler Kanzlei-Assistent": schwebender
   Button + Panel mit Kontaktwegen und DE|EN-Umschalter. Ein einziger,
   zurückhaltender Hinweis nach 10s ODER 30% Scroll. Verdrahtet alle
   [data-open-analysis] / [data-open-assistant] CTAs der Seite.
   ============================================================ */
(function () {
  "use strict";
  var C = window.EasyTaxContact;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fab, panel, nudge, isOpen = false, nudged = false;
  function T(de, en) { return C.t(de, en); }
  function A() { return window.EasyTaxAnalysis; }

  function panelHTML() {
    var lang = C.getLang();
    var langBtns =
      '<div class="eta-lang eta-lang--panel" role="group" aria-label="Sprache / Language">' +
        '<button type="button" class="eta-lang-b" data-a="lang" data-lang="de" aria-pressed="' + (lang === "de") + '">DE</button>' +
        '<button type="button" class="eta-lang-b" data-a="lang" data-lang="en" aria-pressed="' + (lang === "en") + '">EN</button>' +
      '</div>';
    return '' +
      '<div class="eta-panel-head">' +
        '<div><p class="eta-panel-h">' + T("Digitaler Kanzlei-Assistent", "Digital Firm Assistant") + '</p><p class="eta-panel-s">' + T("Ihr erster Ansprechpartner bei EasyTax.", "Your first point of contact at EasyTax.") + '</p></div>' +
        '<div class="eta-panel-head-r">' + langBtns +
          '<button type="button" class="eta-panel-x" data-a="close" aria-label="' + T("Schließen", "Close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg></button>' +
        '</div>' +
      '</div>' +
      '<div class="eta-panel-opts">' +
        '<button type="button" class="eta-po" data-a="analysis"><span class="eta-po-h">' + T("Unternehmensanalyse starten", "Start business analysis") + '</span><span class="eta-po-s">' + T("In wenigen Schritten zur passenden Betreuung", "A few steps to the right support") + '</span></button>' +
        '<a class="eta-po" href="' + C.telHref() + '"><span class="eta-po-h">' + T("Ich möchte anrufen", "I'd like to call") + '</span><span class="eta-po-s">' + C.PHONE_DISPLAY + '</span></a>' +
        '<button type="button" class="eta-po" data-a="email"><span class="eta-po-h">' + T("Ich möchte eine E-Mail schreiben", "I'd like to write an email") + '</span><span class="eta-po-s">' + T("Anfrage vorbereiten", "Prepare enquiry") + '</span></button>' +
        '<button type="button" class="eta-po" data-a="services"><span class="eta-po-h">' + T("Ich habe eine Frage zu Leistungen", "I have a question about services") + '</span><span class="eta-po-s">' + T("Kurzer Überblick", "Quick overview") + '</span></button>' +
        '<button type="button" class="eta-po" data-a="mandant"><span class="eta-po-h">' + T("Ich bin bereits Mandant", "I'm already a client") + '</span><span class="eta-po-s">' + T("Direkter Kontakt", "Direct contact") + '</span></button>' +
      '</div>' +
      '<div class="eta-panel-info" hidden>' +
        '<p>' + C.guard("services") + '</p>' +
        '<p class="eta-panel-info-note">' + T("Fragen zu Preisen oder konkreten Steuerthemen klären wir gerne persönlich – am besten in einem kurzen Gespräch.", "Questions about prices or specific tax topics are best clarified personally – ideally in a short conversation.") + '</p>' +
        '<div class="eta-panel-info-cta"><button type="button" class="eta-btn eta-btn--primary" data-a="analysis"><span>' + T("Analyse starten", "Start analysis") + '</span></button><a class="eta-btn eta-btn--ghost" href="' + C.telHref() + '"><span>' + T("Anrufen", "Call") + '</span></a></div>' +
      '</div>';
  }

  function nudgeHTML() {
    return '' +
      '<button type="button" class="eta-nudge-x" data-a="nudge-close" aria-label="' + T("Hinweis schließen", "Close hint") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></button>' +
      '<p>' + T("Wir helfen Ihnen gerne, die passende Betreuung zu finden.", "We're happy to help you find the right support.") + '</p>' +
      '<button type="button" class="eta-btn eta-btn--primary eta-btn--sm" data-a="analysis"><span>' + T("Analyse starten", "Start analysis") + '</span></button>';
  }

  function updateFab() {
    if (!fab) return;
    fab.setAttribute("aria-label", T("Kanzlei-Assistent öffnen", "Open firm assistant"));
    var lbl = fab.querySelector(".eta-fab-label");
    if (lbl) lbl.textContent = T("Kanzlei-Assistent", "Firm Assistant");
  }

  function build() {
    document.documentElement.classList.add("eta-has-assistant");

    fab = document.createElement("button");
    fab.type = "button";
    fab.className = "eta-fab";
    fab.setAttribute("aria-haspopup", "dialog");
    fab.setAttribute("aria-expanded", "false");
    fab.innerHTML = '<span class="eta-fab-dot" aria-hidden="true"></span><span class="eta-fab-label"></span>';
    document.body.appendChild(fab);
    updateFab();

    panel = document.createElement("div");
    panel.className = "eta-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "EasyTax");
    panel.hidden = true;
    panel.innerHTML = panelHTML();
    document.body.appendChild(panel);

    nudge = document.createElement("div");
    nudge.className = "eta-nudge";
    nudge.hidden = true;
    nudge.innerHTML = nudgeHTML();
    document.body.appendChild(nudge);

    fab.addEventListener("click", toggle);
    panel.addEventListener("click", onPanelClick);
    nudge.addEventListener("click", onPanelClick);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen) closePanel(); });
    document.addEventListener("click", function (e) {
      if (!isOpen) return;
      if (panel.contains(e.target) || fab.contains(e.target)) return;
      closePanel();
    });

    scheduleNudge();
  }

  function setLang(l) {
    if (l === C.getLang()) return;
    C.setLang(l);
    panel.innerHTML = panelHTML();
    nudge.innerHTML = nudgeHTML();
    updateFab();
  }

  function toggle() { isOpen ? closePanel() : openPanel(); }
  function openPanel() {
    hideNudge();
    // always reflect the current language (follows the site language unless overridden)
    panel.innerHTML = panelHTML();
    updateFab();
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add("is-open"); });
    fab.setAttribute("aria-expanded", "true");
    fab.classList.add("is-active");
    isOpen = true;
    var f = panel.querySelector("button, a"); if (f) try { f.focus(); } catch (e) {}
  }
  function closePanel() {
    panel.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
    fab.classList.remove("is-active");
    isOpen = false;
    var info = panel.querySelector(".eta-panel-info"); if (info) info.hidden = true;
    var done = function () { panel.hidden = true; panel.removeEventListener("transitionend", done); };
    if (reduce) done(); else panel.addEventListener("transitionend", done);
  }

  function onPanelClick(e) {
    var t = e.target.closest("[data-a]"); if (!t) return;
    var a = t.getAttribute("data-a");
    if (a === "lang") return setLang(t.getAttribute("data-lang"));
    if (a === "close") return closePanel();
    if (a === "nudge-close") return hideNudge(true);
    if (a === "analysis") { closePanel(); hideNudge(true); if (A()) A().open(); return; }
    if (a === "email")   { closePanel(); if (A()) A().open({ mode: "email" }); return; }
    if (a === "mandant") { closePanel(); if (A()) A().open({ mode: "contact" }); return; }
    if (a === "services") {
      var info = panel.querySelector(".eta-panel-info");
      if (info) info.hidden = !info.hidden;
      return;
    }
  }

  /* --- dezenter Nudge: 10s ODER 30% Scroll, einmalig --- */
  function scheduleNudge() {
    var timer = setTimeout(showNudge, 10000);
    function onScroll() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0 && window.scrollY / h >= 0.3) { showNudge(); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.__etNudgeCleanup = function () { clearTimeout(timer); window.removeEventListener("scroll", onScroll); };
  }
  function showNudge() {
    if (nudged || isOpen) return;
    nudged = true;
    if (window.__etNudgeCleanup) window.__etNudgeCleanup();
    nudge.hidden = false;
    requestAnimationFrame(function () { nudge.classList.add("is-show"); });
    setTimeout(function () { if (!isOpen) hideNudge(); }, 9000);
  }
  function hideNudge(perm) {
    if (!nudge) return;
    nudge.classList.remove("is-show");
    var done = function () { nudge.hidden = true; nudge.removeEventListener("transitionend", done); };
    if (reduce) done(); else nudge.addEventListener("transitionend", done);
  }

  /* --- CTAs überall auf der Seite verdrahten --- */
  function wireCtas() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-open-analysis]");
      if (a) { e.preventDefault(); if (A()) A().open(); return; }
      var b = e.target.closest("[data-open-assistant]");
      if (b) { e.preventDefault(); openPanel(); }
    });
  }

  function init() { build(); wireCtas(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
