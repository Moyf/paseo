import { router, type Href } from "expo-router";
import { navigateToLastWorkspace } from "@/stores/navigation-active-workspace-store";
import { getLastSettingsView } from "@/stores/last-settings-view";
import { getHostRuntimeStore } from "@/runtime/host-runtime";
import {
  buildOpenProjectRoute,
  buildProjectSettingsRoute,
  buildProjectsSettingsRoute,
  buildSettingsHostSectionRoute,
  buildSettingsPluginScreenRoute,
  buildSettingsRoute,
  buildSettingsSectionRoute,
  type HostSectionSlug,
  type SettingsSectionSlug,
} from "@/utils/host-routes";

export type SettingsView =
  | { kind: "plugin"; serverId: string; pluginId: string; screenId: string }
  | { kind: "root" }
  | { kind: "section"; section: SettingsSectionSlug }
  | { kind: "host"; serverId: string; section: HostSectionSlug }
  | { kind: "project"; serverId: string; projectId: string };

export function openHostOverview(serverId: string): void {
  router.push(buildSettingsHostSectionRoute(serverId, "host"));
}

export function openProjectSettings(serverId: string, projectId: string): void {
  router.push(buildProjectSettingsRoute(serverId, projectId));
}

export function buildSettingsRouteForView(view: SettingsView): string {
  switch (view.kind) {
    case "section":
      return buildSettingsSectionRoute(view.section);
    case "host":
      return buildSettingsHostSectionRoute(view.serverId, view.section);
    case "project":
      return buildProjectSettingsRoute(view.serverId, view.projectId);
    case "plugin":
      return buildSettingsPluginScreenRoute(view.serverId, view.pluginId, view.screenId);
    case "root":
      return buildSettingsRoute();
  }
}

export function resolveSettingsOpenRoute(): string {
  const lastView = getLastSettingsView();
  if (!lastView) {
    return buildSettingsRoute();
  }
  if (lastView.kind !== "section") {
    const hostExists = getHostRuntimeStore()
      .getHosts()
      .some((host) => host.serverId === lastView.serverId);
    if (!hostExists) {
      return buildSettingsRoute();
    }
  }
  return buildSettingsRouteForView(lastView);
}

export function openSettings(): void {
  router.push(resolveSettingsOpenRoute());
}

export function returnFromSettings(view: SettingsView): void {
  if (view.kind === "root") {
    if (!navigateToLastWorkspace()) {
      router.replace(buildOpenProjectRoute());
    }
    return;
  }

  let parent: Href = buildSettingsRoute();
  if (view.kind === "plugin") parent = buildSettingsHostSectionRoute(view.serverId, "plugins");
  if (view.kind === "project") parent = buildProjectsSettingsRoute(view.serverId);
  router.dismissTo(parent as Href);
}
