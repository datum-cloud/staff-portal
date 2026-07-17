import type { EffortId } from '@datum-cloud/datum-ui/assistant';
import type { UIMessage } from 'ai';

// Shared assistant types now live in datum-ui; re-export them so the local
// `../types` imports keep resolving. StoredChat below is staff-specific.
export type {
  AssistantConfig,
  EffortId,
  EffortOption,
  LinkRenderProps,
  ModelOption,
  ModelSelectorConfig,
  Turn,
} from '@datum-cloud/datum-ui/assistant';

/**
 * A locally-persisted chat (localStorage). Staff-specific superset of datum-ui's
 * `ChatSummary` — adds the fields needed to fully restore a conversation
 * (per-message HTML, selected model/effort, timestamps).
 */
export interface StoredChat {
  id: string;
  title: string;
  messages: UIMessage[];
  userHtml?: string[];
  model?: string;
  effort?: EffortId;
  createdAt: number;
  updatedAt: number;
}
