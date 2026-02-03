/**
 * Vite plugin to copy downloadable files (models, notebooks, data)
 * to the build output for static serving
 */
import type { Plugin } from "vite";
import {
  copyFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";

export default function copyDownloadsPlugin(): Plugin {
  let outDir: string;

  return {
    name: "vite-plugin-copy-downloads",

    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },

    closeBundle() {
      // Skip during test runs
      if (process.env["VITEST"] || process.env["NODE_ENV"] === "test") {
        return;
      }
      const modelsDir = resolve(process.cwd(), "models");
      const downloadsDir = join(outDir, "downloads");

      // Create downloads directory structure
      const modelsDest = join(downloadsDir, "models");
      const notebooksDest = join(downloadsDir, "notebooks");
      const dataDest = join(downloadsDir, "data");

      [downloadsDir, modelsDest, notebooksDest, dataDest].forEach((dir) => {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      });

      // Copy all .malloy files (models)
      const files = readdirSync(modelsDir);
      let modelCount = 0;
      let notebookCount = 0;

      files.forEach((file) => {
        const srcPath = join(modelsDir, file);
        const stat = statSync(srcPath);

        if (stat.isFile()) {
          if (file.endsWith(".malloy")) {
            const destPath = join(modelsDest, file);
            copyFileSync(srcPath, destPath);
            modelCount++;
            console.log(`  ✓ Copied model: ${file}`);
          } else if (file.endsWith(".malloynb")) {
            const destPath = join(notebooksDest, file);
            copyFileSync(srcPath, destPath);
            notebookCount++;
            console.log(`  ✓ Copied notebook: ${file}`);
          }
        }
      });

      // Copy all data files from models/data
      const dataDir = join(modelsDir, "data");
      if (existsSync(dataDir)) {
        const dataFiles = readdirSync(dataDir);
        let dataCount = 0;

        dataFiles.forEach((file) => {
          const srcPath = join(dataDir, file);
          const stat = statSync(srcPath);

          if (stat.isFile() && file !== ".gitkeep") {
            const destPath = join(dataDest, file);
            copyFileSync(srcPath, destPath);
            dataCount++;
            console.log(`  ✓ Copied data: ${file}`);
          }
        });

        console.log(
          `\n📦 Download files copied: ${modelCount.toString()} models, ${notebookCount.toString()} notebooks, ${dataCount.toString()} data files`,
        );
      }
    },
  };
}
