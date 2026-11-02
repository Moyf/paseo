import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isMainModule } from "./is-main-module.mjs";

export function checkForkRelease({
  cwd = process.cwd(),
  upstreamMainRef = "upstream/main",
  stableRef,
} = {}) {
  const { version } = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8"));
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Moy release requires a stable base version, received ${version}`);
  }
  const baseline = stableRef ?? `refs/paseo/upstream/stable/v${version}`;
  function git(args) {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  }
  const upstreamPackage = JSON.parse(git(["show", `${baseline}:package.json`]));
  if (upstreamPackage.version !== version) {
    throw new Error(
      `Moy version ${version} does not match upstream baseline ${upstreamPackage.version}`,
    );
  }
  git(["merge-base", "--is-ancestor", baseline, "HEAD"]);
  const upstreamCommits = new Set(git(["rev-list", upstreamMainRef, `^${baseline}`]).split("\n"));
  const forkCommits = git(["rev-list", "HEAD", `^${baseline}`]).split("\n");
  const unreleased = forkCommits.filter((commit) => commit && upstreamCommits.has(commit));
  if (unreleased.length > 0) {
    const details = unreleased.map((commit) => git(["show", "-s", "--format=%h %s", commit]));
    throw new Error(`Moy release contains unreleased upstream commits:\n${details.join("\n")}`);
  }
  return version;
}

if (isMainModule(import.meta.url)) {
  try {
    const version = checkForkRelease();
    console.log(`Moy release baseline verified: v${version}; no unreleased upstream/main commits`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
