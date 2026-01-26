/**
 * Site configuration injected at build time via Vite's define option
 */
export interface SiteConfig {
  title: string;
  description: string;
}

declare global {
  const __DATA_EXPLORER_CONFIG__: SiteConfig;
}

export function getSiteConfig(): SiteConfig {
  return __DATA_EXPLORER_CONFIG__;
}
