import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import type { SettingsView } from "@/navigation/settings-navigation";
import { HOST_SECTION_SLUGS, SETTINGS_SECTION_SLUGS } from "@/utils/host-routes";

export const LAST_SETTINGS_VIEW_STORAGE_KEY = "paseo:last-settings-view";

const LastSettingsViewSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("section"),
    section: z.enum(SETTINGS_SECTION_SLUGS),
  }),
  z.strictObject({
    kind: z.literal("host"),
    serverId: z.string().trim().min(1),
    section: z.enum(HOST_SECTION_SLUGS),
  }),
  z.strictObject({
    kind: z.literal("project"),
    serverId: z.string().trim().min(1),
    projectId: z.string().trim().min(1),
  }),
  z.strictObject({
    kind: z.literal("plugin"),
    serverId: z.string().trim().min(1),
    pluginId: z.string().trim().min(1),
    screenId: z.string().trim().min(1),
  }),
]);

export type LastSettingsView = z.infer<typeof LastSettingsViewSchema>;

export interface LastSettingsViewStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  clear(): Promise<void>;
}

function normalizeSettingsView(input: SettingsView): LastSettingsView | null {
  const result = LastSettingsViewSchema.safeParse(input);
  return result.success ? result.data : null;
}

function isSameView(a: LastSettingsView, b: LastSettingsView): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createLastSettingsViewStore(storage: LastSettingsViewStorage) {
  let view: LastSettingsView | null = null;
  let hydrated = false;
  let hydrationPromise: Promise<void> | null = null;

  function remember(input: SettingsView): void {
    const next = normalizeSettingsView(input);
    if (!next || (view !== null && isSameView(view, next))) {
      return;
    }
    view = next;
    void storage.write(JSON.stringify(next)).catch(() => {});
  }

  function hydrate(): Promise<void> {
    if (hydrationPromise) {
      return hydrationPromise;
    }
    hydrationPromise = storage
      .read()
      .then((stored) => {
        if (stored === null) {
          return undefined;
        }
        try {
          view = normalizeSettingsView(JSON.parse(stored));
        } catch {
          view = null;
        }
        if (view === null) {
          void storage.clear().catch(() => {});
        }
        return undefined;
      })
      .catch(() => undefined)
      .finally(() => {
        hydrated = true;
      });
    return hydrationPromise;
  }

  return {
    get: () => view,
    isHydrated: () => hydrated,
    remember,
    hydrate,
  };
}

const lastSettingsViewStore = createLastSettingsViewStore({
  read: () => AsyncStorage.getItem(LAST_SETTINGS_VIEW_STORAGE_KEY),
  write: (value) => AsyncStorage.setItem(LAST_SETTINGS_VIEW_STORAGE_KEY, value),
  clear: () => AsyncStorage.removeItem(LAST_SETTINGS_VIEW_STORAGE_KEY),
});

export function rememberLastSettingsView(view: SettingsView): void {
  lastSettingsViewStore.remember(view);
}

export function getLastSettingsView(): LastSettingsView | null {
  return lastSettingsViewStore.get();
}

export function hydrateLastSettingsView(): Promise<void> {
  return lastSettingsViewStore.hydrate();
}

void hydrateLastSettingsView();
