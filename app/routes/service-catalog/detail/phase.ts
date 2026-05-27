// CamelCase API phase values render badly in BadgeState (e.g. "Pendingapproval"
// because BadgeState lowercases everything except the first letter). Insert a
// space before each internal capital before passing to BadgeState.
export function humanizePhase(phase: string | undefined): string {
  if (!phase) return '';
  return phase.replace(/([a-z])([A-Z])/g, '$1 $2');
}
