import { SERIES_ALIASES } from '../aliases/aliases.js';

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

export function applyFilters(state) {
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
        row.hidden = !(matchesRange && matchesText && matchesStatus(state.config.mode, statusValue, row));
    });
}

export function updateSearchInput() {
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
