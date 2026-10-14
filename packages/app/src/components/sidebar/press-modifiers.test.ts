import { afterEach, describe, expect, it, vi } from "vitest";
import {
  captureWorkspaceRowPointerModifiers,
  consumeWorkspaceRowPressIntent,
  resolveWorkspaceRowPressIntent,
  type WorkspaceRowPressIntent,
} from "@/components/sidebar/press-modifiers";

describe("resolveWorkspaceRowPressIntent", () => {
  it("routes Cmd to toggle on Apple platforms and ignores Ctrl there (Ctrl+click is the context menu)", () => {
    expect(
      resolveWorkspaceRowPressIntent({
        applePlatform: true,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBeNull();
    expect(
      resolveWorkspaceRowPressIntent({
        applePlatform: true,
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
      }),
    ).toEqual({ kind: "toggle" });
  });

  it("routes Ctrl to toggle elsewhere and ignores Cmd there", () => {
    expect(
      resolveWorkspaceRowPressIntent({
        applePlatform: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }),
    ).toEqual({ kind: "toggle" });
    expect(
      resolveWorkspaceRowPressIntent({
        applePlatform: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
      }),
    ).toBeNull();
  });

  it("Shift always means range and wins over the multi-select key", () => {
    expect(
      resolveWorkspaceRowPressIntent({
        applePlatform: true,
        ctrlKey: false,
        metaKey: true,
        shiftKey: true,
      }),
    ).toEqual({ kind: "range" });
    expect(
      resolveWorkspaceRowPressIntent({
        applePlatform: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
      }),
    ).toEqual({ kind: "range" });
  });

  it("no modifiers means a plain press", () => {
    expect(
      resolveWorkspaceRowPressIntent({
        applePlatform: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBeNull();
  });
});

describe("capture and consume", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    consumeWorkspaceRowPressIntent();
  });

  function stubApplePlatform(isApple: boolean): void {
    vi.stubGlobal(
      "navigator",
      isApple ? { userAgent: "Macintosh; Intel Mac OS X 14_0" } : { userAgent: "Windows NT 10.0" },
    );
  }

  function pointerEvent(modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) {
    return modifiers as unknown as Parameters<typeof captureWorkspaceRowPointerModifiers>[0];
  }

  it("consumes the captured intent exactly once", () => {
    stubApplePlatform(true);
    captureWorkspaceRowPointerModifiers(pointerEvent({ metaKey: true }));
    const intent: WorkspaceRowPressIntent | null = consumeWorkspaceRowPressIntent();
    expect(intent).toEqual({ kind: "toggle" });
    expect(consumeWorkspaceRowPressIntent()).toBeNull();
  });

  it("a plain pointerdown overwrites a stale modifier intent", () => {
    stubApplePlatform(false);
    captureWorkspaceRowPointerModifiers(pointerEvent({ ctrlKey: true }));
    captureWorkspaceRowPointerModifiers(pointerEvent({}));
    expect(consumeWorkspaceRowPressIntent()).toBeNull();
  });

  it("captures Shift as a range", () => {
    stubApplePlatform(false);
    captureWorkspaceRowPointerModifiers(pointerEvent({ shiftKey: true }));
    expect(consumeWorkspaceRowPressIntent()).toEqual({ kind: "range" });
  });
});
