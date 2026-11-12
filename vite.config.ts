import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assertDataset } from './src/data';
import { buildIndex } from './src/search';

const source = readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8');
const datasetHash = createHash('sha256').update(source).digest('hex');

function assets(): Record<string, string> {
  const dataset: unknown = JSON.parse(source);
  assertDataset(dataset);
  const files: Record<string, string> = {
    'licenses.txt': [
      'Show Me Statutes — software license notices',
      readFileSync('LICENSE', 'utf8'),
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
  define: { 'import.meta.env.DATASET_HASH': JSON.stringify(datasetHash) },
  publicDir: false,
  plugins: [{
    name: 'statute-heading-index',
    generateBundle() {
      for (const [fileName, source] of Object.entries(assets())) this.emitFile({ type: 'asset', fileName, source });
    },
    configureServer(server) {
      const files = assets();
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0].replace(/^\//, '');
        if (!name || !(name in files)) return next();
        res.setHeader('Content-Type', name.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(files[name]);
      });
    },
  }],
});
