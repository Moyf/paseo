import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { load } from "js-yaml";

const root = fileURLToPath(new URL("../", import.meta.url));
const workspace = load(readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8"));

// pnpm patches are the same dependency fixes with package-relative paths.
for (const [packageName, destination] of Object.entries(workspace.patchedDependencies)) {
  const versionSeparator = packageName.lastIndexOf("@");
  const name = packageName.slice(0, versionSeparator);
  const filename = path.basename(destination);
  const source = readFileSync(path.join(root, "patches", filename), "utf8");
  const prefix = `node_modules/${name}/`;
  const converted = source.split(prefix).join("");
  writeFileSync(path.join(root, destination), converted);
}
