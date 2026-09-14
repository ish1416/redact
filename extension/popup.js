const SITE = 'https://site-1091e99dece845399799e882a38760c7.freebuff.page';

const LABELS = {
  card: 'Card numbers',
  key: 'API keys',
  jwt: 'Session tokens',
  iban: 'Bank accounts',
  email: 'Email addresses',
};

const $ = (id) => document.getElementById(id);
let host = '';
let settings = { enabled: true, categories: Object.keys(LABELS), allow: [] };
let tabId = null;

function renderCats(counts) {
  const list = $('cats');
  list.innerHTML = '';
  for (const [id, label] of Object.entries(LABELS)) {
    const li = document.createElement('li');
    const wrap = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = settings.categories.includes(id);
    box.dataset.cat = id;
    box.addEventListener('change', async () => {
      const next = Object.keys(LABELS).filter((key) =>
        key === id ? box.checked : settings.categories.includes(key),
      );
      settings.categories = next;
      await chrome.storage.sync.set({ categories: next });
      rescan();
    });
    const name = document.createElement('span');
    name.textContent = label;
    const n = document.createElement('em');
    const hit = counts?.[id] ?? 0;
    n.textContent = String(hit);
    n.dataset.hot = hit > 0 ? 'true' : 'false';
    wrap.append(box, name, n);
    li.append(wrap);
    list.append(li);
  }
}

function paint(stats) {
  const paused = stats?.paused ?? false;
  $('host').textContent = stats?.host ? stats.host : 'this page is not readable';
  $('toggle').setAttribute('aria-checked', String(settings.enabled));
  $('toggle-label').textContent = settings.enabled ? 'Redacting' : 'Off';
  $('count').textContent = String(stats?.total ?? 0);
  $('pause').textContent = paused ? 'Resume on this site' : 'Pause on this site';
  $('note').textContent = paused
    ? 'Paused for this host only. Reload the page to restore what you were reading.'
    : 'Nothing leaves this tab. No network requests, ever.';
  renderCats(stats?.counts ?? {});
}

async function rescan() {
  if (tabId == null) return;
  const stats = await new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'rdx:rescan' }, (reply) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(reply);
    });
  });
  if (stats) {
    const existing = await readStats();
    paint({ ...existing, total: stats.total });
  } else {
    paint(null);
  }
}

async function readStats() {
  if (tabId == null) return null;
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'rdx:stats' }, (reply) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(reply);
    });
  });
}

async function boot() {
  const stored = await chrome.storage.sync.get({
    enabled: true,
    categories: Object.keys(LABELS),
    allow: [],
  });
  settings = { enabled: Boolean(stored.enabled), categories: stored.categories, allow: stored.allow };

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id ?? null;
  try {
    host = new URL(tab?.url ?? '').hostname;
  } catch {
    host = '';
  }

  $('site').href = SITE;
  paint(await readStats());

  $('toggle').addEventListener('click', async () => {
    settings.enabled = !settings.enabled;
    await chrome.storage.sync.set({ enabled: settings.enabled });
    setTimeout(async () => paint(await readStats()), 120);
  });

  $('pause').addEventListener('click', async () => {
    const paused = settings.allow.includes(host);
    settings.allow = paused
      ? settings.allow.filter((h) => h !== host)
      : [...settings.allow, host];
    await chrome.storage.sync.set({ allow: settings.allow });
    setTimeout(async () => paint(await readStats()), 120);
  });
}

void boot();
