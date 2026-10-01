import { create } from "zustand";

import type { Station } from "@/lib/types";

export type ReportReason = "no-play" | "wrong-audio" | "wrong-details" | "wrong-metadata" | "other";

type ReportState = {
  station: Station | null;
  /** The reason selected when the sheet opens. */
  initialReason: ReportReason;
  open: (station: Station, reason?: ReportReason) => void;
  close: () => void;
};

/** The Report sheet. One instance at the root; any screen can open it. */
export const useReport = create<ReportState>((set) => ({
  station: null,
  initialReason: "no-play",
  open: (station, reason = "no-play") => set({ station, initialReason: reason }),
  close: () => set({ station: null }),
}));
