// Alt+Shift+R flips redaction everywhere. The content scripts watch storage,
// so the page repaints without a reload.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-redaction') return;
  const { enabled = true } = await chrome.storage.sync.get({ enabled: true });
  await chrome.storage.sync.set({ enabled: !enabled });
});

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(['enabled', 'categories', 'allow']);
  if (typeof current.enabled !== 'boolean') {
    await chrome.storage.sync.set({
      enabled: true,
      categories: ['card', 'key', 'jwt', 'iban', 'email'],
      allow: [],
    });
  }
});
