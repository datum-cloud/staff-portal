/**
 * Fixed dimensions for the Milo shell regions. Every sticky offset and region
 * size references these so a height/width change is a single edit.
 */
export const NAVBAR_H = 58;
export const CONTEXTBAR_H = 34;

/** Collapsed (icon-only) vs expanded (icon + label + count) sub-nav rail width. */
export const SUBNAV_W_COLLAPSED = 50;
export const SUBNAV_W_EXPANDED = 224;

/** Filter panel width on list pages that opt into filtering. */
export const FILTER_W = 240;

/** Sticky top offset for the content below the fixed headers. */
export const HEADER_STACK_H = NAVBAR_H + CONTEXTBAR_H;
