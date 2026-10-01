import { create } from "zustand";

import type { Station } from "@/lib/types";

/** Where the long-pressed tile sits on screen, so the menu can open beside it. */
export type AnchorFrame = { x: number; y: number; width: number; height: number };

type QuickActionsState = {
  target: { station: Station; frame: AnchorFrame } | null;
  open: (station: Station, frame: AnchorFrame) => void;
  close: () => void;
};

/**
 * The long-press menu. One instance lives at the root and any station tile
 * can summon it.
 */
export const useQuickActions = create<QuickActionsState>((set) => ({
  target: null,
  open: (station, frame) => set({ target: { station, frame } }),
  close: () => set({ target: null }),
}));
