/**
 * Generated station artwork.
 *
 * Radio Browser logos are user-submitted and often missing, tiny, or dead
 * links, so every station gets a designed tile instead: a two-stop gradient
 * and one of a handful of simple shapes. Both are picked from the station's
 * id, so a station always looks the same wherever it appears.
 */

export type ArtPattern = "ring" | "stripes" | "dots" | "bars" | "blobs" | "arches" | "orbit";

export type StationArtSpec = {
  /** Gradient stops, top-left to bottom-right. */
  colors: readonly [string, string];
  pattern: ArtPattern;
};

/** The eight hue pairs used across the designs. */
const PALETTES: readonly (readonly [string, string])[] = [
  ["#A9DEF0", "#50A9D9"], // sky
  ["#B3E1C7", "#51B48D"], // mint
  ["#F8C8B7", "#DA8375"], // coral
  ["#C8D2FD", "#9196E2"], // periwinkle
  ["#ECCFA9", "#D38B59"], // amber
  ["#A7E1DD", "#2BB3B9"], // teal
  ["#F4C5DA", "#D481A2"], // rose
  ["#B7D8FB", "#6EA1E2"], // cornflower
];

const PATTERNS: readonly ArtPattern[] = [
  "ring",
  "stripes",
  "dots",
  "bars",
  "blobs",
  "arches",
  "orbit",
];

/** Tile for a station that can't currently be played. */
export const UNAVAILABLE_ART_COLORS = ["#E6E8EC", "#C9CCD4"] as const;

/** Small, stable string hash (FNV-1a). */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function stationArt(stationuuid: string): StationArtSpec {
  const h = hash(stationuuid);
  return {
    colors: PALETTES[h % PALETTES.length],
    // A different slice of the hash, so palette and pattern vary independently.
    pattern: PATTERNS[(h >>> 8) % PATTERNS.length],
  };
}

/**
 * The station's name as set inside its tile: at most two short lines, broken
 * between words. Frequencies and filler are dropped so the name stays big.
 */
export function tileLines(name: string): string[] {
  const words = name
    .replace(/[|·•–—-]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^\d+([.,]\d+)?(fm|am)?$/i.test(w) && !/^(fm|am|radio)$/i.test(w));

  const usable = words.length > 0 ? words : name.split(/\s+/).filter(Boolean);
  if (usable.length <= 1) return [usable[0] ?? name];

  const first = usable[0];
  const second = usable.slice(1, 3).join(" ");
  return [first, second.length > 12 ? usable[1] : second];
}
