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

/** Every stream a `.pls` lists, in its own order (File1, File2, …). */
function parsePlsAll(text: string): string[] {
  const entries: { n: number; url: string }[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const match = /^\s*File(\d+)\s*=\s*(\S+)/i.exec(rawLine);
    if (!match) continue;
    const url = match[2].trim();
    if (!/^https?:\/\//i.test(url)) continue;
    entries.push({ n: Number(match[1]), url });
  }

  return entries.sort((a, b) => a.n - b.n).map((e) => e.url);
}

/** Every stream a `.m3u` lists, top to bottom. */
function parseM3uAll(text: string): string[] {
  const urls: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^https?:\/\//i.test(line)) urls.push(line);
  }
  return urls;
}

function parsePls(text: string): string | null {
  return parsePlsAll(text)[0] ?? null;
}

function parseM3u(text: string): string | null {
  return parseM3uAll(text)[0] ?? null;
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
      headers: { "User-Agent": "Aircircle/1.0.0" },
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

/** A playlist link expanded to every stream inside it; any other link as itself. */
async function expand(url: string): Promise<string[]> {
  const ext = extensionOf(url);
  if (ext !== "pls" && ext !== "m3u") return [url];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Aircircle/1.0.0" },
    });
    if (!response.ok) return [url];

    const text = await response.text();
    const urls = ext === "pls" ? parsePlsAll(text) : parseM3uAll(text);
    return urls.length > 0 ? urls : [url];
  } catch {
    return [url];
  } finally {
    clearTimeout(timer);
  }
}

const candidateCache = new Map<string, string[]>();

/**
 * Every stream the directory gives for a station, best first.
 *
 * A station can have more than one way in: the address the directory resolved,
 * the address the broadcaster originally published, and — when either is a
 * playlist file — several mirrors listed inside it. The first is the primary
 * stream; the rest are fallbacks to try when the primary won't start.
 *
 * These are only ever the broadcaster's own alternates for the same station.
 * Nothing here substitutes a different station.
 */
export async function getStreamCandidates(station: {
  stationuuid: string;
  url: string;
  urlResolved?: string;
}): Promise<string[]> {
  const cached = candidateCache.get(station.stationuuid);
  if (cached) return cached;

  const sources = [station.urlResolved, station.url].filter((u): u is string => !!u);
  const expanded = await Promise.all(sources.map(expand));

  const candidates: string[] = [];
  for (const url of expanded.flat()) {
    if (!candidates.includes(url)) candidates.push(url);
  }
  if (candidates.length === 0) candidates.push(station.urlResolved || station.url);

  candidateCache.set(station.stationuuid, candidates);
  return candidates;
}
