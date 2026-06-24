/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL des fichiers audio (servis depuis le même domaine par défaut). */
  readonly VITE_AUDIO_BASE?: string;
  /** Base URL de l'API backend (défaut /api). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
