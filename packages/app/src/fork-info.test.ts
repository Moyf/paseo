import { describe, expect, it } from "vitest";
import ledger from "../../../FORK_FEATURES.json";
import { FORK_FEATURES, ForkFeatureLedgerSchema, forkFeaturePrNumber } from "./fork-info";

describe("Moy feature ledger", () => {
  it("About consumes the project ledger without a second feature list", () => {
    expect(FORK_FEATURES).toEqual(ledger.features);
    expect(FORK_FEATURES.find((feature) => feature.id === "sidebar-reveal")?.branch).toBe(
      "add-reveal-current-workspace-sidebar",
    );
  });

  it("distinguishes merged Moy functionality from upstream PR status", () => {
    const feature = FORK_FEATURES.find((entry) => entry.id === "assistant-file-links");
    expect(feature?.forkStatus).toBe("merged");
    expect(feature?.status).toBe("pr-open");
    expect(feature && forkFeaturePrNumber(feature)).toBe(6420);
  });

  it("accepts development, merged, regressed and retired states independently of upstream", () => {
    for (const forkStatus of ["in-development", "merged", "regressed", "retired"] as const) {
      const result = ForkFeatureLedgerSchema.parse({
        schemaVersion: 1,
        features: [{ ...ledger.features[0], forkStatus }],
      });
      expect(result.features[0].forkStatus).toBe(forkStatus);
      expect(result.features[0].status).toBe("local-only");
    }
  });

  it("refuses duplicate feature IDs", () => {
    expect(() =>
      ForkFeatureLedgerSchema.parse({
        schemaVersion: 1,
        features: [ledger.features[0], ledger.features[0]],
      }),
    ).toThrow("Duplicate feature id");
  });

  it("refuses merged records without their commit", () => {
    expect(() =>
      ForkFeatureLedgerSchema.parse({
        schemaVersion: 1,
        features: [{ ...ledger.features[0], forkStatus: "merged", mergedCommit: null }],
      }),
    ).toThrow("require a merge commit");
  });

  it("refuses invalid dates and upstream status without a PR", () => {
    expect(() =>
      ForkFeatureLedgerSchema.parse({
        schemaVersion: 1,
        features: [{ ...ledger.features[0], addedOn: "2026-02-30" }],
      }),
    ).toThrow();
    expect(() =>
      ForkFeatureLedgerSchema.parse({
        schemaVersion: 1,
        features: [{ ...ledger.features[0], status: "pr-open" }],
      }),
    ).toThrow("requires a PR URL");
  });
});
