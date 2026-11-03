import { useCallback, useEffect, useMemo, useState } from "react";
import { useSidebarRevealStore } from "@/components/sidebar/sidebar-reveal-store";
import {
  selectSidebarGroupVisibility,
  type SidebarGroupItem,
  type SidebarGroupVisibility,
  type SidebarGroupVisibilityPolicy,
} from "./sidebar-group-visibility";
import type { ActiveWorkspaceSelection } from "@/stores/last-workspace-selection";

const PINNED_POLICY = { kind: "pinned" } as const;

interface LimitedSidebarGroupInput<T> {
  items: readonly T[];
  selection: ActiveWorkspaceSelection | null;
  policy?: SidebarGroupVisibilityPolicy<T>;
}

export function useLimitedSidebarGroup<T extends SidebarGroupItem & { workspaceKey: string }>({
  items,
  selection,
  policy = PINNED_POLICY,
}: LimitedSidebarGroupInput<T>): SidebarGroupVisibility<T> & {
  expanded: boolean;
  toggleExpanded: () => void;
} {
  const [expanded, setExpanded] = useState(false);
  const [revealExpanded, setRevealExpanded] = useState(false);
  const revealRequest = useSidebarRevealStore((state) => state.request);
  useEffect(() => {
    if (!revealRequest || revealExpanded) return;
    const inGroup = items.some((item) => item.workspaceKey === revealRequest.workspaceKey);
    // A reveal request for a workspace past the "show more" window expands the group once,
    // so "Reveal in sidebar" can reach row 21+ without the user enlarging the group first.
    const shownWhenCollapsed = selectSidebarGroupVisibility({
      items,
      expanded: false,
      policy,
      selection,
    }).visibleItems;
    const hiddenByWindow =
      inGroup &&
      !shownWhenCollapsed.some((item) => item.workspaceKey === revealRequest.workspaceKey);
    if (hiddenByWindow) {
      setRevealExpanded(true);
    }
  }, [items, policy, selection, revealExpanded, revealRequest]);
  const visibility = useMemo(
    () =>
      selectSidebarGroupVisibility({
        items,
        expanded: expanded || revealExpanded,
        policy,
        selection,
      }),
    [expanded, items, policy, revealExpanded, selection],
  );
  const toggleExpanded = useCallback(() => setExpanded((current) => !current), []);

  return { ...visibility, expanded, toggleExpanded };
}
