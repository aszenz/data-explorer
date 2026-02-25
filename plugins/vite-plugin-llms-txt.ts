/**
 * Vite plugin for generating llms.txt
 *
 * Generates an llms.txt file at build time that describes the Malloy models
 * and schema to help LLMs understand the data explorer site.
 *
 * In dev mode, serves llms.txt dynamically via middleware.
 * In build mode, uses the generateBundle hook to extract hashed asset URLs
 * from the output bundle and include them as download links.
 */

import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import * as path from "node:path";
import {
  extractModelsSchema,
  getDataFiles,
  getNotebooks,
  generateLlmsTxtContent,
} from "../src/llms-txt";

export interface LlmsTxtPluginOptions {
  siteTitle?: string;
  modelsDir?: string;
  siteUrl: string;
}

export default function llmsTxtPlugin(options: LlmsTxtPluginOptions): Plugin {
  const {
    siteTitle = "Malloy Data Explorer",
    modelsDir = "models",
    siteUrl,
  } = options;

  let config: ResolvedConfig;

  function validateSiteUrl(): void {
    if (!siteUrl || siteUrl.trim() === "") {
      throw new Error(
        "[llms.txt] SITE_URL environment variable is required. " +
          "Set it in your build command or CI/CD workflow. " +
          "Example: SITE_URL=https://example.com npm run build",
      );
    }
  }

  return {
    name: "vite-plugin-llms-txt",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    // DEV MODE: Serve llms.txt dynamically using original source paths.
    // NOTE: Download URLs in dev are root-relative without the base path prefix.
    // If BASE_PUBLIC_PATH is set during development, the generated links in
    // llms.txt may not include it (siteUrl defaults to http://localhost:5173).
    // This is acceptable because BASE_PUBLIC_PATH is typically only set for
    // production builds.
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/llms.txt") {
          void (async () => {
            try {
              validateSiteUrl();
              const modelsDirPath = path.join(config.root, modelsDir);
              const [models, dataFiles, notebooks] = await Promise.all([
                extractModelsSchema(modelsDirPath),
                getDataFiles(modelsDirPath),
                getNotebooks(modelsDirPath),
              ]);

              // URLs are root-relative (no base prefix) because the
              // generator already prepends siteUrl which includes the base path.
              const modelDownloadURLs: Record<string, string> = {};
              for (const model of models) {
                modelDownloadURLs[model.name] = `/models/${model.name}.malloy`;
              }
              const dataDownloadURLs: Record<string, string> = {};
              for (const file of dataFiles) {
                dataDownloadURLs[`data/${file}`] = `/models/data/${file}`;
              }

              const content = generateLlmsTxtContent({
                siteTitle,
                siteUrl,
                models,
                dataFiles,
                notebooks,
                modelDownloadURLs,
                dataDownloadURLs,
              });
              res.setHeader("Content-Type", "text/plain; charset=utf-8");
              res.end(content);
            } catch (error) {
              console.error("[llms.txt] Error generating content:", error);
              res.statusCode = 500;
              res.end(
                `Error generating llms.txt: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          })();
          return;
        }
        next();
      });
    },

    // BUILD MODE: Extract hashed asset URLs from the bundle and emit llms.txt
    async generateBundle(_outputOptions, bundle) {
      if (process.env["VITEST"] || process.env["NODE_ENV"] === "test") {
        return;
      }

      try {
        validateSiteUrl();
        const modelsDirPath = path.join(config.root, modelsDir);
        const [models, dataFiles, notebooks] = await Promise.all([
          extractModelsSchema(modelsDirPath),
          getDataFiles(modelsDirPath),
          getNotebooks(modelsDirPath),
        ]);

        // Extract download URLs from the output bundle's asset entries.
        // URLs are root-relative (no base prefix) because the generator
        // already prepends siteUrl which includes the base path.
        const modelDownloadURLs: Record<string, string> = {};
        const dataDownloadURLs: Record<string, string> = {};

        for (const asset of Object.values(bundle)) {
          if (asset.type !== "asset") continue;
          for (const originalFile of asset.originalFileNames) {
            if (
              originalFile.startsWith("models/") &&
              originalFile.endsWith(".malloy")
            ) {
              const name = path.basename(originalFile, ".malloy");
              modelDownloadURLs[name] = `/${asset.fileName}`;
            } else if (originalFile.startsWith("models/data/")) {
              const dataPath = originalFile.replace("models/", "");
              dataDownloadURLs[dataPath] = `/${asset.fileName}`;
            }
          }
        }

        const content = generateLlmsTxtContent({
          siteTitle,
          siteUrl,
          models,
          dataFiles,
          notebooks,
          modelDownloadURLs,
          dataDownloadURLs,
        });

        this.emitFile({
          type: "asset",
          fileName: "llms.txt",
          source: content,
        });

        console.log("[llms.txt] Generated llms.txt");
      } catch (error) {
        console.error("[llms.txt] Error generating file:", error);
        throw error;
      }
    },
  };
}
