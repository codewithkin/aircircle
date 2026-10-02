import { useEffect, useState } from "react";
import { View } from "react-native";
import { create } from "zustand";

import { StationArt } from "@/components/station/station-art";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { Txt } from "@/components/ui/txt";
import { shareStation } from "@/lib/share";
import { stationSubtitle } from "@/lib/station";
import type { Station } from "@/lib/types";
import { colors } from "@/theme/tokens";
import { t } from "@/lib/i18n";

type ShareState = {
  target: { station: Station; nowPlaying: string } | null;
  close: () => void;
};

const useShare = create<ShareState>((set) => ({
  target: null,
  close: () => set({ target: null }),
}));

/**
 * Shares a station. With nothing fresh on air to add, the native share sheet
 * opens straight away. When there is a current title, the listener is asked
 * first whether to include it — off unless they turn it on, so a share never
 * gives away what someone is listening to by default.
 */
export function share(station: Station, nowPlaying: string | null): void {
  if (!nowPlaying) {
    void shareStation(station);
    return;
  }
  useShare.setState({ target: { station, nowPlaying } });
}

export function ShareSheet() {
  const target = useShare((s) => s.target);
  const close = useShare((s) => s.close);

  // Kept so the sheet still has content while it slides away.
  const [shown, setShown] = useState(target);
  const [include, setInclude] = useState(false);

  useEffect(() => {
    if (!target) return;
    setShown(target);
    setInclude(false);
  }, [target]);

  return (
    <Sheet visible={target !== null} onClose={close} accessibilityLabel={t("Share station")}>
      {shown ? (
        <View>
          <Txt variant="titleSm" accessibilityRole="header">
            {t("Share station")}
          </Txt>

          <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <StationArt station={shown.station} size={52} radius={15} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="bodyLg" numberOfLines={1}>
                {shown.station.name}
              </Txt>
              <Txt variant="meta" color={colors.inkSoft} numberOfLines={1}>
                {stationSubtitle(shown.station) || t("Live radio")}
              </Txt>
            </View>
          </View>

          <View
            style={{
              marginTop: 18,
              borderRadius: 18,
              backgroundColor: colors.canvas,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Txt variant="bodyLg">{t("Include what’s playing")}</Txt>
              <Txt variant="caption" color={colors.inkSoft} numberOfLines={2}>
                {shown.nowPlaying}
              </Txt>
            </View>
            <Toggle value={include} onChange={setInclude} accessibilityLabel={t("Include what’s playing")} />
          </View>

          <Button
            label={t("Share")}
            icon="ios_share"
            onPress={() => {
              const { station, nowPlaying } = shown;
              close();
              void shareStation(station, include ? nowPlaying : null);
            }}
            containerStyle={{ marginTop: 18, marginBottom: 8 }}
          />
        </View>
      ) : null}
    </Sheet>
  );
}
