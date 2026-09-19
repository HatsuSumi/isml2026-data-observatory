import { loadNominationStats } from '../statisticsData.js';
import { reconcileKeyedList } from '../../common/keyed-list.js';
import {
    cleanSearchText,
    filterNominationCharacters,
    getDistributionFilters,
    requireElement,
    requireFunction,
    sortDistributionRows
} from './distribution-data.js';
import { bindDistributionModal } from './distribution-modal.js';

const PAGE_SIZE = 20;
const DEFAULT_SORT_COLUMN = 'total';
const DEFAULT_SORT_DIRECTION = 'desc';
const DEFAULT_TEXT_COLUMNS = ['name'];

function requirePageOptions(options) {
    if (!options || typeof options !== 'object') {
        throw new Error('分布页配置必须是对象');
    }
    if (typeof options.tableSelector !== 'string' || options.tableSelector === '') {
        throw new Error('分布页配置错误：tableSelector 无效');
    }
    if (typeof options.rowTemplateId !== 'string' || options.rowTemplateId === '') {
        throw new Error('分布页配置错误：rowTemplateId 无效');
    }
    if (typeof options.closeSelector !== 'string' || options.closeSelector === '') {
        throw new Error('分布页配置错误：closeSelector 无效');
    }
    if (Object.prototype.hasOwnProperty.call(options, 'pageSize') && (!Number.isInteger(options.pageSize) || options.pageSize <= 0)) {
        throw new Error('分布页配置错误：pageSize 必须是正整数');
    }
    if (Object.prototype.hasOwnProperty.call(options, 'textColumns') && !Array.isArray(options.textColumns)) {
        throw new Error('分布页配置错误：textColumns 必须是数组');
    }
    if (Object.prototype.hasOwnProperty.call(options, 'defaultSortColumn') && (typeof options.defaultSortColumn !== 'string' || options.defaultSortColumn === '')) {
        throw new Error('分布页配置错误：defaultSortColumn 无效');
    }
    if (Object.prototype.hasOwnProperty.call(options, 'defaultSortDirection') && options.defaultSortDirection !== 'asc' && options.defaultSortDirection !== 'desc') {
        throw new Error('分布页配置错误：defaultSortDirection 无效');
    }
    return {
        tableSelector: options.tableSelector,
        rowTemplateId: options.rowTemplateId,
        closeSelector: options.closeSelector,
        pageSize: Object.prototype.hasOwnProperty.call(options, 'pageSize') ? options.pageSize : PAGE_SIZE,
        textColumns: Object.prototype.hasOwnProperty.call(options, 'textColumns') ? options.textColumns : DEFAULT_TEXT_COLUMNS,
        defaultSortColumn: Object.prototype.hasOwnProperty.call(options, 'defaultSortColumn') ? options.defaultSortColumn : DEFAULT_SORT_COLUMN,
        defaultSortDirection: Object.prototype.hasOwnProperty.call(options, 'defaultSortDirection') ? options.defaultSortDirection : DEFAULT_SORT_DIRECTION,
        getRowKey: requireFunction(options.getRowKey, 'getRowKey'),
        getCellValues: requireFunction(options.getCellValues, 'getCellValues'),
        getDetailTargets: requireFunction(options.getDetailTargets, 'getDetailTargets'),
        aggregate: requireFunction(options.aggregate, 'aggregate'),
        matchRow: requireFunction(options.matchRow, 'matchRow'),
        renderDetails: requireFunction(options.renderDetails, 'renderDetails')
    };
}

function requireRow(node) {
    if (!node) throw new Error('分布页行模板克隆失败');
    return node;
}

function requireCell(row, index) {
    const cell = row.cells[index];
    if (!cell) throw new Error(`分布页表格缺少第 ${index + 1} 列`);
    return cell;
}

