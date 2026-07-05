/* ============================================================
   EasyTax · business-analysis
   Die Unternehmensanalyse als ruhige Fullscreen-/Overlay-Experience.
   State-Machine + Rendering; nutzt analysis-data (Fragen/Logik) und
   contact-utils (Kontakt). Keine Speicherung, kein Tracking.
   Zugänglich: Dialog, Fokus-Trap, ESC, Tastatur, reduced-motion.
   ============================================================ */
window.EasyTaxAnalysis = (function () {
  "use strict";
  var C = window.EasyTaxContact, D = window.EasyTaxAnalysisData;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    overlay.setAttribute("aria-label", "Unternehmensanalyse");
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="eta-backdrop" data-action="close"></div>' +
      '<div class="eta-stage">' +
        '<div class="eta-top">' +
          '<span class="eta-brandline">EasyTax · Unternehmensanalyse</span>' +
          '<button type="button" class="eta-close" data-action="close" aria-label="Analyse schließen">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>' +
          '</button>' +
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
    // Datenschutz: Angaben nach dem Schließen verwerfen
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
    else if (a === "start") { state.mode = "question"; state.step = 0; render(); }
    else if (a === "pick") { pickSingle(t.getAttribute("data-val")); }
    else if (a === "toggle") { toggleMulti(t.getAttribute("data-val"), t); }
    else if (a === "next") { next(); }
    else if (a === "back") { back(); }
    else if (a === "contact") { chooseContact(t.getAttribute("data-mode")); }
    else if (a === "email-open") { openEmail(); }
    else if (a === "restart") { state = { mode: "question", step: 0, answers: { anliegen: [] } }; render(); }
  }

  /* ---------- state transitions ---------- */
  function pickSingle(val) {
    var step = D.STEPS[state.step];
    state.answers[step.id] = val;
    // sanfte Auto-Weiterführung (Apple-Onboarding-Gefühl)
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
    if (state.step < D.STEPS.length - 1) { state.step++; render(); }
    else { state.mode = "result"; render(); }
  }
  function back() {
    if (state.mode === "result") { state.mode = "question"; state.step = D.STEPS.length - 1; render(); }
    else if (state.mode === "contact" || state.mode === "email" || state.mode === "appt") { state.mode = "result"; render(); }
    else if (state.step > 0) { state.step--; render(); }
    else { state.mode = "intro"; render(); }
  }
  function chooseContact(mode) { state.mode = mode; render(); }

  /* ---------- rendering ---------- */
  function render() {
    var html = "";
    if (state.mode === "intro") { html = tplIntro(); setBar(0); }
    else if (state.mode === "question") { html = tplQuestion(D.STEPS[state.step]); setBar((state.step) / D.STEPS.length); }
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
    // small delay for mask-reveal
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
        '<p class="eta-eyebrow">Unternehmensanalyse</p>' +
        '<h2 class="eta-title">Finden Sie heraus, welche Betreuung zu Ihrer Situation passt.</h2>' +
        '<p class="eta-lede">Beantworten Sie einige kurze Fragen. Anschließend erhalten Sie eine erste Orientierung, welche Leistungen für Ihr Anliegen relevant sein könnten.</p>' +
        '<p class="eta-note">Diese Analyse ersetzt keine persönliche steuerliche Beratung.</p>' +
        '<div class="eta-actions">' +
          '<button type="button" class="eta-btn eta-btn--primary eta-focus" data-action="start"><span>Analyse starten</span></button>' +
          '<a class="eta-btn eta-btn--ghost" href="' + C.telHref() + '"><span>Lieber direkt anrufen · ' + C.PHONE_DISPLAY + '</span></a>' +
        '</div>' +
      '</div>';
  }

  function tplQuestion(step) {
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
          '<span class="eta-step">Schritt ' + (state.step + 1) + ' / ' + D.STEPS.length + '</span>' +
          (step.hint ? '<span class="eta-hint">' + esc(step.hint) + '</span>' : "") +
        '</div>' +
        '<h2 class="eta-q">' + esc(step.question) + '</h2>' +
        '<div class="eta-opts' + (multi ? " eta-opts--multi" : "") + '">' + opts + '</div>' +
        '<div class="eta-nav">' +
          '<button type="button" class="eta-link" data-action="back">Zurück</button>' +
          (multi ? '<button type="button" class="eta-btn eta-btn--primary eta-next" data-action="next"' + (selCount ? "" : " disabled") + '><span>Weiter</span></button>' : '<span class="eta-hint eta-hint--soft">Wählen Sie eine Option</span>') +
        '</div>' +
      '</div>';
  }

  function tplResultHeader() {
    var r = D.result(state.answers);
    var cards = r.cards.map(function (c, i) {
      return '<div class="eta-card" style="--i:' + i + '"><span class="eta-card-dot" aria-hidden="true"></span><span>' + esc(c) + '</span></div>';
    }).join("");
    return { r: r, cards: cards };
  }

  function tplResult() {
    var h = tplResultHeader(), r = h.r;
    // Primär-CTA aus der Logik + immer die drei Kontaktwege darunter
    var primary = ctaButton(r.cta);
    return '' +
      '<div class="eta-screen eta-result">' +
        '<p class="eta-eyebrow">Ihre erste Orientierung</p>' +
        '<h2 class="eta-title eta-title--sm">Basierend auf Ihren Angaben könnten folgende Bereiche für Sie relevant sein.</h2>' +
        '<div class="eta-cards">' + h.cards + '</div>' +
        '<p class="eta-resulttext">' + esc(r.text) + '</p>' +
        '<div class="eta-primary">' + primary + '</div>' +
        '<div class="eta-assist">' +
          '<p class="eta-assist-h">Digitaler Kanzlei-Assistent</p>' +
          '<p class="eta-assist-s">Möchten Sie Ihre Anfrage direkt vorbereiten?</p>' +
          '<div class="eta-contactrow">' +
            '<a class="eta-btn eta-btn--line" href="' + C.telHref() + '"><span>Jetzt anrufen</span></a>' +
            '<button type="button" class="eta-btn eta-btn--line" data-action="contact" data-mode="email"><span>E-Mail vorbereiten</span></button>' +
            '<button type="button" class="eta-btn eta-btn--line" data-action="contact" data-mode="appt"><span>Termin anfragen</span></button>' +
          '</div>' +
        '</div>' +
        '<div class="eta-nav"><button type="button" class="eta-link" data-action="back">Zurück</button><button type="button" class="eta-link" data-action="restart">Analyse neu starten</button></div>' +
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
    // contact / appointment -> Kontaktauswahl
    return '<button type="button" class="eta-btn eta-btn--primary eta-focus" data-action="contact" data-mode="contact"><span>' + esc(cta.label) + '</span></button>';
  }

  function tplContact() {
    return '' +
      '<div class="eta-screen eta-contact">' +
        '<p class="eta-eyebrow">Digitaler Kanzlei-Assistent</p>' +
        '<h2 class="eta-title eta-title--sm">Wie möchten Sie EasyTax erreichen?</h2>' +
        '<div class="eta-contactcards">' +
          '<a class="eta-cc" href="' + C.telHref() + '"><span class="eta-cc-h">Jetzt anrufen</span><span class="eta-cc-s">' + C.PHONE_DISPLAY + '</span></a>' +
          '<button type="button" class="eta-cc" data-action="contact" data-mode="email"><span class="eta-cc-h">E-Mail vorbereiten</span><span class="eta-cc-s">Anfrage in wenigen Schritten</span></button>' +
          '<button type="button" class="eta-cc" data-action="contact" data-mode="appt"><span class="eta-cc-h">Termin anfragen</span><span class="eta-cc-s">Wunschtermin senden</span></button>' +
        '</div>' +
        '<p class="eta-mini">Sie erreichen EasyTax telefonisch unter ' + C.PHONE_DISPLAY + '.</p>' +
        '<div class="eta-nav"><button type="button" class="eta-link" data-action="back">Zurück</button></div>' +
      '</div>';
  }

  function tplEmail() {
    return '' +
      '<div class="eta-screen eta-email">' +
        '<p class="eta-eyebrow">E-Mail vorbereiten</p>' +
        '<h2 class="eta-title eta-title--sm">Wie dürfen wir Sie ansprechen?</h2>' +
        '<label class="eta-field"><span class="eta-flabel">Name</span>' +
          '<input type="text" class="eta-input eta-focus" id="eta-name" autocomplete="name" placeholder="Ihr Name" /></label>' +
        '<label class="eta-field"><span class="eta-flabel">Möchten Sie noch etwas ergänzen?</span>' +
          '<textarea class="eta-input" id="eta-extra" rows="4" placeholder="Optional – Ihr Anliegen in eigenen Worten"></textarea></label>' +
        '<div class="eta-actions">' +
          '<button type="button" class="eta-btn eta-btn--primary" data-action="email-open"><span>E-Mail öffnen</span></button>' +
          '<a class="eta-btn eta-btn--ghost" href="' + C.telHref() + '"><span>Oder anrufen · ' + C.PHONE_DISPLAY + '</span></a>' +
        '</div>' +
        '<p class="eta-privacy">' + esc(C.GUARD.privacy) + '</p>' +
        '<div class="eta-nav"><button type="button" class="eta-link" data-action="back">Zurück</button></div>' +
      '</div>';
  }

  function tplAppt() {
    return '' +
      '<div class="eta-screen eta-appt">' +
        '<p class="eta-eyebrow">Termin anfragen</p>' +
        '<h2 class="eta-title eta-title--sm">Gerne finden wir einen passenden Termin.</h2>' +
        '<p class="eta-resulttext">Gerne können Sie Ihren Terminwunsch per E-Mail senden oder EasyTax direkt telefonisch kontaktieren.</p>' +
        '<div class="eta-actions">' +
          '<button type="button" class="eta-btn eta-btn--primary" data-action="contact" data-mode="email"><span>E-Mail mit Terminwunsch vorbereiten</span></button>' +
          '<a class="eta-btn eta-btn--ghost" href="' + C.telHref() + '"><span>Jetzt anrufen · ' + C.PHONE_DISPLAY + '</span></a>' +
        '</div>' +
        '<div class="eta-nav"><button type="button" class="eta-link" data-action="back">Zurück</button></div>' +
      '</div>';
  }

  function tplThanks() {
    return '' +
      '<div class="eta-screen eta-thanks">' +
        '<p class="eta-eyebrow">Fast geschafft</p>' +
        '<h2 class="eta-title eta-title--sm">Ihre E-Mail wurde in Ihrem E-Mail-Programm geöffnet.</h2>' +
        '<p class="eta-resulttext">Bitte prüfen Sie die vorbereitete Nachricht und senden Sie sie ab. Falls sich nichts geöffnet hat, erreichen Sie EasyTax telefonisch unter ' + C.PHONE_DISPLAY + '.</p>' +
        '<div class="eta-actions">' +
          '<a class="eta-btn eta-btn--primary eta-focus" href="' + C.telHref() + '"><span>Anrufen · ' + C.PHONE_DISPLAY + '</span></a>' +
          '<button type="button" class="eta-btn eta-btn--ghost" data-action="close"><span>Schließen</span></button>' +
        '</div>' +
      '</div>';
  }

  /* ---------- email compose ---------- */
  function openEmail() {
    var name = (view.querySelector("#eta-name") || {}).value || "";
    var extra = (view.querySelector("#eta-extra") || {}).value || "";
    var mail = C.buildEmail(state.answers, D.LABELS, name, extra, D.mainTopic(state.answers));
    // Öffnet das E-Mail-Programm; keine Übermittlung ohne aktive Handlung des Nutzers
    window.location.href = mail.href;
    state.mode = "thanks"; render();
  }

  return { open: open, close: close };
})();
