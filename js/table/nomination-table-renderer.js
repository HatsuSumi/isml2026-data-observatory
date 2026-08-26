import { reconcileKeyedList } from '../common/keyed-list.js';

function getRowKey(row) {
    return `${row.columns[2] || ''}@${row.columns[3] || ''}`;
}

function createNominationRow() {
    const template = document.getElementById('nomination-row-template');
    const row = template?.content?.firstElementChild;
    if (!row) {
        throw new Error('提名表缺少有效的 nomination-row-template 模板');
    }
    return row.cloneNode(true);
}

function updateRowNode(tr, row, mode) {
    const cells = tr.cells;
    const cv = row.columns[4] || '';
    const rank = mode === 'stellar' && row.isAutoPromoted ? '-' : (row.rank ?? '-');
    const votes = mode === 'stellar' && row.isAutoPromoted ? '自动晋级' : String(row.votes);

    tr.dataset.promoted = row.isPromoted ? 'true' : 'false';
    tr.dataset.autoPromoted = row.isAutoPromoted ? 'true' : 'false';
    cells[0].textContent = String(rank);
    cells[1].textContent = row.columns[0] || '';
    cells[2].textContent = row.columns[1] || '';
    cells[4].textContent = row.columns[2] || '';
    cells[5].textContent = row.columns[3] || '';
    cells[6].textContent = cv;
    cells[7].textContent = votes;

    const avatar = cells[3].querySelector('img');
    avatar.hidden = !row.columns[8];
    if (row.columns[8]) {
        avatar.src = row.columns[8];
        avatar.alt = row.columns[2] || '';
    }
}

export function renderTable(state, rows) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) {
        throw new Error('提名表缺少 tableBody 容器');
    }

    reconcileKeyedList(tableBody, rows, {
        getKey: getRowKey,
        keyAttribute: 'rowKey',
        create: createNominationRow,
        update: (tr, row) => updateRowNode(tr, row, state.config.mode)
    });
    tableBody.querySelectorAll('tr').forEach(row => row.classList.add('fade-in'));
}
