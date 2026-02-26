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

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
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
