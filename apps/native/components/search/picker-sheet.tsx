import { useState } from "react";
import { FlatList, TextInput, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Sheet } from "@/components/ui/sheet";
import { RowListSkeleton } from "@/components/ui/skeleton";
import { Txt } from "@/components/ui/txt";
import { useAsync } from "@/hooks/use-async";
import type { BrowseEntry } from "@/lib/api/radio-browser";
import { colors, fonts } from "@/theme/tokens";
import { t } from "@/lib/i18n";

type PickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Loads the options; called once each time the sheet opens. */
  load: () => Promise<BrowseEntry[]>;
  selected?: string | null;
  onSelect: (value: string | null) => void;
};

function titleCase(value: string): string {
  return value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/**
 * A single-choice filter picker: a short list with its own search, opened from
 * a filter chip. Picking a row applies it and closes the sheet.
 */
export function PickerSheet({ visible, onClose, title, load, selected, onSelect }: PickerSheetProps) {
  const [query, setQuery] = useState("");
  const options = useAsync(visible ? `picker:${title}` : null, load);

  const needle = query.trim().toLowerCase();
  const rows = (options.data ?? []).filter((o) => !needle || o.name.toLowerCase().includes(needle));

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={title}>
      <Txt variant="titleSm" accessibilityRole="header">
        {title}
      </Txt>

      <View
        style={{
          marginTop: 14,
          height: 46,
          borderRadius: 23,
          backgroundColor: colors.canvas,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
        }}
      >
        <Icon name="search" size={20} color={colors.inkSoft} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("Search")}
          placeholderTextColor={colors.inkFaint}
          autoCorrect={false}
          accessibilityLabel={t("Search")}
          style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, padding: 0 }}
        />
      </View>

      <View style={{ height: 340, marginTop: 8 }}>
        {options.loading && !options.data ? (
          <RowListSkeleton count={4} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.name}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              selected ? (
                <PressableScale
                  onPress={() => {
                    onSelect(null);
                    onClose();
                  }}
                  pressedScale={0.985}
                  accessibilityRole="button"
                  accessibilityLabel={t("Remove filters")}
                  style={{ height: 52, flexDirection: "row", alignItems: "center", gap: 10 }}
                >
                  <Icon name="close" size={20} color={colors.inkSoft} />
                  <Txt variant="bodyLg" color={colors.inkSoft}>
                    {t("All")}
                  </Txt>
                </PressableScale>
              ) : null
            }
            ListEmptyComponent={
              <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 18 }}>
                {options.error ? t("Couldn’t load the list. Check your connection.") : t("Nothing matches.")}
              </Txt>
            }
            renderItem={({ item }) => {
              const isSelected = item.name === selected;
              return (
                <PressableScale
                  onPress={() => {
                    onSelect(item.name);
                    onClose();
                  }}
                  pressedScale={0.985}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={t("{{name}}, {{count}} stations", { name: item.name, count: item.stationCount })}
                  style={{
                    height: 52,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.hairline,
                  }}
                >
                  <Txt variant="bodyLg" numberOfLines={1} style={{ flex: 1 }}>
                    {titleCase(item.name)}
                  </Txt>
                  <Txt variant="caption" color={colors.inkFaint}>
                    {item.stationCount.toLocaleString()}
                  </Txt>
                  {isSelected ? <Icon name="check" size={20} color={colors.signal} /> : null}
                </PressableScale>
              );
            }}
          />
        )}
      </View>
    </Sheet>
  );
}
