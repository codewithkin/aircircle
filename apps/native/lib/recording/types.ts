/** A completed recording saved on this device. */
export type Recording = {
  id: string;
  stationName: string;
  stationUuid: string;
  /**
   * File name inside the recordings directory — not a full path. iOS moves the
   * app's container between updates, so an absolute path saved today can point
   * nowhere tomorrow. Resolve with `recordingUri()` at the moment of use.
   */
  fileName: string;
  durationMs: number;
  sizeBytes: number;
  /** Epoch ms when the recording finished. */
  recordedAt: number;
};

export type RecordingFailure =
  /** The station does not permit offline recording. */
  | "not-eligible"
  /** The stream is a playlist of segments (HLS), not a byte stream. */
  | "unsupported-stream"
  /** Not enough room on the device. */
  | "no-space"
  /** Connected, but nothing ever arrived. */
  | "no-data"
  /** Could not resolve or open the stream at all. */
  | "network";

export const RECORDING_FAILURE_MESSAGES: Record<RecordingFailure, string> = {
  "not-eligible": "This station does not permit offline recording.",
  "unsupported-stream": "This station's stream can't be saved for offline listening.",
  "no-space": "Not enough space to save this recording.",
  "no-data": "Nothing was recorded — the station sent no audio.",
  network: "The recording couldn't start. Check your connection and try again.",
};
