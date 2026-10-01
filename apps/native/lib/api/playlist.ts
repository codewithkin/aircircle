/**
 * Resolves `.pls` / `.m3u` playlist container files to the raw stream URL
 * inside them.
 *
 * RadioBrowser's `url_resolved` only follows HTTP redirects — it does not open
 * playlist files and read what's inside. A meaningful slice of stations
 * (older Icecast/Shoutcast setups in particular) publish a `.pls` or `.m3u`
 * file as their canonical URL. Handing that straight to `createAudioPlayer`
 * fails outright.
 *
 * `.m3u8` is deliberately excluded — that's an HLS manifest, a real streaming
 * format both ExoPlayer and AVPlayer open natively, not a redirector.
 */

const FETCH_TIMEOUT_MS = 4000;

function extensionOf(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const match = /\.([a-z0-9]+)$/i.exec(pathname);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

function parsePls(text: string): string | null {
  let best: { n: number; url: string } | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const match = /^\s*File(\d+)\s*=\s*(\S+)/i.exec(rawLine);
    if (!match) continue;
    const n = Number(match[1]);
    const url = match[2].trim();
    if (!/^https?:\/\//i.test(url)) continue;
    if (!best || n < best.n) best = { n, url };
  }

  return best?.url ?? null;
}

function parseM3u(text: string): string | null {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^https?:\/\//i.test(line)) return line;
  }
  return null;
}

/**
 * Fast path for the common case (a direct stream URL, no extension games):
 * returns the input unchanged with zero network cost. Only `.pls`/`.m3u`
 * URLs pay for a fetch.
 */
export async function resolvePlaylistUrl(url: string): Promise<string> {
  const ext = extensionOf(url);
  if (ext !== "pls" && ext !== "m3u") return url;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "AirCircle/1.0.0" },
    });
    if (!response.ok) return url;

    const text = await response.text();
    const resolved = ext === "pls" ? parsePls(text) : parseM3u(text);

    return resolved ?? url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}

const resolvedUrlCache = new Map<string, string>();

/**
 * `resolvePlaylistUrl(station.urlResolved || station.url)`, memoized per
 * station UUID for the life of the app session.
 */
export async function getPlayableStreamUrl(station: {
  stationuuid: string;
  url: string;
  urlResolved?: string;
}): Promise<string> {
  const cached = resolvedUrlCache.get(station.stationuuid);
  if (cached) return cached;

  const candidate = station.urlResolved || station.url;
  const resolved = await resolvePlaylistUrl(candidate);
  resolvedUrlCache.set(station.stationuuid, resolved);
  return resolved;
}
