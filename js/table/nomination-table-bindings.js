import { closeCustomSelects, buildCustomSelect, syncCustomSelect } from './nomination-table-custom-select.js';
import { applyFilters, updateSearchInput } from './nomination-table-filters.js';
import { downloadCurrentTableView, downloadSourceFile } from './nomination-table-downloads.js';
import { getSortState, setSortState, clearPersistedState, sortDefault } from './nomination-table-state.js';
import { sortRows, SORTABLE_COLUMNS } from './nomination-table-sort.js';
import { renderTable } from './nomination-table-renderer.js';
import { debounce, smoothScrollTo } from '../common/dom.js';

function getTableHeaders() {
    return Array.from(document.querySelectorAll('table thead th'));
}

function closeDropdownIfNeeded(event) {
    if (event.target.matches('.download-btn')) return;
    document.querySelectorAll('.dropdown-content.show').forEach(dropdown => dropdown.classList.remove('show'));
    if (!event.target.closest('.select-wrapper')) closeCustomSelects();
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

function setSortHeaderState(columnIndex, direction) {
    const headers = getTableHeaders();
    headers.forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
    headers[columnIndex]?.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
}

function bindSortHeaders(state, applyView) {
    getTableHeaders().forEach((th, index) => {
        if (!SORTABLE_COLUMNS[state.config.mode].includes(index)) return;
        th.dataset.sortable = 'true';
        th.addEventListener('click', () => {
            const isAsc = th.classList.contains('sort-desc');
            setSortState(state, index, isAsc ? 'asc' : 'desc');
            setSortHeaderState(index, isAsc ? 'asc' : 'desc');
            applyView();
        });
    });
}

function bindBackToTop() {
    const button = document.querySelector('.back-to-top');
    if (!button || button.dataset.bound) return;
    window.addEventListener('scroll', () => button.classList.toggle('show', window.scrollY > 300));
    button.addEventListener('click', () => smoothScrollTo(0));
    button.dataset.bound = 'true';
}

function resetState(state, applyView) {
    const button = document.querySelector('.reset-btn');
    button?.classList.add('rotating');
    setTimeout(() => button?.classList.remove('rotating'), 300);
    clearPersistedState(state);
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
    if (defaults.columnIndex !== undefined) {
        setSortState(state, defaults.columnIndex, defaults.direction);
        setSortHeaderState(defaults.columnIndex, defaults.direction);
    }
    updateSearchInput();
    applyView();
}

function bindFilters(state, applyView) {
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
    const debouncedApplyFilters = debounce(() => applyFilters(state), 300);
    searchInput.addEventListener('input', debouncedApplyFilters);
    document.getElementById('minVotes').addEventListener('input', debouncedApplyFilters);
    document.getElementById('maxVotes').addEventListener('input', debouncedApplyFilters);
    document.querySelector('.reset-btn')?.addEventListener('click', () => resetState(state, applyView));
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
    if (sort.columnIndex !== undefined && sort.direction !== undefined) {
        setSortState(state, sort.columnIndex, sort.direction);
        setSortHeaderState(sort.columnIndex, sort.direction);
    }
}

function applyView(state) {
    const rows = sortRows(state.rows, state.config.mode, getSortState(state));
    renderTable(state, rows);
    applyFilters(state);
}

export function bindNominationTable(state) {
    bindGlobals(state);
    bindSortHeaders(state, () => applyView(state));
    bindFilters(state, () => applyView(state));
    bindBackToTop();
    return {
        restoreUi: () => restoreUi(state),
        applyView: () => applyView(state),
        resetState: () => resetState(state, () => applyView(state))
    };
}
