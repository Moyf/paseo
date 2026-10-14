import { create } from "zustand";

/** The identity triple every sidebar row carries, and the only thing selection needs. */
export interface SidebarSelectionTarget {
  serverId: string;
  workspaceId: string;
  workspaceKey: string;
}

interface SidebarSelectionState {
  /**
   * The sidebar's rows in flat visual order — pinned section first, then each group's rows —
   * registered by whichever list renderer is mounted. Shift ranges are slices of this order, so
   * a range can cross section boundaries the way the rows visually line up.
   */
  order: readonly SidebarSelectionTarget[];
  selected: readonly SidebarSelectionTarget[];
  /** Derived set of selected keys, so a row can ask "am I in it" without scanning. */
  selectedKeys: ReadonlySet<string>;
  anchorKey: string | null;
  setOrder: (order: readonly SidebarSelectionTarget[]) => void;
  handleSelectPress: (target: SidebarSelectionTarget, options: { range: boolean }) => void;
  clear: () => void;
}

export const emptySidebarSelectionTargetSet: ReadonlySet<string> = new Set();

function toKeySet(targets: readonly SidebarSelectionTarget[]): ReadonlySet<string> {
  return new Set(targets.map((target) => target.workspaceKey));
}

/**
 * The order slice between two rows, inclusive. Pure so the range rule is testable without a
 * component: the anchor stays where it was (a shift press extends, it does not move it), and an
 * anchor that fell out of the visible order starts a fresh range at the pressed row.
 */
export function computeRangeSelection(
  order: readonly SidebarSelectionTarget[],
  anchorKey: string | null,
  targetKey: string,
): readonly SidebarSelectionTarget[] {
  const targetIndex = order.findIndex((target) => target.workspaceKey === targetKey);
  if (targetIndex < 0) return [];
  const anchorIndex =
    anchorKey !== null ? order.findIndex((target) => target.workspaceKey === anchorKey) : -1;
  if (anchorIndex < 0) return order.filter((target) => target.workspaceKey === targetKey);
  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return order.slice(start, end + 1);
}

/** Cmd/Ctrl click: press a selected row to drop it, press anything else to add it. */
export function computeToggleSelection(
  selected: readonly SidebarSelectionTarget[],
  target: SidebarSelectionTarget,
): { selected: readonly SidebarSelectionTarget[]; removed: boolean } {
  if (selected.some((entry) => entry.workspaceKey === target.workspaceKey)) {
    return {
      selected: selected.filter((entry) => entry.workspaceKey !== target.workspaceKey),
      removed: true,
    };
  }
  return { selected: [...selected, target], removed: false };
}

export const useSidebarSelectionStore = create<SidebarSelectionState>((set, get) => ({
  order: [],
  selected: [],
  selectedKeys: emptySidebarSelectionTargetSet,
  anchorKey: null,
  setOrder: (order) => {
    const { selected, anchorKey } = get();
    // Rows that left the visible order (archived, filtered, collapsed away) cannot be acted on
    // by a menu the user can still see, so they fall out of the selection with the order.
    const keys = toKeySet(order);
    const nextSelected = selected.filter((target) => keys.has(target.workspaceKey));
    const nextAnchorKey = anchorKey !== null && keys.has(anchorKey) ? anchorKey : null;
    if (
      nextSelected.length === selected.length &&
      nextAnchorKey === anchorKey &&
      get().order === order
    ) {
      return;
    }
    set({
      order,
      selected: nextSelected,
      selectedKeys: toKeySet(nextSelected),
      anchorKey: nextAnchorKey,
    });
  },
  handleSelectPress: (target, { range }) => {
    const { order, anchorKey, selected } = get();
    if (range) {
      const anchor =
        anchorKey !== null && order.some((entry) => entry.workspaceKey === anchorKey)
          ? anchorKey
          : target.workspaceKey;
      const next = computeRangeSelection(order, anchor, target.workspaceKey);
      set({ selected: next, selectedKeys: toKeySet(next), anchorKey: anchor });
      return;
    }
    const { selected: next, removed } = computeToggleSelection(selected, target);
    set({
      selected: next,
      selectedKeys: toKeySet(next),
      anchorKey: removed && next.length === 0 ? null : target.workspaceKey,
    });
  },
  clear: () => set({ selected: [], selectedKeys: emptySidebarSelectionTargetSet, anchorKey: null }),
}));
