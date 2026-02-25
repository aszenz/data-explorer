import type * as malloy from "@malloydata/malloy";
import * as duckdb from "@duckdb/duckdb-wasm";
import { DuckDBWASMConnection } from "@malloydata/db-duckdb/wasm";
import duckdbWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdbWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";

/**
 * Map of dataset file paths to their serving URLs.
 * e.g. { "data/orders.csv": "/assets/orders-abc123.csv" }
 */
export type DataFileURLs = Record<string, string>;

export default class DuckDBConnection extends DuckDBWASMConnection {
  private dataFileURLs: DataFileURLs;
  private registrationPromise: Promise<void> | null = null;

  constructor(
    dataFileURLs: DataFileURLs,
    duckdbWasmOptions: { name: string; additionalExtensions?: string[] },
    queryOptions: malloy.QueryOptionsReader,
  ) {
    super({ ...duckdbWasmOptions, motherDuckToken: undefined }, queryOptions);
    this.dataFileURLs = dataFileURLs;
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
   * Override the runDuckDBQuery method to ensure files are registered
   * before any query execution.
   */
  protected override async runDuckDBQuery(
    sql: string,
    abortSignal?: AbortSignal,
  ): Promise<{ rows: malloy.QueryRecord[]; totalRows: number }> {
    if (null === this.connection) {
      throw new Error("Connection is null");
    }
    console.log({ sql });

    await this._registerAllFiles();

    console.time("Running query");
    const result = await super.runDuckDBQuery(sql, abortSignal);
    console.timeEnd("Running query");
    return result;
  }

  /**
   * Register all known data files as URLs in DuckDB's virtual filesystem.
   * DuckDB fetches them on demand when a query needs them.
   * This supports both direct references (data/orders.csv) and
   * glob patterns (data/serverlogs/*.csv) natively via DuckDB-WASM's
   * _files Map prefix-matching (no httpfs extension needed for this).
   *
   * httpfs is loaded because Malloy-generated SQL may reference external
   * URLs directly (e.g. https://...) which requires the extension for
   * URL scheme recognition by DuckDB's SQL parser.
   */
  private _registerAllFiles(): Promise<void> {
    this.registrationPromise ??= this._doRegisterAllFiles();
    return this.registrationPromise;
  }

  private async _doRegisterAllFiles(): Promise<void> {
    if (null === this.database) {
      throw new Error("Database is null");
    }
    if (null === this.connection) {
      throw new Error("Connection is null");
    }
    const db = this.database;

    await this.connection.query("install httpfs");
    await this.connection.query("load httpfs");

    const entries = Object.entries(this.dataFileURLs);
    console.log(`Registering ${entries.length.toString()} data file URLs`);

    await Promise.all(
      entries.map(([name, url]) => {
        // directIO enables range-request reading — beneficial for Parquet
        // (only metadata + needed row groups are fetched). For CSV/JSON/XLSX
        // the full file is read sequentially anyway so buffering is cheaper.
        const directIO = name.endsWith(".parquet");
        return db.registerFileURL(
          name,
          url,
          duckdb.DuckDBDataProtocol.HTTP,
          directIO,
        );
      }),
    );
  }
}
