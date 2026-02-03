/**
 * Utilities for generating static download URLs for models, notebooks, and data files
 */

/**
 * Get the base path for the application
 * This respects the BASE_PUBLIC_PATH environment variable used in Vite config
 */
function getBasePath(): string {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base : `${base}/`;
}

/**
 * Generate a static download URL for a model file
 * @param modelName - Name of the model (without extension)
 * @returns URL to the static model file
 */
export function getModelDownloadUrl(modelName: string): string {
  const base = getBasePath();
  return `${base}downloads/models/${encodeURIComponent(modelName)}.malloy`;
}

/**
 * Generate a static download URL for a notebook file
 * @param notebookName - Name of the notebook (without extension)
 * @returns URL to the static notebook file
 */
export function getNotebookDownloadUrl(notebookName: string): string {
  const base = getBasePath();
  return `${base}downloads/notebooks/${encodeURIComponent(notebookName)}.malloynb`;
}

/**
 * Generate a static download URL for a data file
 * @param filename - Full filename with extension (e.g., "data.csv")
 * @returns URL to the static data file
 */
export function getDataDownloadUrl(filename: string): string {
  const base = getBasePath();
  return `${base}downloads/data/${encodeURIComponent(filename)}`;
}

/**
 * Trigger a browser download for a given URL
 * @param url - The URL to download
 * @param filename - The filename to use for the download
 */
export function triggerDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
