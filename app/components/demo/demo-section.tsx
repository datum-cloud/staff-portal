import { cn } from '@datum-cloud/datum-ui/utils';
import type { ReactNode } from 'react';

/** One entry in a demo component's scroll-spy nav. */
export type DemoSectionMeta = {
  id: string;
  label: string;
};

type DemoGroupProps = {
  /** Group heading shown once above its sections (e.g. "Badges & Status"). */
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

/**
 * Wrapper for a demo component's whole group — a titled block containing one
 * or more <DemoSection>s. Rendered directly into the playground's main column.
 */
export function DemoGroup({ title, description, children }: DemoGroupProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description != null && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      <div className="space-y-10">{children}</div>
    </div>
  );
}

type DemoSectionProps = {
  /** Must match the `id` in the component's `*DemoSections` array (scroll-spy target). */
  id: string;
  title: string;
  description?: ReactNode;
  className?: string;
  /**
   * Skip the white card surface — for sections whose content already renders
   * its own card(s) (SectionCard, MessageCard, DangerZoneCard) so we don't nest
   * a card inside a card.
   */
  bare?: boolean;
  children: ReactNode;
};

/**
 * A single anchored subsection inside a demo group. The heading sits on the
 * page; the demo content sits on a white card surface (unless `bare`). The
 * `scroll-mt-*` offset keeps the heading clear of the sticky top when jumped to.
 */
export function DemoSection({
  id,
  title,
  description,
  className,
  bare = false,
  children,
}: DemoSectionProps) {
  return (
    <section id={id} className={cn('scroll-mt-24 space-y-3', className)}>
      <div className="space-y-1">
        <h3 className="text-base font-medium">{title}</h3>
        {description != null && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {bare ? children : <div className="bg-card space-y-4 rounded-xl border p-6">{children}</div>}
    </section>
  );
}

/** A row of demo controls. The surrounding <DemoSection> card provides the surface. */
export function DemoRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>;
}
