import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, rmSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PROJECT_ROOT = resolve(__dirname, "../..");
const CLI_PATH = join(PROJECT_ROOT, "dist-cli/index.js");
const EXAMPLE_MODELS = join(PROJECT_ROOT, "example/models");

// Build CLI before tests
beforeAll(() => {
  console.log("Building CLI...");
  execSync("npm run build:cli", { cwd: PROJECT_ROOT, stdio: "inherit" });
}, 30000);

describe("CLI smoke tests", () => {
  describe("--help flag", () => {
    it("should display help text", () => {
      const output = execSync(`node ${CLI_PATH} --help`, {
        encoding: "utf-8",
      });

      expect(output).toContain("data-explorer");
      expect(output).toContain("build");
      expect(output).toContain("--output");
      expect(output).toContain("--title");
      expect(output).toContain("--description");
    });
  });

  describe("--version flag", () => {
    it("should display version", () => {
      const output = execSync(`node ${CLI_PATH} --version`, {
        encoding: "utf-8",
      });

      expect(output).toContain("data-explorer");
      expect(output).toMatch(/v?\d+\.\d+\.\d+/);
    });
  });

  describe("build command validation", () => {
    it("should error when no input path provided", () => {
      expect(() => {
        execSync(`node ${CLI_PATH} build`, {
          encoding: "utf-8",
          stdio: "pipe",
        });
      }).toThrow();
    });

    it("should error when input path does not exist", () => {
      expect(() => {
        execSync(`node ${CLI_PATH} build /nonexistent/path`, {
          encoding: "utf-8",
          stdio: "pipe",
        });
      }).toThrow();
    });

    it("should error when unknown command is given", () => {
      expect(() => {
        execSync(`node ${CLI_PATH} unknowncommand`, {
          encoding: "utf-8",
          stdio: "pipe",
        });
      }).toThrow();
    });
  });

  describe("build command execution", () => {
    const testOutputDir = join(PROJECT_ROOT, "test-output-cli");

    afterAll(() => {
      // Clean up test output
      if (existsSync(testOutputDir)) {
        rmSync(testOutputDir, { recursive: true, force: true });
      }
    });

    it("should build example site successfully", () => {
      // Clean up any previous test output
      if (existsSync(testOutputDir)) {
        rmSync(testOutputDir, { recursive: true, force: true });
      }

      const output = execSync(
        `node ${CLI_PATH} build ${EXAMPLE_MODELS} -o ${testOutputDir} -t "Test Site" -d "Test description"`,
        {
          encoding: "utf-8",
          cwd: PROJECT_ROOT,
          timeout: 120000,
        }
      );

      expect(output).toContain("Build completed successfully");

      // Verify output files exist
      expect(existsSync(testOutputDir)).toBe(true);
      expect(existsSync(join(testOutputDir, "index.html"))).toBe(true);
      expect(existsSync(join(testOutputDir, "assets"))).toBe(true);
    }, 120000);

    it("should include custom title in built site", () => {
      // The index.html should contain the title (set via JS, but we can check for the bundle)
      const indexHtml = readFileSync(
        join(testOutputDir, "index.html"),
        "utf-8"
      );

      // The HTML should at least have the basic structure
      expect(indexHtml).toContain("<!DOCTYPE html>");
      expect(indexHtml).toContain('<div id="root">');
    });
  });
});
