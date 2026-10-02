import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { canSwitchOutput, routeLabel, showOutputSwitcher, useAudioRoute } from "@/lib/audio-route";
import type { AudioRouteKind } from "@/lib/audio-route";
import { useToast } from "@/stores/toast";
import { colors, shadows } from "@/theme/tokens";

const ICONS: Record<AudioRouteKind, IconName> = {
  speaker: "smartphone",
  wired: "headphones",
  bluetooth: "headphones",
  car: "speaker",
  other: "speaker",
};

/**
 * Shows where audio is going and opens the system's output switcher, so the
 * listener can move between the phone, headphones, Bluetooth and a car without
 * leaving the player. Absent on builds that can't do either.
 */
export function OutputChip({ translucent = false }: { translucent?: boolean }) {
  const route = useAudioRoute((s) => s.route);
  if (!canSwitchOutput || !route) return null;

  const label = routeLabel(route);

  return (
    <PressableScale
      onPress={() => {
        if (!showOutputSwitcher()) {
          useToast.getState().show({ message: "Couldn’t open the output switcher", icon: "error" });
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={`Audio output: ${label}`}
      accessibilityHint="Opens the output switcher."
      style={{
        height: 44,
        maxWidth: 132,
        borderRadius: 22,
        backgroundColor: translucent ? "rgba(255,255,255,0.7)" : colors.card,
        boxShadow: translucent ? undefined : shadows.hairline,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingLeft: 12,
        paddingRight: 14,
      }}
    >
      <Icon name={ICONS[route.kind]} size={20} />
      <Txt variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </Txt>
    </PressableScale>
  );
}
