import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EqBars } from "@/components/ui/live";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Eyebrow } from "@/components/ui/section-header";
import { Txt } from "@/components/ui/txt";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { haptics } from "@/lib/haptics";
import { canRecord } from "@/lib/recording/eligibility";
import type { Station } from "@/lib/types";
import { useFavorites } from "@/stores/favorites";
import { useOnboarding } from "@/stores/onboarding";
import { useRecordings } from "@/stores/recordings";
import { springs } from "@/theme/motion";
import { colors, fonts, shadows } from "@/theme/tokens";

/** How long the first-listen banner stays if it isn't closed by hand. */
const CELEBRATION_MS = 4500;

/**
 * "You're live." — shown once, the first time a station actually plays. It
 * sits over the top of the screen, never blocks a control, and goes on its own.
 */
function Celebration({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  useEffect(() => {
    haptics.success();
    const timer = setTimeout(onDone, CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: reduced ? 0 : -24, scale: reduced ? 1 : 0.96 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={springs.settle}
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        top: insets.top + 64,
        zIndex: 12,
        borderRadius: 28,
        backgroundColor: colors.ink,
        boxShadow: "0 24px 48px -20px rgba(0,0,0,0.5)",
        paddingVertical: 18,
        paddingLeft: 18,
        paddingRight: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.live,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <EqBars size={26} color={colors.onInk} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Txt color={colors.onInk} style={{ fontFamily: fonts.serif, fontSize: 30, lineHeight: 31 }}>
          You’re live.
        </Txt>
        <Txt variant="meta" color="#B8BCC8" style={{ lineHeight: 19 }}>
          This station is now playing. We’ll keep it close on Home.
        </Txt>
      </View>
      <View style={{ alignSelf: "flex-start" }}>
        <IconButton
          icon="close"
          size={36}
          iconSize={18}
          color={colors.onInk}
          background="rgba(255,255,255,0.1)"
          accessibilityLabel="Dismiss"
          onPress={onDone}
        />
      </View>
    </MotiView>
  );
}

function TipCard({
  step,
  children,
  dark = false,
}: {
  step: number;
  children: ReactNode;
  dark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <MotiView
      // Keyed by step so each tip rises in fresh as the last one leaves.
      key={step}
      from={{ opacity: 0, translateY: reduced ? 0 : 40 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ ...springs.settle, delay: 500 }}
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: insets.bottom + 16,
        zIndex: 12,
        borderRadius: 28,
        backgroundColor: dark ? colors.night : colors.card,
        boxShadow: shadows.lifted,
        padding: 20,
      }}
    >
      <Eyebrow color={dark ? colors.nightText : colors.inkFaint}>{`Tip ${step + 1} of 3`}</Eyebrow>
      {children}
    </MotiView>
  );
}

function TipActions({
  onSkip,
  skipLabel = "Skip tips",
  children,
}: {
  onSkip: () => void;
  skipLabel?: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        marginTop: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <PressableScale onPress={onSkip} hitSlop={12} accessibilityRole="button" accessibilityLabel={skipLabel}>
        <Txt variant="label" color={colors.inkSoft}>
          {skipLabel}
        </Txt>
      </PressableScale>
      {children}
    </View>
  );
}

/**
 * First-listen guidance on Now Playing: a one-off "You're live" moment, then
 * three short tips shown one at a time — never all at once, never over audio
 * controls, and every one dismissible.
 */
export function Coach({ station }: { station: Station }) {
  const router = useRouter();

  const celebrated = useOnboarding((s) => s.hasCelebratedFirstListen);
  const tipsSeen = useOnboarding((s) => s.tipsSeen);
  const wantsSleep = useOnboarding((s) => s.intents.includes("sleep"));
  const { markFirstListenCelebrated, advanceTips, skipTips } = useOnboarding.getState();

  const isFavorite = useFavorites((s) => s.stations.some((f) => f.stationuuid === station.stationuuid));
  const isRecordingNow = useRecordings((s) => s.active !== null);

  // Saving the station is the action tip 1 teaches — doing it moves things on.
  useEffect(() => {
    if (celebrated && tipsSeen === 0 && isFavorite) advanceTips();
  }, [celebrated, tipsSeen, isFavorite, advanceTips]);

  if (!celebrated) return <Celebration onDone={markFirstListenCelebrated} />;
  if (tipsSeen >= 3 || isRecordingNow) return null;

  if (tipsSeen === 0) {
    return (
      <TipCard step={0}>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
          <Icon name="favorite" size={24} color="#AE316E" />
          <Txt variant="section" style={{ flex: 1, lineHeight: 23 }}>
            Tap the heart to save this station on your device.
          </Txt>
        </View>
        <TipActions onSkip={skipTips}>
          <Button label="Got it" variant="signal" height={38} onPress={advanceTips} />
        </TipActions>
      </TipCard>
    );
  }

  if (tipsSeen === 1) {
    return (
      <TipCard step={1}>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
          <Icon name="lock" size={24} filled />
          <Txt variant="heading" style={{ flex: 1, lineHeight: 24 }}>
            Lock your phone or switch apps—use the system media controls to keep listening.
          </Txt>
        </View>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={{
            marginTop: 14,
            borderRadius: 20,
            backgroundColor: colors.night,
            paddingVertical: 12,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="lock" size={13} color={colors.nightText} filled />
              <Txt variant="tab" color={colors.nightText}>
                Lock screen · Aircircle
              </Txt>
            </View>
            <Txt variant="label" color={colors.onInk} numberOfLines={1}>
              {station.name}
            </Txt>
          </View>
          <Icon name="pause" size={26} color={colors.onInk} filled />
          <Icon name="stop" size={22} color={colors.onInk} filled />
        </View>
        <TipActions onSkip={skipTips}>
          <Button label="Got it" variant="signal" height={44} onPress={advanceTips} />
        </TipActions>
      </TipCard>
    );
  }

  // The third tip is the single most relevant utility for this listener.
  if (wantsSleep) {
    return (
      <TipCard step={2} dark>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
          <Icon name="bedtime" size={24} color={colors.nightAccent} />
          <Txt variant="titleSm" color={colors.onInk} style={{ flex: 1, fontSize: 20, lineHeight: 26 }}>
            Set a sleep timer whenever you want playback to stop automatically.
          </Txt>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
          <Button label="Not now" variant="nightOutline" height={52} onPress={skipTips} />
          <Button
            label="Set timer"
            icon="bedtime"
            variant="night"
            height={52}
            grow
            onPress={() => {
              skipTips();
              router.push("/sleep-timer");
            }}
          />
        </View>
      </TipCard>
    );
  }

  if (canRecord(station) && !station.hls) {
    return (
      <TipCard step={2}>
        <Txt variant="titleSm" style={{ marginTop: 12 }}>
          Save this station for offline listening.
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
          <Icon name="info" size={16} color={colors.inkFaint} />
          <Txt variant="caption" color={colors.inkFaint}>
            Recording starts only when you tap Record.
          </Txt>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
          <Button label="Maybe later" variant="outline" height={52} onPress={skipTips} />
          <Button
            label="Record"
            icon="fiber_manual_record"
            iconFilled
            variant="alert"
            height={52}
            grow
            onPress={() => {
              skipTips();
              void useRecordings.getState().start(station);
            }}
          />
        </View>
      </TipCard>
    );
  }

  return (
    <TipCard step={2}>
      <Txt variant="titleSm" style={{ marginTop: 12, fontSize: 20, lineHeight: 26 }}>
        We’ll remember this station here for your next visit.
      </Txt>
      <TipActions onSkip={skipTips} skipLabel="Stay here">
        <Button
          label="Go to Home"
          height={44}
          onPress={() => {
            skipTips();
            router.back();
          }}
        />
      </TipActions>
    </TipCard>
  );
}
