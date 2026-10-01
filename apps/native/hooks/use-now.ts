import { useEffect, useState } from "react";

/**
 * The current time, refreshed on an interval — for countdowns and elapsed
 * timers. Pass `null` to stop ticking when nothing on screen needs it.
 */
export function useNow(intervalMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (intervalMs === null) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
