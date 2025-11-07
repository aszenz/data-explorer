/*
 * THIS SOURCE CODE IS DERIVED FROM malloy vscode extension AND IS SUBJECT TO IT'S COPYRIGHT NOTICE AND LICENSE TERMS
 * REPO: https://github.com/malloydata/malloy-vscode-extension
 * FILE: https://github.com/malloydata/malloy-vscode-extension/blob/cde23d2459f4d7d4240d609b454cb9e8d47757e9/src/extension/webviews/components/SchemaRenderer.tsx
 */
import * as React from "react";
import { Explore, Field, NamedQuery, QueryField } from "@malloydata/malloy";

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
import { JSX } from "react/jsx-runtime";

export { SchemaRenderer };
export type { SchemaRendererProps };

type SchemaRendererProps = {
  explores: Explore[];
  queries: NamedQuery[];
  onFieldClick: (_field: Field) => void | Promise<void>;
  onQueryClick: (_query: NamedQuery | QueryField) => void | Promise<void>;
  onPreviewClick: (_explore: Explore) => void | Promise<void>;
  onExploreClick: (_explore: Explore) => void | Promise<void>;
  defaultShow: boolean;
};

function SchemaRenderer({
  explores,
  queries,
  onFieldClick,
  onQueryClick,
  onPreviewClick,
  onExploreClick,
  defaultShow,
}: SchemaRendererProps): JSX.Element {
  const hidden = !defaultShow;

  return (
    <div className="schema">
      <ul>
        <li>
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
        </li>
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
      <div onClick={toggleHidden}>
        <span className="chevron">
          {hidden ? (
            <ChevronRightIcon width={22} height={22} />
          ) : (
            <ChevronDownIcon width={22} height={22} />
          )}
        </span>
        {getIconElement(`struct_${subtype}`, false)}
        <b className="explore_name">{getExploreName(explore, path)}</b>
        <button
          type="button"
          className="preview"
          onClick={(e) => {
            void onClickingPreview(e);
          }}
        >
          Preview
        </button>
        <button
          type="button"
          className="preview"
          onClick={(e) => {
            void onClickingExplore(e);
          }}
        >
          Explore
        </button>
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
