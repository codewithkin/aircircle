import { fetch as streamingFetch } from "expo/fetch";

/**
 * Reads the "now playing" title a station embeds in its own stream.
 *
 * Icecast and Shoutcast servers interleave a small text block into the audio
 * every `icy-metaint` bytes when asked with the `Icy-MetaData: 1` header. This
 * opens the stream, reads up to the first block, and hangs up — a few
 * kilobytes, not a second listener.
 *
 * `expo/fetch` rather than the global `fetch`: React Native's own buffers the
 * whole response before resolving, and a live stream never ends.
 *
 * expo-audio does not surface this metadata from its own connection, which is
 * why it is fetched separately.
 */

const TIMEOUT_MS = 8000;

export type IcyResult = {
  /** False when the station doesn't offer in-stream metadata at all. */
  supported: boolean;
  /** The raw title, typically "Artist - Song". Null when the station sent none. */
  title: string | null;
};

function parseStreamTitle(block: string): string | null {
  const match = /StreamTitle='(.*?)';/.exec(block);
  const title = match?.[1]?.replace(/\0/g, "").trim();
  return title || null;
}

export async function fetchIcyTitle(streamUrl: string): Promise<IcyResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await streamingFetch(streamUrl, {
      headers: { "Icy-MetaData": "1", "User-Agent": "Aircircle/1.0.0" },
      signal: controller.signal,
    });

    const metaint = Number(response.headers.get("icy-metaint"));
    if (!response.ok || !response.body || !Number.isFinite(metaint) || metaint <= 0) {
      return { supported: false, title: null };
    }

    const reader = response.body.getReader();

    // Layout: `metaint` bytes of audio, one length byte (×16), then that many
    // bytes of metadata text.
    let audioSeen = 0;
    let block: Uint8Array | null = null;
    let filled = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done || !value) return { supported: true, title: null };

      let offset = 0;

      if (!block) {
        if (audioSeen + value.length <= metaint) {
          audioSeen += value.length;
          continue;
        }
        offset = metaint - audioSeen;
        const length = value[offset] * 16;
        offset += 1;
        // A zero-length block means "nothing to report".
        if (length === 0) return { supported: true, title: null };
        block = new Uint8Array(length);
      }

      const take = Math.min(block.length - filled, value.length - offset);
      block.set(value.subarray(offset, offset + take), filled);
      filled += take;

      if (filled === block.length) {
        return { supported: true, title: parseStreamTitle(new TextDecoder().decode(block)) };
      }
    }
  } catch {
    // Timed out or dropped. Says nothing about whether the station supports it.
    return { supported: true, title: null };
  } finally {
    clearTimeout(timer);
    // Hang up: everything needed has been read, the rest is audio.
    controller.abort();
  }
}
