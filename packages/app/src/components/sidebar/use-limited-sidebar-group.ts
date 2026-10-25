import { useCallback, useEffect, useMemo, useState } from "react";
import { useSidebarRevealStore } from "@/components/sidebar/sidebar-reveal-store";
import {
  selectSidebarGroupVisibility,
  type SidebarGroupVisibilityPolicy,
} from "./sidebar-group-visibility";

const PINNED_POLICY = { kind: "pinned" } as const;

/**
 * Sidebar groups hide their tail behind a "show more" row. A reveal request for a workspace past
 * the window expands the group once, so "Reveal in sidebar" can reach row 21+ without the user
 * enlarging the group first.
 */
export function useLimitedSidebarGroup<T extends { workspaceKey: string }>(
  items: readonly T[],
  policy: SidebarGroupVisibilityPolicy<T> = PINNED_POLICY,
) {
  const [expanded, setExpanded] = useState(false);
  const [revealExpanded, setRevealExpanded] = useState(false);
  const revealRequest = useSidebarRevealStore((state) => state.request);
  useEffect(() => {
    if (!revealRequest || revealExpanded) return;
    const inGroup = items.some((item) => item.workspaceKey === revealRequest.workspaceKey);
    const shownWhenCollapsed = selectSidebarGroupVisibility(items, false, policy).visibleItems;
    const hiddenByWindow =
      inGroup &&
      !shownWhenCollapsed.some((item) => item.workspaceKey === revealRequest.workspaceKey);
    if (hiddenByWindow) {
      setRevealExpanded(true);
    }
  }, [items, policy, revealExpanded, revealRequest]);
  const visibility = useMemo(
    () => selectSidebarGroupVisibility(items, expanded || revealExpanded, policy),
    [expanded, items, policy, revealExpanded],
  );
  const toggleExpanded = useCallback(() => setExpanded((current) => !current), []);

  return { ...visibility, expanded, toggleExpanded };
}
