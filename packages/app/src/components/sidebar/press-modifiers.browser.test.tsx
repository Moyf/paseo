import React, { act, useCallback } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Pressable, Text, View } from "react-native";
import {
  captureWorkspaceRowPointerModifiers,
  consumeWorkspaceRowPointerUpIntent,
  consumeWorkspaceRowPressSuppression,
} from "@/components/sidebar/press-modifiers";
import { useSidebarSelectionStore } from "@/stores/sidebar-selection-store";

// App sources compile against the classic JSX runtime, which expects React on the global.
beforeEach(() => vi.stubGlobal("React", React));

/**
 * Real browser, real react-native-web primitives, because the bug lived in how the row sees
 * pointer clicks: the responder system never delivers Ctrl clicks as presses
 * (`isPrimaryPointerDown` rejects them), so the row must apply modifier intents from its own
 * `onPointerDown`/`onPointerUp` pair. This mounts exactly that pair and replays the sequence —
 * first ctrl+click, second ctrl+click, shift range, plain click.
 */

interface Mounted {
  root: Root;
  container: HTMLDivElement;
}

const mounted: Mounted[] = [];

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    act(() => entry.root.unmount());
    entry.container.remove();
  }
  act(() => useSidebarSelectionStore.getState().clear());
  captureWorkspaceRowPointerModifiers({});
  consumeWorkspaceRowPointerUpIntent();
  consumeWorkspaceRowPressSuppression();
});

function selectionKeys(): string[] {
  return useSidebarSelectionStore.getState().selected.map((target) => target.workspaceKey);
}

function Row({ rowKey, onPress }: { rowKey: string; onPress: () => void }): React.ReactElement {
  const handlePress = useCallback(() => {
    if (consumeWorkspaceRowPressSuppression()) {
      return;
    }
    useSidebarSelectionStore
      .getState()
      .handleNavigatePress({ serverId: "s1", workspaceId: rowKey, workspaceKey: `s1:${rowKey}` });
    onPress();
  }, [onPress, rowKey]);
  const handlePointerUp = useCallback(() => {
    const intent = consumeWorkspaceRowPointerUpIntent();
    if (intent) {
      const store = useSidebarSelectionStore.getState();
      store.handleSelectPress(
        { serverId: "s1", workspaceId: rowKey, workspaceKey: `s1:${rowKey}` },
        { range: intent.kind === "range" },
      );
    }
  }, [rowKey]);
  return (
    <View onPointerDown={captureWorkspaceRowPointerModifiers} onPointerUp={handlePointerUp}>
      <Pressable onPress={handlePress} testID={`row-${rowKey}`}>
        <Text>{rowKey}</Text>
      </Pressable>
    </View>
  );
}

function mountRow(
  key: string,
  onPress: () => void,
): (modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => void {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<Row rowKey={key} onPress={onPress} />);
  });
  mounted.push({ root, container });

  const row = container.querySelector(`[data-testid="row-${key}"]`) as HTMLElement;
  if (!row) throw new Error(`row-${key} did not render`);
  return (modifiers: { ctrlKey?: boolean; shiftKey?: boolean } = {}) => {
    const rect = row.getBoundingClientRect();
    const init = {
      bubbles: true,
      composed: true,
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      isPrimary: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      ...modifiers,
    };
    act(() => {
      row.dispatchEvent(new PointerEvent("pointerdown", init));
      row.dispatchEvent(new PointerEvent("pointerup", init));
    });
  };
}

describe("pointer-level multi-select over real react-native-web primitives", () => {
  it("counts the first ctrl+click as a selection and does not navigate", () => {
    const onPress = vi.fn();
    const press = mountRow("a", onPress);
    press({ ctrlKey: true });
    expect(selectionKeys()).toEqual(["s1:a"]);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("a second ctrl+click joins the selection", () => {
    mountRow("a", vi.fn())({ ctrlKey: true });
    mountRow("b", vi.fn())({ ctrlKey: true });
    expect(selectionKeys()).toEqual(["s1:a", "s1:b"]);
  });

  it("shift+click extends a range from the anchor across rows", () => {
    useSidebarSelectionStore.getState().setOrder([
      { serverId: "s1", workspaceId: "a", workspaceKey: "s1:a" },
      { serverId: "s1", workspaceId: "b", workspaceKey: "s1:b" },
      { serverId: "s1", workspaceId: "c", workspaceKey: "s1:c" },
      { serverId: "s1", workspaceId: "d", workspaceKey: "s1:d" },
    ]);
    mountRow("a", vi.fn())({ ctrlKey: true });
    mountRow("c", vi.fn())({ shiftKey: true });
    expect(selectionKeys()).toEqual(["s1:a", "s1:b", "s1:c"]);
  });

  it("a plain pointerup is a no-op and does not arm the press suppression", () => {
    mountRow("a", vi.fn())({ ctrlKey: true });
    expect(selectionKeys()).toEqual(["s1:a"]);
    // The plain click's pointerup carries no intent; navigation happens in the synthesized
    // press, which synthetic events cannot drive — the store-level anchor rule is covered by
    // sidebar-selection-store.test.ts.
    mountRow("b", vi.fn())({});
    expect(selectionKeys()).toEqual(["s1:a"]);
    expect(consumeWorkspaceRowPressSuppression()).toBe(false);
  });
});
