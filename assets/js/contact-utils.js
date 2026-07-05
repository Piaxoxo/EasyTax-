/* ============================================================
   EasyTax · contact-utils
   Zentrale Kontakt-Variablen + Helfer für Telefon, mailto und
   Guardrail-Texte. Keine Server-Kommunikation, keine Speicherung.
   ============================================================ */
window.EasyTaxContact = (function () {
  "use strict";

  /* --- Zentrale Kontakt-Variablen (hier zentral änderbar) ---------------
     E-Mail: bestehende offizielle Adresse aus dem Projekt (main.js).
             Falls sich die offizielle Adresse ändert, NUR hier anpassen. */
  var EMAIL         = "office@easytax.eu";
  /* Telefon: identische Nummer wie im Rest der Website.
     PHONE_TEL = reiner tel:-Wert · PHONE_DISPLAY = Anzeigeformat. */
  var PHONE_TEL     = "+43191333670";
  var PHONE_DISPLAY = "+43 1 913 3367-0";

  /* --- Guardrail-Antworten (Preise / Steuerfragen / Konkurrenz) --------- */
  var GUARD = {
    price:      "Die passende Betreuung hängt von Ihrer individuellen Situation ab. Für eine seriöse Einschätzung empfehlen wir ein kurzes persönliches Gespräch mit EasyTax.",
    tax:        "Das lässt sich seriös nur nach Prüfung Ihrer konkreten Situation beantworten. Gerne unterstützt Sie das Team von EasyTax persönlich.",
    competitor: "Ich kann keine anderen Kanzleien empfehlen. Gerne können wir prüfen, ob EasyTax der passende Ansprechpartner für Ihr Anliegen ist.",
    services:   "EasyTax bietet Unterstützung bei Steuerberatung, Buchhaltung, Lohnverrechnung, Jahresabschluss, Unternehmensgründung und Restrukturierung.",
    privacy:    "Ihre Angaben werden nur verwendet, um Ihre Anfrage vorzubereiten, und ohne Ihre aktive Handlung nicht an EasyTax übermittelt."
  };

  function telHref() { return "tel:" + PHONE_TEL; }
  function mailHref() { return "mailto:" + EMAIL; }

  function buildMailto(subject, body) {
    return "mailto:" + EMAIL +
      "?subject=" + encodeURIComponent(subject || "") +
      "&body=" + encodeURIComponent(body || "");
  }

  /* Menschlich lesbare Zusammenfassung der Analyse-Antworten (DE). */
  function summarize(answers, labels) {
    answers = answers || {}; labels = labels || {};
    var L = function (id, val) { return (labels[id] && labels[id][val]) || val; };
    var lines = [];
    if (answers.situation)  lines.push("Ausgangssituation: " + L("situation", answers.situation));
    if (answers.anliegen && answers.anliegen.length) {
      lines.push("Anliegen: " + answers.anliegen.map(function (v) { return L("anliegen", v); }).join(", "));
    }
    if (answers.groesse)    lines.push("Unternehmensgröße: " + L("groesse", answers.groesse));
    if (answers.arbeit)     lines.push("Gewünschte Betreuung: " + L("arbeit", answers.arbeit));
    if (answers.dringlich)  lines.push("Zeithorizont: " + L("dringlich", answers.dringlich));
    return lines.join("\n");
  }

  /* Baut Betreff + Body für die vorbereitete E-Mail. */
  function buildEmail(answers, labels, name, extra, mainTopic) {
    var subject = "Anfrage an EasyTax – " + (mainTopic || "Unternehmensanalyse");
    var body =
      "Sehr geehrtes EasyTax-Team,\n\n" +
      "ich interessiere mich für Ihre Unterstützung und möchte gerne einen Termin bzw. eine Rückmeldung vereinbaren.\n\n" +
      "Mein Anliegen:\n" + (summarize(answers, labels) || "(keine näheren Angaben)") + "\n\n" +
      "Zusätzliche Information:\n" + (extra && extra.trim() ? extra.trim() : "(keine)") + "\n\n" +
      "Ich freue mich über Ihre Rückmeldung.\n\n" +
      "Mit freundlichen Grüßen\n" +
      (name && name.trim() ? name.trim() : "");
    return { subject: subject, body: body, href: buildMailto(subject, body) };
  }

  return {
    EMAIL: EMAIL, PHONE_TEL: PHONE_TEL, PHONE_DISPLAY: PHONE_DISPLAY, GUARD: GUARD,
    telHref: telHref, mailHref: mailHref, buildMailto: buildMailto,
    summarize: summarize, buildEmail: buildEmail
  };
})();
