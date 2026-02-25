/**
 * React context for download URLs.
 * Initialized at the router level with Vite-bundled asset URLs
 * so components can look up download links.
 */

import { createContext, useContext, type Context } from "react";

export type DownloadURLs = {
  modelURLs: Record<string, string>;
  notebookURLs: Record<string, string>;
};

export const DownloadURLsContext: Context<DownloadURLs | null> =
  createContext<DownloadURLs | null>(null);

function useDownloadURLs(): DownloadURLs {
  const ctx = useContext(DownloadURLsContext);
  if (ctx === null) {
    throw new Error(
      "useDownloadURLs must be used within a DownloadURLsContext.Provider",
    );
  }
  return ctx;
}

export function useModelDownloadUrl(modelName: string): string | undefined {
  return useDownloadURLs().modelURLs[modelName];
}

export function useNotebookDownloadUrl(
  notebookName: string,
): string | undefined {
  return useDownloadURLs().notebookURLs[notebookName];
}
