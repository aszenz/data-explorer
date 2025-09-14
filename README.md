# Data explorer

Explore semantic data models written in malloy.

A static site for sharing data explorations.

## Demo Examples

Try exploring these models:

- [Sales Orders](https://aszenz.github.io/data-explorer/#/model/sales_orders)

On opening, a schema page is shown with views, dimensions and
measures associated with the model sources.

Clicking on any schema item
opens up Malloy Explorer
with a pre-defined query to see
the data for that item.

All interactions within the
explorer are saved to the url so
sharing a particular query/view
of the model is as easy as
sharing a link.

## Publishing your own Malloy models

1. Clone the repo `git clone https://github.com/aszenz/data-explorer.git`
2. Look at the `models` directory, it contains example models and data files like [trading model](https://github.com/aszenz/data-explorer/blob/master/models%2Ftrading.malloy) which uses data from two csv files [orders](https://raw.githubusercontent.com/aszenz/data-explorer/refs/heads/master/models/data/orders.csv) and [contracts](https://raw.githubusercontent.com/aszenz/data-explorer/refs/heads/master/models/data/contracts.csv), you can add your own models and their data files here.
3. Run `npm run start` to build and run the site on `http://localhost:3000`.
4. Copy `dist` folder to any static web hosting like GH Pages or serve using any http server

> [!WARNING]
> The generated `dist/index.html` file cannot be opened directly in the browser using the `file://` protocol. You must serve it through a local web server. Navigate to the `dist` directory and run one of these commands:
> - `python -m http.server 8000` (then visit http://localhost:8000)
> - `npx serve -s . -p 8000` (then visit http://localhost:8000)

## Using these awesome technologies

- [Malloy Language](https://github.com/malloydata/malloy)
- [Malloy Explorer](https://github.com/malloydata/malloy-explorer)
- [DuckDB WASM](https://github.com/duckdb/duckdb-wasm)
