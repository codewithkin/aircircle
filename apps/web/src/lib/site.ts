/**
 * One place for everything about the site that is not a page.
 *
 * The support address, the owner's name and the "effective" date appear in the
 * layout metadata, the footer, the privacy policy, the terms, and the store
 * listings that point at them. There is exactly one copy of each.
 *
 * `EFFECTIVE_DATE` is deliberately manual. It is a legal date, not a build
 * date — deriving it from `Date.now()` would claim the policy changed every
 * time the site was redeployed.
 */

export const SITE = {
  name: "Aircircle",

  tagline: "Find live radio.",
  description:
    "Live internet radio by station, place, language or genre. Free, no account, and it keeps playing with your phone locked.",

  /** Where a listener, a store reviewer or a regulator writes to. */
  email: "kinzinzombe07@gmail.com",

  /** Who builds and owns the app, and answers for these policies. */
  owner: "Kin Leon Zinzombe",

  /**
   * The developer account the app is published through, when that is not the
   * owner's own. Its name then appears as the seller on the store listing, and
   * the policies explain the difference. `null` means the owner publishes it.
   */
  publisher: null as string | null,

  /** Android application id, as registered with Google Play. */
  androidPackage: "com.codewithkin.aircircle",
} as const;

/** Update by hand whenever the substance of a policy changes. */
export const EFFECTIVE_DATE = "2 October 2026";
