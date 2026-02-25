/*
 * THIS SOURCE CODE IS DERIVED FROM malloy vscode extension AND IS SUBJECT TO IT'S COPYRIGHT NOTICE AND LICENSE TERMS
 * REPO: https://github.com/malloydata/malloy-vscode-extension
 * FILE: https://github.com/malloydata/malloy-vscode-extension/blob/cde23d2459f4d7d4240d609b454cb9e8d47757e9/src/extension/webviews/components/SchemaRenderer.tsx
 */
import * as React from "react";
import {
  Explore,
  type Field,
  type NamedQueryDef,
  type QueryField,
  type Model,
} from "@malloydata/malloy";
import MalloyCodeBlock from "./MalloyCodeBlock";
import type { DataSourceInfo } from "./types";
import { useSearchParams, Link } from "react-router";

import {
  exploreSubtype,
  extractReferencedDataFiles,
  fieldType,
  getTypeLabel,
  isFieldAggregate,
  isFieldHidden,
} from "./schema-utils";
import ArrayIcon from "../img/data-type-array.svg?react";
import BooleanIcon from "../img/boolean.svg?react";
import ChevronRightIcon from "../img/chevron_right.svg?react";
import ChevronDownIcon from "../img/chevron_down.svg?react";
import DownloadIcon from "../img/download.svg?react";
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
import LightningIcon from "../img/lightning.svg?react";
import CodeIcon from "../img/code.svg?react";
import FileIcon from "../img/file.svg?react";
import EyeIcon from "../img/eye.svg?react";
import CompassIcon from "../img/compass.svg?react";
import DatabaseIcon from "../img/database-icon.svg?react";
import { type JSX } from "react/jsx-runtime";

import Menu from "./Menu";

export { SchemaRenderer };
export type { SchemaRendererProps };

type SchemaRendererProps = {
  explores: Explore[];
  queries: NamedQueryDef[];
  model?: Model;
  modelCode?: string;
  dataSources?: DataSourceInfo[];
  onFieldClick: (_field: Field) => void | Promise<void>;
  onQueryClick: (_query: NamedQueryDef | QueryField) => void | Promise<void>;
  onPreviewClick: (_explore: Explore) => void | Promise<void>;
  onExploreClick: (_explore: Explore) => void | Promise<void>;
  defaultShow: boolean;
};

