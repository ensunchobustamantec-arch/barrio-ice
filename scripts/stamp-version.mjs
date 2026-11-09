import { existsSync, readFileSync, writeFileSync } from "node:fs";

const id = (process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())).slice(
  0,
  10,
);

for (const file of ["sw.js", "admin/sw.js"]) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8");
  if (!source.includes("__BUILD_ID__")) {
    throw new Error(`${file}: falta el marcador __BUILD_ID__`);
  }
  writeFileSync(file, source.replaceAll("__BUILD_ID__", id));
}

console.log("BUILD_ID =", id);
const menuFile = "shared/menu-schema.js";
const key = process.env.BARRIO_APP_CHECK_SITE_KEY?.trim() || "";
writeFileSync(menuFile, readFileSync(menuFile, "utf8").replace(
  /const APP_CHECK_SITE_KEY = "[^"]*";/,
  () => "const APP_CHECK_SITE_KEY = " + JSON.stringify(key) + ";",
));
