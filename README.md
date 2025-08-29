# Data explorer

Explore semantic data models written in malloy.

A static site for sharing data explorations.

## Demo Examples

- [Trading Model](https://aszenz.github.io/data-explorer/#/model/trading)

## Publishing your own Malloy models

1. Clone the repo
2. Look at the `models` directory, it contains example models and data files like [trading model](https://github.com/aszenz/data-explorer/blob/master/models%2Ftrading.malloy) which uses data from two csv files [orders](https://raw.githubusercontent.com/aszenz/data-explorer/refs/heads/master/models/data/orders.csv) and [contracts](https://raw.githubusercontent.com/aszenz/data-explorer/refs/heads/master/models/data/contracts.csv), you can add your own models and their data files here.
3. Run `npm run start` to build and run the site.
4. Copy `dist` folder to any static web hosting like GH Pages.

## Using these awesome technologies

- [Malloy Language](https://github.com/malloydata/malloy)
- [Malloy Explorer](https://github.com/malloydata/malloy-explorer)
- [DuckDB WASM](https://github.com/duckdb/duckdb-wasm)
