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
  createReadStream,
} from "node:fs";
import { join, resolve, basename } from "node:path";

export default function copyDownloadsPlugin(): Plugin {
  let outDir: string;
  let modelsDir: string;

  return {
    name: "vite-plugin-copy-downloads",

    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      modelsDir = resolve(config.root, "models");
    },

    configureServer(server) {
      // Respect Vite's base config
      const base = server.config.base.endsWith("/")
        ? server.config.base
        : `${server.config.base}/`;
      const downloadsPrefix = `${base}downloads/`;

      server.middlewares.use((req, res, next) => {
        const url = req.url || "";

        if (!url.startsWith(downloadsPrefix)) {
          next();
          return;
        }

        // Strip the prefix and any query string, then decode
        const pathPart = url.slice(downloadsPrefix.length).split("?")[0] || "";
        const [rawCategory, ...rawRestParts] = pathPart
          .split("/")
          .filter(Boolean);

        if (!rawCategory || rawRestParts.length === 0) {
          next();
          return;
        }

        // Decode URI components
        const category = decodeURIComponent(rawCategory);
        const restParts = rawRestParts.map((part) => decodeURIComponent(part));

        // Reject any path traversal attempts
        if (restParts.some((part) => part === ".." || part === ".")) {
          res.statusCode = 400;
          res.end("Bad Request");
          return;
        }

        const rest = restParts.join("/");
        let filePath: string;

        if (category === "models" || category === "notebooks") {
          // Models and notebooks both live in the top-level models directory.
          filePath = join(modelsDir, rest);
        } else if (category === "data") {
          filePath = join(modelsDir, "data", rest);
        } else {
          next();
          return;
        }

        // Verify the resolved path is within the allowed directory
        const normalizedPath = resolve(filePath);
        const allowedDir =
          category === "data" ? resolve(modelsDir, "data") : resolve(modelsDir);
        if (!normalizedPath.startsWith(allowedDir)) {
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }

        if (!existsSync(filePath)) {
          next();
          return;
        }

        const stat = statSync(filePath);
        if (!stat.isFile()) {
          next();
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${basename(filePath)}"`,
        );

        const stream = createReadStream(filePath);
        stream.on("error", () => {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end("Internal Server Error");
          } else {
            res.end();
          }
        });
        stream.pipe(res);
      });
    },

    closeBundle() {
      // Skip during test runs
      if (process.env["VITEST"] || process.env["NODE_ENV"] === "test") {
        return;
      }
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
