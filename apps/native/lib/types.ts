/**
 * Minimal station type matching Radio Browser API response fields.
 * Extend as needed for UI (favicon, codec, bitrate are optional display fields).
 */
export type Station = {
  stationuuid: string;
  name: string;
  url: string;
  urlResolved?: string;
  country?: string;
  favicon?: string;
  codec?: string;
  bitrate?: number;
  tags?: string;
  language?: string;
  votes?: number;
  clickcount?: number;
};
