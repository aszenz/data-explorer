import { describe, expect, test } from "vitest";
import { extractReferencedDataFiles } from "../src/schema-utils";
import type { Model, ModelDef, TableSourceDef } from "@malloydata/malloy";
import type { DataSourceInfo } from "../src/types";

describe("extractReferencedDataFiles", () => {
  test("extracts table paths from model with single table source", () => {
    const mockModelDef: ModelDef = {
      name: "test-model",
      exports: ["users"],
      contents: {
        users: createTableSource("users", "duckdb:data/users.parquet"),
      },
      queryList: [],
      dependencies: {},
    };

    const mockModel = createMockModel(mockModelDef);

    const dataSources: DataSourceInfo[] = [
      {
        name: "users",
        path: "/data/users.parquet",
        url: "http://localhost/data/users.parquet",
        fileType: "parquet",
      },
      {
        name: "products",
        path: "/data/products.parquet",
        url: "http://localhost/data/products.parquet",
        fileType: "parquet",
      },
    ];

    const result = extractReferencedDataFiles(mockModel, dataSources);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("users");
  });

  test("extracts multiple table paths from model", () => {
    const mockModelDef: ModelDef = {
      name: "test-model",
      exports: ["users", "products"],
      contents: {
        users: createTableSource("users", "duckdb:data/users.parquet"),
        products: createTableSource("products", "duckdb:data/products.csv"),
      },
      queryList: [],
      dependencies: {},
    };

    const mockModel = createMockModel(mockModelDef);

    const dataSources: DataSourceInfo[] = [
      {
        name: "users",
        path: "/data/users.parquet",
        url: "http://localhost/data/users.parquet",
        fileType: "parquet",
      },
      {
        name: "products",
        path: "/data/products.csv",
        url: "http://localhost/data/products.csv",
        fileType: "csv",
      },
      {
        name: "orders",
        path: "/data/orders.parquet",
        url: "http://localhost/data/orders.parquet",
        fileType: "parquet",
      },
    ];

    const result = extractReferencedDataFiles(mockModel, dataSources);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name).sort()).toEqual(["products", "users"]);
  });

  test("handles table paths without duckdb prefix", () => {
    const mockModelDef: ModelDef = {
      name: "test-model",
      exports: ["users"],
      contents: {
        users: createTableSource("users", "data/users.parquet"),
      },
      queryList: [],
      dependencies: {},
    };

    const mockModel = createMockModel(mockModelDef);

    const dataSources: DataSourceInfo[] = [
      {
        name: "users",
        path: "/data/users.parquet",
        url: "http://localhost/data/users.parquet",
        fileType: "parquet",
      },
    ];

    const result = extractReferencedDataFiles(mockModel, dataSources);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("users");
  });

  test("handles table paths with and without data/ prefix", () => {
    const mockModelDef: ModelDef = {
      name: "test-model",
      exports: ["users"],
      contents: {
        users: createTableSource("users", "users.parquet"),
      },
      queryList: [],
      dependencies: {},
    };

    const mockModel = createMockModel(mockModelDef);

    const dataSources: DataSourceInfo[] = [
      {
        name: "users",
        path: "/data/users.parquet",
        url: "http://localhost/data/users.parquet",
        fileType: "parquet",
      },
    ];

    const result = extractReferencedDataFiles(mockModel, dataSources);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("users");
  });

  test("returns empty array when no tables are referenced", () => {
    const mockModelDef: ModelDef = {
      name: "test-model",
      exports: [],
      contents: {},
      queryList: [],
      dependencies: {},
    };

    const mockModel = createMockModel(mockModelDef);

    const dataSources: DataSourceInfo[] = [
      {
        name: "users",
        path: "/data/users.parquet",
        url: "http://localhost/data/users.parquet",
        fileType: "parquet",
      },
    ];

    const result = extractReferencedDataFiles(mockModel, dataSources);

    expect(result).toHaveLength(0);
  });

  test("ignores non-table source types", () => {
    const mockModelDef: ModelDef = {
      name: "test-model",
      exports: ["users", "usersSql"],
      contents: {
        users: createTableSource("users", "duckdb:data/users.parquet"),
        usersSql: {
          type: "sql_select",
          selectStr: "SELECT * FROM users",
          name: "usersSql",
          dialect: "duckdb",
          connection: "main",
          fields: [],
        },
      },
      queryList: [],
      dependencies: {},
    };

    const mockModel = createMockModel(mockModelDef);

    const dataSources: DataSourceInfo[] = [
      {
        name: "users",
        path: "/data/users.parquet",
        url: "http://localhost/data/users.parquet",
        fileType: "parquet",
      },
    ];

    const result = extractReferencedDataFiles(mockModel, dataSources);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("users");
  });

  test("handles different file types (csv, parquet, json)", () => {
    const mockModelDef: ModelDef = {
      name: "test-model",
      exports: ["users", "products", "logs"],
      contents: {
        users: createTableSource("users", "data/users.parquet"),
        products: createTableSource("products", "data/products.csv"),
        logs: createTableSource("logs", "data/logs.json"),
      },
      queryList: [],
      dependencies: {},
    };

    const mockModel = createMockModel(mockModelDef);

    const dataSources: DataSourceInfo[] = [
      {
        name: "users",
        path: "/data/users.parquet",
        url: "http://localhost/data/users.parquet",
        fileType: "parquet",
      },
      {
        name: "products",
        path: "/data/products.csv",
        url: "http://localhost/data/products.csv",
        fileType: "csv",
      },
      {
        name: "logs",
        path: "/data/logs.json",
        url: "http://localhost/data/logs.json",
        fileType: "json",
      },
    ];

    const result = extractReferencedDataFiles(mockModel, dataSources);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.fileType).sort()).toEqual([
      "csv",
      "json",
      "parquet",
    ]);
  });
});

// Helper to create a mock model from a ModelDef
function createMockModel(modelDef: ModelDef): Model {
  return {
    _modelDef: modelDef,
  } as Model;
}

// Helper to create a TableSourceDef
function createTableSource(name: string, tablePath: string): TableSourceDef {
  return {
    type: "table",
    name,
    tablePath,
    dialect: "duckdb",
    connection: "main",
    fields: [],
  };
}
