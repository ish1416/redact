// Builds the installable extension:
//   src/extension/content.ts -> extension/dist/content.js (IIFE, Chrome 116)
//   extension/{manifest,background,popup,icons} -> extension/dist/
//   extension/dist -> public/redact-0.1.0.zip (the file the landing page serves)
import { execFileSync } from 'node:child_process';
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { build } from 'esbuild';

const root = new URL('..', import.meta.url).pathname;
process.chdir(root);

const out = 'extension/dist';
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: ['src/extension/content.ts'],
  outfile: `${out}/content.js`,
  bundle: true,
  format: 'iife',
  target: 'chrome116',
  minify: true,
  legalComments: 'none',
  logLevel: 'info',
});

for (const file of ['manifest.json', 'background.js', 'popup.html', 'popup.css', 'popup.js']) {
  await cp(`extension/${file}`, `${out}/${file}`);
}
await cp('extension/icons', `${out}/icons`, { recursive: true });

await rm('public/redact-0.1.0.zip', { force: true });
execFileSync('zip', ['-qr', '../../public/redact-0.1.0.zip', '.'], { cwd: out, stdio: 'pipe' });

const zip = await stat('public/redact-0.1.0.zip');
console.log(`public/redact-0.1.0.zip  ${(zip.size / 1024).toFixed(1)} kB`);
