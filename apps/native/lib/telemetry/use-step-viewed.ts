import { useEffect } from "react";

import { track } from "@/lib/telemetry";

/**
 * Reports that an onboarding step was reached, once per visit. Together with
 * `Onboarding.completed` this shows where people leave setup.
 */
export function useStepViewed(step: string): void {
  useEffect(() => {
    track("Onboarding.stepViewed", { step });
  }, [step]);
}
