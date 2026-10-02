import { permanentRedirect } from "next/navigation";

/*
 * The terms live at /terms. /tos is the other address people guess, and the one
 * the sister projects used first, so it forwards rather than 404s.
 */
export default function TosRedirect(): never {
  permanentRedirect("/terms");
}
