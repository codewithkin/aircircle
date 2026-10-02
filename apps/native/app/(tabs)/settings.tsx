import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { Linking, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { LanguageSheet, currentLanguageName } from "@/components/ui/language-sheet";
import { Icon } from "@/components/ui/icon";
import { LogoMark } from "@/components/ui/logo-mark";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Eyebrow } from "@/components/ui/section-header";
import { Txt } from "@/components/ui/txt";
import { haptics } from "@/lib/haptics";
import { REPORT_EMAIL } from "@/lib/report";
import { useFavorites } from "@/stores/favorites";
import { usePlayer } from "@/stores/player";
import { useRecents } from "@/stores/recents";
import { useRecordings } from "@/stores/recordings";
import { useSettings } from "@/stores/settings";
import { GUTTER, colors, fonts } from "@/theme/tokens";
import { t } from "@/lib/i18n";

const SLEEP_PRESETS = [15, 30, 45, 60, 120];

function formatMinutes(minutes: number): string {
  if (minutes < 60) return t("{{minutes}} min", { minutes });
  const hours = minutes / 60;
  return hours === 1 ? t("1 hour") : t("{{hours}} hours", { hours });
}

function Row({
  label,
  children,
  divider = true,
}: {
  label: string;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <View
      style={{
        minHeight: 58,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: colors.hairline,
      }}
    >
      <Txt variant="body" style={{ fontSize: 16, lineHeight: 21, flexShrink: 1 }}>
        {label}
      </Txt>
      {children}
    </View>
  );
}

/** A row whose value changes each time it is tapped. */
function CycleRow({
  label,
  value,
  onPress,
  divider = true,
}: {
  label: string;
  value: string;
  onPress: () => void;
  divider?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.99}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={t("Tap to change.")}
    >
      <Row label={label} divider={divider}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Txt variant="body" color={colors.inkSoft} style={{ lineHeight: 18 }}>
            {value}
          </Txt>
          <Icon name="chevron_right" size={20} color={colors.inkFaint} />
        </View>
      </Row>
    </PressableScale>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View accessible accessibilityLabel={`${value} ${label}`} style={{ gap: 4 }}>
      <Txt color={colors.onInk} style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 42 }}>
        {value}
      </Txt>
      <Txt variant="caption" color={colors.nightText}>
        {label}
      </Txt>
    </View>
  );
}

