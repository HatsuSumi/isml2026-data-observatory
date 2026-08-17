import { SERIES_ALIASES } from '../aliases/aliases.js';
import { buildStellarDisplayRows, parseNominationCsvRow } from './nomination-data.js';

const COLUMN_ORDER = [0, 1, 2, 4, 5, 6, 7, 3];
const EXCEL_COLUMNS = [
  { header: '排名', width: 5 },
  { header: '日期', width: 15 },
  { header: '赛事名称', width: 30 },
  { header: '角色', width: 30 },
  { header: 'IP', width: 50 },
  { header: 'CV', width: 20 },
  { header: '得票数', width: 15 },
  { header: '头像链接', width: 100 }
];
const SORTABLE = { stellar: [0, 4, 5, 6, 7], nova: [4, 5, 6, 7] };
const AUTO_TEXT = '自动晋级';
const CUSTOM_SELECT_TRIGGER_CLASS = 'custom-select-trigger';
const CUSTOM_SELECT_VALUE_CLASS = 'custom-select-value';
const CUSTOM_SELECT_OPTIONS_CLASS = 'custom-select-options';
const CUSTOM_SELECT_OPTION_CLASS = 'custom-select-option';

function storage(config) {
  const base = config.storageKey || `nomination-table-${config.title}`;
  return {
    searchType: `${base}:searchType`,
    statusFilter: `${base}:statusFilter`,
    sortColumn: `${base}:sortColumn`,
    sortDirection: `${base}:sortDirection`
  };
}

function sortDefault(mode) {
  return mode === 'stellar'
    ? { columnIndex: 7, direction: 'desc' }
    : { columnIndex: undefined, direction: undefined };
}

function getSortState(state) {
  const column = localStorage.getItem(state.keys.sortColumn);
  const direction = localStorage.getItem(state.keys.sortDirection);
  if (column === null || direction === null) return sortDefault(state.config.mode);
  return { columnIndex: parseInt(column, 10), direction };
}

function getTableHeaders() {
  return Array.from(document.querySelectorAll('table thead th'));
}

function setSortState(state, columnIndex, direction) {
  localStorage.setItem(state.keys.sortColumn, String(columnIndex));
  localStorage.setItem(state.keys.sortDirection, direction);
  const headers = getTableHeaders();
  headers.forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
  headers[columnIndex]?.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
}

function closeCustomSelects(exceptWrapper) {
  document.querySelectorAll('.select-wrapper.active').forEach(wrapper => {
    if (wrapper !== exceptWrapper) wrapper.classList.remove('active');
  });
}

function syncCustomSelect(select) {
  const wrapper = select.closest('.select-wrapper');
  if (!wrapper) return;
  const valueLabel = wrapper.querySelector(`.${CUSTOM_SELECT_VALUE_CLASS}`);
  const options = wrapper.querySelectorAll(`.${CUSTOM_SELECT_OPTION_CLASS}`);
  const selectedOption = select.options[select.selectedIndex];
  if (valueLabel) {
    valueLabel.textContent = selectedOption?.textContent?.trim() || '';
  }
  options.forEach(option => {
    option.classList.toggle('selected', option.dataset.value === select.value);
  });
}

