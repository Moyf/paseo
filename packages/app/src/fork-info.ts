export const FORK_EDITION = "Moy 版";

export const FORK_REPO_URL = "https://github.com/Moyf/paseo";

export interface ForkBuildMeta {
  readonly version: string | null;
  readonly builtAt: string | null;
  readonly commit: string | null;
}

export type ForkFeatureStatus = "pr-open" | "pr-merged" | "local-only";

export interface ForkFeature {
  readonly label: string;
  readonly detail: string;
  readonly status: ForkFeatureStatus;
  readonly prUrl: string | null;
}

export const FORK_FEATURES: readonly ForkFeature[] = [
  {
    label: "工作区重命名快捷键",
    detail: "快捷键或双击侧栏工作区即可重命名",
    status: "pr-open",
    prUrl: "https://github.com/getpaseo/paseo/pull/4643",
  },
  {
    label: "终端打开位置",
    detail: "终端可在指定位置打开，带底部 Dock",
    status: "pr-open",
    prUrl: "https://github.com/getpaseo/paseo/pull/5344",
  },
  {
    label: "标题栏拖动修复",
    detail: "滚动内容上方标题栏仍可拖动窗口",
    status: "pr-open",
    prUrl: "https://github.com/getpaseo/paseo/pull/5413",
  },
  {
    label: "Mac 免签名本地构建",
    detail: "关闭 hardenedRuntime，免证书直接运行",
    status: "local-only",
    prUrl: null,
  },
];

export const FORK_STATUS_TEXT: Record<ForkFeatureStatus, string> = {
  "pr-open": "待上游合并",
  "pr-merged": "已进入上游",
  "local-only": "仅本地",
};

export function forkFeaturePrNumber(feature: ForkFeature): number | null {
  const match = feature.prUrl?.match(/\/pull\/(\d+)$/);
  return match ? Number(match[1]) : null;
}
