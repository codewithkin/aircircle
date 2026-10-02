import { requireOptionalNativeModule } from "expo";
import { create } from "zustand";

/** Where audio is going right now. */
export type AudioRouteKind = "speaker" | "wired" | "bluetooth" | "car" | "other";

export type AudioRoute = {
  kind: AudioRouteKind;
  /** The device's own name when it has one, e.g. "Pixel Buds". */
  name: string | null;
};

type RouteEvent = { kind: AudioRouteKind; name: string | null };

type AircircleRouteModule = {
  getCurrentRoute(): RouteEvent;
  showOutputSwitcher(): boolean;
  addListener(event: "onRouteChange", listener: (route: RouteEvent) => void): { remove(): void };
};

/**
 * The app's own Android module. Optional on purpose: on iOS, on web, or in a
 * build made before the module existed it is simply absent, and everything
 * that depends on it steps aside rather than failing.
 */
const native = requireOptionalNativeModule<AircircleRouteModule>("AircircleAudioRoute");

type AudioRouteState = {
  /** Null when the platform can't tell us (no native module). */
  route: AudioRoute | null;
  /**
   * When audio last fell back from a private route — headphones, Bluetooth, a
   * car — to the phone's own speaker. Epoch ms; null if it hasn't happened.
   */
  privateRouteLostAt: number | null;
};

export const useAudioRoute = create<AudioRouteState>(() => ({
  route: null,
  privateRouteLostAt: null,
}));

/** Whether this build can show the system's output picker. */
export const canSwitchOutput = native !== null;

/**
 * Opens the system output switcher so the listener can move audio between the
 * phone, headphones, Bluetooth and a car. Returns false if it couldn't open.
 */
export function showOutputSwitcher(): boolean {
  try {
    return native?.showOutputSwitcher() ?? false;
  } catch {
    return false;
  }
}

/** A short label for the current route, for the chip on Now Playing. */
export function routeLabel(route: AudioRoute): string {
  if (route.name) return route.name;
  switch (route.kind) {
    case "wired":
      return "Headphones";
    case "bluetooth":
      return "Bluetooth";
    case "car":
      return "Car";
    case "speaker":
      return "Phone";
    default:
      return "Output";
  }
}

/**
 * Whether the route that was just lost was a private one. Used to tell
 * "playback paused because the headphones came out" from any other pause, so
 * the app can say so — and so audio is never sent to the speaker by surprise.
 */
export function lostPrivateRouteRecently(withinMs = 2500): boolean {
  const at = useAudioRoute.getState().privateRouteLostAt;
  return at !== null && Date.now() - at <= withinMs;
}

export function startAudioRouteListener(): () => void {
  if (!native) return () => {};

  const apply = (next: RouteEvent) => {
    const previous = useAudioRoute.getState().route;
    const wasPrivate = previous !== null && previous.kind !== "speaker";
    useAudioRoute.setState({
      route: { kind: next.kind, name: next.name },
      privateRouteLostAt:
        wasPrivate && next.kind === "speaker"
          ? Date.now()
          : useAudioRoute.getState().privateRouteLostAt,
    });
  };

  try {
    apply(native.getCurrentRoute());
  } catch {
    /* route stays unknown */
  }

  const subscription = native.addListener("onRouteChange", apply);
  return () => subscription.remove();
}
