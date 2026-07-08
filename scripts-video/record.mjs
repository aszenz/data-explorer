import { chromium } from "playwright";
import { writeFileSync, mkdirSync, renameSync } from "fs";

const BASE = "http://localhost:5173";
const OUT = "/home/user/data-explorer/scripts-video/out";
mkdirSync(OUT, { recursive: true });

// Narration clip durations (seconds), measured from the generated WAVs.
const DUR = {
  home: 16.284,
  schema: 14.216,
  explorer: 22.672,
  notebook: 10.676,
  outro: 10.788,
};
const LEAD = 0.7; // silence before a clip starts within its scene
const TRAIL = 1.2; // silence after a clip before moving on
const q = (s) => encodeURIComponent(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Smoothly scroll the window to a target Y over `ms`.
async function smoothScroll(page, toY, ms) {
  await page.evaluate(
    async ([toY, ms]) => {
      const start = window.scrollY;
      const delta = toY - start;
      const t0 = performance.now();
      await new Promise((resolve) => {
        function step(now) {
          const p = Math.min(1, (now - t0) / ms);
          const eased = 0.5 - Math.cos(p * Math.PI) / 2; // ease in-out
          window.scrollTo(0, start + delta * eased);
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      });
    },
    [toY, ms],
  );
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const offsets = [];
const t0 = Date.now();
const mark = (name) => {
  const startMs = Date.now() - t0 + LEAD * 1000;
  offsets.push({ name, startMs: Math.round(startMs) });
};

async function waitReady(timeout = 60000) {
  await page.waitForLoadState("networkidle", { timeout });
  // Wait until the app has rendered something beyond the loader.
  await page
    .waitForFunction(
      () => {
        const t = document.body.innerText || "";
        return t.length > 40 && !t.includes("Loading");
      },
      { timeout },
    )
    .catch(() => {});
}

// ---- Scene 1: Home ----
await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
await waitReady();
await sleep(600);
mark("home");
await sleep(LEAD * 1000);
await sleep(DUR.home * 1000); // hold on the hero + catalog
await sleep(TRAIL * 1000);

// ---- Scene 2: Model schema (sample_data) ----
await page.goto(BASE + "/#/model/sample_data", { waitUntil: "networkidle", timeout: 60000 });
await waitReady();
await sleep(800);
mark("schema");
await sleep(LEAD * 1000);
await sleep(5200); // show Data Sources (dimensions / measures / views)
await page.getByText("Named Queries", { exact: false }).first().click().catch(() => {});
await sleep(4200); // show named queries
await page.getByText("Malloy Definition", { exact: false }).first().click().catch(() => {});
await sleep(DUR.schema * 1000 - 5200 - 4200); // remainder on the definition
await sleep(TRAIL * 1000);

// ---- Scene 3: Explorer dashboard (sample_data / employees / overview) ----
await page.goto(
  BASE + `/#/model/sample_data/explorer/employees?query=${q("run: employees -> overview")}&run=true`,
  { waitUntil: "networkidle", timeout: 60000 },
);
await waitReady();
await page.waitForSelector("svg", { timeout: 30000 }).catch(() => {});
await sleep(1500);
mark("explorer");
await sleep(LEAD * 1000);
await sleep(9000); // admire the dashboard: KPI cards + bar charts
await page.getByText("Malloy", { exact: true }).first().click().catch(() => {});
await sleep(4500); // show the Malloy query
await page.getByText("SQL", { exact: true }).first().click().catch(() => {});
await sleep(4500); // show generated SQL
await page.getByText("Results", { exact: true }).first().click().catch(() => {});
await sleep(DUR.explorer * 1000 - 9000 - 4500 - 4500); // back to results
await sleep(TRAIL * 1000);

// ---- Scene 4: Data notebook (Sample Data) ----
await page.goto(BASE + "/#/notebook/Sample%20Data", { waitUntil: "networkidle", timeout: 60000 });
await waitReady();
await page.waitForSelector("svg", { timeout: 30000 }).catch(() => {});
await sleep(1200);
mark("notebook");
await sleep(LEAD * 1000);
const maxY = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
await sleep(1500);
await smoothScroll(page, Math.min(maxY, 1600), (DUR.notebook - 3) * 1000);
await sleep(1500);
await sleep(TRAIL * 1000);

// ---- Scene 5: Outro (home) ----
// Navigate home via in-app hash routing (goto "/" only clears the hash on the
// same document and does not reliably re-render the router).
await page.evaluate(() => {
  window.location.hash = "#/";
});
await page.waitForFunction(
  () => (document.body.innerText || "").includes("Data Models"),
  { timeout: 30000 },
).catch(() => {});
await waitReady();
await smoothScroll(page, 0, 400);
await sleep(800);
mark("outro");
await sleep(LEAD * 1000);
await sleep(DUR.outro * 1000);
await sleep(TRAIL * 1000 + 400);

const totalMs = Date.now() - t0;
const videoPath = await page.video().path();
await context.close();
await browser.close();

const finalVideo = `${OUT}/raw.webm`;
renameSync(videoPath, finalVideo);
writeFileSync(
  `${OUT}/offsets.json`,
  JSON.stringify({ totalMs, offsets, durations: DUR }, null, 2),
);
console.log("video:", finalVideo);
console.log("totalMs:", totalMs);
console.log("offsets:", JSON.stringify(offsets));
