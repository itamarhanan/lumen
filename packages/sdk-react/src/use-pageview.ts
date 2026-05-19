import { useEffect } from 'react';
import { useLumen } from './lumen-context';

export function usePageview(url?: string, referrer?: string) {
  const lumen = useLumen();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    lumen.pageview(url, referrer);
  }, [lumen, url, referrer]);
}
