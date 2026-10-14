import { Platform, type PointerEvent } from "react-native";

/**
 * Which non-navigating thing a workspace-row press means, decided by the pointer modifiers held
 * at pointerdown. `toggle` is Cmd on Apple platforms and Ctrl elsewhere; `range` is Shift.
 */
export type WorkspaceRowPressIntent = { kind: "toggle" } | { kind: "range" };

/** Pure decision so the platform split (Cmd vs Ctrl) is testable without a browser. */
export function resolveWorkspaceRowPressIntent(input: {
  applePlatform: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): WorkspaceRowPressIntent | null {
  if (input.shiftKey) return { kind: "range" };
  const multiSelect = input.applePlatform ? input.metaKey : input.ctrlKey;
  if (multiSelect) return { kind: "toggle" };
  return null;
}

let pendingIntent: WorkspaceRowPressIntent | null = null;

function isApplePlatform(): boolean {
  if (Platform.OS !== "web") return false;
  return (
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent ?? "")
  );
}

/**
 * React-native-web press events do not carry modifier keys, so the row container snapshots the
 * intent off `onPointerDown`, which runs before the synthesized press. Every pointerdown
 * overwrites the snapshot, so a click on the kebab or any other child cannot leave stale
 * modifiers behind.
 *
 * On web the handler receives the raw DOM PointerEvent, which carries the modifier flags; the
 * synthetic React Native type does not, so the flags are read defensively.
 */
export function captureWorkspaceRowPointerModifiers(event: PointerEvent): void {
  const modifiers = event as unknown as {
    ctrlKey?: boolean | null;
    metaKey?: boolean | null;
    shiftKey?: boolean | null;
  };
  pendingIntent = resolveWorkspaceRowPressIntent({
    applePlatform: isApplePlatform(),
    ctrlKey: modifiers.ctrlKey === true,
    metaKey: modifiers.metaKey === true,
    shiftKey: modifiers.shiftKey === true,
  });
}

/**
 * Read and drop the pending intent, so one pointerdown answers at most one press. A press that
 * never arrives (a touch that became a drag) leaves the snapshot for the next pointerdown to
 * overwrite.
 */
export function consumeWorkspaceRowPressIntent(): WorkspaceRowPressIntent | null {
  const intent = pendingIntent;
  pendingIntent = null;
  return intent;
}
