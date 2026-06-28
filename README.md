# EasyTax · Website

Premium-Website für die Steuerberatung **EasyTax** (Wien), persönlich geführt von
Dr. Giangiacomo Bortoluzzi. Statische Single-Page-Website im **Liquid-Glass-Design**
(clean, modern, dunkle Quiet-Luxury-Ästhetik mit Messing-Akzent).

## Inhalt

| Datei | Zweck |
|---|---|
| `index.html` | Komplette Startseite (10 Sektionen, Strukturdaten/Schema.org) |
| `assets/css/styles.css` | Liquid-Glass-Theme, responsiv |
| `assets/js/main.js` | Scroll-Reveals, Counter, Mobile-Menü, Anfrage-Formular |
| `STARTSEITE.md` | Finale Texte & Sektions-Regie (Copy-Quelle) |
| `KONZEPT.md` | Marken- & Website-Strategie |

## Kontaktdaten (in der Seite hinterlegt)

- **Telefon:** +43 1 913 3367-0 · **Fax:** +43 1 913 3367-50
- **E-Mail:** office@easytax.eu
- **Adresse:** Veithgasse 6, 1030 Wien
- **Kanzlei seit:** 07.05.1993

## Call-to-Action / Anrufen

Mehrere Direkt-Anruf-Buttons (`tel:`-Links) verteilt über die Seite:
Header, Hero, Anfrage-Sektion, Footer und ein schwebender Anruf-Button (mobil).

## Anfrage-Formular → E-Mail an office@easytax.eu

Das Reservierungsformular (Leistungsauswahl per Chips + Name, Unternehmen, E-Mail,
Telefon, Nachricht) erzeugt eine Anfrage mit **Betreff „Anfrage von Webseite"**.

Es gibt zwei Versandwege (konfigurierbar in `assets/js/main.js`):

1. **Standard (funktioniert sofort, kein Backend):** öffnet eine vorausgefüllte
   E-Mail an `office@easytax.eu` – Empfänger, Betreff, gewählte Leistungen und
   Nachricht sind bereits eingetragen. Der Absender klickt nur noch „Senden".

2. **Empfohlen für echten Hintergrund-Versand (ohne Mailprogramm):**
   einen kostenlosen Access-Key auf <https://web3forms.com> erstellen
   (verifiziert mit `office@easytax.eu`) und in `main.js` eintragen:
   ```js
   var WEB3FORMS_KEY = "DEIN-ACCESS-KEY";
   ```
   Danach wird die Anfrage direkt im Hintergrund an `office@easytax.eu`
   zugestellt; bei einem Fehler greift automatisch Variante 1 als Fallback.

## Lokal ansehen

```bash
python3 -m http.server 8099
# → http://localhost:8099
```

## Deployment

Reine statische Dateien – läuft auf jedem Static-Hosting
(Netlify, Vercel, Cloudflare Pages, GitHub Pages, klassisches Webhosting).
Einfach den Ordnerinhalt hochladen.

## Vor dem Go-Live ersetzen

- **Portrait-Platzhalter** durch echte, professionelle Fotos von Dr. Bortoluzzi
  (`.portrait-img` in `index.html`).
- **Testimonials** durch echte, freigegebene Mandantenstimmen.
- **Kennzahlen** in der Trust-Leiste (z. B. „90 %", „500+") durch belegbare Werte.
- **Impressum / Datenschutz** ergänzen (rechtlich erforderlich).
