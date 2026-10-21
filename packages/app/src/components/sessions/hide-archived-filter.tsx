import { useCallback, useMemo, type ReactElement } from "react";
import { Text, View, type PressableStateCallbackType } from "react-native";
import { Check } from "lucide-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { PressHighlight } from "@/components/ui/press-highlight";
import type { Theme } from "@/styles/theme";

const ThemedCheck = withUnistyles(Check);
const checkColorMapping = (theme: Theme) => ({ color: theme.colors.accentForeground });

export interface HideArchivedFilterProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  testID?: string;
}

/**
 * The "Hide archived" checkbox on the History screen's filter rail. The pill chrome is the
 * host filter's so the controls read as one row; the box is the app's checkbox treatment
 * from `add-host-modal.tsx`. Hover stays on the Pressable's own render-prop style —
 * self-styling only, per docs/hover.md.
 */
export function HideArchivedFilter({
  checked,
  onCheckedChange,
  label,
  testID,
}: HideArchivedFilterProps): ReactElement {
  const handlePress = useCallback(() => onCheckedChange(!checked), [checked, onCheckedChange]);
  const accessibilityState = useMemo(() => ({ checked }), [checked]);
  const triggerStyle = useCallback(
    ({ pressed, hovered = false }: PressableStateCallbackType & { hovered?: boolean }) => [
      styles.trigger,
      Boolean(hovered) && styles.triggerHovered,
      pressed && styles.triggerPressed,
    ],
    [],
  );

  return (
    <PressHighlight
      onPress={handlePress}
      style={triggerStyle}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={accessibilityState}
      aria-checked={checked}
      testID={testID}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <ThemedCheck size={14} uniProps={checkColorMapping} /> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </PressHighlight>
  );
}

const styles = StyleSheet.create((theme) => ({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    alignSelf: "flex-start",
    paddingVertical: theme.spacing[1.5],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface1,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
  },
  triggerHovered: {
    backgroundColor: theme.colors.surface2,
  },
  triggerPressed: {
    backgroundColor: theme.colors.surface3,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: theme.borderRadius.sm,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  label: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
  },
}));
