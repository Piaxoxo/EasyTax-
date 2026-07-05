/* ============================================================
   EasyTax · business-analysis  (zweisprachig DE/EN)
   Die Unternehmensanalyse als ruhige Overlay-Experience.
   State-Machine + Rendering; nutzt analysis-data (Fragen/Logik) und
   contact-utils (Kontakt + Sprache). Keine Speicherung, kein Tracking.
   Zugänglich: Dialog, Fokus-Trap, ESC, Tastatur, reduced-motion.
   ============================================================ */
window.EasyTaxAnalysis = (function () {
  "use strict";
  var C = window.EasyTaxContact, D = window.EasyTaxAnalysisData;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function T(de, en) { return C.t(de, en); }

  var overlay, stage, view, bar, live, lastFocus, built = false;
  var state = { mode: "intro", step: 0, answers: { anliegen: [] } };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]; }); }

  /* ---------- build once ---------- */
  function build() {
    if (built) return; built = true;
    overlay = document.createElement("div");
    overlay.className = "eta-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "EasyTax");
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="eta-backdrop" data-action="close"></div>' +
      '<div class="eta-stage">' +
        '<div class="eta-top">' +
          '<span class="eta-brandline"></span>' +
          '<div class="eta-top-right">' +
            '<div class="eta-lang" role="group" aria-label="Sprache / Language">' +
              '<button type="button" class="eta-lang-b" data-action="lang" data-lang="de">DE</button>' +
              '<button type="button" class="eta-lang-b" data-action="lang" data-lang="en">EN</button>' +
            '</div>' +
            '<button type="button" class="eta-close" data-action="close">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="eta-progress" aria-hidden="true"><span class="eta-bar"></span></div>' +
        '<div class="eta-view" aria-live="polite"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    stage = overlay.querySelector(".eta-stage");
    view = overlay.querySelector(".eta-view");
    bar = overlay.querySelector(".eta-bar");
    live = view;

    overlay.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
  }

  function updateChrome() {
    var bl = overlay.querySelector(".eta-brandline");
    if (bl) bl.textContent = T("EasyTax · Unternehmensanalyse", "EasyTax · Business analysis");
    var cl = overlay.querySelector(".eta-close");
    if (cl) cl.setAttribute("aria-label", T("Analyse schließen", "Close analysis"));
    var lang = C.getLang();
    Array.prototype.forEach.call(overlay.querySelectorAll(".eta-lang-b"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
  }

  /* ---------- open / close ---------- */
  function open(opts) {
    build();
    opts = opts || {};
    if (!opts.keep) state = { mode: opts.mode || "intro", step: 0, answers: { anliegen: [] } };
    if (opts.mode) state.mode = opts.mode;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.documentElement.classList.add("eta-lock");
    requestAnimationFrame(function () { overlay.classList.add("eta-open"); });
    render();
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("eta-open");
    document.documentElement.classList.remove("eta-lock");
    var done = function () { overlay.hidden = true; overlay.removeEventListener("transitionend", done); };
    if (reduce) done(); else overlay.addEventListener("transitionend", done);
    state = { mode: "intro", step: 0, answers: { anliegen: [] } };
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  /* ---------- keyboard / focus trap ---------- */
  function onKey(e) {
    if (overlay.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") {
      var f = stage.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
      f = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null && !el.disabled; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  /* ---------- click delegation ---------- */
  function onClick(e) {
    var t = e.target.closest("[data-action]");
    if (!t) return;
    var a = t.getAttribute("data-action");
    if (a === "close") { close(); }
    else if (a === "lang") { setLang(t.getAttribute("data-lang")); }
    else if (a === "start") { state.mode = "question"; state.step = 0; render(); }
    else if (a === "pick") { pickSingle(t.getAttribute("data-val")); }
    else if (a === "toggle") { toggleMulti(t.getAttribute("data-val"), t); }
    else if (a === "next") { next(); }
    else if (a === "back") { back(); }
    else if (a === "contact") { chooseContact(t.getAttribute("data-mode")); }
    else if (a === "email-open") { openEmail(); }
    else if (a === "restart") { state = { mode: "question", step: 0, answers: { anliegen: [] } }; render(); }
  }

  function setLang(l) {
    if (l === C.getLang()) return;
    C.setLang(l);
    // keep the site switcher (if present) in sync visually only when DE/EN
    render();
  }

  /* ---------- state transitions ---------- */
  function pickSingle(val) {
    var step = D.getSteps()[state.step];
    state.answers[step.id] = val;
    highlightPicked(val);
    setTimeout(next, reduce ? 0 : 240);
  }
  function toggleMulti(val, el) {
    var arr = state.answers.anliegen;
    var i = arr.indexOf(val);
    if (i === -1) arr.push(val); else arr.splice(i, 1);
    el.classList.toggle("is-sel");
    el.setAttribute("aria-pressed", i === -1 ? "true" : "false");
    var nx = view.querySelector(".eta-next");
    if (nx) nx.disabled = arr.length === 0;
  }
  function next() {
    var steps = D.getSteps();
    if (state.step < steps.length - 1) { state.step++; render(); }
    else { state.mode = "result"; render(); }
  }
  function back() {
    var steps = D.getSteps();
    if (state.mode === "result") { state.mode = "question"; state.step = steps.length - 1; render(); }
    else if (state.mode === "contact" || state.mode === "email" || state.mode === "appt") { state.mode = "result"; render(); }
    else if (state.step > 0) { state.step--; render(); }
    else { state.mode = "intro"; render(); }
  }
  function chooseContact(mode) { state.mode = mode; render(); }

  /* ---------- rendering ---------- */
  function render() {
    updateChrome();
    var steps = D.getSteps();
    var html = "";
    if (state.mode === "intro") { html = tplIntro(); setBar(0); }
    else if (state.mode === "question") { html = tplQuestion(steps[state.step], steps.length); setBar((state.step) / steps.length); }
    else if (state.mode === "result") { html = tplResult(); setBar(1); }
    else if (state.mode === "contact") { html = tplContact(); setBar(1); }
    else if (state.mode === "email") { html = tplEmail(); setBar(1); }
    else if (state.mode === "appt") { html = tplAppt(); setBar(1); }
    else if (state.mode === "thanks") { html = tplThanks(); setBar(1); }
    swap(html);
  }
  function setBar(p) { if (bar) bar.style.transform = "scaleX(" + Math.max(0.02, Math.min(1, p)) + ")"; }
  function swap(html) {
    if (reduce) { view.innerHTML = html; focusFirst(); return; }
    view.classList.remove("eta-in");
    view.classList.add("eta-out");
    setTimeout(function () {
      view.innerHTML = html;
      view.classList.remove("eta-out");
      requestAnimationFrame(function () { view.classList.add("eta-in"); focusFirst(); });
    }, 160);
  }
  function focusFirst() {
    var f = view.querySelector(".eta-focus, button, input, textarea, a");
    if (f) { try { f.focus(); } catch (e) {} }
  }
  function highlightPicked(val) {
    var els = view.querySelectorAll(".eta-opt");
    Array.prototype.forEach.call(els, function (el) {
      if (el.getAttribute("data-val") === val) el.classList.add("is-sel");
    });
  }

  /* ---------- templates ---------- */
  function tplIntro() {
    return '' +
      '<div class="eta-screen eta-intro">' +
        '<p class="eta-eyebrow">' + T("Unternehmensanalyse", "Business analysis") + '</p>' +
        '<h2 class="eta-title">' + T("Finden Sie heraus, welche Betreuung zu Ihrer Situation passt.", "Find out which support fits your situation.") + '</h2>' +
        '<p class="eta-lede">' + T("Beantworten Sie einige kurze Fragen. Anschließend erhalten Sie eine erste Orientierung, welche Leistungen für Ihr Anliegen relevant sein könnten.", "Answer a few short questions. You'll then receive an initial orientation on which services could be relevant to your matter.") + '</p>' +
        '<p class="eta-note">' + T("Diese Analyse ersetzt keine persönliche steuerliche Beratung.", "This analysis does not replace personal tax advice.") + '</p>' +
        '<div class="eta-actions">' +
          '<button type="button" class="eta-btn eta-btn--primary eta-focus" data-action="start"><span>' + T("Analyse starten", "Start analysis") + '</span></button>' +
          '<a class="eta-btn eta-btn--ghost" href="' + C.telHref() + '"><span>' + T("Lieber direkt anrufen · ", "Prefer to call directly · ") + C.PHONE_DISPLAY + '</span></a>' +
        '</div>' +
      '</div>';
  }

  function tplQuestion(step, total) {
    var multi = step.type === "multi";
    var opts = step.options.map(function (o) {
      var sel = multi ? (state.answers.anliegen.indexOf(o.value) !== -1) : (state.answers[step.id] === o.value);
      return '<button type="button" class="eta-opt' + (sel ? " is-sel" : "") + '" ' +
        'data-action="' + (multi ? "toggle" : "pick") + '" data-val="' + esc(o.value) + '" ' +
        (multi ? 'aria-pressed="' + (sel ? "true" : "false") + '"' : "") + '>' +
        '<span class="eta-opt-label">' + esc(o.label) + '</span>' +
        '<span class="eta-opt-mark" aria-hidden="true"></span>' +
        '</button>';
    }).join("");
    var selCount = multi ? state.answers.anliegen.length : 0;
    return '' +
      '<div class="eta-screen eta-question">' +
        '<div class="eta-qhead">' +
          '<span class="eta-step">' + T("Schritt ", "Step ") + (state.step + 1) + ' / ' + total + '</span>' +
          (step.hint ? '<span class="eta-hint">' + esc(step.hint) + '</span>' : "") +
        '</div>' +
        '<h2 class="eta-q">' + esc(step.question) + '</h2>' +
        '<div class="eta-opts' + (multi ? " eta-opts--multi" : "") + '">' + opts + '</div>' +
        '<div class="eta-nav">' +
          '<button type="button" class="eta-link" data-action="back">' + T("Zurück", "Back") + '</button>' +
          (multi ? '<button type="button" class="eta-btn eta-btn--primary eta-next" data-action="next"' + (selCount ? "" : " disabled") + '><span>' + T("Weiter", "Continue") + '</span></button>' : '<span class="eta-hint eta-hint--soft">' + T("Wählen Sie eine Option", "Choose an option") + '</span>') +
        '</div>' +
      '</div>';
  }

  function tplResult() {
    var r = D.result(state.answers);
    var cards = r.cards.map(function (c, i) {
      return '<div class="eta-card" style="--i:' + i + '"><span class="eta-card-dot" aria-hidden="true"></span><span>' + esc(c) + '</span></div>';
    }).join("");
    var primary = ctaButton(r.cta);
    return '' +
      '<div class="eta-screen eta-result">' +
        '<p class="eta-eyebrow">' + T("Ihre erste Orientierung", "Your initial orientation") + '</p>' +
        '<h2 class="eta-title eta-title--sm">' + T("Basierend auf Ihren Angaben könnten folgende Bereiche für Sie relevant sein.", "Based on your answers, the following areas could be relevant to you.") + '</h2>' +
        '<div class="eta-cards">' + cards + '</div>' +
        '<p class="eta-resulttext">' + esc(r.text) + '</p>' +
        '<div class="eta-primary">' + primary + '</div>' +
        '<div class="eta-assist">' +
          '<p class="eta-assist-h">' + T("Digitaler Kanzlei-Assistent", "Digital Firm Assistant") + '</p>' +
          '<p class="eta-assist-s">' + T("Möchten Sie Ihre Anfrage direkt vorbereiten?", "Would you like to prepare your enquiry directly?") + '</p>' +
          '<div class="eta-contactrow">' +
            '<a class="eta-btn eta-btn--line" href="' + C.telHref() + '"><span>' + T("Jetzt anrufen", "Call now") + '</span></a>' +
            '<button type="button" class="eta-btn eta-btn--line" data-action="contact" data-mode="email"><span>' + T("E-Mail vorbereiten", "Prepare email") + '</span></button>' +
            '<button type="button" class="eta-btn eta-btn--line" data-action="contact" data-mode="appt"><span>' + T("Termin anfragen", "Request an appointment") + '</span></button>' +
          '</div>' +
        '</div>' +
        '<div class="eta-nav"><button type="button" class="eta-link" data-action="back">' + T("Zurück", "Back") + '</button><button type="button" class="eta-link" data-action="restart">' + T("Analyse neu starten", "Restart analysis") + '</button></div>' +
      '</div>';
  }

  function ctaButton(cta) {
    if (!cta) return "";
    if (cta.type === "call") {
      return '<a class="eta-btn eta-btn--primary eta-focus" href="' + C.telHref() + '"><span>' + esc(cta.label) + ' · ' + C.PHONE_DISPLAY + '</span></a>';
    }
    if (cta.type === "email") {
      return '<button type="button" class="eta-btn eta-btn--primary eta-focus" data-action="contact" data-mode="email"><span>' + esc(cta.label) + '</span></button>';
    }
    return '<button type="button" class="eta-btn eta-btn--primary eta-focus" data-action="contact" data-mode="contact"><span>' + esc(cta.label) + '</span></button>';
  }

  function tplContact() {
    return '' +
      '<div class="eta-screen eta-contact">' +
        '<p class="eta-eyebrow">' + T("Digitaler Kanzlei-Assistent", "Digital Firm Assistant") + '</p>' +
        '<h2 class="eta-title eta-title--sm">' + T("Wie möchten Sie EasyTax erreichen?", "How would you like to reach EasyTax?") + '</h2>' +
        '<div class="eta-contactcards">' +
          '<a class="eta-cc" href="' + C.telHref() + '"><span class="eta-cc-h">' + T("Jetzt anrufen", "Call now") + '</span><span class="eta-cc-s">' + C.PHONE_DISPLAY + '</span></a>' +
          '<button type="button" class="eta-cc" data-action="contact" data-mode="email"><span class="eta-cc-h">' + T("E-Mail vorbereiten", "Prepare email") + '</span><span class="eta-cc-s">' + T("Anfrage in wenigen Schritten", "Enquiry in a few steps") + '</span></button>' +
          '<button type="button" class="eta-cc" data-action="contact" data-mode="appt"><span class="eta-cc-h">' + T("Termin anfragen", "Request an appointment") + '</span><span class="eta-cc-s">' + T("Wunschtermin senden", "Send your preferred time") + '</span></button>' +
        '</div>' +
        '<p class="eta-mini">' + T("Sie erreichen EasyTax telefonisch unter ", "You can reach EasyTax by phone at ") + C.PHONE_DISPLAY + '.</p>' +
        '<div class="eta-nav"><button type="button" class="eta-link" data-action="back">' + T("Zurück", "Back") + '</button></div>' +
      '</div>';
  }

  function tplEmail() {
    return '' +
      '<div class="eta-screen eta-email">' +
        '<p class="eta-eyebrow">' + T("E-Mail vorbereiten", "Prepare email") + '</p>' +
        '<h2 class="eta-title eta-title--sm">' + T("Wie dürfen wir Sie ansprechen?", "How may we address you?") + '</h2>' +
        '<label class="eta-field"><span class="eta-flabel">' + T("Name", "Name") + '</span>' +
          '<input type="text" class="eta-input eta-focus" id="eta-name" autocomplete="name" placeholder="' + T("Ihr Name", "Your name") + '" /></label>' +
        '<label class="eta-field"><span class="eta-flabel">' + T("Möchten Sie noch etwas ergänzen?", "Would you like to add anything?") + '</span>' +
          '<textarea class="eta-input" id="eta-extra" rows="4" placeholder="' + T("Optional – Ihr Anliegen in eigenen Worten", "Optional – your request in your own words") + '"></textarea></label>' +
        '<div class="eta-actions">' +
          '<button type="button" class="eta-btn eta-btn--primary" data-action="email-open"><span>' + T("E-Mail öffnen", "Open email") + '</span></button>' +
          '<a class="eta-btn eta-btn--ghost" href="' + C.telHref() + '"><span>' + T("Oder anrufen · ", "Or call · ") + C.PHONE_DISPLAY + '</span></a>' +
        '</div>' +
        '<p class="eta-privacy">' + esc(C.guard("privacy")) + '</p>' +
        '<div class="eta-nav"><button type="button" class="eta-link" data-action="back">' + T("Zurück", "Back") + '</button></div>' +
      '</div>';
  }

  function tplAppt() {
    return '' +
      '<div class="eta-screen eta-appt">' +
        '<p class="eta-eyebrow">' + T("Termin anfragen", "Request an appointment") + '</p>' +
        '<h2 class="eta-title eta-title--sm">' + T("Gerne finden wir einen passenden Termin.", "We'll gladly find a suitable time.") + '</h2>' +
        '<p class="eta-resulttext">' + T("Gerne können Sie Ihren Terminwunsch per E-Mail senden oder EasyTax direkt telefonisch kontaktieren.", "You're welcome to send your preferred time by email or contact EasyTax directly by phone.") + '</p>' +
        '<div class="eta-actions">' +
          '<button type="button" class="eta-btn eta-btn--primary" data-action="contact" data-mode="email"><span>' + T("E-Mail mit Terminwunsch vorbereiten", "Prepare email with preferred time") + '</span></button>' +
          '<a class="eta-btn eta-btn--ghost" href="' + C.telHref() + '"><span>' + T("Jetzt anrufen · ", "Call now · ") + C.PHONE_DISPLAY + '</span></a>' +
        '</div>' +
        '<div class="eta-nav"><button type="button" class="eta-link" data-action="back">' + T("Zurück", "Back") + '</button></div>' +
      '</div>';
  }

  function tplThanks() {
    return '' +
      '<div class="eta-screen eta-thanks">' +
        '<p class="eta-eyebrow">' + T("Fast geschafft", "Almost done") + '</p>' +
        '<h2 class="eta-title eta-title--sm">' + T("Ihre E-Mail wurde in Ihrem E-Mail-Programm geöffnet.", "Your email has been opened in your email program.") + '</h2>' +
        '<p class="eta-resulttext">' + T("Bitte prüfen Sie die vorbereitete Nachricht und senden Sie sie ab. Falls sich nichts geöffnet hat, erreichen Sie EasyTax telefonisch unter ", "Please review the prepared message and send it. If nothing opened, you can reach EasyTax by phone at ") + C.PHONE_DISPLAY + '.</p>' +
        '<div class="eta-actions">' +
          '<a class="eta-btn eta-btn--primary eta-focus" href="' + C.telHref() + '"><span>' + T("Anrufen · ", "Call · ") + C.PHONE_DISPLAY + '</span></a>' +
          '<button type="button" class="eta-btn eta-btn--ghost" data-action="close"><span>' + T("Schließen", "Close") + '</span></button>' +
        '</div>' +
      '</div>';
  }

  /* ---------- email compose ---------- */
  function openEmail() {
    var name = (view.querySelector("#eta-name") || {}).value || "";
    var extra = (view.querySelector("#eta-extra") || {}).value || "";
    var mail = C.buildEmail(state.answers, D.getLabels(), name, extra, D.mainTopic(state.answers));
    window.location.href = mail.href;
    state.mode = "thanks"; render();
  }

  return { open: open, close: close };
})();
