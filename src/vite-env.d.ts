/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DATASET_HASH: string;
  readonly CLIENT_DATASET_HASH: string;
  readonly SEARCH_INDEX_HASH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
