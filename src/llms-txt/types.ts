/**
 * Types for llms.txt generation
 */

export interface ExtractedModel {
  name: string;
  sources: ExtractedSource[];
  queries: ExtractedQuery[];
  rawCode: string;
}

export interface ExtractedSource {
  name: string;
  tablePath?: string;
  dimensions: ExtractedField[];
  measures: ExtractedField[];
  views: ExtractedView[];
}

export interface ExtractedView {
  name: string;
}

export interface ExtractedField {
  name: string;
  type: string;
}

export interface ExtractedQuery {
  name: string;
}

export interface LlmsTxtOptions {
  siteTitle?: string;
  modelsDir?: string;
}
