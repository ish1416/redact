# Redact

**Share the screen. Not the card number.**

A Chrome extension that blacks out the things you would rather not read aloud — card numbers,
live API keys, session tokens, bank accounts and customer email addresses — on the page you are
already sharing. One shortcut. Nothing leaves the tab.

[Install from the landing page](https://redact-vercel.vercel.app) ·
[Read the engine](src/core/redact.ts) · MIT

---

## The problem

Screen shares do not leak because someone decides to leak. They leak because a dashboard has
a customer's email in the corner, a support thread has a `sk_live_` key pasted into it, and the
card on file is rendered in full because it is a test account. Blurring after the fact is a
race you lose.

Redact is the other order: press `Alt + Shift + R`, the page is read, the matches are replaced
with black bars, then you share. Nothing is uploaded, because there is nowhere to upload it to.

## What it catches

| Category | Rule | False-positive guard |
|---|---|---|
| Card numbers | 13–19 digits, with or without spaces and dashes | Luhn checksum, plus a repeated-digit rejection |
| API keys | `sk_` / `rk_` / `pk_` live and test keys, `whsec_`, `AKIA`/`ASIA`, GitHub tokens | Word boundaries; a bare `sk_live` is not a key |
| Session tokens | Three base64url segments beginning `eyJ` | All three segments required |
| Bank accounts | IBAN-shaped strings | MOD-97 check digits (ISO 13616) |
| Email addresses | Standard address shape | None — an address is an address |

Order ids, version strings, timestamps and prose survive the pass. That is the point: a tool
that hides everything is a tool nobody leaves on.

## How the pass works

1. **Read.** A `TreeWalker` collects text nodes. Scripts, styles, inputs, textareas, editable
   regions and the extension's own spans are skipped. A pass is capped at 6,000 nodes.
2. **Refuse.** Each rule proposes candidates; the checksum has the final word. Two rules that
   overlap are resolved in favour of the earlier, longer match.
3. **Paint.** Each match becomes a `<span data-rdx>` with an inline black bar. Inline styles
   survive hostile page CSS; the original text is held in a `WeakMap`-style array in memory,
   never in an attribute, so a DOM inspector shows the bar too.
4. **Keep up.** A `MutationObserver` watches for added nodes and character changes and rescans
   them 220 ms after they land, so a modal that opens mid-call is covered before it is read out.

Turning redaction off (or allowing the site) restores the original text nodes exactly.

## Install

The build is unsigned, so it is not on the Chrome Web Store. That also means you can read it
before you run it.

1. Download [`redact-0.1.0.zip`](public/redact-0.1.0.zip) from the site or this repo.
2. Unzip it anywhere permanent.
3. Open `chrome://extensions`, switch on **Developer mode**.
4. **Load unpacked** → choose the unzipped folder. Pin the mark.

`Alt + Shift + R` toggles redaction. The toolbar popup has the master switch, per-category
toggles, a live count for the current page, and a per-site pause.

## Privacy

- `permissions: ["storage"]` — settings only.
- No network requests, no telemetry, no remote code, no account.
- Content script runs on `http` and `https` pages, main frame only.
- Redacted text is black bars in the DOM; the original is never written anywhere persistent.

A permission and network audit is printed on the site as a receipt, and it is not decorative:
the manifest is the whole list.

## Limits

- **Pixels are not text.** Images, canvas, WebGL and PDF viewers are invisible to a text pass.
- **Password inputs are already masked** by the browser, and their values never enter the DOM.
- **Cross-origin iframes and closed shadow roots** are out of scope in v0.1.
- **Only known shapes.** A loyalty number, a postal address or a diagnosis has no pattern here.
- **No undo from the page.** Restoring happens through the popup or the shortcut, not the page.

## Development

```bash
npm install
npm test                 # 13 tests over the engine
npm run build            # type-check + Vite build
npm run build:extension  # bundles content.ts, packages public/redact-0.1.0.zip
npm run dev              # landing page on :5181
```

The extension is plain MV3 files plus one bundled content script:

```
extension/            manifest, popup, service worker, icons
src/extension/        content.ts — the content script, bundled to extension/dist
src/core/redact.ts    the engine (pure, no DOM) — shared with the landing demo
scripts/              pack-extension.mjs, make-icons.mjs, build.mjs
```

`src/core/redact.ts` is the only place the patterns live. The landing page's live demo imports
the same file, so the demo cannot drift from the product.

## Licence

MIT © Ishita Singh
