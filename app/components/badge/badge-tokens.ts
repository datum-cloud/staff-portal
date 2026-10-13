/**
 * Shared badge sizing for staff-portal.
 *
 * datum-ui's `Badge` is a fixed-size primitive we style via className (we don't
 * add size props to the shared lib). These two tokens are the single source of
 * truth so badges stop drifting between sizes — change the size in one place.
 *
 * Two intents:
 * - STATUS: state / decision badges (Active, Pending, ACCEPTED…) — the small
 *   uppercase chip, matching AppBadge (Figma) and cloud-portal's status badge.
 * - TAG: neutral label chips (hostnames, DNS providers, edges) — small but
 *   readable, normal case (never uppercased — e.g. hostnames must stay legible).
 *
 * Count pills (the `bg-primary/15` round numbers) are a separate, intentionally
 * tiny thing and are not covered here.
 */
export const STATUS_BADGE_CLASS =
  'h-4 px-[5px] text-4xs leading-4 font-medium tracking-[0.3px] uppercase';
export const TAG_CHIP_CLASS = 'text-xs px-2 py-0.5';