function SchemaRenderer({
  explores,
  queries,
  model,
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
  const hasExplores = explores.length > 0;
  const [searchParams] = useSearchParams();

  // Filter dataSources to only show files referenced in the model
  const referencedDataSources = React.useMemo(() => {
    if (undefined === model || undefined === dataSources) return [];
    return extractReferencedDataFiles(model, dataSources);
  }, [model, dataSources]);

  const hasDataSources = referencedDataSources.length > 0;

  // Set default tab - prefer sources, but fall back to queries or code if sources is empty
  const getDefaultTab = (): "sources" | "queries" | "code" | "data" => {
    if (hasExplores) return "sources";
    if (hasQueries) return "queries";
    if (modelCode) return "code";
    if (hasDataSources) return "data";
    return "sources";
  };

  const validTabs = ["sources", "queries", "code", "data"] as const;
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam && validTabs.includes(tabParam as (typeof validTabs)[number])
      ? (tabParam as "sources" | "queries" | "code" | "data")
      : getDefaultTab();

  const createTabUrl = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    return `?${params.toString()}`;
  };

  return (
    <div className="schema">
      <div className="schema-tabs">
        {hasExplores && (
          <Link
            to={createTabUrl("sources")}
            className={`schema-tab ${activeTab === "sources" ? "active" : ""}`}
          >
            <DatabaseIcon aria-label="Data Sources" />
            Data Sources
            <span className="count-badge">{explores.length}</span>
          </Link>
        )}
        {hasQueries && (
          <Link
            to={createTabUrl("queries")}
            className={`schema-tab ${activeTab === "queries" ? "active" : ""}`}
          >
            <LightningIcon aria-label="Named Queries" />
            Named Queries
            <span className="count-badge">{queries.length}</span>
          </Link>
        )}
        {modelCode && (
          <Link
            to={createTabUrl("code")}
            className={`schema-tab ${activeTab === "code" ? "active" : ""}`}
          >
            <CodeIcon aria-label="Code" />
            Malloy Definition
          </Link>
        )}
        {hasDataSources && (
          <Link
            to={createTabUrl("data")}
            className={`schema-tab ${activeTab === "data" ? "active" : ""}`}
          >
            <DownloadIcon aria-label="Raw Data" />
            Raw Data
            <span className="count-badge">{referencedDataSources.length}</span>
          </Link>
        )}
      </div>

      <SchemaMobileMenu
        activeTab={activeTab}
        hasExplores={hasExplores}
        exploresCount={explores.length}
        hasQueries={hasQueries}
        queriesCount={queries.length}
        hasModelCode={!!modelCode}
        hasDataSources={hasDataSources}
        dataSourcesCount={referencedDataSources.length}
      />
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
        {activeTab === "sources" && hasExplores && (
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
            {referencedDataSources.map((source) => {
              const filename = `${source.name}.${source.fileType}`;
              return (
                <a
                  key={source.path}
                  href={source.url}
                  download={filename}
                  className="raw-data-item"
                  title={`Download ${filename}`}
                >
                  <FileIcon className="raw-data-icon" aria-label="File" />
                  <span className="raw-data-name">{source.name}</span>
                  <span className="raw-data-type">
                    {source.fileType.toUpperCase()}
                  </span>
                  <DownloadIcon
                    className="raw-data-download-icon"
                    aria-label="Download"
                  />
                </a>
              );
            })}
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
  query: NamedQueryDef | QueryField;
  path: string;
  onQueryClick: (_query: NamedQueryDef | QueryField) => void | Promise<void>;
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
  onQueryClick: (_query: NamedQueryDef | QueryField) => void | Promise<void>;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const exploreKey = path ? `${path}.${explore.name}` : explore.name;
  const expandedExplores = searchParams.get("expanded")?.split(",") || [];
  const isToggled = expandedExplores.includes(exploreKey);
  // XOR: hidden if (startHidden and not toggled) or (not startHidden and toggled)
  const hidden = startHidden ? !isToggled : isToggled;

  const toggleHidden = () => {
    const newExpandedExplores = isToggled
      ? expandedExplores.filter((key) => key !== exploreKey)
      : [...expandedExplores, exploreKey];

    const params = new URLSearchParams(searchParams);
    if (newExpandedExplores.length > 0) {
      params.set("expanded", newExpandedExplores.join(","));
    } else {
      params.delete("expanded");
    }
    setSearchParams(params);
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
            <EyeIcon aria-label="Preview" />
            Preview
          </button>
          <button
            type="button"
            className="action-button explore-button"
            onClick={(e) => {
              void onClickingExplore(e);
            }}
          >
            <CompassIcon aria-label="Explore" />
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
  onQueryClick: (_query: NamedQueryDef | QueryField) => void | Promise<void>,
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

type SchemaMobileMenuProps = {
  activeTab: "sources" | "queries" | "code" | "data";
  hasExplores: boolean;
  exploresCount: number;
  hasQueries: boolean;
  queriesCount: number;
  hasModelCode: boolean;
  hasDataSources: boolean;
  dataSourcesCount: number;
};

function SchemaMobileMenu({
  activeTab,
  hasExplores,
  exploresCount,
  hasQueries,
  queriesCount,
  hasModelCode,
  hasDataSources,
  dataSourcesCount,
}: SchemaMobileMenuProps): JSX.Element {
  const [searchParams] = useSearchParams();

  const getActiveTabLabel = () => {
    switch (activeTab) {
      case "sources":
        return `Data Sources (${exploresCount.toString()})`;
      case "queries":
        return `Named Queries (${queriesCount.toString()})`;
      case "code":
        return "Malloy Definition";
      case "data":
        return `Raw Data (${dataSourcesCount.toString()})`;
    }
  };

  const createTabUrl = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    return `?${params.toString()}`;
  };

  const allItems: Array<{
    value: "sources" | "queries" | "code" | "data";
    label: string;
    to: string;
    show: boolean;
  }> = [
    {
      value: "sources" as const,
      label: `Data Sources (${exploresCount.toString()})`,
      to: createTabUrl("sources"),
      show: hasExplores,
    },
    {
      value: "queries" as const,
      label: `Named Queries (${queriesCount.toString()})`,
      to: createTabUrl("queries"),
      show: hasQueries,
    },
    {
      value: "code" as const,
      label: "Malloy Definition",
      to: createTabUrl("code"),
      show: hasModelCode,
    },
    {
      value: "data" as const,
      label: `Raw Data (${dataSourcesCount.toString()})`,
      to: createTabUrl("data"),
      show: hasDataSources,
    },
  ];

  const menuItems = allItems.filter((item) => item.show);

  return (
    <div className="schema-tabs-mobile">
      <Menu
        trigger={getActiveTabLabel()}
        triggerClassName="schema-tabs-mobile-trigger"
        items={menuItems.map((item) => ({
          name: item.label,
          to: item.to,
          active: activeTab === item.value,
        }))}
      />
    </div>
  );
}
