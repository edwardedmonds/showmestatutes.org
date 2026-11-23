import { defineConfig } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { assertDataset, todayInMissouri } from './src/data';
import { extractRuntimeAliases } from './src/aliases-runtime';
import { runtimeCoverage } from './src/coverage-runtime';
import { projectClientDataset } from './src/runtime';
import { buildIndex } from './src/search';
import { loadFullText } from './src/full-text-build';
import { headingsFor, parseHeadingRegistry } from './src/subsection-headings';
import { headingCoverage, loadStatewideHeadings } from './src/subsection-headings-build';
import { browseAssets, homepageSeo } from './src/seo';

const source = readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8');
const datasetHash = createHash('sha256').update(source).digest('hex');
const parsed: unknown = JSON.parse(source);
assertDataset(parsed);
const dataset = parsed;
const clientDatasetJson = JSON.stringify(projectClientDataset(dataset, datasetHash));
const clientDatasetHash = createHash('sha256').update(clientDatasetJson).digest('hex');
const searchIndexJson = JSON.stringify({
  datasetHash,
  builtAt: new Date().toISOString(),
  index: buildIndex(dataset.records).toJSON(),
});
const searchIndexHash = createHash('sha256').update(searchIndexJson).digest('hex');
const coverageRuntimePath = resolve('src/coverage-runtime.ts');
const coverageSourcePath = resolve('data/coverage.json');
const aliasesRuntimePath = resolve('src/aliases-runtime.ts');
const aliasesSourcePath = resolve('data/aliases.json');
const fullText = process.env.STATUTES_FULL_TEXT ? loadFullText(process.env.STATUTES_FULL_TEXT, dataset, datasetHash, process.env.STATUTES_FULL_TEXT_ALLOW_PILOT === '1') : undefined;
const headingMode = process.env.STATUTES_SUBSECTION_HEADINGS;
if (headingMode && !['pilot', 'statewide'].includes(headingMode)) throw new Error('Unknown subsection heading mode');
if (headingMode && !fullText) throw new Error('Subsection headings require a full-text candidate');
const pilot = headingMode ? parseHeadingRegistry(JSON.parse(readFileSync('data/subsection-headings-pilot.json', 'utf8'))) : undefined;
const headingRegistry = headingMode === 'statewide' ? loadStatewideHeadings('data/subsection-headings/statewide', fullText!, pilot!) : pilot;
const coverage = headingRegistry && fullText ? headingCoverage(fullText, headingRegistry) : undefined;
if (process.env.STATUTES_REQUIRE_COMPLETE_HEADINGS === '1' && (!coverage || !coverage.complete))
  throw new Error('Editorial headings: statewide review is incomplete');
if (coverage) console.info(`Editorial heading coverage: ${JSON.stringify({complete: coverage.complete, counts: coverage.counts})}`);
if (headingRegistry && fullText) {
  let accepted = 0;
  for (const id of headingRegistry.keys()) {
    const text = fullText.get(id);
    const count = text ? headingsFor(text, headingRegistry).size : 0;
    accepted += count;
    if (!count && headingRegistry.get(id)?.reviewStatus === 'source-checked') console.warn(`Editorial headings: ${id} uses numbered navigation; its source or review needs attention.`);
  }
  console.info(`Editorial headings: ${accepted} source-matched headings; ${headingRegistry.size} registered versions including drafts.`);
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
    // Stable URLs remain available for audits; browsers use snapshot-specific assets.
    'data/statutes.json': source,
    [`data/statutes-client-${clientDatasetHash}.json`]: clientDatasetJson,
    'data/search-index.json': searchIndexJson,
    [`data/search-index-${searchIndexHash}.json`]: searchIndexJson,
  };
  return files;
}
export default defineConfig({
  base: './',
  // Avoid compressing 30,000 HTML assets concurrently just to report their sizes.
  build: { reportCompressedSize: false },
  define: {
    'import.meta.env.DATASET_HASH': JSON.stringify(datasetHash),
    'import.meta.env.CLIENT_DATASET_HASH': JSON.stringify(clientDatasetHash),
    'import.meta.env.SEARCH_INDEX_HASH': JSON.stringify(searchIndexHash),
  },
  // Data is emitted with snapshot hashes above. Brand assets and locally hosted fonts are copied.
  publicDir: 'static',
  plugins: [{
    name: 'coverage-runtime-projection',
    enforce: 'pre',
    load(id) {
      const cleanId = resolve(id.split('?')[0]);
      if (cleanId === coverageRuntimePath) {
        this.addWatchFile(coverageSourcePath);
        return `export const runtimeCoverage = ${JSON.stringify(runtimeCoverage)};\n`;
      }
      if (cleanId === aliasesRuntimePath) {
        this.addWatchFile(aliasesSourcePath);
        const freshAliases = extractRuntimeAliases(JSON.parse(readFileSync(aliasesSourcePath, 'utf8')));
        return `export const runtimeAliases = ${JSON.stringify(freshAliases)};\n`;
      }
      return null;
    },
  }, {
    name: 'statute-heading-index',
    transformIndexHtml(html) { return homepageSeo(html, dataset); },
    generateBundle() {
      for (const [fileName, source] of Object.entries(assets())) this.emitFile({ type: 'asset', fileName, source });
    },
    writeBundle() {
      if (!headingRegistry || !fullText || !coverage) return;
      // Keep the audit snapshot outside the site output. Reviewers may continue
      // editing chapter files after this build; the audit must check what it used.
      mkdirSync('data/editorial-work', {recursive: true});
      writeFileSync('data/editorial-work/last-build.json', JSON.stringify({
        schemaVersion: 1, mode: headingMode, datasetSha256: datasetHash, coverage,
        entries: [...headingRegistry.values()].filter(entry => fullText.has(entry.id)).map(entry => ({...entry,
          displayed: headingsFor(fullText.get(entry.id)!, headingRegistry).size > 0})),
      }, null, 2) + '\n');
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
