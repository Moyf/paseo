import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import type { DaemonServerInfo, WorkspaceDescriptor } from "@/stores/session-store";
import { useSessionStore } from "@/stores/session-store";
import type { SidebarSelectionTarget } from "@/stores/sidebar-selection-store";
import { useSidebarSelectionStore } from "@/stores/sidebar-selection-store";
import { useActiveWorkspaceSelection } from "@/stores/navigation-active-workspace-store";
import { useToast } from "@/contexts/toast-context";
import { useWorkspaceLayoutStore } from "@/stores/workspace-layout-store";
import { buildWorkspaceTabPersistenceKey } from "@/workspace-tabs/model";
import { getHostRuntimeStore } from "@/runtime/host-runtime";
import { confirmRiskyWorktreeArchive } from "@/git/worktree-archive-warning";
import { markWorkspaceUnread } from "@/workspace/mark-unread";
import { archiveWorkspacesOptimistically } from "@/workspace/workspace-archive";
import { redirectIfArchivingActiveWorkspace } from "@/utils/sidebar-workspace-archive-redirect";

/** A selected row resolved against the live session store; `workspace` is null when it is gone. */
export interface SidebarBatchSelectionEntry extends SidebarSelectionTarget {
  workspace: WorkspaceDescriptor | null;
}

type HostFeatureName = "workspacePinning" | "workspaceMarkUnread";

type SessionsSlice = Record<
  string,
  | {
      workspaces?: ReadonlyMap<string, WorkspaceDescriptor>;
      serverInfo?: DaemonServerInfo | null;
    }
  | undefined
>;

function resolveEntries(
  sessions: SessionsSlice,
  targets: readonly SidebarSelectionTarget[],
): SidebarBatchSelectionEntry[] {
  return targets.map((target) => ({
    ...target,
    workspace: sessions[target.serverId]?.workspaces?.get(target.workspaceId) ?? null,
  }));
}

function hostSupports(
  sessions: SessionsSlice,
  serverId: string,
  feature: HostFeatureName,
): boolean {
  return sessions[serverId]?.serverInfo?.features?.[feature] === true;
}

/** A selection entry whose workspace is still live. */
export type ResolvedSidebarBatchEntry = SidebarBatchSelectionEntry & {
  workspace: WorkspaceDescriptor;
};

function isResolved(entry: SidebarBatchSelectionEntry): entry is ResolvedSidebarBatchEntry {
  return entry.workspace !== null;
}

/** Rows whose host can pin and that are not already going away. */
export function selectPinCapableEntries(
  sessions: SessionsSlice,
  entries: readonly SidebarBatchSelectionEntry[],
): ResolvedSidebarBatchEntry[] {
  return entries
    .filter(isResolved)
    .filter(
      (entry) =>
        entry.workspace.archivingAt == null &&
        hostSupports(sessions, entry.serverId, "workspacePinning"),
    );
}

/** Rows that can take a mark-unread: a done workspace on a host with the feature. */
export function selectMarkUnreadEligibleEntries(
  sessions: SessionsSlice,
  entries: readonly SidebarBatchSelectionEntry[],
): ResolvedSidebarBatchEntry[] {
  return entries
    .filter(isResolved)
    .filter(
      (entry) =>
        entry.workspace.status === "done" &&
        hostSupports(sessions, entry.serverId, "workspaceMarkUnread"),
    );
}

/** Rows the batch archive can act on — still present, not already archiving. */
export function selectArchivableEntries(
  entries: readonly SidebarBatchSelectionEntry[],
): ResolvedSidebarBatchEntry[] {
  return entries.filter(isResolved).filter((entry) => entry.workspace.archivingAt == null);
}

function purgeArchivedWorkspaceState(input: { serverId: string; workspaceId: string }): void {
  const workspaceKey = buildWorkspaceTabPersistenceKey(input);
  if (workspaceKey) {
    useWorkspaceLayoutStore.getState().purgeWorkspace(workspaceKey);
  }
}

/**
 * Batch counterparts of the sidebar row actions, written against the multi-selection rather than
 * one workspace. Eligibility is resolved at action time from the live session store, so a row
 * that vanished between menu open and click is skipped instead of failing.
 */
