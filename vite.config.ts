import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assertDataset } from './src/data';
import { buildIndex } from './src/search';

function assets(): Record<string, string> {
  const source = readFileSync(process.env.STATUTES_DATASET ?? 'public/data/statutes.json', 'utf8');
  const dataset: unknown = JSON.parse(source);
  assertDataset(dataset);
  return {
    'data/statutes.json': source,
    'data/search-index.json': JSON.stringify({
      datasetHash: createHash('sha256').update(source).digest('hex'),
      builtAt: new Date().toISOString(),
      index: buildIndex(dataset.records).toJSON(),
    }),
  };
}
export default defineConfig({
  base: './',
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
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(files[name]);
      });
    },
  }],
});
