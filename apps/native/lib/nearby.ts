import * as Location from "expo-location";

export type NearbyResult =
  | { ok: true; countryCode: string; country: string | null; locality: string | null }
  | { ok: false; reason: "denied" | "unavailable" };

/**
 * Finds roughly where the listener is, to put nearby stations first.
 *
 * Only ever called after the listener has tapped "Allow Nearby stations" on a
 * screen that explains why. Approximate location is all that's needed — a
 * country and a city, not coordinates — and nothing is stored but the place
 * name the listener then sees.
 */
export async function findNearby(): Promise<NearbyResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: "denied" };

    // A recent fix is fine; this is city-level, not navigation.
    const position =
      (await Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));

    const [address] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    if (!address?.isoCountryCode) return { ok: false, reason: "unavailable" };

    return {
      ok: true,
      countryCode: address.isoCountryCode.toUpperCase(),
      country: address.country,
      locality: address.city ?? address.subregion ?? address.region,
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
