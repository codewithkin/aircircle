import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HEART_COLOR } from "@/components/station/heart-button";
import { ReportSheet } from "@/components/station/report-sheet";
import { StationArt } from "@/components/station/station-art";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { usePresence } from "@/hooks/use-presence";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { shareStation } from "@/lib/share";
import { rememberStation, stationSubtitle } from "@/lib/station";
import { useFavorites } from "@/stores/favorites";
import { usePlayer } from "@/stores/player";
import { useQuickActions } from "@/stores/quick-actions";
import { useRecents } from "@/stores/recents";
import type { AnchorFrame } from "@/stores/quick-actions";
import { useReport } from "@/stores/report";
import { springs, timing } from "@/theme/motion";
import { colors, shadows } from "@/theme/tokens";
import type { Station } from "@/lib/types";

const MENU_WIDTH = 272;
const MENU_HEIGHT = 370;
const EDGE = 20;

function MenuItem({
  icon,
  label,
  onPress,
  color = colors.ink,
  iconColor,
  filled,
  highlighted,
  index,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  iconColor?: string;
  filled?: boolean;
  highlighted?: boolean;
  index: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ ...timing.base, delay: 60 + index * 30 }}
    >
      <PressableScale
        onPress={onPress}
        pressedScale={0.98}
        accessibilityRole="menuitem"
        accessibilityLabel={label}
        style={{
          height: 48,
          borderRadius: 14,
          backgroundColor: highlighted ? colors.canvas : "transparent",
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 14,
        }}
      >
        <Icon name={icon} size={22} color={iconColor ?? color} filled={filled} />
        <Txt variant="body" color={color} style={{ fontSize: 16, lineHeight: 20 }} numberOfLines={1}>
          {label}
        </Txt>
      </PressableScale>
    </MotiView>
  );
}

/**
 * The long-press menu. The rest of the screen softens, the pressed tile lifts
 * in place, and the actions open beside it. Tap anywhere else, or press back,
 * to dismiss.
 */
export function QuickActions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const reduced = useReducedMotion();

  const target = useQuickActions((s) => s.target);
  const close = useQuickActions((s) => s.close);

  // Kept so the menu still has content while it fades out.
  const [shown, setShown] = useState<{ station: Station; frame: AnchorFrame } | null>(target);
  useEffect(() => {
    if (target) setShown(target);
  }, [target]);

  const visible = target !== null;
  const mounted = usePresence(visible, 240);

  const isFavorite = useFavorites((s) =>
    shown ? s.stations.some((f) => f.stationuuid === shown.station.stationuuid) : false,
  );
  const isRecent = useRecents((s) =>
    shown ? s.stations.some((r) => r.stationuuid === shown.station.stationuuid) : false,
  );
  const current = usePlayer((s) => s.station);
  const status = usePlayer((s) => s.status);
  const recording = usePlayer((s) => s.recording);

  // The report sheet lives here too, always in the same place in the tree, so
  // it can open as this menu closes without being remounted mid-animation.
  if (!mounted || !shown) {
    return (
      <>
        {null}
        <ReportSheet />
      </>
    );
  }

  const { station, frame } = shown;
  const isCurrent = !recording && current?.stationuuid === station.stationuuid;
  const isPlaying = isCurrent && status === "playing";
  const isStopped = isCurrent && status === "stopped";

  // Open below the tile when there's room, otherwise above it.
  const below = frame.y + frame.height + 16;
  const fitsBelow = below + MENU_HEIGHT < window.height - insets.bottom - EDGE;
  const top = fitsBelow ? below : Math.max(insets.top + EDGE, frame.y - MENU_HEIGHT - 16);
  const left = Math.min(Math.max(frame.x, EDGE), window.width - MENU_WIDTH - EDGE);

  // Close first, then act, so the menu is already leaving as the action lands.
  const run = (action: () => void) => () => {
    close();
    action();
  };

  const subtitle = stationSubtitle(station);

  return (
    <>
      <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={close}>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={timing.base}
          style={StyleSheet.absoluteFill}
        >
          <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(245,246,248,0.55)" }]}
          />
        </MotiView>

        {/* The pressed tile, redrawn above the blur and lifted. */}
        <MotiView
          pointerEvents="none"
          from={{ scale: 1, opacity: 1 }}
          animate={{ scale: visible && !reduced ? 1.06 : 1, opacity: visible ? 1 : 0 }}
          transition={springs.settle}
          style={{
            position: "absolute",
            left: frame.x,
            top: frame.y,
            borderRadius: 24,
            boxShadow: shadows.lifted,
          }}
        >
          <StationArt
            station={station}
            size={frame.width}
            height={frame.height}
            radius={frame.width >= 100 ? 24 : Math.round(frame.width * 0.28)}
            showName={frame.width >= 96}
          />
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: reduced ? 1 : 0.94, translateY: reduced ? 0 : fitsBelow ? -8 : 8 }}
          animate={{
            opacity: visible ? 1 : 0,
            scale: visible || reduced ? 1 : 0.96,
            translateY: 0,
          }}
          transition={springs.settle}
          accessibilityViewIsModal
          accessibilityRole="menu"
          style={{
            position: "absolute",
            left,
            top,
            width: MENU_WIDTH,
            borderRadius: 24,
            backgroundColor: colors.card,
            boxShadow: "0 30px 60px -20px rgba(16,17,20,0.35)",
            padding: 8,
          }}
        >
          <View
            style={{
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 10,
              gap: 4,
              borderBottomWidth: 1,
              borderBottomColor: colors.hairline,
              marginBottom: 4,
            }}
          >
            <Txt variant="bodyLg" numberOfLines={1}>
              {station.name}
            </Txt>
            {subtitle ? (
              <Txt variant="caption" color={colors.inkSoft} numberOfLines={1}>
                {subtitle}
              </Txt>
            ) : null}
          </View>

          <MenuItem
            index={0}
            highlighted
            filled
            icon={isPlaying ? "pause" : "play_arrow"}
            label={isPlaying ? "Pause" : isCurrent ? "Resume" : "Play"}
            onPress={run(() => {
              const player = usePlayer.getState();
              if (isCurrent) void player.toggle();
              else void player.play(station);
            })}
          />
          <MenuItem
            index={1}
            icon="favorite"
            filled={isFavorite}
            iconColor={HEART_COLOR}
            label={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            onPress={run(() => useFavorites.getState().toggle(station))}
          />
          <MenuItem
            index={2}
            icon="info"
            label="Station details"
            onPress={run(() => {
              rememberStation(station);
              router.push({ pathname: "/station/[id]", params: { id: station.stationuuid } });
            })}
          />
          <MenuItem
            index={3}
            icon="ios_share"
            label="Share"
            onPress={run(() => void shareStation(station))}
          />
          {isRecent ? (
            <MenuItem
              index={4}
              icon="history"
              label="Remove from Recents"
              onPress={run(() => useRecents.getState().remove(station.stationuuid))}
            />
          ) : null}
          {isStopped ? (
            <MenuItem
              index={5}
              icon="close"
              label="Forget this station"
              onPress={run(() => usePlayer.getState().dismiss())}
            />
          ) : (
            <MenuItem
              index={5}
              icon="flag"
              color="#AC1922"
              label="Report"
              onPress={run(() => useReport.getState().open(station))}
            />
          )}
        </MotiView>
      </Modal>
      <ReportSheet />
    </>
  );
}
