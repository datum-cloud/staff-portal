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
export { TabStrip } from './components/page/tab-strip';
export { DetailShell } from './components/page/detail-shell';
export {
  FilterPanel,
  CheckboxFilterGroup,
  InlineFilterBar,
  MobileFilterButton,
  multiSelectFilterFn,
  dateRangeFilterFn,
  DATE_RANGE_OPTIONS,
} from './components/page/rich-filter-panel';
export type { FilterGroupConfig, FilterOption } from './components/page/rich-filter-panel';
export { ListGrowthChart } from './components/page/list-growth-chart';

// List table (styled datum-ui DataTable wrapper)
export { ListTable } from './components/page/list-table';
export { ListColumnHeader } from './components/page/list-column-header';
export { ListPagination } from './components/page/list-pagination';

// Section / table cards (Figma overview chrome)
export { SectionCard } from './components/page/section-card';
export { TableCard } from './components/page/table-card';
export {
  SECTION_CARD_CHROME,
  LIST_TABLE_HEADER_CLASS,
  LIST_TABLE_HEADER_ROW_CLASS,
  LIST_TABLE_HEADER_CELL_CLASS,
  EMBEDDED_TABLE_HEADER_CELL_CLASS,
  LIST_TABLE_ROW_CLASS,
  LIST_TABLE_CELL_CLASS,
  LIST_TABLE_BODY_CLASS,
  EMBEDDED_TABLE_CELL_CLASS,
  EMBEDDED_TABLE_BODY_CLASS,
} from './lib/card-chrome';
