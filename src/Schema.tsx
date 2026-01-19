/*
 * THIS SOURCE CODE IS DERIVED FROM malloy vscode extension AND IS SUBJECT TO IT'S COPYRIGHT NOTICE AND LICENSE TERMS
 * REPO: https://github.com/malloydata/malloy-vscode-extension
 * FILE: https://github.com/malloydata/malloy-vscode-extension/blob/cde23d2459f4d7d4240d609b454cb9e8d47757e9/src/extension/webviews/components/SchemaRenderer.tsx
 */
import * as React from "react";
import {
  Explore,
  type Field,
  type NamedQuery,
  type QueryField,
} from "@malloydata/malloy";
import MalloyCodeBlock from "./MalloyCodeBlock";
import type { DataSourceInfo } from "./types";

import {
  exploreSubtype,
  fieldType,
  getTypeLabel,
  isFieldAggregate,
  isFieldHidden,
} from "./schema-utils";
import ArrayIcon from "../img/data-type-array.svg?react";
import BooleanIcon from "../img/boolean.svg?react";
import ChevronRightIcon from "../img/chevron_right.svg?react";
import ChevronDownIcon from "../img/chevron_down.svg?react";
import ManyToOneIcon from "../img/many_to_one.svg?react";
import NumberIcon from "../img/number.svg?react";
import NumberAggregateIcon from "../img/number-aggregate.svg?react";
import OneToManyIcon from "../img/one_to_many.svg?react";
import OneToOneIcon from "../img/one_to_one.svg?react";
import QueryIcon from "../img/turtle.svg?react";
import RecordIcon from "../img/data-type-json.svg?react";
import SqlNativeIcon from "../img/sql-database.svg?react";
import StringIcon from "../img/string.svg?react";
import TimeIcon from "../img/time.svg?react";
import UnknownIcon from "../img/unknown.svg?react";
import { type JSX } from "react/jsx-runtime";

export { SchemaRenderer };
export type { SchemaRendererProps };

type SchemaRendererProps = {
  explores: Explore[];
  queries: NamedQuery[];
  modelCode?: string;
  dataSources?: DataSourceInfo[];
  onFieldClick: (_field: Field) => void | Promise<void>;
  onQueryClick: (_query: NamedQuery | QueryField) => void | Promise<void>;
  onPreviewClick: (_explore: Explore) => void | Promise<void>;
  onExploreClick: (_explore: Explore) => void | Promise<void>;
  defaultShow: boolean;
};

/**
 * Extract table/file references from Malloy model code
 */
function extractReferencedDataFiles(
  modelCode: string,
  dataSources: DataSourceInfo[],
): DataSourceInfo[] {
  // Match patterns like table('duckdb:path/file.ext') or table("duckdb:path/file.ext")
  // Also match from() and similar patterns
  const tablePatterns = [
    /table\s*\(\s*['"](?:duckdb:)?([^'"]+)['"]\s*\)/gi,
    /from\s*\(\s*['"](?:duckdb:)?([^'"]+)['"]\s*\)/gi,
  ];

  const referencedPaths = new Set<string>();

  for (const pattern of tablePatterns) {
    let match;
    while ((match = pattern.exec(modelCode)) !== null) {
      const path = match[1];
      if (path) {
        referencedPaths.add(path);
        // Also add without 'data/' prefix if present, or with it
        if (path.startsWith("data/")) {
          referencedPaths.add(path.substring(5));
        } else {
          referencedPaths.add(`data/${path}`);
        }
      }
    }
  }

  // Filter dataSources to only include referenced files
  return dataSources.filter((source) => {
    const fileName = `${source.name}.${source.fileType}`;
    const pathWithData = `data/${fileName}`;
    return (
      referencedPaths.has(fileName) ||
      referencedPaths.has(pathWithData) ||
      referencedPaths.has(source.path.replace("/models/", ""))
    );
  });
}

