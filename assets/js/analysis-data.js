/* ============================================================
   EasyTax · analysis-data
   Datenmodell der Unternehmensanalyse + Ergebnislogik.
   Bewusst UI-frei: nur Fragen, Optionen und die Regel, welche
   Orientierung sich aus den Antworten ergibt.

   WICHTIG (inhaltliche Grenzen): keine Preise, keine Honorare,
   keine verbindliche Steuer-/Rechtsberatung, keine Ersparnis-
   versprechen, keine anderen Kanzleien. Nur erste Orientierung.
   ============================================================ */
window.EasyTaxAnalysisData = (function () {
  "use strict";

  /* --- Fragen (eine pro Screen) --- */
  var STEPS = [
    {
      id: "situation", type: "single",
      question: "Welche Situation beschreibt Sie am besten?",
      options: [
        { value: "gruendung",    label: "Ich gründe ein Unternehmen" },
        { value: "selbst",       label: "Ich bin selbstständig" },
        { value: "gmbh",         label: "Ich führe eine GmbH" },
        { value: "wechsel",      label: "Ich suche einen neuen Steuerberater" },
        { value: "mandant",      label: "Ich bin bereits Mandant" },
        { value: "dringend",     label: "Ich habe ein dringendes Anliegen" },
        { value: "unsicher",     label: "Ich bin mir nicht sicher" }
      ]
    },
    {
      id: "anliegen", type: "multi",
      question: "Wobei benötigen Sie Unterstützung?",
      hint: "Mehrfachauswahl möglich",
      options: [
        { value: "steuerberatung",  label: "Steuerberatung" },
        { value: "buchhaltung",     label: "Buchhaltung" },
        { value: "lohn",            label: "Lohnverrechnung" },
        { value: "jahresabschluss", label: "Jahresabschluss / Bilanzierung" },
        { value: "gruendung",       label: "Unternehmensgründung" },
        { value: "restruk",         label: "Restrukturierung / Krisenmanagement" },
        { value: "allgemein",       label: "Allgemeine Anfrage" }
      ]
    },
    {
      id: "groesse", type: "single",
      question: "Wie groß ist Ihr Unternehmen aktuell?",
      options: [
        { value: "gruendung", label: "Noch in Gründung" },
        { value: "einzel",    label: "Einzelunternehmen / selbstständig" },
        { value: "s1",        label: "1–5 Mitarbeiter" },
        { value: "s2",        label: "6–20 Mitarbeiter" },
        { value: "s3",        label: "Mehr als 20 Mitarbeiter" },
        { value: "na",        label: "Nicht relevant" }
      ]
    },
    {
      id: "arbeit", type: "single",
      question: "Wie möchten Sie idealerweise betreut werden?",
      options: [
        { value: "persoenlich", label: "Persönlich" },
        { value: "digital",     label: "Digital" },
        { value: "beides",      label: "Kombination aus beidem" },
        { value: "klaeren",     label: "Ich möchte das im Gespräch klären" }
      ]
    },
    {
      id: "dringlich", type: "single",
      question: "Wie dringend ist Ihr Anliegen?",
      options: [
        { value: "zeitnah",     label: "Ich möchte zeitnah sprechen" },
        { value: "wochen",      label: "In den nächsten Wochen" },
        { value: "informieren", label: "Ich informiere mich erst" },
        { value: "dringend",    label: "Es ist dringend" }
      ]
    }
  ];

  /* --- Label-Lookup (für Zusammenfassung / E-Mail) --- */
  var LABELS = {};
  STEPS.forEach(function (s) {
    LABELS[s.id] = {};
    s.options.forEach(function (o) { LABELS[s.id][o.value] = o.label; });
  });

  /* --- Ergebnislogik: Antworten -> erste Orientierung ---
     Reihenfolge = Priorität. Gibt EIN Ergebnis-Objekt zurück:
     { key, cards[], text, cta{label,type}, urgent }
     cta.type: 'call' | 'email' | 'appointment' | 'contact'      */
  function result(a) {
    a = a || {};
    var anliegen = a.anliegen || [];
    var has = function (v) { return anliegen.indexOf(v) !== -1; };
    var urgent = a.situation === "dringend" || a.dringlich === "dringend";

    if (urgent) {
      return {
        key: "urgent", urgent: true,
        cards: ["Persönliche Klärung", "Direkter Kontakt", "Terminvereinbarung"],
        text: "Bei dringenden Anliegen ist ein persönlicher Kontakt meist der schnellste Weg. Bitte kontaktieren Sie EasyTax direkt telefonisch.",
        cta: { label: "Jetzt anrufen", type: "call" }
      };
    }
    if (a.situation === "mandant") {
      return {
        key: "mandant", urgent: false,
        cards: ["Direkter Kontakt", "Anliegen per E-Mail senden", "Telefonische Rückfrage"],
        text: "Wenn Sie bereits Mandant sind, ist der direkte Kontakt mit der Kanzlei meist der schnellste Weg.",
        cta: { label: "EasyTax kontaktieren", type: "contact" }
      };
    }
    if (a.situation === "gruendung" || has("gruendung")) {
      return {
        key: "gruendung", urgent: false,
        cards: ["Unternehmensgründung", "Steuerberatung", "Buchhaltung", "Digitale Betreuung"],
        text: "Bei einer Gründung ist es wichtig, steuerliche und organisatorische Fragen frühzeitig sauber aufzusetzen. EasyTax begleitet Gründer bei den nächsten Schritten und klärt im persönlichen Gespräch, welche Betreuung sinnvoll ist.",
        cta: { label: "Gründungsgespräch anfragen", type: "email" }
      };
    }
    if (a.situation === "gmbh" || has("jahresabschluss")) {
      return {
        key: "unternehmen", urgent: false,
        cards: ["Steuerberatung für Unternehmen", "Jahresabschluss / Bilanzierung", "Buchhaltung", "Laufende Betreuung"],
        text: "Für Unternehmen ist Steuerberatung mehr als Pflichterfüllung. Sie schafft Struktur, Sicherheit und eine belastbare Grundlage für Entscheidungen.",
        cta: { label: "Unternehmensbetreuung besprechen", type: "email" }
      };
    }
    if (has("lohn")) {
      return {
        key: "lohn", urgent: false,
        cards: ["Lohnverrechnung", "Arbeitgeber-Betreuung", "Laufende Beratung", "Fristen & Abgaben"],
        text: "Sobald Mitarbeiter beschäftigt werden, braucht es verlässliche Prozesse und klare Zuständigkeiten. EasyTax unterstützt bei der laufenden Lohnverrechnung und den damit verbundenen Themen.",
        cta: { label: "Lohnverrechnung anfragen", type: "email" }
      };
    }
    if (has("buchhaltung")) {
      return {
        key: "buchhaltung", urgent: false,
        cards: ["Buchhaltung", "Digitale Buchhaltungsprozesse", "Laufende Betreuung", "Steuerberatung"],
        text: "Eine gut organisierte Buchhaltung schafft Überblick und entlastet im Alltag. EasyTax unterstützt Unternehmen dabei, ihre laufenden Prozesse klarer und effizienter zu gestalten.",
        cta: { label: "Buchhaltung besprechen", type: "email" }
      };
    }
    /* Fallback: allgemeine Orientierung */
    return {
      key: "orientierung", urgent: false,
      cards: ["Steuerberatung", "Buchhaltung", "Laufende Betreuung", "Persönliche Klärung"],
      text: "Welche Betreuung am besten passt, lässt sich am klarsten in einem kurzen persönlichen Gespräch einschätzen. EasyTax hilft Ihnen, die nächsten Schritte einzuordnen.",
      cta: { label: "EasyTax kontaktieren", type: "contact" }
    };
  }

  /* Hauptthema (für E-Mail-Betreff) */
  function mainTopic(a) {
    var map = {
      gruendung: "Unternehmensgründung", unternehmen: "Unternehmensbetreuung",
      lohn: "Lohnverrechnung", buchhaltung: "Buchhaltung",
      mandant: "Bestehendes Mandat", urgent: "Dringendes Anliegen", orientierung: "Erste Orientierung"
    };
    return map[result(a).key] || "Unternehmensanalyse";
  }

  return { STEPS: STEPS, LABELS: LABELS, result: result, mainTopic: mainTopic };
})();