function renderPagination(container, currentPage, totalPages, onChange) {
    const pages = Math.max(totalPages, 1);
    const pagination = document.createElement('div');
    pagination.className = 'pagination';

    const addButton = (label, page, disabled) => {
        const button = document.createElement('button');
        button.textContent = label;
        button.disabled = disabled;
        if (!disabled) button.addEventListener('click', () => onChange(page));
        pagination.appendChild(button);
    };

    addButton('首页', 1, currentPage === 1);
    addButton('上一页', currentPage - 1, currentPage === 1);
    const status = document.createElement('span');
    status.textContent = `第 ${currentPage} / ${pages} 页`;
    pagination.appendChild(status);
    addButton('下一页', currentPage + 1, currentPage === pages || totalPages === 0);
    addButton('末页', pages, currentPage === pages || totalPages === 0);

    const oldPagination = container.querySelector('.pagination');
    if (oldPagination) oldPagination.remove();
    container.appendChild(pagination);
}

export async function startDistributionPage(rawOptions) {
    const options = requirePageOptions(rawOptions);
    const table = requireElement(options.tableSelector);
    const tbody = requireElement('tbody', table);
    const template = requireElement(`#${options.rowTemplateId}`);
    const tableSection = requireElement('.table-section');
    const searchInput = requireElement('#searchInput');
    const searchBtn = requireElement('#searchBtn');
    const searchCount = requireElement('.search-count');
    const modal = requireElement('#characterModal');
    const novaFilters = requireElement('#nova-filters');
    const sortHeader = requireElement(`th[data-column="${options.defaultSortColumn}"]`, table);
    const pageSize = options.pageSize;
    const textColumns = options.textColumns;

    let source = null;
    let rows = [];
    let currentPage = 1;
    let previousPage = 1;
    let sortColumn = options.defaultSortColumn;
    let sortDirection = options.defaultSortDirection;
    let matches = [];
    let matchIndex = -1;

    bindDistributionModal(modal, options.closeSelector);
    sortHeader.classList.add(`sort-${sortDirection}`);

    const charactersOf = () => filterNominationCharacters(source, getDistributionFilters());
    const sortedRows = () => sortDistributionRows(rows, sortColumn, sortDirection, textColumns);
    const pageOf = index => Math.floor(index / pageSize) + 1;

    function updateSearchCount() {
        const query = searchInput.value.trim();
        if (!query) {
            searchCount.textContent = '';
            searchCount.classList.remove('no-results');
            return;
        }
        if (matches.length === 0) {
            searchCount.textContent = '0/0';
            searchCount.classList.add('no-results');
            return;
        }
        searchCount.textContent = `${matchIndex + 1}/${matches.length}`;
        searchCount.classList.remove('no-results');
    }

    function applyHighlights() {
        tbody.querySelectorAll('.highlight, .highlight-current').forEach(node => {
            node.classList.remove('highlight', 'highlight-current');
        });
        if (matches.length === 0) return;
        matches.forEach((match, index) => {
            if (pageOf(match.index) !== currentPage) return;
            const row = tbody.children[match.index % pageSize];
            if (!row) throw new Error('分布页搜索高亮找不到对应行');
            const cells = Object.prototype.hasOwnProperty.call(match, 'cells')
                ? match.cells.map(cellIndex => requireCell(row, cellIndex))
                : Array.from(row.cells);
            const current = index === matchIndex;
            cells.forEach(cell => {
                cell.classList.toggle('highlight-current', current);
                cell.classList.toggle('highlight', !current);
            });
        });
    }

    function renderTable() {
        const sorted = sortedRows();
        const totalPages = Math.ceil(sorted.length / pageSize);
        if (totalPages > 0 && currentPage > totalPages) currentPage = totalPages;
        const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

        reconcileKeyedList(tbody, pageRows, {
            getKey: options.getRowKey,
            keyAttribute: 'rowKey',
            create: () => requireRow(template.content.cloneNode(true).firstElementChild),
            update: (row, item) => {
                const values = options.getCellValues(item);
                if (!Array.isArray(values)) throw new Error('分布页单元格数据必须是数组');
                if (row.cells.length !== values.length) {
                    throw new Error(`分布页行单元格数量错误：期望 ${values.length}，实际 ${row.cells.length}`);
                }
                Array.from(row.cells).forEach((cell, index) => {
                    cell.textContent = String(values[index]);
                    delete cell.dataset.value;
                    delete cell.dataset.detailKey;
                });
                options.getDetailTargets(item).forEach(target => {
                    if (!target || typeof target !== 'object') {
                        throw new Error('分布页详情目标无效');
                    }
                    const cell = requireCell(row, target.index);
                    if (typeof target.count !== 'number' || !Number.isFinite(target.count)) {
                        throw new Error('分布页详情计数无效');
                    }
                    cell.dataset.value = String(target.count);
                    if (target.count > 0) {
                        if (target.key == null || target.key === '') {
                            throw new Error('分布页详情键无效');
                        }
                        cell.dataset.detailKey = String(target.key);
                    }
                });
            }
        });

        renderPagination(tableSection, currentPage, totalPages, page => {
            currentPage = page;
            renderTable();
        });
        applyHighlights();
        updateSearchCount();
    }

    function collectMatches(query) {
        const characters = charactersOf();
        return sortedRows().reduce((results, item, index) => {
            const match = options.matchRow(item, query, { characters });
            if (match) {
                if (Object.prototype.hasOwnProperty.call(match, 'cells') && !Array.isArray(match.cells)) {
                    throw new Error('分布页搜索匹配 cells 必须是数组');
                }
                results.push({ index, ...match });
            }
            return results;
        }, []);
    }

    function runSearch() {
        const query = cleanSearchText(searchInput.value);
        if (!query) {
            matches = [];
            matchIndex = -1;
            renderTable();
            return;
        }
        matches = collectMatches(query);
        matchIndex = matches.length > 0 ? 0 : -1;
        if (matches.length > 0) currentPage = pageOf(matches[0].index);
        renderTable();
    }

    function moveMatch(step) {
        if (matches.length === 0) {
            previousPage = currentPage;
            runSearch();
            return;
        }
        matchIndex = (matchIndex + step + matches.length) % matches.length;
        currentPage = pageOf(matches[matchIndex].index);
        renderTable();
    }

    function refresh() {
        rows = options.aggregate(charactersOf());
        if (!Array.isArray(rows)) throw new Error('分布页聚合结果必须是数组');
        currentPage = 1;
        previousPage = 1;
        if (cleanSearchText(searchInput.value)) runSearch();
        else {
            matches = [];
            matchIndex = -1;
            renderTable();
        }
    }

    tbody.addEventListener('click', event => {
        const cell = event.target.closest('td[data-detail-key]');
        if (!cell || !tbody.contains(cell)) return;
        const row = cell.parentElement;
        if (!row || !row.dataset.rowKey) {
            throw new Error('分布页详情行缺少 rowKey');
        }
        const item = sortedRows().find(entry => String(options.getRowKey(entry)) === row.dataset.rowKey);
        if (!item) throw new Error('分布页详情找不到对应数据');
        options.renderDetails({
            item,
            detailKey: cell.dataset.detailKey,
            characters: charactersOf(),
            modal
        });
    });

    document.querySelectorAll('input[name="group"]').forEach(radio => {
        radio.addEventListener('change', event => {
            novaFilters.classList.toggle('hidden', event.target.value !== 'nova');
            refresh();
        });
    });

    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', refresh);
    });

    table.querySelectorAll('th[data-column]').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            if (!column) throw new Error('分布页表头缺少 data-column');
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'desc';
            }
            table.querySelectorAll('th[data-column]').forEach(node => {
                node.classList.remove('sort-asc', 'sort-desc');
            });
            header.classList.add(`sort-${sortDirection}`);
            if (cleanSearchText(searchInput.value)) runSearch();
            else renderTable();
        });
    });

    searchBtn.addEventListener('click', () => {
        previousPage = currentPage;
        runSearch();
    });

    searchInput.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        moveMatch(event.shiftKey ? -1 : 1);
    });

    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim()) return;
        matches = [];
        matchIndex = -1;
        if (currentPage !== previousPage) currentPage = previousPage;
        renderTable();
    });

    source = await loadNominationStats();
    refresh();
}
