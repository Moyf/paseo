import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { SettingsSection } from "@/components/settings/headings/settings-section";
import { settingsStyles } from "@/styles/settings";
import { openExternalUrl } from "@/utils/open-external-url";
import { FORK_BUILD_META } from "@/fork-build-meta";
import {
  FORK_EDITION,
  FORK_FEATURES,
  FORK_REPO_URL,
  FORK_STATUS_TEXT,
  forkFeaturePrNumber,
  type ForkFeature,
} from "@/fork-info";

function statusText(feature: ForkFeature): string {
  const prNumber = forkFeaturePrNumber(feature);
  const status = FORK_STATUS_TEXT[feature.status];
  return prNumber === null ? status : `PR #${prNumber} · ${status}`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildHint(): string {
  const commit = FORK_BUILD_META.commit?.slice(0, 7) ?? null;
  if (!commit) {
    return "本地源码运行，未经打包";
  }
  const commitTime = FORK_BUILD_META.commitTime ?? FORK_BUILD_META.builtAt;
  return commitTime ? `构建于 ${formatTime(commitTime)} · ${commit}` : `构建 ${commit}`;
}

export function ForkAboutSection() {
  return (
    <SettingsSection title={`${FORK_EDITION} · all-feats`}>
      <View style={settingsStyles.card}>
        <Pressable
          style={settingsStyles.row}
          onPress={() => void openExternalUrl(FORK_REPO_URL)}
          accessibilityRole="button"
        >
          <View style={settingsStyles.rowContent}>
            <Text style={settingsStyles.rowTitle}>{FORK_EDITION}</Text>
            <Text style={settingsStyles.rowHint}>{buildHint()}</Text>
          </View>
          <Text style={styles.value} numberOfLines={1}>
            {FORK_BUILD_META.version ?? "本地构建"}
          </Text>
        </Pressable>
        {FORK_FEATURES.map((feature) => (
          <Pressable
            key={feature.label}
            style={[settingsStyles.row, settingsStyles.rowBorder]}
            disabled={feature.prUrl === null}
            onPress={() => {
              if (feature.prUrl) {
                void openExternalUrl(feature.prUrl);
              }
            }}
            accessibilityRole={feature.prUrl ? "button" : undefined}
          >
            <View style={settingsStyles.rowContent}>
              <Text style={settingsStyles.rowTitle}>{feature.label}</Text>
              <Text style={settingsStyles.rowHint}>{feature.detail}</Text>
            </View>
            <Text style={styles.status}>{statusText(feature)}</Text>
          </Pressable>
        ))}
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create((theme) => ({
  value: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
  },
  status: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
}));
