import { beforeEach, describe, expect, it } from "vitest";
import {
  computeRangeSelection,
  computeToggleSelection,
  useSidebarSelectionStore,
  type SidebarSelectionTarget,
} from "@/stores/sidebar-selection-store";

function target(key: string, serverId = "s1"): SidebarSelectionTarget {
  return { serverId, workspaceId: `${serverId}-${key}`, workspaceKey: `${serverId}:${key}` };
}

const ORDER = [target("a"), target("b"), target("c"), target("d", "s2"), target("e")];

describe("computeRangeSelection", () => {
  it("slices inclusively between anchor and target regardless of direction", () => {
    expect(computeRangeSelection(ORDER, "s1:a", "s1:c").map((entry) => entry.workspaceKey)).toEqual(
      ["s1:a", "s1:b", "s1:c"],
    );
    expect(computeRangeSelection(ORDER, "s1:c", "s1:a").map((entry) => entry.workspaceKey)).toEqual(
      ["s1:a", "s1:b", "s1:c"],
    );
  });

  it("spans across section boundaries and hosts", () => {
    expect(computeRangeSelection(ORDER, "s1:b", "s1:e").map((entry) => entry.workspaceKey)).toEqual(
      ["s1:b", "s1:c", "s2:d", "s1:e"],
    );
  });

  it("selects only the target when the anchor is gone from the visible order", () => {
    expect(
      computeRangeSelection(ORDER, "s1:missing", "s1:c").map((entry) => entry.workspaceKey),
    ).toEqual(["s1:c"]);
  });

  it("selects nothing when the target is not in the visible order", () => {
    expect(computeRangeSelection(ORDER, "s1:a", "s1:missing")).toEqual([]);
  });
});

describe("computeToggleSelection", () => {
  it("adds an unselected row", () => {
    const result = computeToggleSelection([target("a")], target("c"));
    expect(result.removed).toBe(false);
    expect(result.selected.map((entry) => entry.workspaceKey)).toEqual(["s1:a", "s1:c"]);
  });

  it("removes a selected row", () => {
    const result = computeToggleSelection([target("a"), target("c")], target("a"));
    expect(result.removed).toBe(true);
    expect(result.selected.map((entry) => entry.workspaceKey)).toEqual(["s1:c"]);
  });
});

describe("useSidebarSelectionStore", () => {
  beforeEach(() => {
    useSidebarSelectionStore.getState().clear();
    useSidebarSelectionStore.getState().setOrder(ORDER);
  });

  it("a plain press selects one row and moves the anchor", () => {
    useSidebarSelectionStore.getState().handleSelectPress(target("b"), { range: false });
    const state = useSidebarSelectionStore.getState();
    expect(state.selected.map((entry) => entry.workspaceKey)).toEqual(["s1:b"]);
    expect(state.anchorKey).toBe("s1:b");
  });

  it("pressing the only selected row deselects it and drops the anchor", () => {
    const store = useSidebarSelectionStore.getState();
    store.handleSelectPress(target("b"), { range: false });
    useSidebarSelectionStore.getState().handleSelectPress(target("b"), { range: false });
    const state = useSidebarSelectionStore.getState();
    expect(state.selected).toEqual([]);
    expect(state.selectedKeys.size).toBe(0);
    expect(state.anchorKey).toBeNull();
  });

  it("toggling one row among several keeps the rest", () => {
    const store = useSidebarSelectionStore.getState();
    store.handleSelectPress(target("a"), { range: false });
    store.handleSelectPress(target("c"), { range: false });
    useSidebarSelectionStore.getState().handleSelectPress(target("b"), { range: false });
    expect(useSidebarSelectionStore.getState().selected.map((entry) => entry.workspaceKey)).toEqual(
      ["s1:a", "s1:c", "s1:b"],
    );
    useSidebarSelectionStore.getState().handleSelectPress(target("a"), { range: false });
    expect(useSidebarSelectionStore.getState().selected.map((entry) => entry.workspaceKey)).toEqual(
      ["s1:c", "s1:b"],
    );
  });

  it("a range press extends from the anchor without moving it", () => {
    const store = useSidebarSelectionStore.getState();
    store.handleSelectPress(target("b"), { range: false });
    useSidebarSelectionStore.getState().handleSelectPress(target("d", "s2"), { range: true });
    const state = useSidebarSelectionStore.getState();
    expect(state.selected.map((entry) => entry.workspaceKey)).toEqual(["s1:b", "s1:c", "s2:d"]);
    expect(state.anchorKey).toBe("s1:b");
  });

  it("prunes rows that left the visible order and drops a vanished anchor", () => {
    const store = useSidebarSelectionStore.getState();
    store.handleSelectPress(target("a"), { range: false });
    store.handleSelectPress(target("e"), { range: true });
    expect(useSidebarSelectionStore.getState().selected.length).toBe(5);

    useSidebarSelectionStore.getState().setOrder([target("b"), target("c"), target("e")]);
    const state = useSidebarSelectionStore.getState();
    expect(state.selected.map((entry) => entry.workspaceKey)).toEqual(["s1:b", "s1:c", "s1:e"]);
    expect(state.anchorKey).toBeNull();
  });

  it("a plain press selects just that row, so the next ctrl press adds on top of it", () => {
    const store = useSidebarSelectionStore.getState();
    store.handleSelectPress(target("a"), { range: false });
    store.handleSelectPress(target("c"), { range: true });
    expect(useSidebarSelectionStore.getState().selected.length).toBe(3);

    // The user plain-clicks row d — it navigates and the multi-selection resets to just d.
    useSidebarSelectionStore.getState().handleNavigatePress(target("d", "s2"));
    const state = useSidebarSelectionStore.getState();
    expect(state.selected.map((entry) => entry.workspaceKey)).toEqual(["s2:d"]);
    expect(state.anchorKey).toBe("s2:d");

    // A ctrl press then adds on top of the plain-clicked row.
    useSidebarSelectionStore.getState().handleSelectPress(target("b"), { range: false });
    expect(useSidebarSelectionStore.getState().selected.map((entry) => entry.workspaceKey)).toEqual(
      ["s2:d", "s1:b"],
    );

    // And a shift press extends from the last-pressed row (the ctrl press moved the anchor),
    // replacing the selection with the anchor..target slice.
    useSidebarSelectionStore.getState().handleSelectPress(target("e"), { range: true });
    expect(useSidebarSelectionStore.getState().selected.map((entry) => entry.workspaceKey)).toEqual(
      ["s1:b", "s1:c", "s2:d", "s1:e"],
    );
  });

  it("clear empties the selection and the anchor", () => {
    const store = useSidebarSelectionStore.getState();
    store.handleSelectPress(target("a"), { range: false });
    store.handleSelectPress(target("c"), { range: true });
    useSidebarSelectionStore.getState().clear();
    const state = useSidebarSelectionStore.getState();
    expect(state.selected).toEqual([]);
    expect(state.selectedKeys.size).toBe(0);
    expect(state.anchorKey).toBeNull();
  });
});
