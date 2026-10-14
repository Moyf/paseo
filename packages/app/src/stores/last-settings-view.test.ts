import { describe, expect, it, vi } from "vitest";
import type { SettingsView } from "@/navigation/settings-navigation";
import { createLastSettingsViewStore, type LastSettingsViewStorage } from "./last-settings-view";

function createMemoryStorage(initial: string | null = null) {
  let value = initial;
  const writes: string[] = [];
  const storage: LastSettingsViewStorage = {
    read: () => Promise.resolve(value),
    write: (next) => {
      value = next;
      writes.push(next);
      return Promise.resolve();
    },
    clear: () => {
      value = null;
      return Promise.resolve();
    },
  };
  return { storage, getValue: () => value, writes };
}

const INVALID_SECTION_VIEW = {
  kind: "section",
  section: "not-a-section",
} as unknown as SettingsView;

describe("createLastSettingsViewStore", () => {
  it("remembers a non-root view and persists it", async () => {
    const { storage, getValue } = createMemoryStorage();
    const store = createLastSettingsViewStore(storage);

    store.remember({ kind: "section", section: "general" });
    await vi.waitFor(() => {
      expect(getValue()).toBe(JSON.stringify({ kind: "section", section: "general" }));
    });
    expect(store.get()).toEqual({ kind: "section", section: "general" });
  });

  it("ignores the root view so leaving settings keeps the last page", async () => {
    const { storage, getValue, writes } = createMemoryStorage();
    const store = createLastSettingsViewStore(storage);

    store.remember({ kind: "section", section: "general" });
    await vi.waitFor(() => {
      expect(writes.length).toBe(1);
    });
    store.remember({ kind: "root" });

    expect(store.get()).toEqual({ kind: "section", section: "general" });
    expect(writes.length).toBe(1);
    expect(getValue()).toBe(JSON.stringify({ kind: "section", section: "general" }));
  });

  it("skips writes when the view is unchanged", async () => {
    const { storage, writes } = createMemoryStorage();
    const store = createLastSettingsViewStore(storage);

    store.remember({ kind: "section", section: "general" });
    await vi.waitFor(() => {
      expect(writes.length).toBe(1);
    });
    store.remember({ kind: "section", section: "general" });
    expect(writes.length).toBe(1);
  });

  it("hydrates a stored view", async () => {
    const { storage } = createMemoryStorage(
      JSON.stringify({ kind: "host", serverId: "srv_1", section: "plugins" }),
    );
    const store = createLastSettingsViewStore(storage);

    await store.hydrate();

    expect(store.get()).toEqual({ kind: "host", serverId: "srv_1", section: "plugins" });
  });

  it("clears invalid stored payloads", async () => {
    const { storage, getValue } = createMemoryStorage(
      JSON.stringify({ kind: "section", section: "not-a-section" }),
    );
    const store = createLastSettingsViewStore(storage);

    await store.hydrate();

    expect(store.get()).toBeNull();
    await vi.waitFor(() => {
      expect(getValue()).toBeNull();
    });
  });

  it("clears malformed stored payloads", async () => {
    const { storage, getValue } = createMemoryStorage("{not json");
    const store = createLastSettingsViewStore(storage);

    await store.hydrate();

    expect(store.get()).toBeNull();
    await vi.waitFor(() => {
      expect(getValue()).toBeNull();
    });
  });

  it("rejects remembered views with invalid slugs", () => {
    const { storage } = createMemoryStorage();
    const store = createLastSettingsViewStore(storage);

    store.remember(INVALID_SECTION_VIEW);

    expect(store.get()).toBeNull();
  });

  it("hydrates only once", async () => {
    const { storage } = createMemoryStorage(JSON.stringify({ kind: "section", section: "about" }));
    const store = createLastSettingsViewStore(storage);

    await store.hydrate();
    store.remember({ kind: "section", section: "general" });
    await store.hydrate();

    expect(store.get()).toEqual({ kind: "section", section: "general" });
  });
});
