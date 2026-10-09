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

function buildHint(): string {
  if (!FORK_BUILD_META.commit) {
    return "本地源码运行，未经 CI 打包";
  }
  const commit = FORK_BUILD_META.commit.slice(0, 7);
  const date = FORK_BUILD_META.builtAt?.slice(0, 10) ?? "";
  return date ? `构建于 ${date} · ${commit}` : `构建 ${commit}`;
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
            {FORK_BUILD_META.version ?? "开发构建"}
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
