/**
 * Vite plugin for generating llms.txt
 *
 * Generates an llms.txt file at build time that describes the Malloy models
 * and schema to help LLMs understand the data explorer site.
 *
 * In dev mode, serves llms.txt dynamically via middleware.
 */

import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import * as fs from "node:fs/promises";
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
}

export default function llmsTxtPlugin(
  options: LlmsTxtPluginOptions = {},
): Plugin {
  const { siteTitle = "Malloy Data Explorer", modelsDir = "models" } = options;

  let config: ResolvedConfig;

  async function generateContent(): Promise<string> {
    const modelsDirPath = path.join(config.root, modelsDir);

    const [models, dataFiles, notebooks] = await Promise.all([
      extractModelsSchema(modelsDirPath),
      getDataFiles(modelsDirPath),
      getNotebooks(modelsDirPath),
    ]);

    return generateLlmsTxtContent({
      siteTitle,
      basePath: config.base,
      models,
      dataFiles,
      notebooks,
    });
  }

  return {
    name: "vite-plugin-llms-txt",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    // DEV MODE: Serve llms.txt dynamically
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/llms.txt") {
          void (async () => {
            try {
              // Regenerate on each request in dev mode for hot reloading
              const content = await generateContent();
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

    // BUILD MODE: Generate file after bundle
    async closeBundle() {
      if (process.env["VITEST"] || process.env["NODE_ENV"] === "test") {
        return;
      }
      if (config.command !== "build") return;

      try {
        const content = await generateContent();

        const outputPath = path.join(
          config.root,
          config.build.outDir,
          "llms.txt",
        );
        await fs.writeFile(outputPath, content, "utf-8");

        console.log(`[llms.txt] Generated ${outputPath}`);
      } catch (error) {
        console.error("[llms.txt] Error generating file:", error);
        throw error;
      }
    },
  };
}
