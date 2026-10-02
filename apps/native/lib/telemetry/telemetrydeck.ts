import { createTelemetryDeck } from "@typedigital/telemetrydeck-react";
import * as ExpoCrypto from "expo-crypto";
import { Platform } from "react-native";
import { TextEncoder as PolyfillTextEncoder } from "text-encoding";

import { getInstallId, setTelemetrySender } from "@/lib/telemetry";
import { startTelemetryInstrumentation } from "@/lib/telemetry/instrument";

/**
 * The TelemetryDeck end of telemetry — the only file that knows the SDK.
 *
 * The SDK is written for browsers and expects Web Crypto and TextEncoder to
 * hash the install id before it leaves the phone. React Native has neither as
 * the browser shapes them, so they are filled in from expo-crypto and
 * text-encoding, and only where the runtime doesn't already provide them.
 */

const APP_ID = process.env.EXPO_PUBLIC_TELEMETRYDECK_APP_ID ?? "";

type Options = Parameters<typeof createTelemetryDeck>[0];

/** The organisation namespace the app's signals are filed under. */
const NAMESPACE = "com.manassehtechnologies";

function installWebShims(): void {
  const scope = globalThis as unknown as { crypto?: unknown; TextEncoder?: unknown };
  if (!scope.crypto) scope.crypto = ExpoCrypto;
  if (!scope.TextEncoder) scope.TextEncoder = PolyfillTextEncoder;
}

/**
 * Connects `track()` to TelemetryDeck and starts watching the app. Does
 * nothing — and sends nothing — until an App ID is configured.
 */
export function startTelemetry(): () => void {
  if (!APP_ID) return () => {};

  try {
    installWebShims();

    const deck = createTelemetryDeck({
      appID: APP_ID,
      clientUser: getInstallId(),
      // Development builds are filed as test signals, out of the real numbers.
      testMode: __DEV__,
      // expo-crypto's digest has the same shape as SubtleCrypto's.
      subtleCrypto: { digest: ExpoCrypto.digest } as unknown as Options["subtleCrypto"],
    });

    setTelemetrySender((type, payload) => {
      void deck
        .signal(`${NAMESPACE}.${type}`, { ...payload, platform: Platform.OS })
        .catch(() => {
          /* offline or rejected: a lost signal is not worth a retry */
        });
    });
  } catch {
    // Telemetry that can't start must not take the app down with it.
    setTelemetrySender(null);
    return () => {};
  }

  const stopInstrumentation = startTelemetryInstrumentation();
  return () => {
    stopInstrumentation();
    setTelemetrySender(null);
  };
}
