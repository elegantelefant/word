/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GEMINI_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;

// Office.js global types
declare const Office: typeof import("@microsoft/office-js").Office;
declare const Word: typeof import("@microsoft/office-js").Word;
