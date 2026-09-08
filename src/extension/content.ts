import {
  findMatches,
  maskValue,
  type Category,
  type Match,
} from '../core/redact';

/**
 * The content script.
 *
 * One pass walks the text nodes of the page; a MutationObserver keeps up with
 * anything the app renders afterwards. Redacted spans keep their original text
 * in memory only — never in the DOM, an attribute or storage — so a screenshot,
 * a copy-paste or a DOM inspector shows the same black bars.
 */

interface Settings {
  enabled: boolean;
  categories: Category[];
  allow: string[];
}

const DEFAULTS: Settings = {
  enabled: true,
  categories: ['card', 'key', 'jwt', 'iban', 'email'],
  allow: [],
};

const SKIP = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
  'IFRAME',
  'CANVAS',
  'SVG',
  'CODE-EDITOR',
]);

const counts: Record<Category, number> = { card: 0, key: 0, jwt: 0, iban: 0, email: 0 };
let settings: Settings = DEFAULTS;
let records: { nodes: ChildNode[]; original: string; cats: Category[] }[] = [];
let observer: MutationObserver | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

const host = () => location.hostname;

function allowed(): boolean {
  return settings.allow.includes(host());
}

function skipNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest('[data-rdx]')) return true;
  if (SKIP.has(parent.tagName)) return true;
  if (parent.isContentEditable) return true;
  return (node.nodeValue?.trim().length ?? 0) < 4;
}

function paint(match: Match): HTMLSpanElement {
  const span = document.createElement('span');
  span.dataset.rdx = match.category;
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', `${match.category} redacted`);
  span.textContent = maskValue(match.value);
  span.style.cssText = [
    'background:#0a0503!important',
    'color:#0a0503!important',
    'border-radius:2px!important',
    'padding:0 .14em!important',
    'box-decoration-break:clone!important',
    '-webkit-box-decoration-break:clone!important',
    'user-select:none!important',
    'cursor:not-allowed!important',
  ].join(';');
  return span;
}

function applyToNode(node: Text): boolean {
  const text = node.nodeValue ?? '';
  if (skipNode(node)) return false;

  const matches = findMatches(text, settings.categories);
  if (matches.length === 0) return false;

  const fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) fragment.append(text.slice(cursor, match.start));
    fragment.append(paint(match));
    cursor = match.end;
    counts[match.category] += 1;
  }
  if (cursor < text.length) fragment.append(text.slice(cursor));

  const nodes = Array.from(fragment.childNodes);
  records.push({ nodes, original: text, cats: matches.map((m) => m.category) });
  node.replaceWith(fragment);
  return true;
}

function walk(root: ParentNode, budget = 6000): void {
  if (!settings.enabled || allowed()) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const batch: Text[] = [];
  let node = walker.nextNode();
  while (node && batch.length < budget) {
    batch.push(node as Text);
    node = walker.nextNode();
  }
  for (const text of batch) applyToNode(text);
}

function restore(): void {
  for (const record of records.reverse()) {
    const first = record.nodes[0];
    const parent = first?.parentNode;
    if (!parent) continue;
    parent.insertBefore(document.createTextNode(record.original), first);
    for (const node of record.nodes) node.remove();
  }
  records = [];
  for (const key of Object.keys(counts) as Category[]) counts[key] = 0;
}

function observe(): void {
  observer?.disconnect();
  observer = new MutationObserver((mutations) => {
    if (!settings.enabled || allowed()) return;
    const added: Node[] = [];
    let changed = false;
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE && !(node as Element).hasAttribute?.('data-rdx')) {
          added.push(node);
        }
      }
      if (mutation.type === 'characterData' && mutation.target.parentNode) {
        changed = true;
        added.push(mutation.target.parentNode);
      }
    }
    if (added.length === 0 && !changed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      for (const node of added) {
        if (node.nodeType === Node.TEXT_NODE) applyToNode(node as Text);
        else if (node.nodeType === Node.ELEMENT_NODE) walk(node as Element);
      }
      added.length = 0;
    }, 220);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function total(): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

function apply(): void {
  if (!settings.enabled || allowed()) {
    restore();
    return;
  }
  walk(document.body);
}

async function boot(): Promise<void> {
  const stored = (await chrome.storage.sync.get(
    DEFAULTS as unknown as Record<string, unknown>,
  )) as Partial<Settings>;
  settings = { ...DEFAULTS, ...stored };
  apply();
  observe();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    let dirty = false;
    if (changes.enabled) {
      settings.enabled = Boolean(changes.enabled.newValue);
      dirty = true;
    }
    if (changes.categories) {
      settings.categories = (changes.categories.newValue as Category[]) ?? DEFAULTS.categories;
      dirty = true;
    }
    if (changes.allow) {
      settings.allow = (changes.allow.newValue as string[]) ?? [];
      dirty = true;
    }
    if (!dirty) return;
    restore();
    apply();
  });

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    const type = (message as { type?: string })?.type;
    if (type === 'rdx:stats') {
      respond({
        enabled: settings.enabled,
        paused: allowed(),
        counts: { ...counts },
        total: total(),
        host: host(),
      });
      return;
    }
    if (type === 'rdx:rescan') {
      restore();
      apply();
      respond({ total: total() });
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  void boot();
}
