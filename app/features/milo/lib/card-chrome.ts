import { cn } from '@datum-cloud/datum-ui/utils';

/**
 * Shared surface chrome for section cards and ListTable containers.
 * Matches Figma org-overview cards: rounded-xl, card border, soft shadow.
 *
 * @see https://www.figma.com/design/bBEQ8YeTP4SngNl5EkkQdH/Datum---Master-Design-File?node-id=14079-78438
 */
export const SECTION_CARD_CHROME = cn(
  'bg-card text-card-foreground rounded-xl border border-card-border',
  'shadow-[var(--section-card-shadow)]'
);

/**
 * Figma mist table header / dense cell classes — shared by ListTable and
 * TableCard-embedded DataTables so cards-with-tables match list chrome.
 *
 * @see https://www.figma.com/design/bBEQ8YeTP4SngNl5EkkQdH/Datum---Master-Design-File?node-id=14438-59986
 */
export const LIST_TABLE_HEADER_CLASS = '[&_tr]:border-0';
export const LIST_TABLE_HEADER_ROW_CLASS = 'border-0 hover:bg-transparent';
export const LIST_TABLE_HEADER_CELL_CLASS = cn(
  'sticky top-0 z-10 h-9 border-b border-[#efefed] bg-[#fbfbfa] px-4',
  'text-[11px] leading-4 font-normal tracking-normal text-[#0c1d31]/60 uppercase',
  'dark:border-border dark:bg-muted dark:text-muted-foreground'
);
/** Mist header for tables nested inside overview TableCards (Figma 32px / #f6f6f5@50%). */
export const EMBEDDED_TABLE_HEADER_CELL_CLASS = cn(
  'sticky top-0 z-10 h-8 border-b border-[#efefed] bg-[#f6f6f5]/50 px-4',
  'text-[10px] leading-4 font-normal tracking-normal text-[#0c1d31]/60 uppercase',
  'dark:border-border dark:bg-muted dark:text-muted-foreground'
);
/** Kill TableRow's default border-b so only cell borders draw (avoids double lines). */
export const LIST_TABLE_ROW_CLASS = 'border-0 hover:bg-muted/30';
export const LIST_TABLE_CELL_CLASS =
  'border-b border-border px-4 py-0.5 text-sm [&_[data-slot=dt-row-actions]]:!size-7 [&_[data-slot=dt-row-actions]]:!p-0 [&_[data-slot=button-copy]]:!size-5';
/**
 * Drop last-row cell borders so they don’t stack with the ListTable card’s
 * bottom border (reads as a double line above the pagination).
 */
export const LIST_TABLE_BODY_CLASS = '[&_tr:last-child>td]:border-b-0';
/** Dense body cells for overview TableCards (Figma 32px rows). */
export const EMBEDDED_TABLE_CELL_CLASS =
  'border-b border-[#efefed] px-4 py-0 h-8 text-xs dark:border-border [&_[data-slot=dt-row-actions]]:!size-7 [&_[data-slot=dt-row-actions]]:!p-0';
/** Drop last-row cell borders so they don’t stack with the nested table frame. */
export const EMBEDDED_TABLE_BODY_CLASS = '[&_tr:last-child>td]:border-b-0';
