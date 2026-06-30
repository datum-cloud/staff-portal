import { NAV_SECTIONS } from '../../lib/nav-config';
import { useActiveNav } from '../../lib/use-active-section';
import { MiloNavItem } from './milo-nav-item';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Horizontal main menu (#771) with overflow scroll arrows. When the sections
 * don't fit (e.g. md→lg widths), `‹`/`›` buttons fade in at the edges and scroll
 * the row — instead of an ugly native scrollbar. Each arrow hides once that end
 * is reached. Hidden below `md`, where the navbar uses the hamburger sheet.
 */
export function MiloMainNav() {
  const { t } = useLingui();
  const { section: activeSection } = useActiveNav();
  const activeHref = activeSection?.href;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update]);

  // Reveal the active section if it's scrolled off-screen (e.g. a far item on load).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !activeHref) return;
    el.querySelector<HTMLElement>(`a[href="${activeHref}"]`)?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
    });
  }, [activeHref]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const arrowBtn =
    'text-foreground hover:bg-foreground/5 pointer-events-auto flex size-7 shrink-0 items-center justify-center rounded-md';

  return (
    <div className="relative hidden min-w-0 flex-1 items-center md:flex">
      {canLeft && (
        <div className="from-background pointer-events-none absolute top-0 bottom-0 left-0 z-10 flex items-center bg-gradient-to-r to-transparent pr-6">
          <button
            type="button"
            aria-label={t`Scroll left`}
            onClick={() => scrollByPage(-1)}
            className={arrowBtn}>
            <ChevronLeft className="size-4" />
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_SECTIONS.map((section) => (
          <MiloNavItem
            key={section.id}
            section={section}
            active={activeSection?.id === section.id}
          />
        ))}
      </div>

      {canRight && (
        <div className="to-background pointer-events-none absolute top-0 right-0 bottom-0 z-10 flex items-center justify-end bg-gradient-to-r from-transparent pl-6">
          <button
            type="button"
            aria-label={t`Scroll right`}
            onClick={() => scrollByPage(1)}
            className={cn(arrowBtn)}>
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
