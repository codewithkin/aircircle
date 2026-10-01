import { create } from "zustand";

import type { IconName } from "@/theme/icon-glyphs";

export type Toast = {
  id: number;
  message: string;
  icon?: IconName;
  /** An optional single action, e.g. Undo. */
  actionLabel?: string;
  onAction?: () => void;
};

const DURATION_MS = 4000;

let timer: ReturnType<typeof setTimeout> | null = null;
let nextId = 1;

type ToastState = {
  toast: Toast | null;
  show: (toast: Omit<Toast, "id">) => void;
  hide: () => void;
};

/**
 * Short confirmations for things that can be undone: "Saved to Favorites",
 * "Stopped · Undo". One at a time; a new one replaces the last. Never used as
 * the only explanation of an error — those get a persistent state on screen.
 */
export const useToast = create<ToastState>((set) => ({
  toast: null,

  show: (toast) => {
    if (timer) clearTimeout(timer);
    set({ toast: { ...toast, id: nextId++ } });
    timer = setTimeout(() => {
      timer = null;
      set({ toast: null });
    }, DURATION_MS);
  },

  hide: () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    set({ toast: null });
  },
}));
