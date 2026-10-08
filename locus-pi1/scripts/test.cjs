const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
function findTests(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? findTests(filename) : /\.test\.(ts|mjs)$/.test(entry.name) ? [filename] : [];
  });
}
const tests = findTests(path.join(root, "src")).sort();
if (!tests.length) {
  console.error("Nenhum teste encontrado.");
  process.exit(1);
}
let failed = false;
// Run each suite in its own process to isolate Electron mocks and in-memory databases.
for (const filename of tests) {
  console.log(`\n${path.relative(root, filename)}`);
  const result = spawnSync(process.execPath, [
    "--require", path.join(__dirname, "register-typescript.cjs"),
    "-e", filename.endsWith(".mjs")
      ? 'import(require("node:url").pathToFileURL(process.argv[1]).href).catch(error => { console.error(error); process.exitCode = 1; })'
      : "require(process.argv[1])", filename,
  ], { cwd: root, stdio: "inherit" });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
