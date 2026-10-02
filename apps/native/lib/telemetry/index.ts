import { getJson, setJson } from "@/lib/storage";
import { useSettings } from "@/stores/settings";

/**
 * Anonymous usage signals.
 *
 * Everything the app measures goes through `track()`. It is deliberately
 * small and boring:
 *
 *   - No names, no search text, no location, no account — there isn't one.
 *     Payloads are counts, categories and durations.
 *   - The only identifier is a random id made on this device, which
 *     TelemetryDeck hashes again before storing. It can't be tied to a person
 *     and is wiped with the app's data.
 *   - The listener can turn it off in Settings.
 *
 * The sender is plugged in separately (see `telemetrydeck.ts`) so that
 * nothing else in the app depends on the analytics SDK.
 */

export type SignalPayload = Record<string, string | number | boolean>;

type Sender = (type: string, payload: Record<string, string>) => void;

let sender: Sender | null = null;

const INSTALL_ID_KEY = "telemetry.installId";

/** A random id for this install. Not derived from the device or the listener. */
export function getInstallId(): string {
  const existing = getJson<string>(INSTALL_ID_KEY);
  if (typeof existing === "string" && existing.length > 0) return existing;

  const id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  setJson(INSTALL_ID_KEY, id);
  return id;
}

export function setTelemetrySender(next: Sender | null): void {
  sender = next;
}

/**
 * Records that something happened. Safe to call from anywhere, at any time:
 * with telemetry off or unconfigured it does nothing, and it never throws.
 */
export function track(type: string, payload: SignalPayload = {}): void {
  if (!sender || !useSettings.getState().analyticsEnabled) return;

  // TelemetryDeck payloads are flat string maps.
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) flat[key] = String(value);

  try {
    sender(type, flat);
  } catch {
    /* measuring must never get in the way of the thing being measured */
  }
}
