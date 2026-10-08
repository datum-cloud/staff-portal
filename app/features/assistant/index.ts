// Only the light, always-rendered pieces go through this barrel: the layouts
// and navbars import it on every page. The workspace and the staff config
// import `@datum-cloud/datum-ui/assistant` and tiptap, whose modules have side
// effects, so re-exporting them here kept ~1.2 MB of assistant code on every
// page's first load even where nothing used it. Import those from their own
// files (see routes/dashboard) so they load only where they're rendered.
export { AssistantProvider, useAssistant } from './components/assistant-context';
export { AssistantPanel } from './components/assistant-panel';
export { AssistantTrigger } from './components/assistant-trigger';
export type { AssistantConfig } from './types';
