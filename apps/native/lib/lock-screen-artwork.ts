import { Asset } from "expo-asset";

/**
 * Artwork shown on the lock screen / Now Playing card.
 *
 * Deliberately a bundled asset rather than `station.favicon`:
 *
 * 1. RadioBrowser favicons are user-submitted and frequently missing, plain
 *    HTTP (blocked by iOS ATS), or dead links.
 * 2. Rapidly updating lock screen metadata with *remote* artwork is a known
 *    iOS crash (expo/expo#44496), and station switching does exactly that.
 *
 * Station artwork still appears in-app via favicon, which can fall back to
 * a placeholder safely. The lock screen gets something that always works.
 */
export const LOCK_SCREEN_ARTWORK = Asset.fromModule(require("../assets/images/icon.png")).uri;
