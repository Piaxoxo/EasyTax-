/* ============================================================
   EasyTax · contact-utils
   Zentrale Kontakt-Variablen + Helfer für Telefon, mailto und
   Guardrail-Texte. Zweisprachig (DE/EN). Keine Server-Kommunikation,
   keine Speicherung.
   ============================================================ */
window.EasyTaxContact = (function () {
  "use strict";

  var EMAIL         = "office@easytax.eu";
  var PHONE_TEL     = "+43191333670";
  var PHONE_DISPLAY = "+43 1 913 3367-0";

  /* --- Sprache: folgt der Website-Sprache, DE|EN (IT → EN) --------------
     Der Assistent unterstützt DE und EN; ein manueller Umschalter kann
     die Sprache überschreiben (setLang). */
  var OVERRIDE = null;
  function siteLang() {
    var s = (window.EasyTaxI18n && window.EasyTaxI18n.get && window.EasyTaxI18n.get()) ||
            (document.documentElement.getAttribute("lang")) || "de";
    return s === "de" ? "de" : "en";   // en + it → en
  }
  function getLang() { return OVERRIDE || siteLang(); }
  function setLang(l) { OVERRIDE = (l === "en") ? "en" : "de"; }
  function t(de, en) { return getLang() === "en" ? en : de; }

  /* --- Guardrail-Antworten (Preise / Steuerfragen / Konkurrenz) --------- */
  var GUARD = {
    price:      "Die passende Betreuung hängt von Ihrer individuellen Situation ab. Für eine seriöse Einschätzung empfehlen wir ein kurzes persönliches Gespräch mit EasyTax.",
    tax:        "Das lässt sich seriös nur nach Prüfung Ihrer konkreten Situation beantworten. Gerne unterstützt Sie das Team von EasyTax persönlich.",
    competitor: "Ich kann keine anderen Kanzleien empfehlen. Gerne können wir prüfen, ob EasyTax der passende Ansprechpartner für Ihr Anliegen ist.",
    services:   "EasyTax bietet Unterstützung bei Steuerberatung, Buchhaltung, Lohnverrechnung, Jahresabschluss, Unternehmensgründung und Restrukturierung.",
    privacy:    "Ihre Angaben werden nur verwendet, um Ihre Anfrage vorzubereiten, und ohne Ihre aktive Handlung nicht an EasyTax übermittelt."
  };
  var GUARD_EN = {
    price:      "The right support depends on your individual situation. For a sound assessment we recommend a short personal conversation with EasyTax.",
    tax:        "This can only be answered responsibly after reviewing your specific situation. The EasyTax team will gladly support you personally.",
    competitor: "I can't recommend other firms. We're happy to check whether EasyTax is the right partner for your matter.",
    services:   "EasyTax supports you with tax advice, accounting, payroll, annual financial statements, company formation and restructuring.",
    privacy:    "Your details are only used to prepare your enquiry and are not sent to EasyTax without your active action."
  };
  function guard(k) { return getLang() === "en" ? GUARD_EN[k] : GUARD[k]; }

  function telHref() { return "tel:" + PHONE_TEL; }
  function mailHref() { return "mailto:" + EMAIL; }

  function buildMailto(subject, body) {
    return "mailto:" + EMAIL +
      "?subject=" + encodeURIComponent(subject || "") +
      "&body=" + encodeURIComponent(body || "");
  }

  /* Menschlich lesbare Zusammenfassung der Analyse-Antworten (DE/EN). */
  function summarize(answers, labels) {
    answers = answers || {}; labels = labels || {};
    var en = getLang() === "en";
    var L = function (id, val) { return (labels[id] && labels[id][val]) || val; };
    var lines = [];
    if (answers.situation)  lines.push((en ? "Starting situation: " : "Ausgangssituation: ") + L("situation", answers.situation));
    if (answers.anliegen && answers.anliegen.length) {
      lines.push((en ? "Concern: " : "Anliegen: ") + answers.anliegen.map(function (v) { return L("anliegen", v); }).join(", "));
    }
    if (answers.groesse)    lines.push((en ? "Company size: " : "Unternehmensgröße: ") + L("groesse", answers.groesse));
    if (answers.arbeit)     lines.push((en ? "Preferred support: " : "Gewünschte Betreuung: ") + L("arbeit", answers.arbeit));
    if (answers.dringlich)  lines.push((en ? "Time frame: " : "Zeithorizont: ") + L("dringlich", answers.dringlich));
    return lines.join("\n");
  }

  /* Baut Betreff + Body für die vorbereitete E-Mail (DE/EN). */
  function buildEmail(answers, labels, name, extra, mainTopic) {
    var en = getLang() === "en";
    var subject = (en ? "Enquiry to EasyTax – " : "Anfrage an EasyTax – ") + (mainTopic || (en ? "Business analysis" : "Unternehmensanalyse"));
    var sum = summarize(answers, labels);
    var body = en
      ? "Dear EasyTax team,\n\n" +
        "I'm interested in your support and would like to arrange an appointment or a callback.\n\n" +
        "My request:\n" + (sum || "(no further details)") + "\n\n" +
        "Additional information:\n" + (extra && extra.trim() ? extra.trim() : "(none)") + "\n\n" +
        "I look forward to hearing from you.\n\n" +
        "Kind regards\n" + (name && name.trim() ? name.trim() : "")
      : "Sehr geehrtes EasyTax-Team,\n\n" +
        "ich interessiere mich für Ihre Unterstützung und möchte gerne einen Termin bzw. eine Rückmeldung vereinbaren.\n\n" +
        "Mein Anliegen:\n" + (sum || "(keine näheren Angaben)") + "\n\n" +
        "Zusätzliche Information:\n" + (extra && extra.trim() ? extra.trim() : "(keine)") + "\n\n" +
        "Ich freue mich über Ihre Rückmeldung.\n\n" +
        "Mit freundlichen Grüßen\n" + (name && name.trim() ? name.trim() : "");
    return { subject: subject, body: body, href: buildMailto(subject, body) };
  }

  return {
    EMAIL: EMAIL, PHONE_TEL: PHONE_TEL, PHONE_DISPLAY: PHONE_DISPLAY,
    GUARD: GUARD, guard: guard,
    getLang: getLang, setLang: setLang, t: t,
    telHref: telHref, mailHref: mailHref, buildMailto: buildMailto,
    summarize: summarize, buildEmail: buildEmail
  };
})();
