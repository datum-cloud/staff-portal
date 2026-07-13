/**
 * Static config for the full-page assistant workspace (#554).
 *
 * MODEL_SELECTOR_ENABLED is the single kill-switch for the model + effort
 * picker in the prompt card. Flip to `false` to hide the control entirely — the
 * client then sends no override and the server falls back to its default model.
 */
import type { EffortId, EffortOption, ModelOption } from './types';

export const MODEL_SELECTOR_ENABLED = true;

export const MODEL_OPTIONS: ModelOption[] = [
  { id: 'sonnet-4-6', label: 'Sonnet 4.5' },
  { id: 'haiku-4-5', label: 'Haiku 4.5' },
];

export const EFFORT_OPTIONS: EffortOption[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

export const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id;
export const DEFAULT_EFFORT_ID: EffortId = 'high';

/** Suggestion starters shown on the empty/new-chat state (staff-oriented). */
export const SUGGESTIONS = [
  'Are there any unresolved Sentry errors?',
  "How's our infrastructure looking?",
  'Show me the latest 10 new users',
] as const;
