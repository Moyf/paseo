import { useCallback, useEffect, useMemo, useState } from "react";
import { useSidebarRevealStore } from "@/components/sidebar/sidebar-reveal-store";

const INITIAL_VISIBLE_ITEMS = 20;

/**
 * Sidebar groups hide their tail behind a "show more" row. A reveal request for a workspace past
 * the window expands the group once, so "Reveal in sidebar" can reach row 21+ without the user
 * enlarging the group first.
 */
export function useLimitedSidebarGroup<T extends { workspaceKey: string }>(
  items: readonly T[],
): {
  visibleItems: T[];
  expanded: boolean;
  canToggle: boolean;
  toggleExpanded: () => void;
} {
  const [expanded, setExpanded] = useState(false);
  const [revealExpanded, setRevealExpanded] = useState(false);
  const revealRequest = useSidebarRevealStore((state) => state.request);
  useEffect(() => {
    if (!revealRequest || revealExpanded) return;
    const hiddenByWindow =
      items.length > INITIAL_VISIBLE_ITEMS &&
      items
        .slice(INITIAL_VISIBLE_ITEMS)
        .some((item) => item.workspaceKey === revealRequest.workspaceKey);
    if (hiddenByWindow) {
      setRevealExpanded(true);
    }
  }, [items, revealExpanded, revealRequest]);
  const visibleItems = useMemo(
    () => (expanded || revealExpanded ? items.slice() : items.slice(0, INITIAL_VISIBLE_ITEMS)),
    [expanded, items, revealExpanded],
  );
  const canToggle = items.length > INITIAL_VISIBLE_ITEMS;
  const toggleExpanded = useCallback(() => setExpanded((current) => !current), []);

  return { visibleItems, expanded, canToggle, toggleExpanded };
}
