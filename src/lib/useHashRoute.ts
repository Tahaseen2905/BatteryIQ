/**
 * Tiny hash router so every screen has a link: #/quality_gates/Q3/spc, #/machine/HS-01.
 */

import { useCallback, useEffect, useState } from 'react';

const read = (): string[] => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);

export function useHashRoute(): [string[], (...parts: string[]) => void] {
  const [parts, setParts] = useState<string[]>(read);
  useEffect(() => {
    const onChange = () => setParts(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const go = useCallback((...next: string[]) => {
    const hash = '#/' + next.map(encodeURIComponent).join('/');
    if (window.location.hash !== hash) window.location.hash = hash;
  }, []);
  return [parts, go];
}