function buildCustomSelect(select) {
  const wrapper = select.closest('.select-wrapper');
  if (!wrapper || wrapper.querySelector(`.${CUSTOM_SELECT_TRIGGER_CLASS}`)) return;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = CUSTOM_SELECT_TRIGGER_CLASS;
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const value = document.createElement('span');
  value.className = CUSTOM_SELECT_VALUE_CLASS;
  trigger.appendChild(value);

  const options = document.createElement('div');
  options.className = CUSTOM_SELECT_OPTIONS_CLASS;
  options.setAttribute('role', 'listbox');

  Array.from(select.options).forEach(nativeOption => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = CUSTOM_SELECT_OPTION_CLASS;
    option.dataset.value = nativeOption.value;
    option.textContent = nativeOption.textContent;
    option.addEventListener('click', () => {
      if (select.value === nativeOption.value) {
        wrapper.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
        return;
      }
      select.value = nativeOption.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncCustomSelect(select);
      wrapper.classList.remove('active');
      trigger.setAttribute('aria-expanded', 'false');
    });
    options.appendChild(option);
  });

  trigger.addEventListener('click', () => {
    const isOpen = wrapper.classList.toggle('active');
    closeCustomSelects(isOpen ? wrapper : null);
    trigger.setAttribute('aria-expanded', String(isOpen));
  });

  wrapper.appendChild(trigger);
  wrapper.appendChild(options);
  select.addEventListener('change', () => syncCustomSelect(select));
  syncCustomSelect(select);
}

