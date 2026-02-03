/// <reference types="vitest/config" />
import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import copyDownloadsPlugin from "./plugins/vite-plugin-copy-downloads";
import llmsTxtPlugin from "./plugins/vite-plugin-llms-txt";

// https://vite.dev/config/
const config: UserConfig = defineConfig({
  // NOTE: THIS PATH MUST END WITH A TRAILING SLASH
  base: process.env["BASE_PUBLIC_PATH"] ?? "/",
  plugins: [react(), svgr(), copyDownloadsPlugin(), llmsTxtPlugin()],
  define: {
    "process.env": {},
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
export default config;
