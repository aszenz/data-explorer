import * as malloy from "@malloydata/malloy";
import { DuckDBWASMConnection } from "@malloydata/db-duckdb/wasm";

export class DuckDBConnection extends DuckDBWASMConnection {
  /**
   * Override the runDuckDBQuery method to load the required tables from the server
   */
  protected async runDuckDBQuery(
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
    const alreadyLoadedTables = (await connection.query("SHOW TABLES"))
      .toArray()
      .map((row: { [columnName: string]: string }) => Object.values(row)[0]);
    // TODO: Don't load the full table for describe queries
    // Describe queries are used to load the schema of the table
    await Promise.all(
      tablesRequiredForQueryExecution
        .filter((table) => !alreadyLoadedTables.includes(table))
        .map((table) =>
          fetch(this._getTableUrl(table), { signal: abortSignal })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Failed to fetch data for the table: ${table}`);
              }
              return response.text();
            })
            .then((text) =>
              this.database?.registerFileText(`${table}_file`, text),
            )
            .then(() =>
              connection.insertCSVFromPath(`${table}_file`, {
                name: table,
                header: true,
                detect: true,
              }),
            ),
        ),
    );
    return super.runDuckDBQuery(sql, abortSignal);
  }

  private _getTableUrl(tableName: string): string {
    const baseUrl = import.meta.env.BASE_URL;
    return new URL(
      `${baseUrl}data/${tableName}.csv`,
      window.location.origin,
    ).toString();
  }
}
