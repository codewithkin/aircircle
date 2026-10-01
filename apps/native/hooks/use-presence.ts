import { useEffect, useState } from "react";

/**
 * Keeps something mounted just long enough to animate out.
 *
 * Returns true while `visible` is true and for `exitMs` afterwards, so the
 * caller can drive an exit animation from `visible` and still have an element
 * on screen to run it on.
 */
export function usePresence(visible: boolean, exitMs = 280): boolean {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(timer);
  }, [visible, exitMs]);

  return visible || mounted;
}
