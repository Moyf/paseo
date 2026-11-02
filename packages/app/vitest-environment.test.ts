import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const appDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = path.resolve(appDir, "../..");
const require = createRequire(import.meta.url);
const vitestEntry = path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs");
const tsgoEntry = path.join(
  path.dirname(require.resolve("@typescript/native-preview/package.json")),
  "bin/tsgo.js",
);

it("loads the shipped Markdown WASM through the app's Vite transform", () => {
  const fixtureDir = mkdtempSync(path.join(appDir, "src/.vitest-markdown-wasm-"));
  const fixture = path.join(fixtureDir, "wasm.test.ts");
  try {
    writeFileSync(
      fixture,
      `import { expect, it } from "vitest";
import { parseMarkdown } from "react-native-enriched-markdown/lib/module/web/parseMarkdown.js";
it("parses with the shipped WASM", async () => {
  const tree = await parseMarkdown("**Obsidian：**决定 ==高亮==", { latexMath: false, highlight: true });
  expect(tree.children[0].children).toEqual([
    { type: "Strong", children: [{ type: "Text", content: "Obsidian：" }] },
    { type: "Text", content: "决定 " },
    { type: "Highlight", children: [{ type: "Text", content: "高亮" }] },
  ]);
});
`,
    );
    const result = spawnSync(
      process.execPath,
      [vitestEntry, "run", "--project", "unit", fixture, "--bail=1"],
      { cwd: appDir, encoding: "utf8", timeout: 30_000 },
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
}, 40_000);

it("the test configuration typechecks with Expo's generated environment declaration", () => {
  const fixtureDir = mkdtempSync(path.join(appDir, ".vitest-expo-env-"));
  try {
    writeFileSync(path.join(fixtureDir, "expo-env.d.ts"), '/// <reference types="expo/types" />\n');
    writeFileSync(
      path.join(fixtureDir, "tsconfig.json"),
      JSON.stringify({
        extends: "../tsconfig.json",
        files: ["../vitest.config.ts", "expo-env.d.ts"],
        include: [],
      }),
    );
    const result = spawnSync(
      process.execPath,
      [tsgoEntry, "--noEmit", "--project", path.join(fixtureDir, "tsconfig.json")],
      { cwd: appDir, encoding: "utf8", timeout: 30_000 },
    );

    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
}, 40_000);

it.each([
  {
    name: "root",
    cwd: rootDir,
    args: ["packages/app/src/screens/workspace/use-mounted-tab-set.test.ts"],
  },
  {
    name: "app",
    cwd: appDir,
    args: ["--project", "unit", "src/screens/workspace/use-mounted-tab-set.test.ts"],
  },
])(
  "$name tests can render React when the shell exports NODE_ENV=production",
  ({ cwd, args }) => {
    const result = spawnSync(process.execPath, [vitestEntry, "run", ...args], {
      cwd,
      env: { ...process.env, NODE_ENV: "production" },
      encoding: "utf8",
      timeout: 30_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
  },
  40_000,
);
