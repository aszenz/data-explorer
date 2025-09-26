# Data explorer

Explore semantic data models written in malloy.

A static site for sharing data explorations.

## Demo Examples

### Try exploring these data models:

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

### Try viewing these data notebooks:

- [Super Store](https://aszenz.github.io/data-explorer/#/notebook/SuperStore?showCode)

A notebook is a sequence of markdown and Malloy results that are rendered together in a single page to explain data.

## Publishing your own Malloy models and notebooks

1. Clone the repo `git clone https://github.com/aszenz/data-explorer.git`
2. Look at the `models` directory, it contains example models, notebooks and data files like [trading model](https://github.com/aszenz/data-explorer/blob/master/models%2Ftrading.malloy) which uses data from two csv files [orders](https://raw.githubusercontent.com/aszenz/data-explorer/refs/heads/master/models/data/orders.csv) and [contracts](https://raw.githubusercontent.com/aszenz/data-explorer/refs/heads/master/models/data/contracts.csv), you can add your own models, notebooks and their data files here.
3. Run `npm run start` to build and run the site locally at `http://localhost:3000`.
4. Deploy your site by copying the generated `dist` folder to any static web hosting service (like GitHub Pages, Netlify, or Vercel) or serve it using any HTTP server.

> [!WARNING]
> The built `dist/index.html` file cannot be opened directly in the browser using the `file://` protocol. You must serve it through a local web server. Navigate to the `dist` directory and run one of these commands:
>
> - `python -m http.server 8000` (then visit http://localhost:8000)
> - `npx serve -s . -p 8000` (then visit http://localhost:8000)

> [!NOTE]
> To host the site under a subpath (commonly used for GitHub Pages), add the `BASE_PUBLIC_PATH` environment variable when building the site.
>
> For example, to host under `https://yourusername.github.io/your-repo-name/` run:
> `BASE_PUBLIC_PATH=/your-repo-name/ npm run build`
>
> Then deploy the contents of the `dist` folder to your GitHub Pages.
> You can also look at this [Github Actions File](.github/workflows/ci_cd.yml) for an example of deploying to GitHub Pages.

> [!TIP]
> Models can also reference data from external URLs, like the [Super Store model](https://github.com/aszenz/data-explorer/blob/master/models%2Fsuperstore.malloy) which uses data from huggingface.

## Using these awesome technologies

- [Malloy Language](https://github.com/malloydata/malloy)
- [Malloy Explorer](https://github.com/malloydata/malloy-explorer)
- [DuckDB WASM](https://github.com/duckdb/duckdb-wasm)
