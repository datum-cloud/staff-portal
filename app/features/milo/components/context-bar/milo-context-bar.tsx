import { CONTEXTBAR_H, NAVBAR_H } from '../../lib/dimensions';
import { Breadcrumb } from '@/components/breadcrumb';

/**
 * Region ② — the context bar (#776). For Phase 0 it reuses the existing
 * breadcrumb; the "You're here" dropdown segment switchers land in the #776
 * pass. Sticky directly beneath the navbar.
 */
export function MiloContextBar() {
  return (
    <div
      style={{ height: CONTEXTBAR_H, top: NAVBAR_H }}
      className="bg-background sticky z-20 flex shrink-0 items-center gap-2 border-b px-4">
      {/* Smaller and fully muted: shrink to text-xs and pull the links + current
          page (which default to text-foreground) back to the muted colour. */}
      <Breadcrumb
        listClassName="text-xs font-normal [&_*]:font-normal [&_a]:text-muted-foreground [&_[aria-current=page]]:text-muted-foreground"
        separator="/"
      />
    </div>
  );
}
