// ABOUTME: Vite config for Office Add-in with HTTPS dev server.
// ABOUTME: Uses React plugin + Tailwind, resolves @ paths, serves over HTTPS for Office.js.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "fs";
import { resolve } from "path";

const devCerts = () => {
  try {
    return {
      key: readFileSync(resolve(process.env.HOME!, ".office-addin-dev-certs", "localhost.key")),
      cert: readFileSync(resolve(process.env.HOME!, ".office-addin-dev-certs", "localhost.crt")),
    };
  } catch {
    console.warn("No dev certs found. Run `pnpm certs` first.");
    return undefined;
  }
};

const stubApigee = () => ({
  name: "stub-apigee-llm",
  enforce: "pre" as const,
  resolveId(source: string) {
    if (source.includes("apigee_llm")) {
      return { id: "\0apigee-stub", moduleSideEffects: false };
    }
    return null;
  },
  load(id: string) {
    if (id === "\0apigee-stub") {
      return "export class ApigeeLlm { static supportedModels = []; }";
    }
    return null;
  },
});

export default defineConfig({
  plugins: [stubApigee(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@google/adk": resolve(__dirname, "src/lib/adk-shim.ts"),
    },
  },
  server: {
    https: devCerts(),
    port: 3000,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});
