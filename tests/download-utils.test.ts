// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import {
  useModelDownloadUrl,
  useNotebookDownloadUrl,
  DownloadURLsContext,
} from "../src/download-utils";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(
    DownloadURLsContext.Provider,
    {
      value: {
        modelURLs: { "my-model": "/assets/my-model-abc123.malloy" },
        notebookURLs: { "my-notebook": "/assets/my-notebook-def456.malloynb" },
      },
    },
    children,
  );

describe("download-utils", () => {
  describe("useModelDownloadUrl", () => {
    test("returns registered URL for known model", () => {
      const { result } = renderHook(() => useModelDownloadUrl("my-model"), {
        wrapper,
      });
      expect(result.current).toBe("/assets/my-model-abc123.malloy");
    });

    test("returns undefined for unknown model", () => {
      const { result } = renderHook(() => useModelDownloadUrl("unknown"), {
        wrapper,
      });
      expect(result.current).toBeUndefined();
    });
  });

  describe("useNotebookDownloadUrl", () => {
    test("returns registered URL for known notebook", () => {
      const { result } = renderHook(
        () => useNotebookDownloadUrl("my-notebook"),
        { wrapper },
      );
      expect(result.current).toBe("/assets/my-notebook-def456.malloynb");
    });

    test("returns undefined for unknown notebook", () => {
      const { result } = renderHook(() => useNotebookDownloadUrl("unknown"), {
        wrapper,
      });
      expect(result.current).toBeUndefined();
    });
  });

  test("throws when used outside provider", () => {
    expect(() => {
      renderHook(() => useModelDownloadUrl("any"));
    }).toThrow(
      "useDownloadURLs must be used within a DownloadURLsContext.Provider",
    );
  });
});
