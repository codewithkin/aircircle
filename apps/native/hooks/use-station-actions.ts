import { useRouter } from "expo-router";
import { useRef } from "react";
import type { View } from "react-native";

import { haptics } from "@/lib/haptics";
import { rememberStation } from "@/lib/station";
import type { Station } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { useQuickActions } from "@/stores/quick-actions";

/**
 * What a station tile or row can do: open its detail screen, play it, and
 * summon the long-press menu anchored to wherever the tile sits on screen.
 */
export function useStationActions(station: Station) {
  const router = useRouter();
  const anchorRef = useRef<View>(null);

  const open = () => {
    rememberStation(station);
    router.push({ pathname: "/station/[id]", params: { id: station.stationuuid } });
  };

  const play = () => {
    void usePlayer.getState().play(station);
  };

  const openMenu = () => {
    const node = anchorRef.current;
    if (!node) return;
    node.measureInWindow((x, y, width, height) => {
      haptics.lift();
      useQuickActions.getState().open(station, { x, y, width, height });
    });
  };

  return { anchorRef, open, play, openMenu };
}
