import { readFileSync } from "node:fs";
import { isMainModule } from "./is-main-module.mjs";

export function verifyForkReleaseAssets({ version, assets }) {
  const requiredSuffixes = [
    `${version}-windows-x64.exe`,
    `${version}-windows-x64.zip`,
    `${version}-macos-arm64.dmg`,
    `${version}-macos-arm64.zip`,
  ];
  const missing = requiredSuffixes.filter(
    (suffix) =>
      !assets.some(
        (asset) => asset.name.endsWith(suffix) && asset.size > 0 && asset.state === "uploaded",
      ),
  );
  if (missing.length > 0) {
    throw new Error(`Moy release is missing completed installers: ${missing.join(", ")}`);
  }
}

if (isMainModule(import.meta.url)) {
  try {
    const [version, manifest] = process.argv.slice(2);
    if (!version || !manifest)
      throw new Error(
        "Usage: node scripts/verify-fork-release-assets.mjs <version> <manifest.json>",
      );
    const { assets } = JSON.parse(readFileSync(manifest, "utf8"));
    verifyForkReleaseAssets({ version, assets });
    console.log("Moy release has Windows x64 EXE/ZIP and macOS arm64 DMG/ZIP");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
