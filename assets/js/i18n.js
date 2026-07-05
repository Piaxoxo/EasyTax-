/* ============================================================
   EasyTax · i18n engine (DE / EN / IT)
   Übersetzt über den deutschen Quelltext (kein Tagging nötig).
   Sprache wird in der URL (?lang=) gemerkt – kein Cookie, kein
   Local Storage (DSGVO). Fehlt eine Übersetzung, bleibt der
   deutsche Text stehen (sauberer Fallback).
   ============================================================ */
(function () {
  "use strict";

  var LANGS = { de: 1, en: 1, it: 1 };
  var DICT = window.__I18N__ || {};
  var htmlEl = document.documentElement;

  function norm(s) { return (s || "").replace(/­/g, "").replace(/\s+/g, " ").trim(); }
  function tr(deText, lang) {
    if (lang === "de") return null;
    var e = DICT[norm(deText)];
    return e && e[lang] ? e[lang] : null;
  }

  /* ---- snapshot translatable text nodes ---- */
  var textNodes = [];
  (function collect() {
    var skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1 };
    var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !norm(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        if (!p || skip[p.nodeName]) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest("[data-no-i18n]")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n; while ((n = tw.nextNode())) textNodes.push({ node: n, de: n.nodeValue });
  })();

  /* ---- snapshot translatable attributes ---- */
  var attrItems = [];
  ["aria-label", "placeholder", "title", "alt"].forEach(function (attr) {
    document.querySelectorAll("[" + attr + "]").forEach(function (el) {
      var v = el.getAttribute(attr);
      if (norm(v)) attrItems.push({ el: el, attr: attr, de: v });
    });
  });
  var titleDe = document.title;
  var descEl = document.querySelector('meta[name="description"]');
  var descDe = descEl ? descEl.getAttribute("content") : null;

  /* ---- internal-link decoration (keeps language across pages) ---- */
  function decorate(href, lang) {
    if (!href || /^(https?:|mailto:|tel:|javascript:)/i.test(href) || href.charAt(0) === "#") return href;
    var hash = "", hi = href.indexOf("#");
    if (hi >= 0) { hash = href.slice(hi); href = href.slice(0, hi); }
    var parts = href.split("?"), path = parts[0];
    var params = new URLSearchParams(parts[1] || "");
    if (lang === "de") params.delete("lang"); else params.set("lang", lang);
    var ps = params.toString();
    return path + (ps ? "?" + ps : "") + hash;
  }
  function decorateLinks(lang) {
    document.querySelectorAll("a[href]").forEach(function (a) {
      var raw = a.getAttribute("href");
      var next = decorate(raw, lang);
      if (next !== raw) a.setAttribute("href", next);
    });
  }

  /* ---- apply a language ---- */
  function apply(lang) {
    if (!LANGS[lang]) lang = "de";
    htmlEl.setAttribute("lang", lang);
    for (var i = 0; i < textNodes.length; i++) {
      var t = textNodes[i]; t.node.nodeValue = (lang === "de") ? t.de : (tr(t.de, lang) || t.de);
    }
    for (var j = 0; j < attrItems.length; j++) {
      var a = attrItems[j]; a.el.setAttribute(a.attr, (lang === "de") ? a.de : (tr(a.de, lang) || a.de));
    }
    document.title = (lang === "de") ? titleDe : (tr(titleDe, lang) || titleDe);
    if (descEl && descDe) descEl.setAttribute("content", (lang === "de") ? descDe : (tr(descDe, lang) || descDe));
    decorateLinks(lang);
    var sw = document.getElementById("langSwitch");
    if (sw) sw.querySelectorAll("button[data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
  }

  /* ---- current language from URL ---- */
  function fromUrl() {
    var m = /[?&]lang=(de|en|it)\b/.exec(location.search);
    return m ? m[1] : "de";
  }
  function pushUrl(lang) {
    try {
      var u = new URL(location.href);
      if (lang === "de") u.searchParams.delete("lang"); else u.searchParams.set("lang", lang);
      history.replaceState(null, "", u.pathname + (u.searchParams.toString() ? "?" + u.searchParams.toString() : "") + u.hash);
    } catch (e) {}
  }

  var current = fromUrl();
  apply(current);

  /* ---- wire switch ---- */
  var sw = document.getElementById("langSwitch");
  if (sw) sw.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-lang]"); if (!b) return;
    var lang = b.getAttribute("data-lang");
    if (!LANGS[lang] || lang === current) return;
    current = lang; pushUrl(lang); apply(lang);
  });

  window.EasyTaxI18n = { apply: apply, get: function () { return current; } };
})();
