/* ============================================================
   EasyTax · analysis-data  (zweisprachig DE/EN)
   Datenmodell der Unternehmensanalyse + Ergebnislogik.
   UI-frei: Fragen, Optionen und die Orientierungs-Regel.

   Inhaltliche Grenzen: keine Preise, keine Honorare, keine
   verbindliche Steuer-/Rechtsberatung, keine Ersparnisversprechen,
   keine anderen Kanzleien. Nur erste Orientierung.
   ============================================================ */
window.EasyTaxAnalysisData = (function () {
  "use strict";

  function lang() { return (window.EasyTaxContact && window.EasyTaxContact.getLang && window.EasyTaxContact.getLang()) || "de"; }
  function pick(o) { return (o && typeof o === "object" && ("de" in o)) ? (lang() === "en" ? o.en : o.de) : o; }

  /* --- Fragen (bilingual) --- */
  var RAW = [
    {
      id: "situation", type: "single",
      question: { de: "Welche Situation beschreibt Sie am besten?", en: "Which situation describes you best?" },
      options: [
        { value: "gruendung", label: { de: "Ich gründe ein Unternehmen", en: "I'm founding a company" } },
        { value: "selbst",    label: { de: "Ich bin selbstständig", en: "I'm self-employed" } },
        { value: "gmbh",      label: { de: "Ich führe eine GmbH", en: "I run a limited company" } },
        { value: "wechsel",   label: { de: "Ich suche einen neuen Steuerberater", en: "I'm looking for a new tax advisor" } },
        { value: "mandant",   label: { de: "Ich bin bereits Mandant", en: "I'm already a client" } },
        { value: "dringend",  label: { de: "Ich habe ein dringendes Anliegen", en: "I have an urgent matter" } },
        { value: "unsicher",  label: { de: "Ich bin mir nicht sicher", en: "I'm not sure" } }
      ]
    },
    {
      id: "anliegen", type: "multi",
      question: { de: "Wobei benötigen Sie Unterstützung?", en: "Where do you need support?" },
      hint: { de: "Mehrfachauswahl möglich", en: "Multiple choice possible" },
      options: [
        { value: "steuerberatung",  label: { de: "Steuerberatung", en: "Tax advice" } },
        { value: "buchhaltung",     label: { de: "Buchhaltung", en: "Accounting" } },
        { value: "lohn",            label: { de: "Lohnverrechnung", en: "Payroll" } },
        { value: "jahresabschluss", label: { de: "Jahresabschluss / Bilanzierung", en: "Annual accounts / balance sheet" } },
        { value: "gruendung",       label: { de: "Unternehmensgründung", en: "Company formation" } },
        { value: "restruk",         label: { de: "Restrukturierung / Krisenmanagement", en: "Restructuring / crisis management" } },
        { value: "allgemein",       label: { de: "Allgemeine Anfrage", en: "General enquiry" } }
      ]
    },
    {
      id: "groesse", type: "single",
      question: { de: "Wie groß ist Ihr Unternehmen aktuell?", en: "How large is your company at the moment?" },
      options: [
        { value: "gruendung", label: { de: "Noch in Gründung", en: "Still being founded" } },
        { value: "einzel",    label: { de: "Einzelunternehmen / selbstständig", en: "Sole proprietor / self-employed" } },
        { value: "s1",        label: { de: "1–5 Mitarbeiter", en: "1–5 employees" } },
        { value: "s2",        label: { de: "6–20 Mitarbeiter", en: "6–20 employees" } },
        { value: "s3",        label: { de: "Mehr als 20 Mitarbeiter", en: "More than 20 employees" } },
        { value: "na",        label: { de: "Nicht relevant", en: "Not relevant" } }
      ]
    },
    {
      id: "arbeit", type: "single",
      question: { de: "Wie möchten Sie idealerweise betreut werden?", en: "How would you ideally like to be supported?" },
      options: [
        { value: "persoenlich", label: { de: "Persönlich", en: "In person" } },
        { value: "digital",     label: { de: "Digital", en: "Digitally" } },
        { value: "beides",      label: { de: "Kombination aus beidem", en: "A combination of both" } },
        { value: "klaeren",     label: { de: "Ich möchte das im Gespräch klären", en: "I'd like to clarify that in conversation" } }
      ]
    },
    {
      id: "dringlich", type: "single",
      question: { de: "Wie dringend ist Ihr Anliegen?", en: "How urgent is your matter?" },
      options: [
        { value: "zeitnah",     label: { de: "Ich möchte zeitnah sprechen", en: "I'd like to talk soon" } },
        { value: "wochen",      label: { de: "In den nächsten Wochen", en: "In the coming weeks" } },
        { value: "informieren", label: { de: "Ich informiere mich erst", en: "I'm just gathering information" } },
        { value: "dringend",    label: { de: "Es ist dringend", en: "It's urgent" } }
      ]
    }
  ];

  function getSteps() {
    return RAW.map(function (s) {
      return {
        id: s.id, type: s.type, question: pick(s.question), hint: s.hint ? pick(s.hint) : undefined,
        options: s.options.map(function (o) { return { value: o.value, label: pick(o.label) }; })
      };
    });
  }
  function getLabels() {
    var out = {};
    RAW.forEach(function (s) { out[s.id] = {}; s.options.forEach(function (o) { out[s.id][o.value] = pick(o.label); }); });
    return out;
  }

  /* --- Ergebnistexte (bilingual) --- */
  var RES = {
    urgent: {
      cards: { de: ["Persönliche Klärung", "Direkter Kontakt", "Terminvereinbarung"], en: ["Personal clarification", "Direct contact", "Appointment"] },
      text: { de: "Bei dringenden Anliegen ist ein persönlicher Kontakt meist der schnellste Weg. Bitte kontaktieren Sie EasyTax direkt telefonisch.",
              en: "For urgent matters, personal contact is usually the fastest route. Please contact EasyTax directly by phone." },
      cta: { label: { de: "Jetzt anrufen", en: "Call now" }, type: "call" }, urgent: true
    },
    mandant: {
      cards: { de: ["Direkter Kontakt", "Anliegen per E-Mail senden", "Telefonische Rückfrage"], en: ["Direct contact", "Send your request by email", "Phone enquiry"] },
      text: { de: "Wenn Sie bereits Mandant sind, ist der direkte Kontakt mit der Kanzlei meist der schnellste Weg.",
              en: "If you're already a client, direct contact with the firm is usually the fastest way." },
      cta: { label: { de: "EasyTax kontaktieren", en: "Contact EasyTax" }, type: "contact" }
    },
    gruendung: {
      cards: { de: ["Unternehmensgründung", "Steuerberatung", "Buchhaltung", "Digitale Betreuung"], en: ["Company formation", "Tax advice", "Accounting", "Digital support"] },
      text: { de: "Bei einer Gründung ist es wichtig, steuerliche und organisatorische Fragen frühzeitig sauber aufzusetzen. EasyTax begleitet Gründer bei den nächsten Schritten und klärt im persönlichen Gespräch, welche Betreuung sinnvoll ist.",
              en: "When founding a company, it's important to set up tax and organisational matters cleanly from the start. EasyTax guides founders through the next steps and clarifies the right support in a personal conversation." },
      cta: { label: { de: "Gründungsgespräch anfragen", en: "Request a founding consultation" }, type: "email" }
    },
    unternehmen: {
      cards: { de: ["Steuerberatung für Unternehmen", "Jahresabschluss / Bilanzierung", "Buchhaltung", "Laufende Betreuung"], en: ["Tax advice for companies", "Annual accounts / balance sheet", "Accounting", "Ongoing support"] },
      text: { de: "Für Unternehmen ist Steuerberatung mehr als Pflichterfüllung. Sie schafft Struktur, Sicherheit und eine belastbare Grundlage für Entscheidungen.",
              en: "For companies, tax advice is more than meeting obligations. It creates structure, security and a solid basis for decisions." },
      cta: { label: { de: "Unternehmensbetreuung besprechen", en: "Discuss company support" }, type: "email" }
    },
    lohn: {
      cards: { de: ["Lohnverrechnung", "Arbeitgeber-Betreuung", "Laufende Beratung", "Fristen & Abgaben"], en: ["Payroll", "Employer support", "Ongoing advice", "Deadlines & levies"] },
      text: { de: "Sobald Mitarbeiter beschäftigt werden, braucht es verlässliche Prozesse und klare Zuständigkeiten. EasyTax unterstützt bei der laufenden Lohnverrechnung und den damit verbundenen Themen.",
              en: "As soon as you employ staff, you need reliable processes and clear responsibilities. EasyTax supports ongoing payroll and the related matters." },
      cta: { label: { de: "Lohnverrechnung anfragen", en: "Request payroll support" }, type: "email" }
    },
    buchhaltung: {
      cards: { de: ["Buchhaltung", "Digitale Buchhaltungsprozesse", "Laufende Betreuung", "Steuerberatung"], en: ["Accounting", "Digital accounting processes", "Ongoing support", "Tax advice"] },
      text: { de: "Eine gut organisierte Buchhaltung schafft Überblick und entlastet im Alltag. EasyTax unterstützt Unternehmen dabei, ihre laufenden Prozesse klarer und effizienter zu gestalten.",
              en: "Well-organised accounting creates an overview and eases the everyday. EasyTax helps companies make their ongoing processes clearer and more efficient." },
      cta: { label: { de: "Buchhaltung besprechen", en: "Discuss accounting" }, type: "email" }
    },
    orientierung: {
      cards: { de: ["Steuerberatung", "Buchhaltung", "Laufende Betreuung", "Persönliche Klärung"], en: ["Tax advice", "Accounting", "Ongoing support", "Personal clarification"] },
      text: { de: "Welche Betreuung am besten passt, lässt sich am klarsten in einem kurzen persönlichen Gespräch einschätzen. EasyTax hilft Ihnen, die nächsten Schritte einzuordnen.",
              en: "The best-fitting support is clearest to gauge in a short personal conversation. EasyTax helps you make sense of the next steps." },
      cta: { label: { de: "EasyTax kontaktieren", en: "Contact EasyTax" }, type: "contact" }
    }
  };

  function resultKey(a) {
    a = a || {};
    var anliegen = a.anliegen || [];
    var has = function (v) { return anliegen.indexOf(v) !== -1; };
    if (a.situation === "dringend" || a.dringlich === "dringend") return "urgent";
    if (a.situation === "mandant") return "mandant";
    if (a.situation === "gruendung" || has("gruendung")) return "gruendung";
    if (a.situation === "gmbh" || has("jahresabschluss")) return "unternehmen";
    if (has("lohn")) return "lohn";
    if (has("buchhaltung")) return "buchhaltung";
    return "orientierung";
  }

  function result(a) {
    var key = resultKey(a), r = RES[key];
    return {
      key: key, urgent: !!r.urgent,
      cards: pick(r.cards), text: pick(r.text),
      cta: { label: pick(r.cta.label), type: r.cta.type }
    };
  }

  var TOPIC = {
    gruendung: { de: "Unternehmensgründung", en: "Company formation" },
    unternehmen: { de: "Unternehmensbetreuung", en: "Company support" },
    lohn: { de: "Lohnverrechnung", en: "Payroll" },
    buchhaltung: { de: "Buchhaltung", en: "Accounting" },
    mandant: { de: "Bestehendes Mandat", en: "Existing client" },
    urgent: { de: "Dringendes Anliegen", en: "Urgent matter" },
    orientierung: { de: "Erste Orientierung", en: "Initial orientation" }
  };
  function mainTopic(a) { return pick(TOPIC[resultKey(a)] || { de: "Unternehmensanalyse", en: "Business analysis" }); }

  return {
    // language-aware getters
    getSteps: getSteps, getLabels: getLabels, result: result, mainTopic: mainTopic,
    // back-compat property accessors
    get STEPS() { return getSteps(); }, get LABELS() { return getLabels(); }
  };
})();