export function useSidebarBatchWorkspaceActions(): {
  pin: (targets: readonly SidebarSelectionTarget[]) => void;
  unpin: (targets: readonly SidebarSelectionTarget[]) => void;
  markUnread: (targets: readonly SidebarSelectionTarget[]) => Promise<void>;
  archive: (targets: readonly SidebarSelectionTarget[]) => Promise<void>;
  clearSelection: () => void;
} {
  const { t } = useTranslation();
  const toast = useToast();
  const activeWorkspaceSelection = useActiveWorkspaceSelection();

  const setPinned = useCallback(
    (targets: readonly SidebarSelectionTarget[], pinned: boolean) => {
      const sessions = useSessionStore.getState().sessions;
      const capable = selectPinCapableEntries(sessions, resolveEntries(sessions, targets));
      if (capable.length === 0) return;
      void (async () => {
        const results = await Promise.allSettled(
          capable.map(async (entry) => {
            const client = getHostRuntimeStore().getClient(entry.serverId);
            if (!client) {
              throw new Error(t("sidebar.workspace.toasts.hostDisconnected"));
            }
            await client.setWorkspacePinned(entry.workspaceId, pinned);
          }),
        );
        const failures = results.filter((result) => result.status === "rejected").length;
        if (failures > 0) {
          toast.error(t("sidebar.workspace.toasts.batchPinFailed", { count: failures }));
        }
        useSidebarSelectionStore.getState().clear();
      })();
    },
    [t, toast],
  );

  const markUnread = useCallback(
    async (targets: readonly SidebarSelectionTarget[]) => {
      const sessions = useSessionStore.getState().sessions;
      const eligible = selectMarkUnreadEligibleEntries(sessions, resolveEntries(sessions, targets));
      if (eligible.length === 0) return;
      const results = await Promise.allSettled(
        eligible.map((entry) => markWorkspaceUnread(entry.serverId, entry.workspaceId)),
      );
      const failures = results.filter((result) => result.status === "rejected").length;
      if (failures > 0) {
        toast.error(t("sidebar.workspace.toasts.batchMarkUnreadFailed", { count: failures }));
      }
      useSidebarSelectionStore.getState().clear();
    },
    [t, toast],
  );

  const archive = useCallback(
    async (targets: readonly SidebarSelectionTarget[]) => {
      const sessions = useSessionStore.getState().sessions;
      const archivable = selectArchivableEntries(resolveEntries(sessions, targets));
      if (archivable.length === 0) return;

      const confirmed: SidebarSelectionTarget[] = [];
      for (const entry of archivable) {
        if (entry.workspace.workspaceKind === "worktree") {
          const shouldArchive = await confirmRiskyWorktreeArchive({
            workspaceName: entry.workspace.name,
            isDirty: entry.workspace.gitRuntime?.isDirty ?? null,
            aheadOfOrigin: entry.workspace.gitRuntime?.aheadOfOrigin ?? null,
            diffStat: entry.workspace.diffStat ?? null,
          });
          if (!shouldArchive) continue;
        }
        confirmed.push({
          serverId: entry.serverId,
          workspaceId: entry.workspaceId,
          workspaceKey: entry.workspaceKey,
        });
      }
      if (confirmed.length === 0) {
        useSidebarSelectionStore.getState().clear();
        return;
      }

      const activeTarget = confirmed.find(
        (target) =>
          activeWorkspaceSelection?.serverId === target.serverId &&
          activeWorkspaceSelection.workspaceId === target.workspaceId,
      );
      if (activeTarget) {
        redirectIfArchivingActiveWorkspace({
          serverId: activeTarget.serverId,
          workspaceId: activeTarget.workspaceId,
          activeWorkspaceSelection,
        });
      }

      const failures = await archiveWorkspacesOptimistically({
        getClient: (serverId) => getHostRuntimeStore().getClient(serverId),
        workspaces: confirmed,
      });
      for (const target of confirmed) {
        purgeArchivedWorkspaceState(target);
      }
      if (failures.length > 0) {
        toast.error(
          t("sidebar.workspace.toasts.batchArchiveFailed", {
            count: failures.length,
            total: confirmed.length,
          }),
        );
      }
      useSidebarSelectionStore.getState().clear();
    },
    [activeWorkspaceSelection, t, toast],
  );

  const clearSelection = useCallback(() => {
    useSidebarSelectionStore.getState().clear();
  }, []);

  return {
    pin: (targets) => setPinned(targets, true),
    unpin: (targets) => setPinned(targets, false),
    markUnread,
    archive,
    clearSelection,
  };
}

/**
 * The selection resolved against live workspace descriptors. The subscription is shallow over
 * the descriptors themselves, so unrelated session churn does not re-render an open menu.
 */
export function useSidebarSelectionEntries(
  targets: readonly SidebarSelectionTarget[],
): SidebarBatchSelectionEntry[] {
  const workspaces = useStoreWithEqualityFn(
    useSessionStore,
    (state) =>
      targets.map(
        (target) => state.sessions[target.serverId]?.workspaces?.get(target.workspaceId) ?? null,
      ),
    shallow,
  );
  return useMemo(
    () => targets.map((target, index) => ({ ...target, workspace: workspaces[index] ?? null })),
    [targets, workspaces],
  );
}

export interface SidebarBatchAffordances {
  count: number;
  /** Pin-capable rows that are currently unpinned — what "Pin" would act on. */
  pinCount: number;
  /** Pin-capable rows that are currently pinned — what "Unpin" would act on. */
  unpinCount: number;
  /** Rows that can take a mark-unread. */
  unreadCount: number;
  /** Rows the archive action can act on. */
  archivableCount: number;
}

/** Pure so the affordance arithmetic is testable without a store. */
export function buildSidebarBatchAffordances(
  sessions: SessionsSlice,
  entries: readonly SidebarBatchSelectionEntry[],
): SidebarBatchAffordances {
  const pinCapable = selectPinCapableEntries(sessions, entries);
  const unpinned = pinCapable.filter((entry) => entry.workspace.pinnedAt == null);
  return {
    count: entries.length,
    pinCount: unpinned.length,
    unpinCount: pinCapable.length - unpinned.length,
    unreadCount: selectMarkUnreadEligibleEntries(sessions, entries).length,
    archivableCount: selectArchivableEntries(entries).length,
  };
}

/**
 * What the batch menu can offer for the current selection. Mounted inside an open menu, so the
 * shallow session-store subscription does not sit under every row.
 */
export function useSidebarBatchAffordances(
  targets: readonly SidebarSelectionTarget[],
): SidebarBatchAffordances {
  const entries = useSidebarSelectionEntries(targets);
  const serverInfos = useStoreWithEqualityFn(
    useSessionStore,
    (state) => targets.map((target) => state.sessions[target.serverId]?.serverInfo ?? null),
    shallow,
  );
  return useMemo(
    () =>
      buildSidebarBatchAffordances(
        Object.fromEntries(
          targets.map((target, index) => [target.serverId, { serverInfo: serverInfos[index] }]),
        ),
        entries,
      ),
    [entries, serverInfos, targets],
  );
}
