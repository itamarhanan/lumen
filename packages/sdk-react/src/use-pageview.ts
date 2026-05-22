import { useEffect, useRef } from 'react';
import { useLumen } from './lumen-context';

export function usePageview(url?: string, referrer?: string) {
  const lumen = useLumen();
  const tracked = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (tracked.current) return;
    tracked.current = true;
    lumen.pageview(url, referrer);
  }, [lumen, url, referrer]);
}
