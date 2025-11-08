import type * as malloy from "@malloydata/malloy";
import * as duckdb from "@duckdb/duckdb-wasm";
import { DuckDBWASMConnection } from "@malloydata/db-duckdb/wasm";
import duckdbWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdbWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";

export type GetDataset = (
  _table: string,
) => Promise<{ data: Blob; fileType: SupportedFileType } | null>;
export type SupportedFileType =
  | "csv"
  | "parquet"
  | "json"
  | "jsonl"
  | "ndjson"
  | "xlsx";
export default class DuckDBConnection extends DuckDBWASMConnection {
  private getDataset: GetDataset;

  constructor(
    getDataset: GetDataset,
    duckdbWasmOptions: { name: string; additionalExtensions?: string[] },
    queryOptions: malloy.QueryOptionsReader,
  ) {
    super({ ...duckdbWasmOptions, motherDuckToken: undefined }, queryOptions);
    this.getDataset = getDataset;
  }

  override getBundles(): duckdb.DuckDBBundles {
    return {
      mvp: {
        mainModule: duckdbWasm,
        mainWorker: mvpWorker,
      },
      eh: {
        mainModule: duckdbWasmEh,
        mainWorker: ehWorker,
      },
    };
  }

  override async init(): Promise<void> {
    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(this.getBundles());
    const logger = new duckdb.VoidLogger();
    if (!bundle.mainWorker) {
      throw new Error("Unable to instantiate duckdb-wasm");
    }
    // @ts-expect-error need this to set the worker
    this.worker = new Worker(bundle.mainWorker);
    // @ts-expect-error need this to set the worker
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this._database = new duckdb.AsyncDuckDB(logger, this.worker);
    await this._database.instantiate(bundle.mainModule, bundle.pthreadWorker);
    // @ts-expect-error need this to set the database path
    if (this.databasePath) {
      await this._database.open({
        // @ts-expect-error need this to set the database path
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        path: this.databasePath,
      });
    }
    this._connection = await this._database.connect();
  }

  /**
   * Override the runDuckDBQuery method to load the required tables from the server
   */
  protected override async runDuckDBQuery(
    sql: string,
    abortSignal?: AbortSignal,
  ): Promise<{ rows: malloy.QueryDataRow[]; totalRows: number }> {
    if (null === this.connection) {
      throw new Error("Connection is null");
    }
    console.log({ sql });
    const connection = this.connection;
    const tablesRequiredForQueryExecution = [
      ...new Set(await connection.getTableNames(sql)),
    ];
    console.log({ tablesRequiredForQueryExecution });
    const alreadyLoadedTables = (await connection.query("SHOW TABLES"))
      .toArray()
      .map((row: { [columnName: string]: string }) => Object.values(row)[0]);
    // TODO: Don't load the full table for describe queries
    // Describe queries are used to load the schema of the table
    console.time("Setting up datasources");
    await Promise.all(
      tablesRequiredForQueryExecution
        .filter((table) => !alreadyLoadedTables.includes(table))
        .map(async (table) => {
          const datasetContents = await this.getDataset(table);
          if (null === datasetContents) {
            console.info(
              `Dataset ${table} not found in local files, installing httpfs to load it directly, assuming it's a duckdb supported uri`,
            );
            await this.connection?.query("install httpfs");
            await this.connection?.query("load httpfs");
            return;
          }

          await this._loadDataFromFile(
            table,
            datasetContents.data,
            datasetContents.fileType,
          );
        }),
    );
    console.timeEnd("Setting up datasources");
    console.time("Running query");
    const result = await super.runDuckDBQuery(sql, abortSignal);
    console.timeEnd("Running query");
    return result;
  }

  /**
   * Load data into DuckDB using the appropriate method based on file type
   */
  private async _loadDataFromFile(
    tableName: string,
    fileContent: Blob,
    fileType: SupportedFileType,
  ): Promise<void> {
    if (null === this.connection) {
      throw new Error("Connection is null");
    }
    if (null === this.database) {
      throw new Error("Database is null");
    }
    const fileName = `file_${tableName}`;

    switch (fileType) {
      case "csv":
        await this.database.registerFileText(
          fileName,
          await fileContent.text(),
        );
        await this.connection.query(
          `CREATE OR REPLACE VIEW "${tableName}" AS SELECT * FROM read_csv_auto('${fileName}')`,
        );
        break;
      case "xlsx":
        await this.database.registerFileBuffer(
          fileName,
          new Uint8Array(await fileContent.arrayBuffer()),
        );
        await this.connection.query(
          `CREATE OR REPLACE VIEW "${tableName}" AS SELECT * FROM read_xlsx('${fileName}')`,
        );
        break;
      case "parquet":
        console.log({ fileContent });
        await this.database.registerFileBuffer(
          fileName,
          new Uint8Array(await fileContent.arrayBuffer()),
        );
        await this.connection.query(
          `CREATE OR REPLACE VIEW "${tableName}" AS SELECT * FROM read_parquet('${fileName}')`,
        );
        break;

      case "json":
      case "jsonl":
      case "ndjson":
        await this.database.registerFileText(
          fileName,
          await fileContent.text(),
        );
        if (fileType === "json") {
          await this.connection.query(
            `CREATE OR REPLACE VIEW "${tableName}" AS SELECT * FROM read_json('${fileName}', auto_detect=true)`,
          );
        } else {
          await this.connection.query(
            `CREATE OR REPLACE VIEW "${tableName}" AS SELECT * FROM read_json('${fileName}', format='newline_delimited', auto_detect=true)`,
          );
        }
        break;

      default:
        assertExhaustive(fileType);
    }
  }
}

function assertExhaustive(fileType: never) {
  console.error({ fileType });
  throw new Error(`Unsupported file type`);
}
