import type { Station } from "@/lib/types";

/**
 * Whether a station may be recorded for offline listening.
 *
 * Every station is recordable for now. Radio Browser carries no rights
 * information, so there is nothing to gate on yet. When rights data has a
 * source, this is the one function to replace — every Record control already
 * asks it.
 */
export function canRecord(_station: Station): boolean {
  return true;
}
