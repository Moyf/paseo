import type { TerminalOpenLocation } from "@/hooks/use-settings";
import type { TerminalTabDestination } from "@/screens/workspace/terminals/use-workspace-terminals";
import {
  useWorkspaceLayoutStore,
  type WorkspaceTabPlacement,
} from "@/stores/workspace-layout-store";

interface ResolveImplicitTerminalPlacementInput {
  isCompact: boolean;
  supportsPaneSplits: boolean;
  persistenceKey: string | null;
  location: TerminalOpenLocation;
  destination: TerminalTabDestination;
}

/**
 * Where an implicitly opened terminal lands, per the Open location preference.
 * An explicit pane target always wins; every other non-desktop context falls back
 * to the focused pane, which callers apply when this returns undefined.
 */
export function resolveImplicitTerminalPlacement(
  input: ResolveImplicitTerminalPlacementInput,
): WorkspaceTabPlacement | undefined {
  if (
    input.isCompact ||
    !input.supportsPaneSplits ||
    !input.persistenceKey ||
    input.destination.kind !== "open" ||
    input.destination.paneId
  ) {
    return undefined;
  }
  const store = useWorkspaceLayoutStore.getState();
  if (input.location === "bottom") {
    const paneId = store.ensureBottomPane(input.persistenceKey);
    return paneId ? { mode: "prefer", paneId } : undefined;
  }
  if (input.location === "side") {
    const paneId = store.ensureSidePane(input.persistenceKey);
    return paneId ? { mode: "prefer", paneId } : undefined;
  }
  return undefined;
}
