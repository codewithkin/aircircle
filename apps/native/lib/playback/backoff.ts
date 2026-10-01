const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 15000;

/**
 * Bounded exponential backoff with full jitter on the top half of the window:
 * attempt 0 waits 0.5–1s, attempt 1 waits 1–2s, and so on up to the cap. The
 * jitter keeps a station that dropped every listener at once from being hit by
 * all of them on the same tick.
 */
export function backoffDelay(attempt: number): number {
  const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return Math.round(ceiling / 2 + Math.random() * (ceiling / 2));
}
