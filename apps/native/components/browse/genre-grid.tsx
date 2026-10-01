import { View } from "react-native";

import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Txt } from "@/components/ui/txt";
import { colors, fonts } from "@/theme/tokens";

type Genre = {
  name: string;
  /** Solid colour, or two stops for a gradient. */
  colors: readonly [string, string];
  angle?: number;
  icon: IconName;
  iconColor: string;
  /** Dark text for the light tiles. */
  dark?: boolean;
  blurb?: string;
};

/** The ten genres offered in onboarding, each with its own tile. */
export const GENRES: Genre[] = [
  {
    name: "Jazz",
    colors: ["#2863AB", "#1B295A"],
    angle: 165,
    icon: "piano",
    iconColor: "#89CEF6",
    blurb: "Late sets, standards",
  },
  { name: "News", colors: ["#DA4339", "#DA4339"], icon: "newspaper", iconColor: "rgba(255,255,255,0.5)" },
  {
    name: "Culture",
    colors: ["#7F5BB6", "#7F5BB6"],
    icon: "theater_comedy",
    iconColor: "rgba(255,255,255,0.85)",
  },
  {
    name: "Classical",
    colors: ["#F7E6C3", "#F7E6C3"],
    icon: "music_note",
    iconColor: "#733D00",
    dark: true,
    blurb: "Orchestral, choral, early music",
  },
  { name: "Talk", colors: ["#008388", "#008388"], icon: "forum", iconColor: "rgba(255,255,255,0.88)" },
  { name: "Community", colors: ["#33854A", "#33854A"], icon: "groups", iconColor: "rgba(255,255,255,0.6)" },
  {
    name: "Music",
    colors: ["#DC4B69", "#F28E42"],
    angle: 115,
    icon: "album",
    iconColor: "rgba(23,24,28,0.75)",
    blurb: "Pop, rock, electronic, world",
  },
  { name: "Student/College", colors: ["#2D4E78", "#2D4E78"], icon: "school", iconColor: "#ECC980" },
  {
    name: "Sports",
    colors: ["#94D457", "#94D457"],
    icon: "sports_soccer",
    iconColor: "rgba(255,255,255,0.75)",
    dark: true,
  },
  { name: "Religious", colors: ["#A35E16", "#A35E16"], icon: "church", iconColor: "rgba(255,255,255,0.7)" },
];

const ROW = 96;
const GAP = 10;

function Tile({
  genre,
  picked,
  height,
  index,
  onPress,
}: {
  genre: Genre;
  picked: boolean;
  height: number;
  index: number;
  onPress: () => void;
}) {
  const fg = genre.dark ? colors.ink : colors.onInk;
  const tall = height > ROW;

  return (
    <Rise index={index} offset={12} style={{ flex: 1 }}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${genre.name}${picked ? ", your pick" : ""}`}
        accessibilityHint="Shows stations in this genre."
      >
        <Gradient
          colors={genre.colors}
          angle={genre.angle ?? 160}
          style={{
            height,
            borderRadius: 24,
            overflow: "hidden",
            paddingVertical: 14,
            paddingHorizontal: 16,
            justifyContent: "flex-end",
          }}
        >
          <Icon
            name={genre.icon}
            size={tall ? 96 : 54}
            color={genre.iconColor}
            filled
            style={{ position: "absolute", right: tall ? 10 : 12, top: tall ? 46 : 10 }}
          />

          {picked ? (
            <View
              style={{
                position: "absolute",
                left: 12,
                top: 12,
                height: 24,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.92)",
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingLeft: 7,
                paddingRight: 9,
              }}
            >
              <Icon name="check" size={13} />
              <Txt variant="tab" style={{ fontFamily: fonts.sansSemibold, fontSize: 11 }}>
                Your pick
              </Txt>
            </View>
          ) : null}

          <Txt color={fg} style={{ fontFamily: fonts.sansSemibold, fontSize: 19, lineHeight: 21, letterSpacing: -0.19 }}>
            {genre.name}
          </Txt>
          {genre.blurb && (tall || !picked) ? (
            <Txt variant="tab" color={fg} numberOfLines={1} style={{ marginTop: 4, opacity: 0.85 }}>
              {genre.blurb}
            </Txt>
          ) : null}
        </Gradient>
      </PressableScale>
    </Rise>
  );
}

/**
 * The genre grid. Genres the listener picked in onboarding come first and the
 * very first gets the tall tile, so the grid is arranged around their taste
 * instead of being the same wall for everyone.
 */
export function GenreGrid({ picks, onSelect }: { picks: string[]; onSelect: (genre: string) => void }) {
  const ordered = [
    ...GENRES.filter((g) => picks.includes(g.name)),
    ...GENRES.filter((g) => !picks.includes(g.name)),
  ];

  // A repeating rhythm: tall + two stacked, one wide, a pair, one wide, a pair.
  const rows: React.ReactNode[] = [];
  let i = 0;
  let step = 0;

  const tile = (genre: Genre, height = ROW) => (
    <Tile
      key={genre.name}
      genre={genre}
      height={height}
      index={Math.min(rows.length + 1, 8)}
      picked={picks.includes(genre.name)}
      onPress={() => onSelect(genre.name)}
    />
  );

  while (i < ordered.length) {
    const left = ordered.length - i;
    const kind = step % 5;

    if (kind === 0 && left >= 3) {
      rows.push(
        <View key={`r${i}`} style={{ flexDirection: "row", gap: GAP }}>
          {tile(ordered[i], ROW * 2 + GAP)}
          <View style={{ flex: 1, gap: GAP }}>
            {tile(ordered[i + 1])}
            {tile(ordered[i + 2])}
          </View>
        </View>,
      );
      i += 3;
    } else if ((kind === 1 || kind === 3 || left === 1) && left >= 1) {
      rows.push(
        <View key={`r${i}`} style={{ flexDirection: "row" }}>
          {tile(ordered[i])}
        </View>,
      );
      i += 1;
    } else {
      rows.push(
        <View key={`r${i}`} style={{ flexDirection: "row", gap: GAP }}>
          {tile(ordered[i])}
          {tile(ordered[i + 1])}
        </View>,
      );
      i += 2;
    }
    step += 1;
  }

  return <View style={{ gap: GAP }}>{rows}</View>;
}
