/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL des fichiers audio (Cloudflare R2 en prod). Optionnel. */
  readonly VITE_AUDIO_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
