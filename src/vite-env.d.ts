/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GATEWAY_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Office.js global types
declare const Office: typeof import("@microsoft/office-js").Office;
declare const Word: typeof import("@microsoft/office-js").Word;
