import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { EditList } from "@/components/favorites/edit-list";
import { PresetGrid } from "@/components/favorites/preset-grid";
import { StationRow } from "@/components/station/station-row";
import { ActionRow } from "@/components/ui/action-row";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/txt";
import { haptics } from "@/lib/haptics";
import { useFavorites } from "@/stores/favorites";
import { totalRecordingBytes, useRecordings } from "@/stores/recordings";
import { springs, timing } from "@/theme/motion";
import { GUTTER, colors, shadows } from "@/theme/tokens";
import { t } from "@/lib/i18n";

type Layout = "grid" | "list";

/** The two-icon switch between the preset grid and the compact list. */
function LayoutSwitch({ value, onChange }: { value: Layout; onChange: (v: Layout) => void }) {
  const options: { value: Layout; icon: IconName; label: string }[] = [
    { value: "grid", icon: "grid_view", label: t("Grid") },
    { value: "list", icon: "view_agenda", label: t("List") },
  ];

  return (
    <View
      accessibilityRole="tablist"
      style={{ height: 40, borderRadius: 20, backgroundColor: colors.chip, padding: 4, flexDirection: "row" }}
    >
      <MotiView
        animate={{ translateX: value === "grid" ? 0 : 40 }}
        transition={springs.settle}
        style={{
          position: "absolute",
          left: 4,
          top: 4,
          width: 40,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.card,
        }}
      />
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => {
            if (o.value === value) return;
            haptics.tap();
            onChange(o.value);
          }}
          accessibilityRole="tab"
          accessibilityLabel={t("{{label}} view", { label: o.label })}
          accessibilityState={{ selected: o.value === value }}
          hitSlop={4}
          style={{ width: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name={o.icon} size={18} color={o.value === value ? colors.ink : colors.inkSoft} />
        </Pressable>
      ))}
    </View>
  );
}

export default function Favorites() {
  const router = useRouter();
  const stations = useFavorites((s) => s.stations);
  const recordings = useRecordings((s) => s.recordings);

  const [layout, setLayout] = useState<Layout>("grid");
  const [editing, setEditing] = useState(false);

  const startEditing = () => {
    if (stations.length === 0) return;
    haptics.lift();
    setEditing(true);
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        // Dragging a row must not also scroll the list underneath it.
        scrollEnabled={!editing || stations.length > 7}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 24 }}
      >
        {/* The header swaps in place between browsing and editing. */}
        <MotiView
          key={editing ? "edit" : "browse"}
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={timing.base}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 40,
            }}
          >
            <Txt variant={editing ? "title" : "titleLg"} accessibilityRole="header">
              {editing ? t("Edit favorites") : t("Favorites")}
            </Txt>
            {editing ? (
              <Button label={t("Done")} variant="signal" height={40} onPress={() => setEditing(false)} />
            ) : stations.length > 0 ? (
              <LayoutSwitch value={layout} onChange={setLayout} />
            ) : null}
          </View>

          {editing ? (
            <Txt variant="meta" color={colors.inkSoft} style={{ marginTop: 8, lineHeight: 20 }}>
              {t("Drag to reorder. Order is saved on this device.")}
            </Txt>
          ) : (
            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="smartphone" size={16} color={colors.inkSoft} />
              <Txt variant="meta" color={colors.inkSoft}>
                {t("Saved on this device")}
              </Txt>
            </View>
          )}
        </MotiView>

        <View style={{ marginTop: 20 }}>
          {stations.length === 0 ? (
            <Rise index={1}>
              <View
                style={{
                  borderRadius: 28,
                  backgroundColor: colors.card,
                  boxShadow: shadows.card,
                  padding: 22,
                }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: "#FFE7F1",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="favorite" size={26} color="#AE316E" filled />
                </View>
                <Txt variant="titleSm" style={{ marginTop: 18 }}>
                  {t("Save stations for one-tap listening.")}
                </Txt>
                <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 6 }}>
                  {t("Tap the heart on any station and it becomes a preset here.")}
                </Txt>
                <Button
                  label={t("Browse stations")}
                  icon="explore"
                  height={52}
                  onPress={() => router.push("/browse")}
                  containerStyle={{ marginTop: 18, alignSelf: "flex-start" }}
                />
              </View>
            </Rise>
          ) : editing ? (
            <EditList />
          ) : layout === "grid" ? (
            <PresetGrid stations={stations} onLongPress={startEditing} />
          ) : (
            <View key="list">
              {stations.map((s, i) => (
                <StationRow
                  key={s.stationuuid}
                  station={s}
                  index={i}
                  trailing="play"
                  divider={i < stations.length - 1}
                />
              ))}
            </View>
          )}
        </View>

        {!editing && stations.length > 0 ? (
          <Rise index={6} style={{ marginTop: 18, alignSelf: "flex-start" }}>
            <Button
              label={t("Edit favorites")}
              icon="edit"
              variant="outline"
              height={44}
              onPress={startEditing}
            />
          </Rise>
        ) : null}

        {/* Saved recordings live alongside Favorites: both are "mine, on this phone". */}
        {!editing && recordings.length > 0 ? (
          <Rise
            index={7}
            style={{
              marginTop: 24,
              borderRadius: 22,
              backgroundColor: colors.card,
              boxShadow: shadows.card,
              paddingHorizontal: 16,
              paddingVertical: 4,
            }}
          >
            <ActionRow
              icon="download_done"
              tone="violet"
              title={t("Recordings")}
              subtitle={t("{{count}} saved · {{value}} MB · Available offline", { count: recordings.length, value: (totalRecordingBytes(recordings) / 1_000_000).toFixed(1) })}
              divider={false}
              onPress={() => router.push("/recordings")}
            />
          </Rise>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