export default function Settings() {
  const router = useRouter();

  const favorites = useFavorites((s) => s.stations.length);
  const recents = useRecents((s) => s.stations.length);
  const recordings = useRecordings((s) => s.recordings.length);
  const hasLastStation = usePlayer((s) => s.station !== null && !s.recording);

  const reduceMotion = useSettings((s) => s.reduceMotion);
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);
  const soundFeedbackEnabled = useSettings((s) => s.soundFeedbackEnabled);
  const mobileDataNotice = useSettings((s) => s.mobileDataNotice);
  const analyticsEnabled = useSettings((s) => s.analyticsEnabled);
  const defaultSleepMinutes = useSettings((s) => s.defaultSleepMinutes);
  const update = useSettings((s) => s.update);

  const [languageOpen, setLanguageOpen] = useState(false);
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 28 }}
      >
        <Rise>
          <Txt variant="titleLg" accessibilityRole="header">
            {t("Settings")}
          </Txt>
        </Rise>

        {/* What's stored on the phone, up front: no account, nothing synced. */}
        <Rise index={1} style={{ marginTop: 18 }}>
          <View
            style={{ borderRadius: 28, backgroundColor: colors.ink, padding: 20, overflow: "hidden" }}
          >
            <View
              style={{
                position: "absolute",
                right: -60,
                top: -60,
                width: 200,
                height: 200,
                borderRadius: 100,
                borderWidth: 30,
                borderColor: "rgba(160,200,255,0.1)",
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <LogoMark inverted />
              <Eyebrow color={colors.nightText}>{t("On this device")}</Eyebrow>
            </View>
            <Txt
              color={colors.onInk}
              style={{
                fontFamily: fonts.serif,
                fontSize: 28,
                lineHeight: 29,
                letterSpacing: -0.28,
                marginTop: 16,
                maxWidth: 260,
              }}
            >
              {t("Everything stays on this phone.")}
            </Txt>
            <View style={{ flexDirection: "row", gap: 28, marginTop: 18 }}>
              <Stat value={favorites} label={t("Favorites")} />
              <Stat value={recents} label={t("Recents")} />
              {recordings > 0 ? (
                <Stat value={recordings} label={t("Recordings")} />
              ) : (
                <Stat value={hasLastStation ? 1 : 0} label={t("Last station")} />
              )}
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 18,
              }}
            >
              <Txt variant="caption" color={colors.nightText} style={{ flexShrink: 1 }}>
                {t("No account. Nothing is synced.")}
              </Txt>
              <Button
                label={t("Manage")}
                variant="night"
                height={38}
                onPress={() => router.push("/local-data")}
                accessibilityLabel={t("Manage local data")}
              />
            </View>
          </View>
        </Rise>

        <Rise index={2} style={{ marginTop: 26 }}>
          <Eyebrow>{t("Playback")}</Eyebrow>
          <View style={{ marginTop: 4 }}>
            <CycleRow
              label={t("Default sleep timer")}
              value={formatMinutes(defaultSleepMinutes)}
              divider={false}
              onPress={() => {
                haptics.tap();
                const next =
                  SLEEP_PRESETS[(SLEEP_PRESETS.indexOf(defaultSleepMinutes) + 1) % SLEEP_PRESETS.length];
                update({ defaultSleepMinutes: next });
              }}
            />
          </View>
        </Rise>

        <Rise index={3} style={{ marginTop: 22 }}>
          <Eyebrow>{t("Appearance & accessibility")}</Eyebrow>
          <View style={{ marginTop: 4 }}>
            <CycleRow
              label={t("Language")}
              value={currentLanguageName()}
              onPress={() => setLanguageOpen(true)}
            />
            <Row label={t("Reduce motion")}>
              <Toggle
                value={reduceMotion}
                onChange={(v) => update({ reduceMotion: v })}
                accessibilityLabel={t("Reduce motion")}
              />
            </Row>
            <Row label={t("Haptic feedback")}>
              <Toggle
                value={hapticsEnabled}
                onChange={(v) => update({ hapticsEnabled: v })}
                accessibilityLabel={t("Haptic feedback")}
              />
            </Row>
            <Row label={t("Play and pause sounds")} divider={false}>
              <Toggle
                value={soundFeedbackEnabled}
                onChange={(v) => update({ soundFeedbackEnabled: v })}
                accessibilityLabel={t("Play and pause sounds")}
              />
            </Row>
          </View>
        </Rise>

        <Rise index={4} style={{ marginTop: 22 }}>
          <Eyebrow>{t("Data & network")}</Eyebrow>
          <View style={{ marginTop: 4 }}>
            <Row label={t("Tell me when on mobile data")} divider={false}>
              <Toggle
                value={mobileDataNotice}
                onChange={(v) => update({ mobileDataNotice: v })}
                accessibilityLabel={t("Tell me when playback uses mobile data")}
              />
            </Row>
          </View>
          <Txt variant="meta" color={colors.inkSoft} style={{ marginTop: 8, lineHeight: 20 }}>
            {t("Live radio streams over the internet and keeps using data while it plays in the background. Stations come from third-party broadcasters and may be unavailable in some regions.")}
          </Txt>
        </Rise>

        <Rise index={5} style={{ marginTop: 22 }}>
          <Eyebrow>{t("Privacy")}</Eyebrow>
          <View style={{ marginTop: 4 }}>
            <Row label={t("Share anonymous usage data")} divider={false}>
              <Toggle
                value={analyticsEnabled}
                onChange={(v) => update({ analyticsEnabled: v })}
                accessibilityLabel={t("Share anonymous usage data")}
              />
            </Row>
          </View>
          <Txt variant="meta" color={colors.inkSoft} style={{ marginTop: 8, lineHeight: 20 }}>
            {t("Helps us see which stations fail and whether playback holds up. Never your name, your searches or your location, and there is no account to tie it to.")}
          </Txt>
        </Rise>

        <Rise index={6} style={{ marginTop: 22 }}>
          <Eyebrow>{t("Support")}</Eyebrow>
          <View style={{ marginTop: 4 }}>
            <CycleRow
              label={t("Contact support")}
              value=""
              onPress={() =>
                void Linking.openURL(
                  `mailto:${REPORT_EMAIL ?? ""}?subject=${encodeURIComponent(t("Aircircle support"))}`,
                ).catch(() => {})
              }
            />
            <Row label={t("Version")} divider={false}>
              <Txt variant="body" color={colors.inkSoft} style={{ fontFamily: fonts.mono, fontSize: 13 }}>
                {version}
              </Txt>
            </Row>
          </View>
        </Rise>
      </ScrollView>

      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </Screen>
  );
}
