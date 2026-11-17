import { readdir, mkdir, rm, cp, stat, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outputDir = path.join(root, 'dist');
const password = process.env.STATICRYPT_PASSWORD;

if (!password || password.length < 16) {
  console.error('Build blocked: define STATICRYPT_PASSWORD as a strong passphrase of at least 16 characters in GitHub Actions secrets.');
  process.exit(1);
}

const entries = await readdir(root, { withFileTypes: true });
const htmlFiles = entries
  .filter((entry) => entry.isFile() && /\.html?$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (!htmlFiles.includes('index.html') || htmlFiles.length === 0) {
  console.error('Build blocked: index.html or other HTML pages were not found at the repository root.');
  process.exit(1);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

// Publish only reviewed static assets. Original HTML (including embedded budget
// data) is encrypted by StatiCrypt and is never copied to dist as plaintext.
const assetsPath = path.join(root, 'assets');
try {
  if ((await stat(assetsPath)).isDirectory()) {
    await cp(assetsPath, path.join(outputDir, 'assets'), { recursive: true });
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const executable = process.platform === 'win32'
  ? path.join(root, 'node_modules', '.bin', 'staticrypt.cmd')
  : path.join(root, 'node_modules', '.bin', 'staticrypt');

const args = [
  ...htmlFiles,
  '--directory', 'dist',
  '--remember', '7',
  '--template-title', 'CascaisBudget2027',
  '--template-instructions', 'Introduza a palavra-passe partilhada para consultar este conteúdo.',
  '--template-button', 'Aceder',
  '--template-error', 'Palavra-passe incorreta. Tente novamente.',
  '--template-placeholder', 'Palavra-passe'
];

const result = spawnSync(executable, args, {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (result.error) throw result.error;
if (result.status !== 0) {
  console.error('Build blocked: StatiCrypt did not complete successfully.');
  process.exit(result.status ?? 1);
}

const outputEntries = await readdir(outputDir, { withFileTypes: true });
const outputHtml = outputEntries.filter((entry) => entry.isFile() && /\.html?$/i.test(entry.name));
if (outputHtml.length !== htmlFiles.length) {
  console.error(`Build blocked: expected ${htmlFiles.length} encrypted HTML files, found ${outputHtml.length}.`);
  process.exit(1);
}

// Sanity check: generated HTML must not be identical to any source page and
// should contain the StatiCrypt password prompt marker.
for (const fileName of htmlFiles) {
  const [source, generated] = await Promise.all([
    readFile(path.join(root, fileName), 'utf8'),
    readFile(path.join(outputDir, fileName), 'utf8')
  ]);
  if (source === generated || !generated.toLowerCase().includes('staticrypt')) {
    console.error(`Build blocked: ${fileName} does not appear to have been encrypted.`);
    process.exit(1);
  }
}

console.log(`Build complete: ${outputHtml.length} HTML pages encrypted; reviewed assets copied to dist/.`);
