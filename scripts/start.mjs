import { spawnSync } from "node:child_process";

process.env["SITE_URL"] ??= "http://localhost:3000";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

for (const args of [
  ["run", "build"],
  ["run", "preview"],
]) {
  const result = spawnSync(npm, args, {
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
