/**
 * "aircircle" as the site sets it: a small ring — the circle — then the name in
 * spaced mono capitals, with the second half in the app's signal blue.
 */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em]">
      <span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-brand" />
      <span>
        <span className="text-subtle">air</span>
        <span className="text-brand">circle</span>
      </span>
    </span>
  );
}
