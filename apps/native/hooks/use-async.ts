import { useCallback, useEffect, useRef, useState } from "react";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: boolean;
};

/**
 * Runs an async loader and tracks its result. Re-runs when `key` changes, and
 * a reply for an old key is dropped — so fast typing or switching filters can
 * never show results for something the listener has already moved on from.
 *
 * Previous data stays on screen while the next load is in flight, which is
 * what lets lists update in place instead of flashing empty.
 */
export function useAsync<T>(key: string | null, load: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: key !== null, error: false });
  const [attempt, setAttempt] = useState(0);

  // Always the latest loader, without making it a dependency of the load effect.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (key === null) {
      setState({ data: null, loading: false, error: false });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: false }));

    loadRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false, error: true }));
      });

    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, reload };
}
