import type { useRouter } from "expo-router";

import { useOnboarding } from "@/stores/onboarding";

type Router = ReturnType<typeof useRouter>;

/**
 * Ends onboarding and, optionally, lands somewhere other than Home.
 *
 * Finishing flips a guard that swaps the onboarding screens for the app, so
 * any follow-on navigation has to wait a beat for the app's own screens to
 * exist before it can push onto them.
 */
export function finishOnboarding(router: Router, then?: "search" | "nearby"): void {
  useOnboarding.getState().complete();
  if (!then) return;

  setTimeout(() => {
    if (then === "search") router.navigate({ pathname: "/search", params: { focus: String(Date.now()) } });
    else router.push("/nearby");
  }, 350);
}

/** The device's region as an ISO country code, e.g. "ZW" — or null if unknown. */
export function deviceCountryCode(): string | null {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = /[-_]([A-Za-z]{2})\b/.exec(locale)?.[1];
    return region ? region.toUpperCase() : null;
  } catch {
    return null;
  }
}