function closeDropdownIfNeeded(event) {
  if (event.target.matches('.download-btn')) return;
  document.querySelectorAll('.dropdown-content.show').forEach(dropdown => dropdown.classList.remove('show'));
  if (!event.target.closest('.select-wrapper')) {
    closeCustomSelects();
    document.querySelectorAll(`.${CUSTOM_SELECT_TRIGGER_CLASS}[aria-expanded="true"]`).forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

async function downloadSourceFile(state, format) {
  const response = await fetch(`${state.config.dataBasePath}.${format}`);
  if (!response.ok) throw new Error(`下载失败: ${response.status}`);
  let blob;
  if (format === 'csv') {
    blob = new Blob([await response.text()], { type: 'text/csv;charset=utf-8' });
  } else if (format === 'json') {
    blob = new Blob([JSON.stringify(await response.json(), null, 2)], { type: 'application/json;charset=utf-8' });
  } else {
    blob = await response.blob();
  }
  triggerDownload(blob, `${state.config.title}.${format}`);
}

async function exportCurrentTableToExcel(state, rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(state.config.title);
  worksheet.columns = EXCEL_COLUMNS;
  worksheet.addRows(rows);
  worksheet.eachRow(row => {
    row.height = 30;
    row.eachCell(cell => {
      cell.font = { name: '楷体', size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'none' },
        left: { style: 'none' },
        bottom: { style: 'none' },
        right: { style: 'none' }
      };
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${state.config.title}-当前视图.xlsx`);
}

function downloadCurrentTableView(state, format) {
  const table = document.querySelector('table');
  const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
  const rows = Array.from(document.querySelectorAll('tbody tr'))
    .filter(row => row.style.display !== 'none')
    .map(row => Array.from(row.cells).map(cell => cell.querySelector('img')?.src || cell.textContent.trim()));
  const reorderedHeaders = COLUMN_ORDER.map(i => headers[i]);
  const reorderedRows = rows.map(row => COLUMN_ORDER.map(i => row[i]));

  if (format === 'json') {
    const data = reorderedRows.map(row => Object.fromEntries(reorderedHeaders.map((header, index) => [header, row[index]])));
    triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), `${state.config.title}-当前视图.json`);
    return;
  }
  if (format === 'csv') {
    const csv = [reorderedHeaders.join(','), ...reorderedRows.map(row => row.join(','))].join('\n');
    triggerDownload(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `${state.config.title}-当前视图.csv`);
    return;
  }
  exportCurrentTableToExcel(state, reorderedRows).catch(error => {
    console.error('Excel 导出错误:', error);
    alert('导出 Excel 时发生错误，请稍后重试');
  });
}

function bindGlobals(state) {
  window.toggleDropdown = () => document.getElementById('downloadDropdown')?.classList.toggle('show');
  window.downloadFile = (format, event) => {
    event.preventDefault();
    event.stopPropagation();
    downloadSourceFile(state, format).catch(error => console.error(error));
  };
  window.downloadCurrentTable = (format, event) => {
    event.preventDefault();
    event.stopPropagation();
    downloadCurrentTableView(state, format);
  };
  document.removeEventListener('click', closeDropdownIfNeeded);
  document.addEventListener('click', closeDropdownIfNeeded);
}

function parseRow(config, line) {
  return parseNominationCsvRow(config, line);
}

async function loadRows(state) {
  const response = await fetch(`${state.config.dataBasePath}.csv`);
  if (!response.ok) throw new Error(`加载失败: ${response.status}`);
  const text = await response.text();
  const rows = text.split(/\r?\n/).slice(1).filter(Boolean).map(line => parseRow(state.config, line));

  if (state.config.mode === 'stellar') {
    const autoRows = rows.filter(row => row.isAutoPromoted);
    const normalRows = rows.filter(row => !row.isAutoPromoted).sort((a, b) => b.votes - a.votes);
    state.rows = buildStellarDisplayRows([...autoRows, ...normalRows]);
    return;
  }

  state.rows = rows;
}

function compareNumbers(a, b, isAsc) {
  return isAsc ? a - b : b - a;
}

function compareText(a, b, isAsc) {
  return isAsc ? a.localeCompare(b, 'zh-CN') : b.localeCompare(a, 'zh-CN');
}

function rowText(row, columnIndex) {
  if (columnIndex === 4) return row.columns[2] || '';
  if (columnIndex === 5) return row.columns[3] || '';
  if (columnIndex === 6) return row.columns[4] || '';
  return row.columns[columnIndex] || '';
}

function compareRows(a, b, columnIndex, isAsc) {
  if (columnIndex === 0) return compareNumbers(a.rank ?? Number.POSITIVE_INFINITY, b.rank ?? Number.POSITIVE_INFINITY, isAsc);
  if (columnIndex === 7) return compareNumbers(a.votes, b.votes, isAsc);
  return compareText(rowText(a, columnIndex), rowText(b, columnIndex), isAsc);
}

function sortStellar(rows, columnIndex, isAsc) {
  if (columnIndex === undefined || isAsc === undefined) return [...rows];

  const autoRows = rows.filter(row => row.isAutoPromoted);
  const normalRows = rows.filter(row => !row.isAutoPromoted);
  const sortedNormalRows = [...normalRows].sort((a, b) => compareRows(a, b, columnIndex, isAsc));

  if ([4, 5, 6].includes(columnIndex)) {
    const sortedAutoRows = [...autoRows].sort((a, b) => compareRows(a, b, columnIndex, isAsc));
    return [...sortedAutoRows, ...sortedNormalRows];
  }

  return [...autoRows, ...sortedNormalRows];
}

function sortNova(rows, columnIndex, isAsc) {
  if (columnIndex === undefined || isAsc === undefined) return [...rows];
  return [...rows].sort((a, b) => compareRows(a, b, columnIndex, isAsc));
}

function buildRowHtml(row, mode) {
  const avatar = row.columns[8] ? `<img src="${row.columns[8]}" alt="${row.columns[2]}" width="50">` : '';
  const cv = row.columns[4] || '';
  const rank = mode === 'stellar' && row.isAutoPromoted ? '-' : (row.rank ?? '-');
  const votes = mode === 'stellar' && row.isAutoPromoted ? AUTO_TEXT : String(row.votes);
  return `
    <td class="rank">${rank}</td>
    <td>${row.columns[0] || ''}</td>
    <td>${row.columns[1] || ''}</td>
    <td>${avatar}</td>
    <td>${row.columns[2] || ''}</td>
    <td>${row.columns[3] || ''}</td>
    <td>${cv}</td>
    <td class="votes">${votes}</td>
  `;
}

function renderTable(state, rows) {
  const tableBody = document.getElementById('tableBody');
  tableBody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.promoted = row.isPromoted ? 'true' : 'false';
    tr.dataset.autoPromoted = row.isAutoPromoted ? 'true' : 'false';
    tr.innerHTML = buildRowHtml(row, state.config.mode);
    tableBody.appendChild(tr);
  });
  document.querySelectorAll('#tableBody tr').forEach(row => row.classList.add('fade-in'));
  bindBackToTop();
}

function matchesTextSearch(row, searchType, terms) {
  const cellIndex = searchType === 'character' ? 4 : searchType === 'anime' ? 5 : searchType === 'cv' ? 6 : -1;
  if (cellIndex === -1) return true;
  if (searchType === 'anime') {
    const animeName = row.cells[cellIndex].textContent;
    return terms.some(term => animeName.toLowerCase().includes(term) || (SERIES_ALIASES[animeName] && SERIES_ALIASES[animeName].some(alias => alias.toLowerCase().includes(term))));
  }
  const text = row.cells[cellIndex].textContent.toLowerCase().replace(/[!！?？.。,，]/g, '');
  return terms.some(term => text.includes(term));
}

function matchesStatus(mode, value, row) {
  const isAutoPromoted = row.dataset.autoPromoted === 'true';
  const isPromoted = row.dataset.promoted === 'true';
  if (mode === 'stellar') {
    if (value === 'auto') return isAutoPromoted;
    if (value === 'normal') return !isAutoPromoted;
    if (value === 'promoted') return isPromoted;
    if (value === 'not_promoted') return !isAutoPromoted && !isPromoted;
    return true;
  }
  if (value === 'advance') return isPromoted;
  if (value === 'eliminate') return !isPromoted;
  return true;
}

function applyFilters(state) {
  const searchType = document.getElementById('searchType').value;
  const statusValue = document.getElementById('statusFilter').value;
  const terms = document.getElementById('searchInput').value.toLowerCase().split(/[\s,，]+/).map(term => term.replace(/[!！?？.。,，]/g, '')).filter(Boolean);
  const minVotes = parseInt(document.getElementById('minVotes').value, 10);
  const maxVotes = parseInt(document.getElementById('maxVotes').value, 10);
  document.querySelectorAll('#tableBody tr').forEach(row => {
    const isAutoPromoted = row.dataset.autoPromoted === 'true';
    const valueText = searchType === 'votes' ? row.querySelector('.votes')?.textContent : row.querySelector('.rank')?.textContent;
    const value = parseInt(valueText || '', 10);
    const matchesRange = (searchType !== 'votes' && searchType !== 'rank') || isAutoPromoted || ((!Number.isNaN(minVotes) ? value >= minVotes : true) && (!Number.isNaN(maxVotes) ? value <= maxVotes : true));
    const matchesText = terms.length === 0 || (searchType !== 'votes' && searchType !== 'rank' && searchType !== 'none' ? matchesTextSearch(row, searchType, terms) : true);
    row.style.display = matchesRange && matchesText && matchesStatus(state.config.mode, statusValue, row) ? '' : 'none';
  });
}

function updateSearchInput() {
  const searchType = document.getElementById('searchType').value;
  const searchInput = document.getElementById('searchInput');
  const votesRange = document.getElementById('votesRange');
  const isRange = searchType === 'votes' || searchType === 'rank';
  const isNone = searchType === 'none';
  votesRange.style.display = isRange ? 'flex' : 'none';
  searchInput.style.display = isRange || isNone ? 'none' : 'block';
  if (isNone) searchInput.value = '';
  if (isRange) {
    document.getElementById('minVotes').placeholder = searchType === 'votes' ? '最小票数' : '最小排名';
    document.getElementById('maxVotes').placeholder = searchType === 'votes' ? '最大票数' : '最大排名';
  } else if (!isNone) {
    searchInput.placeholder = `请输入${searchType === 'character' ? '角色' : searchType === 'anime' ? 'IP' : '声优'}名称（多个关键词用空格或逗号分隔）...`;
  }
}

function applyView(state) {
  const { columnIndex, direction } = getSortState(state);
  const rows = state.config.mode === 'stellar' ? sortStellar(state.rows, columnIndex, direction === 'asc') : sortNova(state.rows, columnIndex, direction === 'asc');
  renderTable(state, rows);
  applyFilters(state);
}

function bindSortHeaders(state) {
  getTableHeaders().forEach((th, index) => {
    if (!SORTABLE[state.config.mode].includes(index)) return;
    th.dataset.sortable = 'true';
    th.addEventListener('click', () => {
      const isAsc = th.classList.contains('sort-desc');
      setSortState(state, index, isAsc ? 'asc' : 'desc');
      applyView(state);
    });
  });
}

function resetState(state) {
  const button = document.querySelector('.reset-btn');
  button?.classList.add('rotating');
  setTimeout(() => button?.classList.remove('rotating'), 300);
  Object.values(state.keys).forEach(key => localStorage.removeItem(key));
  const searchType = document.getElementById('searchType');
  const statusFilter = document.getElementById('statusFilter');
  searchType.value = 'none';
  statusFilter.value = 'all';
  document.getElementById('searchInput').value = '';
  document.getElementById('minVotes').value = '';
  document.getElementById('maxVotes').value = '';
  syncCustomSelect(searchType);
  syncCustomSelect(statusFilter);
  getTableHeaders().forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
  const defaults = sortDefault(state.config.mode);
  if (defaults.columnIndex !== undefined) setSortState(state, defaults.columnIndex, defaults.direction);
  updateSearchInput();
  applyView(state);
}

function bindFilters(state) {
  const searchType = document.getElementById('searchType');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  buildCustomSelect(searchType);
  buildCustomSelect(statusFilter);
  searchInput.style.display = 'none';
  searchType.addEventListener('change', () => {
    localStorage.setItem(state.keys.searchType, searchType.value);
    syncCustomSelect(searchType);
    updateSearchInput();
    applyFilters(state);
  });
  statusFilter.addEventListener('change', () => {
    localStorage.setItem(state.keys.statusFilter, statusFilter.value);
    syncCustomSelect(statusFilter);
    applyFilters(state);
  });
  searchInput.addEventListener('input', () => applyFilters(state));
  document.getElementById('minVotes').addEventListener('input', () => applyFilters(state));
  document.getElementById('maxVotes').addEventListener('input', () => applyFilters(state));
  document.querySelector('.reset-btn')?.addEventListener('click', () => resetState(state));
}

function restoreUi(state) {
  const searchType = document.getElementById('searchType');
  const statusFilter = document.getElementById('statusFilter');
  searchType.value = localStorage.getItem(state.keys.searchType) || 'none';
  statusFilter.value = localStorage.getItem(state.keys.statusFilter) || 'all';
  syncCustomSelect(searchType);
  syncCustomSelect(statusFilter);
  updateSearchInput();
  const sort = getSortState(state);
  if (sort.columnIndex !== undefined && sort.direction !== undefined) setSortState(state, sort.columnIndex, sort.direction);
}

function bindBackToTop() {
  const button = document.querySelector('.back-to-top');
  if (!button || button.dataset.bound) return;
  window.addEventListener('scroll', () => button.classList.toggle('show', window.scrollY > 300));
  button.addEventListener('click', () => smoothScrollToTop(500));
  button.dataset.bound = 'true';
}

function smoothScrollToTop(duration = 500) {
  const startPosition = window.scrollY;
  const startTime = performance.now();
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const scrollStep = currentTime => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    window.scrollTo(0, startPosition * (1 - easeOutCubic(progress)));
    if (progress < 1) requestAnimationFrame(scrollStep);
  };
  requestAnimationFrame(scrollStep);
}

export async function initNominationTable(config) {
  const state = { config, keys: storage(config), rows: [] };
  bindGlobals(state);
  bindSortHeaders(state);
  bindFilters(state);
  await loadRows(state);
  restoreUi(state);
  applyView(state);
}
