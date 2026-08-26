export const SORTABLE_COLUMNS = { stellar: [0, 4, 5, 6, 7], nova: [4, 5, 6, 7] };

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

export function sortRows(rows, mode, sortState) {
    const { columnIndex, direction } = sortState;
    return mode === 'stellar'
        ? sortStellar(rows, columnIndex, direction === 'asc')
        : sortNova(rows, columnIndex, direction === 'asc');
}
