import { describe, expect, test, vi } from "vitest";
import {
  getModelDownloadUrl,
  getNotebookDownloadUrl,
  getDataDownloadUrl,
  triggerDownload,
} from "../src/download-utils";

describe("download-utils", () => {
  describe("getModelDownloadUrl", () => {
    test("generates correct URL with default base path", () => {
      const url = getModelDownloadUrl("my-model");
      expect(url).toContain("downloads/models/my-model.malloy");
      expect(url).toMatch(
        /^\/.+\/downloads\/models\/my-model\.malloy$|^\/downloads\/models\/my-model\.malloy$/,
      );
    });

    test("encodes special characters in model name", () => {
      const url = getModelDownloadUrl("my model with spaces");
      expect(url).toContain(
        "downloads/models/my%20model%20with%20spaces.malloy",
      );
    });

    test("URL structure is correct", () => {
      const url = getModelDownloadUrl("test");
      expect(url).toMatch(/downloads\/models\/test\.malloy$/);
    });
  });

  describe("getNotebookDownloadUrl", () => {
    test("generates correct URL with default base path", () => {
      const url = getNotebookDownloadUrl("my-notebook");
      expect(url).toContain("downloads/notebooks/my-notebook.malloynb");
      expect(url).toMatch(/downloads\/notebooks\/my-notebook\.malloynb$/);
    });

    test("encodes special characters in notebook name", () => {
      const url = getNotebookDownloadUrl("my notebook & analysis");
      expect(url).toContain(
        "downloads/notebooks/my%20notebook%20%26%20analysis.malloynb",
      );
    });

    test("URL structure is correct", () => {
      const url = getNotebookDownloadUrl("notebook");
      expect(url).toMatch(/downloads\/notebooks\/notebook\.malloynb$/);
    });
  });

  describe("getDataDownloadUrl", () => {
    test("generates correct URL for data file", () => {
      const url = getDataDownloadUrl("data.csv");
      expect(url).toContain("downloads/data/data.csv");
      expect(url).toMatch(/downloads\/data\/data\.csv$/);
    });

    test("preserves file extension", () => {
      const url = getDataDownloadUrl("data.parquet");
      expect(url).toContain("downloads/data/data.parquet");
      expect(url).toMatch(/downloads\/data\/data\.parquet$/);
    });

    test("encodes special characters in filename", () => {
      const url = getDataDownloadUrl("my data file.csv");
      expect(url).toContain("downloads/data/my%20data%20file.csv");
    });

    test("URL structure is correct", () => {
      const url = getDataDownloadUrl("data.json");
      expect(url).toMatch(/downloads\/data\/data\.json$/);
    });
  });

  describe("triggerDownload", () => {
    test("creates anchor element with correct attributes", () => {
      // Mock document.createElement
      const mockAnchor = {
        href: "",
        download: "",
        click: vi.fn(),
      };
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockCreateElement = vi.fn().mockReturnValue(mockAnchor);

      // Setup global mocks
      const originalDocument = global.document;
      global.document = {
        createElement: mockCreateElement,
        body: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild,
        },
      } as unknown as Document;

      try {
        triggerDownload("/test/url", "test-file.txt");

        expect(mockCreateElement).toHaveBeenCalledWith("a");
        expect(mockAnchor.href).toBe("/test/url");
        expect(mockAnchor.download).toBe("test-file.txt");
        expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
        expect(mockAnchor.click).toHaveBeenCalledTimes(1);
        expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor);
      } finally {
        // Restore
        global.document = originalDocument;
      }
    });
  });
});
