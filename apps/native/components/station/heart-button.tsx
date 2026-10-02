import { router } from "expo-router";
import { MotiView } from "moti";

import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { Station } from "@/lib/types";
import { useFavorites } from "@/stores/favorites";
import { useToast } from "@/stores/toast";
import { springs } from "@/theme/motion";
import { colors } from "@/theme/tokens";
import { msg, t } from "@/lib/i18n";

/** The pink used for a saved heart on light surfaces. */
export const HEART_COLOR = "#AE316E";

type HeartButtonProps = {
  station: Station;
  size?: number;
  iconSize?: number;
  /** Colour when not saved. */
  color?: string;
  /** Colour when saved. */
  savedColor?: string;
  background?: string;
};

/**
 * Save or unsave a station. The heart fills and pops the instant it's tapped —
 * favorites are local, so there is nothing to wait for.
 */
export function HeartButton({
  station,
  size = 44,
  iconSize = 24,
  color = colors.inkFaint,
  savedColor = HEART_COLOR,
  background = "transparent",
}: HeartButtonProps) {
  const saved = useFavorites((s) => s.stations.some((f) => f.stationuuid === station.stationuuid));
  const toggle = useFavorites((s) => s.toggle);
  const reduced = useReducedMotion();

  return (
    <PressableScale
      onPress={() => {
        toggle(station);
        // Only saving is confirmed; the heart emptying says enough for a removal.
        if (!saved) {
          useToast.getState().show({
            message: t("Saved to Favorites · on this device"),
            icon: "favorite",
            actionLabel: t("View"),
            onAction: () => router.navigate("/favorites"),
          });
        }
      }}
      haptic="confirm"
      pressedScale={0.88}
      accessibilityRole="button"
      accessibilityLabel={
        saved ? t("Remove {{name}} from Favorites", { name: station.name }) : t("Add {{name}} to Favorites", { name: station.name })
      }
      accessibilityState={{ selected: saved }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MotiView
        // Re-keyed on change so the pop plays for both saving and unsaving.
        key={saved ? "saved" : "unsaved"}
        from={{ scale: reduced ? 1 : saved ? 0.5 : 0.85 }}
        animate={{ scale: 1 }}
        transition={springs.pop}
      >
        <Icon name="favorite" size={iconSize} color={saved ? savedColor : color} filled={saved} />
      </MotiView>
    </PressableScale>
  );
}
