export function createNominationTableState(config) {
    return {
        config,
        keys: storage(config),
        rows: []
    };
}

export function storage(config) {
    const base = config.storageKey || `nomination-table-${config.title}`;
    return {
        searchType: `${base}:searchType`,
        statusFilter: `${base}:statusFilter`,
        sortColumn: `${base}:sortColumn`,
        sortDirection: `${base}:sortDirection`
    };
}

export function sortDefault(mode) {
    return mode === 'stellar'
        ? { columnIndex: 7, direction: 'desc' }
        : { columnIndex: undefined, direction: undefined };
}

export function getSortState(state) {
    const column = localStorage.getItem(state.keys.sortColumn);
    const direction = localStorage.getItem(state.keys.sortDirection);
    if (column === null || direction === null) return sortDefault(state.config.mode);
    return { columnIndex: parseInt(column, 10), direction };
}

export function setSortState(state, columnIndex, direction) {
    localStorage.setItem(state.keys.sortColumn, String(columnIndex));
    localStorage.setItem(state.keys.sortDirection, direction);
}

export function clearPersistedState(state) {
    Object.values(state.keys).forEach(key => localStorage.removeItem(key));
}
