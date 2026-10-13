import type { DesktopAppUpdateStatus } from "@/desktop/updates/use-desktop-app-updater";
import { i18n } from "@/i18n/i18next";

export type UpdateCalloutBody =
  | { kind: "available"; versionLabel: string | null }
  | { kind: "found"; versionLabel: string | null }
  | { kind: "installing" }
  | { kind: "error"; message: string };

export type UpdateCalloutActionRole = "changelog" | "install" | "retry";

export interface UpdateCalloutActionDescriptor {
  role: UpdateCalloutActionRole;
  label: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export interface UpdateCalloutDescriptor {
  id: "desktop-update";
  dismissalKey: string;
  priority: number;
  title: string;
  body: UpdateCalloutBody;
  showGiftIcon: boolean;
  variant: "default" | "error";
  actions: UpdateCalloutActionDescriptor[];
  testID: "update-callout";
}

export interface ResolveUpdateCalloutInput {
  isDesktopApp: boolean;
  status: DesktopAppUpdateStatus;
  isInstalling: boolean;
  autoUpdate: boolean;
  availableUpdate: { latestVersion?: string | null } | null;
  errorMessage: string | null;
}

function formatVersionLabel(latestVersion: string | null | undefined): string | null {
  if (!latestVersion) return null;
  return `v${latestVersion.replace(/^v/i, "")}`;
}

function buildCalloutTitleBody(input: {
  isInstalling: boolean;
  isError: boolean;
  isNotifyOnly: boolean;
  latestVersion: string | null;
  errorMessage: string | null;
}): { title: string; body: UpdateCalloutBody } {
  const { isInstalling, isError, isNotifyOnly, latestVersion, errorMessage } = input;

  if (isInstalling) {
    return {
      title: i18n.t("desktop.updates.callout.installingTitle"),
      body: { kind: "installing" },
    };
  }
  if (isError) {
    return {
      title: i18n.t("desktop.updates.callout.failedTitle"),
      body: {
        kind: "error",
        message: errorMessage ?? i18n.t("desktop.updates.callout.genericError"),
      },
    };
  }
  if (isNotifyOnly) {
    return {
      title: i18n.t("desktop.updates.callout.availableTitle"),
      body: { kind: "found", versionLabel: formatVersionLabel(latestVersion) },
    };
  }
  return {
    title: i18n.t("desktop.updates.callout.availableTitle"),
    body: { kind: "available", versionLabel: formatVersionLabel(latestVersion) },
  };
}

export function resolveUpdateCalloutDescriptor(
  input: ResolveUpdateCalloutInput,
): UpdateCalloutDescriptor | null {
  if (!input.isDesktopApp) return null;

  // With auto-update off the found update is never downloaded, so it stays
  // "pending" — surface that as the reminder instead of staying silent.
  const isNotifyOnlyFound =
    !input.autoUpdate && input.status === "pending" && input.availableUpdate != null;
  const isRemindable =
    input.status === "available" ||
    input.status === "installing" ||
    input.status === "error" ||
    isNotifyOnlyFound;
  if (!isRemindable) {
    return null;
  }

  const isError = input.status === "error";
  const isInstalling = input.isInstalling;
  const isNotifyOnly = isNotifyOnlyFound && !isInstalling;
  const isAvailable = !isInstalling && !isError && !isNotifyOnly;

  const latestVersion = input.availableUpdate?.latestVersion ?? null;
  const dismissalKey = `desktop-update:${input.status}:${latestVersion ?? "unknown"}`;

  const { title, body } = buildCalloutTitleBody({
    isInstalling,
    isError,
    isNotifyOnly,
    latestVersion,
    errorMessage: input.errorMessage,
  });

  const actions: UpdateCalloutActionDescriptor[] = [
    { role: "changelog", label: i18n.t("desktop.updates.callout.whatsNew") },
  ];
  if (isError) {
    actions.push({ role: "retry", label: i18n.t("common.actions.retry"), variant: "primary" });
  } else {
    actions.push({
      role: "install",
      label: isInstalling
        ? i18n.t("desktop.updates.callout.installingAction")
        : i18n.t("desktop.updates.callout.installAndRestart"),
      variant: "primary",
      disabled: isInstalling,
    });
  }

  return {
    id: "desktop-update",
    dismissalKey,
    priority: 200,
    title,
    body,
    showGiftIcon: isAvailable || isNotifyOnly,
    variant: isError ? "error" : "default",
    actions,
    testID: "update-callout",
  };
}
