# Redact, explained without assuming Chrome internals

This is a walkthrough of what the project is, how a click travels through it, and what to say
about it in an interview. It assumes you know some JavaScript but nothing about browser
extensions.

## The one idea

A web page is mostly text. Before you share your screen, a small program can read that text,
find the things that look like secrets, and replace them with black bars. It has to be careful:
a 16-digit number is not always a card, and an email address is not always a secret. So the
engine checks its guesses (Luhn for cards, MOD-97 for bank accounts) and only hides what passes.

## What actually gets installed

A Chrome extension is a folder with a `manifest.json` in it. Chrome reads the manifest and
learns three things:

1. **Which files to run on which pages.** Here, `content.js` runs on every `http`/`https` page.
2. **Which pieces of the extension API it may use.** Here, only `storage` — the place settings
   live.
3. **What appears in the toolbar.** A popup (`popup.html`) and an icon.

There is also a *service worker* (`background.js`) — a script with no page, which Chrome starts
when an event happens. The only event it handles is the keyboard shortcut.

`Load unpacked` means "treat this folder as the extension". Chrome does not sign it and does not
check a store listing; that is why the install steps ask you to unzip it yourself.

## How a press travels

1. You press **Alt + Shift + R**.
2. Chrome wakes `background.js` and fires `chrome.commands.onCommand`.
3. The worker reads `enabled` from `chrome.storage.sync`, flips it, and writes it back.
4. Every open tab's content script is listening to `chrome.storage.onChanged`. It sees the
   change and calls `apply()`.
5. `apply()` walks the page's text nodes with a `TreeWalker`, hands each string to
   `findMatches()`, and replaces matches with a `<span>` styled as a black bar.
6. Chrome's storage is synced to your profile, so the popup and every tab agree without a reload.

The popup does the same thing more visibly: it asks the active tab for `{ type: 'rdx:stats' }`
and paints the counts the content script sends back.

## Where the rules live

`src/core/redact.ts`. It has no DOM code at all — it takes a string, returns matches. That is
why it can be tested with plain `vitest`, and why the landing page demo can import it directly.

The interesting part is what happens after a pattern matches:

```ts
if (rule.category === 'card') valid = luhnValid(value);
if (rule.category === 'iban') valid = ibanValid(value);
```

Luhn is the checksum every card number satisfies: double every second digit from the right,
subtract 9 when the result is over 9, add everything, and the total must end in 0. An order
number has roughly a one-in-ten chance of passing by accident, which is exactly why it is not
enough to look at the shape.

## Reading the files in order

1. `extension/manifest.json` — the whole contract with Chrome, in one screen.
2. `src/core/redact.ts` — the rules and the two checksums.
3. `src/core/redact.test.ts` — what "correct" means, including the false positives.
4. `src/extension/content.ts` — the walk, the paint, the observer, the restore.
5. `extension/background.js` — three lines of shortcut handling.
6. `extension/popup.js` — settings, counts, pause.
7. `scripts/pack-extension.mjs` — how the folder becomes a zip.
8. `src/App.tsx` / `src/styles.css` — the site around it.

## Glossary

- **MV3**: Manifest V3, the current extension format. Service workers instead of background pages.
- **Content script**: JavaScript injected into a page, sharing its DOM but not its variables.
- **Service worker**: an event-driven script with no page; it can be stopped at any time.
- **`chrome.storage.sync`**: key/value storage tied to the browser profile.
- **TreeWalker**: a DOM API for visiting nodes of one type (here, text) in order.
- **MutationObserver**: a callback that fires when the DOM changes.
- **Luhn**: the checksum that separates card numbers from long numbers.
- **MOD-97**: the IBAN checksum, defined in ISO 13616.

## Try these

- Add a rule for passport numbers. What would you check before hiding one?
- Change the pass to hide only the last four digits of a card instead of the whole number.
  Which tests break, and why is that a product decision rather than a code one?
- Make the observer ignore changes inside an element with `contenteditable`. Where does the
  restore logic need to care?
- Add a second shortcut that redacts only the current selection.
- Time a pass on a 10,000-node page. What would you change first?

## Limits to say out loud

- It cannot see pixels: canvas, images and PDFs are opaque to a text pass.
- It does not read password inputs; the browser already keeps those out of the DOM.
- Cross-origin iframes and closed shadow roots are not covered.
- It only knows the patterns it ships with.
- It is unsigned, so installing it is a deliberate act of trust — and the code is short enough
  to read in an afternoon.
