/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as Clipboard from "expo-clipboard";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDesktopTarget } from "@/workspace/desktop-open-targets";
import type { InlinePathTarget } from "./parse";
import { AssistantFileLinkContextMenuContent } from "./file-context-menu";
import type { AssistantFileLinkSource } from "./resolver";

vi.mock("expo-clipboard", () => ({
  setStringAsync: vi.fn(async () => {}),
}));

vi.mock("@/workspace/desktop-open-targets", () => ({
  openDesktopTarget: vi.fn(async () => {}),
  useDesktopOpenTargets: vi.fn(() => ({
    targets: [
      {
        id: "explorer",
        label: "Explorer",
        kind: "file-manager" as const,
        icon: { kind: "symbol" as const, name: "folder" as const },
      },
    ],
    isAvailable: true,
  })),
}));

vi.mock("@/contexts/toast-context", () => ({
  useToast: () => ({ show: vi.fn(), copied: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/constants/platform", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIsElectron: () => true,
}));

// The shared menu engine renders through ContextMenu/MenuRoot, which the unit project's
// classic JSX transform cannot mount (menu files have no default React import). Probe the
// action wiring this component hands to FileActionsContextMenuContent instead.
vi.mock("@/components/file-actions-menu", async () => {
  const ReactNamespace = await import("react");
  const invoke = (props: Record<string, unknown>, key: string) => () =>
    (props[key] as (() => void) | undefined)?.();
  const flag = (props: Record<string, unknown>, key: string) =>
    props[key] ? "enabled" : "disabled";
  const probeButton = (testID: string, actionKey: string, props: Record<string, unknown>) =>
    ReactNamespace.createElement("button", {
      type: "button",
      "data-testid": testID,
      onClick: invoke(props, actionKey),
    });
  const label = (testID: string, extra: Record<string, unknown> = {}) =>
    ReactNamespace.createElement("span", { "data-testid": testID, ...extra });
  return {
    FileActionsContextMenuContent: (props: Record<string, unknown>) =>
      ReactNamespace.createElement(
        "div",
        null,
        probeButton("probe-open-file", "onOpenFile", props),
        probeButton("probe-open-to-side", "onOpenToSide", props),
        probeButton("probe-copy-path", "onCopyPath", props),
        probeButton("probe-copy-relative-path", "onCopyRelativePath", props),
        probeButton("probe-reveal", "onReveal", props),
        label("probe-open-file-availability", {
          "data-status": flag(props, "onOpenFile"),
        }),
        label("probe-copy-relative-path-availability", {
          "data-status": flag(props, "onCopyRelativePath"),
        }),
        label("probe-reveal-availability", {
          "data-status": flag(props, "onReveal"),
        }),
        label("probe-reveal-target-name", {
          "data-value": String(props.revealTargetName ?? ""),
        }),
      ),
  };
});

const SOURCE: AssistantFileLinkSource = {
  href: "file:///C:/Users/test/.config/opencode/opencode.jsonc:95",
  text: "C:\\Users\\test\\.config\\opencode\\opencode.jsonc:95",
  markup: "linkify",
};

const TARGET: InlinePathTarget = {
  raw: SOURCE.href,
  path: "C:/Users/test/.config/opencode/opencode.jsonc",
  lineStart: 95,
  lineEnd: undefined,
};

const onOpen = vi.fn();

function renderMenu(input: { workspaceRoot?: string } = {}) {
  return render(
    <AssistantFileLinkContextMenuContent
      source={SOURCE}
      target={TARGET}
      workspaceRoot={input.workspaceRoot}
      onOpen={onOpen}
      testIDPrefix="assistant-file-link"
    />,
  );
}

async function clickAction(testID: string) {
  fireEvent.click(screen.getByTestId(testID));
}

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(Clipboard.setStringAsync).mockClear();
  vi.mocked(openDesktopTarget).mockClear();
  onOpen.mockClear();
});

describe("AssistantFileLinkContextMenuContent", () => {
  it("copies the absolute native path", async () => {
    renderMenu({ workspaceRoot: "C:/Users/test/project" });

    await clickAction("probe-copy-path");

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
        "C:\\Users\\test\\.config\\opencode\\opencode.jsonc",
      );
    });
  });

  it("reveals the file in the file manager", async () => {
    renderMenu({ workspaceRoot: "C:/Users/test/project" });

    await clickAction("probe-reveal");

    await waitFor(() => {
      expect(openDesktopTarget).toHaveBeenCalledWith({
        editorId: "explorer",
        workspacePath: "C:/Users/test/project",
        filePath: "C:\\Users\\test\\.config\\opencode\\opencode.jsonc",
      });
    });
    expect(screen.getByTestId("probe-reveal-target-name").dataset.value).toBe("Explorer");
  });

  it("copies the workspace-relative path only for files inside the workspace", async () => {
    const outside = renderMenu({ workspaceRoot: "C:/Users/test/project" });
    expect(outside.getByTestId("probe-copy-relative-path-availability").dataset.status).toBe(
      "disabled",
    );
    outside.unmount();

    const inside = renderMenu({ workspaceRoot: "C:/Users/test/.config" });
    expect(inside.getByTestId("probe-copy-relative-path-availability").dataset.status).toBe(
      "enabled",
    );

    fireEvent.click(inside.getByTestId("probe-copy-relative-path"));
    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith("opencode/opencode.jsonc");
    });
  });

  it("opens the file with the default disposition and supports opening to the side", async () => {
    renderMenu({ workspaceRoot: "C:/Users/test/project" });

    await clickAction("probe-open-file");
    await clickAction("probe-open-to-side");

    await waitFor(() => {
      expect(onOpen).toHaveBeenNthCalledWith(1, SOURCE, "preferred");
      expect(onOpen).toHaveBeenNthCalledWith(2, SOURCE, "side");
    });
  });

  it("still copies a path for an absolute target without a workspace root", async () => {
    renderMenu({ workspaceRoot: undefined });

    await clickAction("probe-copy-path");

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
        "C:\\Users\\test\\.config\\opencode\\opencode.jsonc",
      );
    });
  });
});
