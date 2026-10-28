import { useEffect, useRef, useState } from 'react';

/** Seconds since the page opened, ticking every 400 ms. Frozen while `frozen` is true (a stopped machine). */
export function useClockSeconds(frozen: boolean): number {
  const [s, setS] = useState(0);
  const start = useRef(performance.now());
  const held = useRef<number | null>(null);
  useEffect(() => {
    const t = setInterval(() => {
      const now = (performance.now() - start.current) / 1000;
      if (frozen) {
        if (held.current == null) held.current = now;
        setS(held.current);
      } else {
        if (held.current != null) {
          // resume from where it stopped
          start.current += (now - held.current) * 1000;
          held.current = null;
        }
        setS((performance.now() - start.current) / 1000);
      }
    }, 400);
    return () => clearInterval(t);
  }, [frozen]);
  return s;
}
