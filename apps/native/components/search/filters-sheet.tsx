import { View } from "react-native";

import { ActionRow } from "@/components/ui/action-row";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Txt } from "@/components/ui/txt";
import { colors } from "@/theme/tokens";

export type FilterKey = "country" | "genre" | "language";

type FiltersSheetProps = {
  visible: boolean;
  onClose: () => void;
  filters: Record<FilterKey, string | null>;
  /** Opens the picker for one filter. The sheet closes first. */
  onPick: (key: FilterKey) => void;
  onClear: () => void;
  onBrowse: () => void;
};

function titleCase(value: string): string {
  return value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/**
 * All three search filters in one place. Each row shows what's set and opens
 * its own picker; the chips on the Search screen are shortcuts to the same
 * pickers.
 */
export function FiltersSheet({ visible, onClose, filters, onPick, onClear, onBrowse }: FiltersSheetProps) {
  const anySet = !!(filters.country || filters.genre || filters.language);

  const pick = (key: FilterKey) => () => {
    onClose();
    // Let this sheet get out of the way before the picker rises.
    setTimeout(() => onPick(key), 220);
  };

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel="Filters">
      <Txt variant="titleSm" accessibilityRole="header">
        Filters
      </Txt>
      <Txt variant="meta" color={colors.inkSoft} style={{ marginTop: 6 }}>
        Narrow results by where a station is, what it plays, or what it speaks.
      </Txt>

      <View style={{ marginTop: 10 }}>
        <ActionRow
          icon="place"
          tone="signal"
          title="Country"
          subtitle={filters.country ? titleCase(filters.country) : "Any country"}
          onPress={pick("country")}
        />
        <ActionRow
          icon="music_note"
          tone="violet"
          title="Genre"
          subtitle={filters.genre ? titleCase(filters.genre) : "Any genre"}
          onPress={pick("genre")}
        />
        <ActionRow
          icon="translate"
          tone="ok"
          title="Language"
          subtitle={filters.language ? titleCase(filters.language) : "Any language"}
          onPress={pick("language")}
        />
        <ActionRow
          icon="explore"
          tone="neutral"
          title="Browse instead"
          subtitle="Lists of countries, cities, languages and genres"
          divider={false}
          onPress={() => {
            onClose();
            onBrowse();
          }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 8 }}>
        <Button
          label="Clear all"
          variant="outline"
          height={52}
          disabled={!anySet}
          onPress={() => {
            onClear();
            onClose();
          }}
        />
        <Button label="Done" variant="signal" height={52} grow onPress={onClose} />
      </View>
    </Sheet>
  );
}
