import { useEffect, useRef, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}

/**
 * Adds `is-in` to every [data-reveal] once it crosses the fold, with a stagger
 * for elements inside the same group. CSS owns everything after that.
 */
export function useReveal(): void {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const node of targets) node.classList.add('is-in');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const group = el.parentElement;
          const siblings = group
            ? Array.from(group.querySelectorAll<HTMLElement>(':scope > [data-reveal]'))
            : [el];
          const index = Math.max(0, siblings.indexOf(el));
          el.style.setProperty('--delay', `${Math.min(index * 70, 420)}ms`);
          el.classList.add('is-in');
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
    );

    for (const node of targets) observer.observe(node);
    return () => observer.disconnect();
  }, []);
}

/** Writes 0 → 1 scroll progress for the element into the --p custom property. */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const span = rect.height + innerHeight;
      const progress = Math.min(1, Math.max(0, (innerHeight - rect.top) / span));
      el.style.setProperty('--p', progress.toFixed(4));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}

/** Tracks the pointer inside an element as --mx / --my percentages. */
export function usePointerGlow<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    return () => el.removeEventListener('pointermove', onMove);
  }, []);

  return ref;
}

/** Reveals the page once the fonts and the first paint are done. */
export function useBoot(): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDone(true), 900);
    return () => clearTimeout(id);
  }, []);
  return done;
}