function SchemaRenderer({
  explores,
  queries,
  modelCode,
  dataSources,
  onFieldClick,
  onQueryClick,
  onPreviewClick,
  onExploreClick,
  defaultShow,
}: SchemaRendererProps): JSX.Element {
  const hidden = !defaultShow;
  const hasQueries = queries.length > 0;

  // Filter dataSources to only show files referenced in the model
  const referencedDataSources = React.useMemo(() => {
    if (!modelCode || !dataSources) return [];
    return extractReferencedDataFiles(modelCode, dataSources);
  }, [modelCode, dataSources]);

  const hasDataSources = referencedDataSources.length > 0;
  const [activeTab, setActiveTab] = React.useState<
    "sources" | "queries" | "code" | "data"
  >("sources");

  return (
    <div className="schema">
      <div className="schema-tabs">
        <button
          type="button"
          className={`schema-tab ${activeTab === "sources" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("sources");
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          Data Sources
          <span className="count-badge">{explores.length}</span>
        </button>
        {hasQueries && (
          <button
            type="button"
            className={`schema-tab ${activeTab === "queries" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("queries");
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Named Queries
            <span className="count-badge">{queries.length}</span>
          </button>
        )}
        {modelCode && (
          <button
            type="button"
            className={`schema-tab ${activeTab === "code" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("code");
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            Malloy Definition
          </button>
        )}
        {hasDataSources && (
          <button
            type="button"
            className={`schema-tab ${activeTab === "data" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("data");
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Raw Data
            <span className="count-badge">{referencedDataSources.length}</span>
          </button>
        )}
      </div>
      <div className="schema-tab-content">
        {activeTab === "queries" && hasQueries && (
          <div className="field_list">
            {queries.sort(sortByName).map((query) => (
              <QueryItem
                key={query.name}
                query={query}
                path={query.name}
                onQueryClick={onQueryClick}
              />
            ))}
          </div>
        )}
        {activeTab === "code" && modelCode && (
          <div className="model-code">
            <MalloyCodeBlock code={modelCode} />
          </div>
        )}
        {activeTab === "sources" && (
          <ul>
            {explores.sort(sortByName).map((explore) => (
              <StructItem
                key={explore.name}
                explore={explore}
                path=""
                onFieldClick={onFieldClick}
                onPreviewClick={onPreviewClick}
                onQueryClick={onQueryClick}
                onExploreClick={onExploreClick}
                startHidden={hidden}
              />
            ))}
          </ul>
        )}
        {activeTab === "data" && hasDataSources && (
          <div className="raw-data-list">
            {referencedDataSources.map((source) => (
              <a
                key={source.path}
                href={source.url}
                download={`${source.name}.${source.fileType}`}
                className="raw-data-item"
                title={`Download ${source.name}.${source.fileType}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="raw-data-icon"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="raw-data-name">{source.name}</span>
                <span className="raw-data-type">{source.fileType.toUpperCase()}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="raw-data-download-icon"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type FieldItemProps = {
  field: Field;
  path: string;
  onFieldClick: (_field: Field) => void | Promise<void>;
};

function FieldItem({ field, path, onFieldClick }: FieldItemProps) {
  return (
    <button
      type="button"
      className={`field clickable`}
      title={buildTitle(field, path)}
      onClick={() => void onFieldClick(field)}
    >
      {getIconElement(fieldType(field), isFieldAggregate(field))}
      <span className="field_name">{field.name}</span>
    </button>
  );
}

type QueryItemProps = {
  query: NamedQuery | QueryField;
  path: string;
  onQueryClick: (_query: NamedQuery | QueryField) => void | Promise<void>;
};

function QueryItem({ query, path, onQueryClick }: QueryItemProps) {
  const title = `${query.name}\nPath: ${path}${path ? "." : ""}${query.name}`;

  return (
    <button
      type="button"
      className={`field clickable`}
      onClick={() => void onQueryClick(query)}
    >
      {getIconElement("query", false)}
      <span title={title} className="field_name">
        {query.name}
      </span>
    </button>
  );
}

type StructItemProps = {
  explore: Explore;
  path: string;
  onFieldClick: (_field: Field) => void | Promise<void>;
  onQueryClick: (_query: NamedQuery | QueryField) => void | Promise<void>;
  onPreviewClick: (_explore: Explore) => void | Promise<void>;
  onExploreClick: (_explore: Explore) => void | Promise<void>;
  startHidden: boolean;
};

function StructItem({
  explore,
  path,
  onFieldClick,
  onQueryClick,
  onPreviewClick,
  onExploreClick,
  startHidden,
}: StructItemProps) {
  const [hidden, setHidden] = React.useState(startHidden);

  const toggleHidden = () => {
    setHidden(!hidden);
  };

  const onClickingPreview = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    return onPreviewClick(explore);
  };

  const onClickingExplore = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    return onExploreClick(explore);
  };

  const subtype = exploreSubtype(explore);
  const { queries, dimensions, measures, explores } = bucketFields(
    explore.allFields,
  );

  const classes = `schema ${hidden ? "hidden" : ""}`;

  return (
    <li className={classes}>
      <div className="explore-header" onClick={toggleHidden}>
        <div className="explore-header-left">
          <span className="chevron">
            {hidden ? (
              <ChevronRightIcon width={22} height={22} />
            ) : (
              <ChevronDownIcon width={22} height={22} />
            )}
          </span>
          {getIconElement(`struct_${subtype}`, false)}
          <b className="explore_name">{getExploreName(explore, path)}</b>
        </div>
        <div className="explore-actions">
          <button
            type="button"
            className="action-button preview-button"
            onClick={(e) => {
              void onClickingPreview(e);
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview
          </button>
          <button
            type="button"
            className="action-button explore-button"
            onClick={(e) => {
              void onClickingExplore(e);
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            Explore
          </button>
        </div>
      </div>
      <ul>
        {queries.length ? (
          <li className="fields">
            <label>Views</label>
            {fieldList(queries, path, onQueryClick, onFieldClick)}
          </li>
        ) : null}
        {measures.length ? (
          <li className="fields">
            <label>Measures</label>
            {fieldList(measures, path, onQueryClick, onFieldClick)}
          </li>
        ) : null}
        {explores.length
          ? explores.map((exp) => (
              <StructItem
                key={exp.name}
                explore={exp}
                path={buildPath(exp, path)}
                onFieldClick={onFieldClick}
                onPreviewClick={onPreviewClick}
                onQueryClick={onQueryClick}
                onExploreClick={onExploreClick}
                startHidden={true}
              />
            ))
          : null}
        {dimensions.length ? (
          <li className="fields">
            <label>Dimensions</label>
            {fieldList(dimensions, path, onQueryClick, onFieldClick)}
          </li>
        ) : null}
      </ul>
    </li>
  );
}

function fieldList(
  fields: Field[],
  path: string,
  onQueryClick: (_query: NamedQuery | QueryField) => void | Promise<void>,
  onFieldClick: (_field: Field) => void | Promise<void>,
) {
  return (
    <div className="field_list">
      {fields.map((field) =>
        field.isQueryField() ? (
          <QueryItem
            key={field.name}
            query={field}
            path={path}
            onQueryClick={onQueryClick}
          />
        ) : (
          <FieldItem
            key={field.name}
            field={field}
            path={path}
            onFieldClick={onFieldClick}
          />
        ),
      )}
    </div>
  );
}

function buildPath(explore: Explore, path: string): string {
  if (path) {
    return `${path}.${explore.name}`;
  } else {
    return explore.name;
  }
}

function sortByName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

/**
 * Bucket fields by type and sort by name.
 *
 * @param fields Source fields
 * @returns An objects with four arrays, one for each of queries, dimensions,
 *   measures and explores/sources, sorted by name
 */

function bucketFields(fields: Field[]): {
  queries: Field[];
  dimensions: Field[];
  measures: Field[];
  explores: Explore[];
} {
  const queries: Field[] = [];
  const dimensions: Field[] = [];
  const measures: Field[] = [];
  const explores: Explore[] = [];

  for (const field of fields) {
    const type = fieldType(field);

    if (!isFieldHidden(field)) {
      if (isFieldAggregate(field)) {
        measures.push(field);
      } else if (field.isExploreField()) {
        if (field.isArray) {
          dimensions.push(field);
        } else {
          explores.push(field);
        }
      } else if (type === "query") {
        queries.push(field);
      } else {
        dimensions.push(field); // && !isFieldHidden(field);
      }
    }
  }

  return {
    queries: queries.sort(sortByName),
    dimensions: dimensions.sort(sortByName),
    measures: measures.sort(sortByName),
    explores: explores.sort(sortByName),
  };
}

/**
 * Returns the corresponding icon for fields and relationships.
 *
 * @param elementType Field type and returned by fieldType()
 * @param isAggregate Field aggregate status as returned from isFieldAggregate()
 * @returns A React wrapped svg of the icon.
 */
function getIconElement(elementType: string, isAggregate: boolean) {
  let imageElement: React.JSX.Element | null;
  if (isAggregate) {
    imageElement = <NumberAggregateIcon />;
  } else {
    switch (elementType) {
      case "array":
        imageElement = <ArrayIcon />;
        break;
      case "struct_record":
        imageElement = <RecordIcon />;
        break;
      case "number":
        imageElement = <NumberIcon />;
        break;
      case "string":
        imageElement = <StringIcon />;
        break;
      case "date":
      case "timestamp":
        imageElement = <TimeIcon />;
        break;
      case "struct_base":
        imageElement = null;
        break;
      case "struct_one_to_many":
        imageElement = <OneToManyIcon />;
        break;
      case "struct_one_to_one":
        imageElement = <OneToOneIcon />;
        break;
      case "struct_many_to_one":
        imageElement = <ManyToOneIcon />;
        break;
      case "boolean":
        imageElement = <BooleanIcon />;
        break;
      case "query":
        imageElement = <QueryIcon />;
        break;
      case "sql native":
        imageElement = <SqlNativeIcon />;
        break;
      default:
        imageElement = <UnknownIcon />;
    }
  }

  return imageElement;
}

/**
 * Preview schema have non-friendly names like '__stage0', give them
 * something friendlier.
 */
function getExploreName(explore: Explore, path: string) {
  if (explore.name.startsWith("__stage")) {
    if (explore.parentExplore) {
      return explore.parentExplore.name;
    }
    return "Preview";
  }
  return path ? path : explore.name;
}

/**
 * Generate some information for the tooltip over Field components.
 * Typically includes name, type and path
 *
 * @param field Field or explore to generate tooltip for
 * @param path Path to this field
 * @returns Tooltip text
 */
function buildTitle(field: Field, path: string) {
  const typeLabel = getTypeLabel(field);
  const fieldName = field.name;
  return `${fieldName}
Path: ${path}${path ? "." : ""}${fieldName}
Type: ${typeLabel}`;
}
