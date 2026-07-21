/**
 * gridOptions.ts — 统一的 AG Grid 默认配置
 * 所有列表页面共用此配置。
 * 用法: import { gridDefaultProps } from '../utils/gridOptions';
 *       <AgGridReact ... {...gridDefaultProps} />
 */
import type { ColDef, LocaleTextFunc, LocaleDefinition } from 'ag-grid-community';

// ---- 默认列属性 ----
export const gridDefaultColDef: ColDef = {
  sortable: true,
  resizable: true,
  filter: false,
  menuTabs: ['generalMenuTab'],
};

// ---- 中文国际化 ----
export const gridLocaleText: Record<string, string> = {
  page: '页', more: '�', to: '�', of: ' ',
  first: '第一页', last: '最后一页', next: '下一页', previous: '上一页',
  loadingOoo: '加载�..',
  noRowsToShow: '暂无数据',
  filterOoo: '筛选...', equals: '等于', notEqual: '不等于',
  lessThan: '小于', greaterThan: '大于',
  contains: '包含', notContains: '不包含',
  startsWith: '开头是', endsWith: '结尾是',
  applyFilter: '应用筛选', resetFilter: '重置筛选',
  clearFilter: '清除', cancelFilter: '取消',
  sortAscending: '升序', sortDescending: '降序', unSort: '取消排序',
  pinColumn: '固定列',
  pinLeft: '固定到左侧', pinRight: '固定到右侧', noPin: '取消固定',
  autosizeThisColumn: '自动调整此列', autosizeAllColumns: '自动调整所有列',
  resetColumns: '重置列',
  selectAll: '全选 (Ctrl+A)', searchOoo: '搜索...',
  blanks: '空白', blank: '空白', notBlank: '非空',
  export: '导出', csvExport: '导出 CSV', excelExport: '导出 Excel',
  ariaLabel: '表格',
  copy: '复制', ctrlC: 'Ctrl+C', paste: '粘贴', ctrlV: 'Ctrl+V',
  rowGroupColumnsEmptyMessage: '拖拽列到此处分组',
  group: '分组', ungroup: '取消分组',
};

// ---- 分页默认配置 ----
export const gridPaginationPageSizes = [10, 20, 50, 100];

// ---- 合并的默认 Props ----
export const gridDefaultProps = {
  defaultColDef: gridDefaultColDef,
  localeText: gridLocaleText,
  pagination: true,
  paginationPageSize: 20,
  paginationPageSizeSelector: gridPaginationPageSizes,
  suppressPaginationPanel: false,
};
