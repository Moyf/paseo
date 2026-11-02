import { z } from "zod";
import ledger from "../../../FORK_FEATURES.json";

export const FORK_EDITION = "Moy 版";

export const FORK_REPO_URL = "https://github.com/Moyf/paseo";

export interface ForkBuildMeta {
  readonly version: string | null;
  readonly builtAt: string | null;
  readonly commit: string | null;
  readonly commitTime: string | null;
}

export const ForkFeatureSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  addedOn: z.iso.date(),
  branch: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1),
  forkStatus: z.enum(["in-development", "merged", "regressed", "retired"]),
  mergedCommit: z
    .string()
    .regex(/^[a-f0-9]{7,40}$/)
    .nullable(),
  status: z.enum(["pr-open", "pr-merged", "pr-closed", "local-only"]),
  prUrl: z.url().nullable(),
  auditedOn: z.iso.date(),
  auditNotes: z.string().min(1),
});

export const ForkFeatureLedgerSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    features: z.array(ForkFeatureSchema).min(1),
  })
  .superRefine(({ features }, context) => {
    const ids = new Set<string>();
    for (const [index, feature] of features.entries()) {
      if (ids.has(feature.id))
        context.addIssue({
          code: "custom",
          path: ["features", index, "id"],
          message: "Duplicate feature id",
        });
      ids.add(feature.id);
      const hasMergedImplementation =
        feature.forkStatus === "merged" || feature.forkStatus === "regressed";
      if (hasMergedImplementation && feature.mergedCommit === null)
        context.addIssue({
          code: "custom",
          path: ["features", index, "mergedCommit"],
          message: "Merged and regressed features require a merge commit",
        });
      if (feature.status !== "local-only" && feature.prUrl === null)
        context.addIssue({
          code: "custom",
          path: ["features", index, "prUrl"],
          message: "Upstream PR status requires a PR URL",
        });
    }
  });

export type ForkFeature = z.infer<typeof ForkFeatureSchema>;
export type ForkFeatureStatus = ForkFeature["status"];
export const FORK_FEATURES: readonly ForkFeature[] = ForkFeatureLedgerSchema.parse(ledger).features;

export const FORK_MERGE_STATUS_TEXT: Record<ForkFeature["forkStatus"], string> = {
  "in-development": "开发中 · 未合入 Moy",
  merged: "已合入 Moy",
  regressed: "已合入 · 存在回退",
  retired: "已退役",
};

export const FORK_STATUS_TEXT: Record<ForkFeatureStatus, string> = {
  "pr-open": "待上游合并",
  "pr-merged": "已进入上游",
  "pr-closed": "PR 已关闭",
  "local-only": "仅本地",
};

export function forkFeaturePrNumber(feature: ForkFeature): number | null {
  const match = feature.prUrl?.match(/\/pull\/(\d+)$/);
  return match ? Number(match[1]) : null;
}
