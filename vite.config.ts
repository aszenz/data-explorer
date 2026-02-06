/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import type { UserConfigFnObject } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import copyDownloadsPlugin from "./plugins/vite-plugin-copy-downloads";
import llmsTxtPlugin from "./plugins/vite-plugin-llms-txt";

// https://vite.dev/config/
const config: ReturnType<typeof defineConfig> = defineConfig((({ mode }) => {
  const siteUrl =
    process.env["SITE_URL"] ??
    (mode === "development" ? "http://localhost:5173" : null);

  if (null === siteUrl) {
    throw new Error(
      "SITE_URL environment variable is required for production builds. " +
        "Set it in your build command or CI/CD workflow.",
    );
  }

  return {
    // NOTE: THIS PATH MUST END WITH A TRAILING SLASH
    base: process.env["BASE_PUBLIC_PATH"] ?? "/",
    plugins: [
      react(),
      svgr(),
      copyDownloadsPlugin(),
      llmsTxtPlugin({
        siteUrl,
      }),
    ],
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
  };
}) satisfies UserConfigFnObject);

export default config;
