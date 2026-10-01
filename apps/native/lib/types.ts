/**
 * A radio station, mapped from the Radio Browser API. Only the identity fields
 * are required; everything else is display or discovery detail that a given
 * station may not have.
 */
export type Station = {
  stationuuid: string;
  name: string;
  url: string;
  urlResolved?: string;
  /** The broadcaster's own site, for "Open station website". */
  homepage?: string;
  favicon?: string;
  country?: string;
  /** ISO 3166-1 alpha-2, e.g. "ZW". */
  countryCode?: string;
  /** Region or city as the directory records it. */
  state?: string;
  /** Comma-separated. */
  language?: string;
  /** Comma-separated genres. */
  tags?: string;
  codec?: string;
  bitrate?: number;
  /** True when the stream is HLS — playable, but not recordable as one file. */
  hls?: boolean;
  /** Whether the directory's last health check reached the stream. */
  lastCheckOk?: boolean;
  /** Epoch ms of that health check, so availability isn't shown as fresher than it is. */
  lastCheckTime?: number;
  geoLat?: number | null;
  geoLong?: number | null;
  votes?: number;
  clickcount?: number;
};
