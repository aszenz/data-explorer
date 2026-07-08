import { chromium } from "playwright";
import { mkdirSync } from "fs";
const BASE = "http://localhost:5173";
const shots = "/tmp/probe";
mkdirSync(shots, { recursive: true });
const q = (s) => encodeURIComponent(s);
const routes = [
  ["exp-overview", `/#/model/sample_data/explorer/employees?query=${q("run: employees -> overview")}&run=true`],
  ["exp-bydept", `/#/model/sample_data/explorer/employees?query=${q("run: employees -> by_department")}&run=true`],
  ["exp-hier", `/#/model/sample_data/explorer/employees?query=${q("run: employees -> department_hierarchy")}&run=true`],
  ["nb-sample", "/#/notebook/Sample%20Data"],
  ["nb-kids", "/#/notebook/Kids%20Screen%20Time"],
];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [name, route] of routes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(12000);
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 100));
    const svgCount = await page.evaluate(() => document.querySelectorAll("svg").length);
    await page.screenshot({ path: `${shots}/${name}.png`, fullPage: false });
    console.log(bodyText.startsWith("Error") ? "ERROR" : "OK", name, "svgs=" + svgCount, bodyText.startsWith("Error") ? "::" + bodyText.replace(/\n/g," ") : "");
  } catch (e) { console.log("FAIL", name, e.message); }
  await page.close();
}
await browser.close();
