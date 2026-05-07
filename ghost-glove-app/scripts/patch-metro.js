// Metro 0.82.5 ships with "./src/*": "./src/*.js" which covers all internal
// src/ paths that @expo/cli imports. No manual patching needed.
// This script is a safety net that adds both with- and without-extension
// forms in case any are missing.

const fs   = require("fs");
const path = require("path");

const METRO_PACKAGES = [
  "metro",
  "metro-cache",
  "metro-config",
  "metro-core",
  "metro-resolver",
  "metro-runtime",
  "metro-source-map",
  "metro-transform-plugins",
  "metro-transform-worker",
];

function walkJs(dir, base) {
  const results = {};
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath  = path.join(base, entry.name);
    if (entry.isDirectory()) {
      Object.assign(results, walkJs(fullPath, relPath));
    } else if (entry.name.endsWith(".js")) {
      const rel      = "./" + relPath.replace(/\\/g, "/");
      const relNoExt = rel.replace(/\.js$/, "");
      results[rel]      = rel;
      results[relNoExt] = rel;
    }
  }
  return results;
}

for (const pkgName of METRO_PACKAGES) {
  const pkgPath = path.resolve(__dirname, `../node_modules/${pkgName}/package.json`);
  if (!fs.existsSync(pkgPath)) continue;

  const pkgDir = path.dirname(pkgPath);
  const srcDir = path.join(pkgDir, "src");
  if (!fs.existsSync(srcDir)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.exports = pkg.exports ?? {};

  const srcExports = walkJs(srcDir, "src");
  let added = 0;
  for (const [key, value] of Object.entries(srcExports)) {
    if (!pkg.exports[key]) {
      pkg.exports[key] = value;
      added++;
    }
  }

  if (added > 0) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log(`[patch-metro] ${pkgName}: added ${added} src/ exports`);
  }
}

console.log("[patch-metro] done");
