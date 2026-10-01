import { Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { Gradient } from "@/components/ui/gradient";
import type { Station } from "@/lib/types";
import { UNAVAILABLE_ART_COLORS, stationArt, tileLines } from "@/theme/station-art";
import type { ArtPattern } from "@/theme/station-art";
import { fonts } from "@/theme/tokens";

type StationArtProps = {
  station: Pick<Station, "stationuuid" | "name">;
  /** Width in points. Square unless `height` is given. */
  size: number;
  height?: number;
  radius?: number;
  /** Set the station's name inside the tile. Off for small thumbnails. */
  showName?: boolean;
  /** Greyed out: the station can't be played right now. */
  unavailable?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The shapes laid over the gradient. Every measurement is a fraction of the
 * tile's size, so the same artwork holds from a 32pt thumbnail to the 272pt
 * Now Playing tile.
 */
function Pattern({ pattern, s }: { pattern: ArtPattern; s: number }) {
  switch (pattern) {
    case "ring":
      return (
        <View
          style={{
            position: "absolute",
            right: -0.26 * s,
            top: -0.23 * s,
            width: 0.91 * s,
            height: 0.91 * s,
            borderRadius: s,
            borderWidth: 0.136 * s,
            borderColor: "rgba(255,255,255,0.3)",
          }}
        />
      );

    case "stripes":
      return (
        <View
          style={{
            position: "absolute",
            left: -0.5 * s,
            top: -0.5 * s,
            width: 2 * s,
            height: 2 * s,
            flexDirection: "row",
            transform: [{ rotate: "45deg" }],
          }}
        >
          {Array.from({ length: 16 }, (_, i) => (
            <View
              key={i}
              style={{
                width: 0.06 * s,
                marginRight: 0.07 * s,
                backgroundColor: "rgba(255,255,255,0.18)",
              }}
            />
          ))}
        </View>
      );

    case "dots": {
      // Fewer, larger dots on small tiles so they stay dots rather than noise.
      const perSide = s >= 100 ? 7 : 4;
      const step = s / perSide;
      const d = step * 0.42;
      return (
        <View style={{ position: "absolute", inset: 0, flexDirection: "row", flexWrap: "wrap" }}>
          {Array.from({ length: perSide * perSide }, (_, i) => (
            <View
              key={i}
              style={{ width: step, height: step, alignItems: "center", justifyContent: "center" }}
            >
              <View
                style={{
                  width: d,
                  height: d,
                  borderRadius: d,
                  backgroundColor: "rgba(255,255,255,0.45)",
                }}
              />
            </View>
          ))}
        </View>
      );
    }

    case "bars": {
      const line = Math.max(1.5, 0.023 * s);
      return (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 0.58 * s }}>
          {Array.from({ length: 7 }, (_, i) => (
            <View
              key={i}
              style={{
                height: line,
                marginBottom: 0.06 * s,
                backgroundColor: "rgba(255,255,255,0.28)",
              }}
            />
          ))}
        </View>
      );
    }

    case "blobs":
      return (
        <>
          <View
            style={{
              position: "absolute",
              right: -0.12 * s,
              bottom: -0.2 * s,
              width: 0.39 * s,
              height: 0.39 * s,
              borderRadius: s,
              backgroundColor: "rgba(255,255,255,0.22)",
            }}
          />
          <View
            style={{
              position: "absolute",
              right: 0.02 * s,
              bottom: -0.06 * s,
              width: 0.17 * s,
              height: 0.17 * s,
              borderRadius: s,
              backgroundColor: "rgba(255,255,255,0.3)",
            }}
          />
        </>
      );

    case "arches":
      return (
        <>
          <View
            style={{
              position: "absolute",
              right: 0.1 * s,
              bottom: -0.04 * s,
              width: 0.46 * s,
              height: 0.73 * s,
              borderTopLeftRadius: 0.23 * s,
              borderTopRightRadius: 0.23 * s,
              backgroundColor: "rgba(255,255,255,0.24)",
            }}
          />
          <View
            style={{
              position: "absolute",
              right: 0.19 * s,
              bottom: -0.04 * s,
              width: 0.27 * s,
              height: 0.5 * s,
              borderTopLeftRadius: 0.135 * s,
              borderTopRightRadius: 0.135 * s,
              backgroundColor: "rgba(255,255,255,0.24)",
            }}
          />
        </>
      );

    case "orbit":
      return (
        <>
          <View
            style={{
              position: "absolute",
              right: -0.5 * s,
              top: -0.5 * s,
              width: 1.02 * s,
              height: 1.02 * s,
              borderRadius: s,
              borderWidth: Math.max(2, 0.04 * s),
              borderColor: "rgba(255,255,255,0.35)",
            }}
          />
          <View
            style={{
              position: "absolute",
              right: -0.29 * s,
              top: -0.29 * s,
              width: 0.6 * s,
              height: 0.6 * s,
              borderRadius: s,
              backgroundColor: "rgba(255,255,255,0.26)",
            }}
          />
        </>
      );
  }
}

/**
 * A station's artwork tile: a gradient and a shape, both chosen from the
 * station's id so it looks the same everywhere it appears.
 */
export function StationArt({
  station,
  size,
  height,
  radius,
  showName = false,
  unavailable = false,
  style,
}: StationArtProps) {
  const spec = stationArt(station.stationuuid);
  const h = height ?? size;
  // Shapes are laid out against the shorter side so wide tiles don't stretch them.
  const s = Math.min(size, h);
  const fontSize = Math.round(s * 0.129 * 10) / 10;

  return (
    <Gradient
      colors={unavailable ? UNAVAILABLE_ART_COLORS : spec.colors}
      angle={160}
      style={[
        {
          width: size,
          height: h,
          borderRadius: radius ?? Math.round(s * 0.18),
          overflow: "hidden",
          justifyContent: "flex-end",
          padding: s * 0.1,
          opacity: unavailable ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Pattern pattern={spec.pattern} s={s} />
      {showName ? (
        <Text
          allowFontScaling={false}
          numberOfLines={2}
          style={{
            fontFamily: fonts.sansSemibold,
            fontSize,
            lineHeight: fontSize * 1.02,
            letterSpacing: -0.025 * fontSize,
            color: "#FFFFFF",
          }}
        >
          {tileLines(station.name).join("\n")}
        </Text>
      ) : null}
    </Gradient>
  );
}
