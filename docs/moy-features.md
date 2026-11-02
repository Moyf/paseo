# Moy feature ledger

[`FORK_FEATURES.json`](../FORK_FEATURES.json) is the feature ledger and the About
page's data source. Edit that file, not a second list in the UI. It ships with the
client; an installed app shows the ledger from its own build, without a network
request.

## Maintain a feature

- Create an entry when starting a fork feature. Give it a stable `id`, its first
  implementation date in `addedOn`, source `branch`, `label` and `detail`.
- Set `forkStatus` to `in-development` until the reviewed implementation enters
  `local/all-feats`. Only then set `merged` and record the actual feature or merge
  commit in `mergedCommit`. A rebased or cherry-picked branch may have different
  commit IDs; verify the implementation, not ancestry alone.
- `status` and `prUrl` describe the upstream PR independently. `pr-open` does not
  mean absent from Moy; `pr-closed` does not mean removed from Moy. Use
  `pr-merged` only after verifying upstream accepted the PR.
- After each upstream/feature merge, inspect every merged feature's UI entry
  points and implementations. Record `auditedOn` and factual `auditNotes`.
  Mark lost or partly disconnected functionality `regressed`; keep the record
  until restored. Mark deliberately superseded features `retired`, with a reason.
- Update this ledger and `FORK_CHANGELOG.md` in the same delivery. Run the existing
  `fork-info.test.ts` suite and the feature's own regression tests. Do not promise
  a feature was preserved without checking it.

## 2026-11-02 audit

Compared the Moy release branch at `9c66e7f1e`, feature branch tips, feature
commits and live callers. The ledger records per-feature findings. Reveal's
crosshair and title context-menu entry points were deleted by `ff7a2074e`;
the command-center entry and sidebar reveal controller survived. The restored
entry points have a real-browser regression in `compact-workspace-header.spec.ts`.

The remaining listed features retain their implementations and callers. This is
not a claim that every platform was manually tested. Local and upstream branch
history include equivalent commits with different IDs, so a failed
`merge-base --is-ancestor` check alone cannot establish a missing feature.

The CJK Markdown work is still on its feature branch, not the release branch.
The generated Expo routes exposed an existing Settings route type error. Removing
the two broad `string` return annotations preserves the route builders' literal
types; the full typecheck passes with that correction.

Reveal previously had no shortcut registration. It now has a configurable,
default-unassigned entry in Settings → Shortcuts, sharing the workspace action
with Command Center and the header button.
