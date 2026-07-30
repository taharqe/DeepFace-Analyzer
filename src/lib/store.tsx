/**
 * Session history.
 *
 * Results live for the lifetime of the app process. Nothing is written to disk:
 * the images are faces, and persisting biometric analysis by default is not a
 * decision this app should make for the user.
 */

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

import type { Analysis } from '@/lib/analyzer';

type HistoryValue = {
  results: Analysis[];
  add: (analysis: Analysis) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const HistoryContext = createContext<HistoryValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<Analysis[]>([]);

  const add = useCallback((analysis: Analysis) => {
    setResults((current) => [analysis, ...current]);
  }, []);

  const remove = useCallback((id: string) => {
    setResults((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setResults([]), []);

  const value = useMemo(() => ({ results, add, remove, clear }), [results, add, remove, clear]);

  return <HistoryContext value={value}>{children}</HistoryContext>;
}

export function useHistory(): HistoryValue {
  const value = use(HistoryContext);
  if (!value) throw new Error('useHistory must be used inside HistoryProvider');
  return value;
}

/** Aggregate stats across the session, for the History header. */
export function useHistoryStats() {
  const { results } = useHistory();
  return useMemo(() => {
    if (results.length === 0) {
      return { count: 0, avgElapsed: 0, avgConfidence: 0 };
    }
    const totalElapsed = results.reduce((sum, r) => sum + r.elapsedMs, 0);
    const confidences = results.flatMap((r) =>
      r.attributes.filter((a) => a.scores.length > 0).map((a) => a.confidence)
    );
    return {
      count: results.length,
      avgElapsed: totalElapsed / results.length,
      avgConfidence:
        confidences.length > 0
          ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
          : 0,
    };
  }, [results]);
}
