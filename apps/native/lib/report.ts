import { Linking } from "react-native";

import type { Station } from "@/lib/types";
import type { ReportReason } from "@/stores/report";
import { msg } from "@/lib/i18n";

/**
 * Where station reports are sent. Not set yet: until there is a support
 * address or endpoint, reports open the listener's mail app with no recipient
 * filled in rather than pretending to have been delivered.
 */
export const REPORT_EMAIL: string | null = null;

export const REPORT_REASONS: Record<ReportReason, string> = {
  "no-play": msg("Stream doesn’t play"),
  "wrong-audio": msg("Wrong station or audio"),
  "wrong-details": msg("Wrong name, logo or place"),
  "wrong-metadata": msg("Now playing info is wrong"),
  other: msg("Something else"),
};

type ReportInput = {
  station: Station;
  reason: ReportReason;
  note: string;
  /** The last playback failure, when there was one. */
  lastError?: string | null;
};

/**
 * The report itself: the station's id and the failure state, plus the
 * listener's note only if they wrote one. Nothing else about the listener.
 */
export function buildReport({ station, reason, note, lastError }: ReportInput): {
  subject: string;
  body: string;
} {
  const lines = [
    `Station: ${station.name}`,
    `Station ID: ${station.stationuuid}`,
    `Problem: ${REPORT_REASONS[reason]}`,
    lastError ? `Last playback error: ${lastError}` : "",
    note.trim() ? `\nDetails: ${note.trim()}` : "",
  ];

  return {
    subject: `Station report: ${station.name}`,
    body: lines.filter(Boolean).join("\n"),
  };
}

/** Hands the report to the mail app. Resolves false if no mail app took it. */
export async function sendReport(input: ReportInput): Promise<boolean> {
  const { subject, body } = buildReport(input);
  const url = `mailto:${REPORT_EMAIL ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
