// Shell
export { MiloShell } from './components/shell/milo-shell';

// Nav config + active-section brain
export { NAV_SECTIONS } from './lib/nav-config';
export type { NavSection, NavSubNav, NavSubGroup, NavSubItem } from './lib/nav-config';
export { useActiveNav, type ActiveNav } from './lib/use-active-section';
export * from './lib/dimensions';

// Page templates
export { ListPage } from './components/page/list-page';
export { PlainPage } from './components/page/plain-page';
export { DetailPage } from './components/page/detail-page';
export { EntityHeader } from './components/page/entity-header';
export { EntityTabNav, type EntityTab } from './components/page/entity-tab-nav';
export {
  RichFilterPanel,
  RichFilterSection,
  RichFilterOption,
} from './components/page/rich-filter-panel';
