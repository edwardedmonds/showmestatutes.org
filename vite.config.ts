import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assertDataset, todayInMissouri } from './src/data';
import { buildIndex } from './src/search';
import { loadFullText } from './src/full-text-build';
import { headingsFor, parseHeadingRegistry } from './src/subsection-headings';
import { browseAssets, homepageSeo } from './src/seo';

const source = readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8');
const datasetHash = createHash('sha256').update(source).digest('hex');
const parsed: unknown = JSON.parse(source);
assertDataset(parsed);
const dataset = parsed;
const fullText = process.env.STATUTES_FULL_TEXT ? loadFullText(process.env.STATUTES_FULL_TEXT, dataset, datasetHash, process.env.STATUTES_FULL_TEXT_ALLOW_PILOT === '1') : undefined;
if (process.env.STATUTES_SUBSECTION_HEADINGS && process.env.STATUTES_SUBSECTION_HEADINGS !== 'pilot') throw new Error('Unknown subsection heading mode');
const headingRegistry = process.env.STATUTES_SUBSECTION_HEADINGS === 'pilot' ? parseHeadingRegistry(JSON.parse(readFileSync('data/subsection-headings-pilot.json', 'utf8'))) : undefined;
if (headingRegistry && !fullText) throw new Error('The subsection heading pilot requires a full-text candidate');
if (headingRegistry && fullText) {
  let accepted = 0;
  for (const id of headingRegistry.keys()) {
    const text = fullText.get(id);
    const count = text ? headingsFor(text, headingRegistry).size : 0;
    accepted += count;
    if (!count) console.warn(`Editorial heading pilot: ${id} uses numbered navigation; its source or review needs attention.`);
  }
  console.info(`Editorial heading pilot: ${accepted} source-matched headings across ${headingRegistry.size} registered versions.`);
}
const browseCss = readFileSync('src/style.css', 'utf8') + '\n' + readFileSync('src/browse.css', 'utf8') + (fullText ? '\n' + readFileSync('src/full-text.css', 'utf8') : '');
const browseStylesheet = `assets/browse-${createHash('sha256').update(browseCss).digest('hex').slice(0, 12)}.css`;
const asOf = todayInMissouri();

function assets(): Record<string, string> {
  const files: Record<string, string> = {
    ...browseAssets(dataset, '/' + browseStylesheet, asOf, fullText, headingRegistry),
    [browseStylesheet]: browseCss,
    'licenses.txt': [
      'Show Me Statutes — software license notices',
      readFileSync('LICENSE', 'utf8'),
      'Cormorant Garamond — heading font (SIL Open Font License)',
      readFileSync('static/fonts/cormorantgaramond-OFL.txt', 'utf8'),
      'Source Sans 3 — interface font (SIL Open Font License)',
      readFileSync('static/fonts/sourcesans3-OFL.txt', 'utf8'),
      'MiniSearch — browser search library',
      readFileSync('node_modules/minisearch/LICENSE.txt', 'utf8'),
      'Vite — build tooling and browser module-preload helper',
      readFileSync('node_modules/vite/LICENSE.md', 'utf8'),
    ].join('\n\n'),
    'data/statutes.json': source,
    'data/search-index.json': JSON.stringify({
      datasetHash,
      builtAt: new Date().toISOString(),
      index: buildIndex(dataset.records).toJSON(),
    }),
  };
  // Stable URLs remain available for audits; browsers use snapshot-specific assets.
  files[`data/statutes-${datasetHash}.json`] = files['data/statutes.json'];
  files[`data/search-index-${datasetHash}.json`] = files['data/search-index.json'];
  return files;
}
export default defineConfig({
  base: './',
  // Avoid compressing 30,000 HTML assets concurrently just to report their sizes.
  build: { reportCompressedSize: false },
  define: { 'import.meta.env.DATASET_HASH': JSON.stringify(datasetHash) },
  // Data is emitted with snapshot hashes above. Brand assets and locally hosted fonts are copied.
  publicDir: 'static',
  plugins: [{
    name: 'statute-heading-index',
    transformIndexHtml(html) { return homepageSeo(html, dataset); },
    generateBundle() {
      for (const [fileName, source] of Object.entries(assets())) this.emitFile({ type: 'asset', fileName, source });
    },
    configureServer(server) {
      const files = assets();
      server.middlewares.use((req, res, next) => {
        let name = req.url?.split('?')[0].replace(/^\//, '');
        if (name?.endsWith('/')) name += 'index.html';
        if (!name || !(name in files)) return next();
        const type = name.endsWith('.json') ? 'application/json' : name.endsWith('.html') ? 'text/html' : name.endsWith('.css') ? 'text/css' : name.endsWith('.xml') ? 'application/xml' : 'text/plain';
        res.setHeader('Content-Type', type + '; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(files[name]);
      });
    },
  }],
});
