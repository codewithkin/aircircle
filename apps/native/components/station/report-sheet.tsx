import { MotiView } from "moti";
import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Txt } from "@/components/ui/txt";
import { haptics } from "@/lib/haptics";
import { REPORT_REASONS, sendReport } from "@/lib/report";
import { stationPlace } from "@/lib/station";
import type { Station } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { useReport } from "@/stores/report";
import type { ReportReason } from "@/stores/report";
import { useToast } from "@/stores/toast";
import { springs, timing } from "@/theme/motion";
import { colors, fonts } from "@/theme/tokens";
import { t } from "@/lib/i18n";

const TILES: { reason: ReportReason; icon: IconName }[] = [
  { reason: "no-play", icon: "volume_off" },
  { reason: "wrong-audio", icon: "swap_horiz" },
  { reason: "wrong-details", icon: "badge" },
  { reason: "wrong-metadata", icon: "music_off" },
];

function ReasonTile({
  reason,
  icon,
  selected,
  onSelect,
  wide = false,
}: {
  reason: ReportReason;
  icon: IconName;
  selected: boolean;
  onSelect: () => void;
  wide?: boolean;
}) {
  const fg = selected ? "#AC1922" : colors.ink;

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onSelect();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={t(REPORT_REASONS[reason])}
      style={{ flexBasis: wide ? "100%" : "48%", flexGrow: 1 }}
    >
      <MotiView
        animate={{
          backgroundColor: selected ? colors.alertSoft : colors.canvas,
          borderColor: selected ? colors.alertStrong : "rgba(211,58,60,0)",
        }}
        transition={timing.base}
        style={
          wide
            ? {
                height: 52,
                borderRadius: 18,
                borderWidth: 2,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 12,
              }
            : { height: 96, borderRadius: 20, borderWidth: 2, padding: 12, justifyContent: "space-between" }
        }
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Icon name={icon} size={22} color={fg} />
          {selected && !wide ? (
            <MotiView from={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.pop}>
              <Icon name="check_circle" size={20} color={fg} filled />
            </MotiView>
          ) : null}
        </View>
        <Txt variant="label" color={fg} style={{ lineHeight: 17.5, flex: wide ? 1 : undefined }}>
          {t(REPORT_REASONS[reason])}
        </Txt>
        {selected && wide ? <Icon name="check_circle" size={20} color={fg} filled /> : null}
      </MotiView>
    </Pressable>
  );
}

/**
 * "Report a problem": one reason at a time, details optional. Opening it never
 * touches playback, and swiping it away cancels with nothing sent.
 */
export function ReportSheet() {
  const station = useReport((s) => s.station);
  const initialReason = useReport((s) => s.initialReason);
  const close = useReport((s) => s.close);

  // Kept so the sheet still has content while it slides away.
  const [shown, setShown] = useState<Station | null>(station);
  const [reason, setReason] = useState<ReportReason>(initialReason);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!station) return;
    setShown(station);
    setReason(initialReason);
    setNote("");
  }, [station, initialReason]);

  const submit = async () => {
    if (!shown) return;
    const lastError = usePlayer.getState().error;
    const sent = await sendReport({
      station: shown,
      reason,
      note,
      lastError: lastError?.detail ?? lastError?.message ?? null,
    });
    close();
    useToast.getState().show(
      sent
        ? { message: t("Report ready in your mail app"), icon: "check_circle" }
        : { message: t("No mail app found to send the report"), icon: "error" },
    );
  };

  return (
    <Sheet visible={station !== null} onClose={close} accessibilityLabel={t("Report a problem")}>
      {shown ? (
        <View>
          <Txt variant="titleSm" accessibilityRole="header">
            {t("Report a problem")}
          </Txt>
          <Txt variant="meta" color={colors.inkSoft} style={{ marginTop: 6 }} numberOfLines={1}>
            {[shown.name, stationPlace(shown)].filter(Boolean).join(" · ")}
          </Txt>

          <View
            accessibilityRole="radiogroup"
            style={{ marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 8 }}
          >
            {TILES.map((tile) => (
              <ReasonTile
                key={tile.reason}
                {...tile}
                selected={reason === tile.reason}
                onSelect={() => setReason(tile.reason)}
              />
            ))}
            <ReasonTile
              wide
              reason="other"
              icon="more_horiz"
              selected={reason === "other"}
              onSelect={() => setReason("other")}
            />
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t("Add details (optional)")}
            placeholderTextColor={colors.inkFaint}
            multiline
            maxLength={500}
            accessibilityLabel={t("Details, optional")}
            style={{
              marginTop: 14,
              height: 84,
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: "#D5D8DE",
              padding: 14,
              fontFamily: fonts.sans,
              fontSize: 15,
              lineHeight: 20,
              color: colors.ink,
              textAlignVertical: "top",
            }}
          />

          <Txt variant="caption" color={colors.inkFaint} style={{ marginTop: 12, lineHeight: 19 }}>
            {t("Your report includes the station and the last playback error. No account needed.")}
          </Txt>

          <Button
            label={t("Send report")}
            variant="alert"
            onPress={() => void submit()}
            containerStyle={{ marginTop: 16, marginBottom: 8 }}
          />
        </View>
      ) : null}
    </Sheet>
  );
}
