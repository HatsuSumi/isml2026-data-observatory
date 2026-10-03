import { buildCustomSelect, closeCustomSelects, syncCustomSelect } from '../../table/table-custom-select.js';
import { loadCharacterResolver } from '../../common/character-resolver.js';
import { loadEventsConfig } from '../../common/data-loader.js';

const DATA_CACHE = new Map();
const state = {
    rows: [],
    filteredRows: [],
    event: 'all',
    search: '',
    sort: { key: 'date', direction: 'desc' }
};

function requireElement(selector) {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`内战数据页面缺少必要元素：${selector}`);
    return element;
}

function requireTemplate(selector) {
    const template = requireElement(selector);
    if (!(template instanceof HTMLTemplateElement) || !template.content.firstElementChild) {
        throw new Error(`内战数据页面模板无效：${selector}`);
    }
    return template;
}

async function fetchJson(path) {
    if (DATA_CACHE.has(path)) return DATA_CACHE.get(path);
    const request = fetch(path).then(response => {
        if (!response.ok) throw new Error(`数据加载失败：${path} HTTP ${response.status}`);
        return response.json();
    });
    DATA_CACHE.set(path, request);
    return request;
}

function collectMatches(eventsConfig) {
    const matches = [];
    for (const month of Object.values(eventsConfig.months)) {
        for (const event of month.events) {
            for (const match of event.matches) {
                matches.push({
                    ...match,
                    date: event.dateRange.start,
                    totalVotes: event.stats?.votes?.total
                });
            }
        }
    }
    return matches;
}

function normalizeDate(value) {
    const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    if (!match) throw new Error(`赛事日期格式无效：${value}`);
    return match[0];
}

function formatDate(value) {
    return normalizeDate(value).replaceAll('-', '/');
}

function assertVotes(value, label) {
    const votes = Number(value);
    if (!Number.isFinite(votes) || votes < 0) throw new Error(`${label}票数无效：${value}`);
    return votes;
}

function getWinnerAndLoser(contestants, label) {
    const winner = contestants.find(contestant => contestant.result === 'win');
    const loser = contestants.find(contestant => contestant.result === 'loss');
    if (!winner || !loser) throw new Error(`${label}缺少明确的胜者或败者`);
    return { winner, loser };
}

function buildBattleRow(match, rawMatch, profiles) {
    const contestants = rawMatch.contestants;
    if (!Array.isArray(contestants) || contestants.length !== 2) return null;
    const [first, second] = contestants;
    const profileA = profiles.get(first.participantId);
    const profileB = profiles.get(second.participantId);
    if (!profileA || !profileB) throw new Error(`内战角色资料缺失：${first.participantId} / ${second.participantId}`);
    if (profileA.ip !== profileB.ip) return null;

    const votesA = assertVotes(first.votes, `${profileA.name} `);
    const votesB = assertVotes(second.votes, `${profileB.name} `);
    const { winner, loser } = getWinnerAndLoser(contestants, `${match.title} 第${rawMatch.match}场`);
    const winnerVotes = assertVotes(winner.votes, '胜者');
    const loserVotes = assertVotes(loser.votes, '败者');
    const voteBank = votesA + votesB;
    const totalVotes = assertVotes(match.totalVotes, `${match.title} 总投票人数`);

    return {
        id: `${match.links.data}:${rawMatch.match}`,
        date: normalizeDate(match.date),
        dateLabel: formatDate(match.date),
        event: match.title,
        characterA: profileA.name,
        characterAId: first.participantId,
        ipA: profileA.ip,
        votesA,
        shareA: voteBank ? votesA / voteBank : 0,
        characterB: profileB.name,
        characterBId: second.participantId,
        ipB: profileB.ip,
        votesB,
        shareB: voteBank ? votesB / voteBank : 0,
        voteBank,
        margin: winnerVotes - loserVotes,
        ratio: loserVotes === 0 ? Infinity : winnerVotes / loserVotes,
        abstentionRate: totalVotes === 0 ? 0 : 1 - voteBank / totalVotes,
        winnerId: winner.participantId
    };
}

async function loadBattles() {
    const [eventsConfig, resolver] = await Promise.all([loadEventsConfig(), loadCharacterResolver()]);
    const matches = collectMatches(eventsConfig).filter(match => match.links?.data);
    const rows = [];
    for (const match of matches) {
        const rawData = await fetchJson(match.links.data);
        if (!Array.isArray(rawData.data)) throw new Error(`赛事数据格式无效：${match.links.data}`);
        const profiles = new Map();
        rawData.data.forEach(item => item.contestants?.forEach(contestant => {
            if (!contestant?.participantId) throw new Error(`赛事数据缺少 participantId：${match.links.data}`);
            profiles.set(contestant.participantId, resolver.getByParticipantId(contestant.participantId));
        }));
        rawData.data.forEach(item => {
            const row = buildBattleRow({ ...match, title: rawData.event || match.title }, item, profiles);
            if (row) rows.push(row);
        });
    }
    return rows;
}

function compareValues(left, right, key) {
    const leftValue = left[key];
    const rightValue = right[key];
    if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue;
    return String(leftValue).localeCompare(String(rightValue), 'zh-CN');
}

function sortRows(rows) {
    const factor = state.sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => compareValues(left, right, state.sort.key) * factor || left.id.localeCompare(right.id));
}

function applyFilters() {
    const search = state.search.trim().toLocaleLowerCase('zh-CN');
    state.filteredRows = sortRows(state.rows.filter(row => {
        const eventMatches = state.event === 'all' || row.event === state.event;
        const searchMatches = !search || `${row.characterA} ${row.ipA} ${row.characterB} ${row.ipB}`.toLocaleLowerCase('zh-CN').includes(search);
        return eventMatches && searchMatches;
    }));
    renderRows();
}

function createRow() {
    return requireTemplate('#battleRowTemplate').content.firstElementChild.cloneNode(true);
}

function setText(row, selector, value) {
    const element = row.querySelector(selector);
    if (!element) throw new Error(`内战数据行缺少元素：${selector}`);
    element.textContent = value;
}

function formatRatio(value) {
    return Number.isFinite(value) ? `${value.toFixed(2)} 倍` : '∞';
}

function formatPercent(value) {
    return `${(value * 100).toFixed(2)}%`;
}

function updateRow(element, row) {
    setText(element, '.date', row.dateLabel);
    setText(element, '.event', row.event);
    setText(element, '.character-a', row.characterA);
    setText(element, '.ip-a', row.ipA);
    setText(element, '.votes-a', `${row.votesA}票`);
    setText(element, '.share-a', formatPercent(row.shareA));
    setText(element, '.character-b', row.characterB);
    setText(element, '.ip-b', row.ipB);
    setText(element, '.votes-b', `${row.votesB}票`);
    setText(element, '.share-b', formatPercent(row.shareB));
    setText(element, '.vote-bank', `${row.voteBank}票`);
    setText(element, '.margin', `${row.margin}票`);
    setText(element, '.ratio', formatRatio(row.ratio));
    setText(element, '.abstention-rate', formatPercent(row.abstentionRate));
    element.classList.toggle('winner-a', row.winnerId === row.characterAId);
}

function renderRows() {
    const body = requireElement('#tableBody');
    const fragment = document.createDocumentFragment();
    state.filteredRows.forEach(row => {
        const element = createRow();
        element.dataset.id = row.id;
        updateRow(element, row);
        fragment.appendChild(element);
    });
    body.replaceChildren(fragment);
    requireElement('#summary').textContent = `共发现 ${state.rows.length} 场内战，当前显示 ${state.filteredRows.length} 场`;
    const statusMessage = requireElement('#statusMessage');
    const hasRows = state.filteredRows.length > 0;
    statusMessage.hidden = hasRows;
    if (!hasRows) {
        statusMessage.textContent = state.rows.length > 0
            ? '没有符合当前筛选条件的内战记录。'
            : '当前赛事数据中暂无内战记录。';
    }
    requireElement('#battlesTable').hidden = !hasRows;
}

function populateEventFilter() {
    const select = requireElement('#eventFilter');
    const fragment = document.createDocumentFragment();
    [...new Set(state.rows.map(row => row.event))].forEach(event => {
        const option = document.createElement('option');
        option.value = event;
        option.textContent = event;
        fragment.appendChild(option);
    });
    select.appendChild(fragment);
}

function debounce(callback, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
}

function bindControls() {
    const eventFilter = requireElement('#eventFilter');
    const searchInput = requireElement('#searchInput');
    buildCustomSelect(eventFilter);
    document.addEventListener('click', event => {
        if (!event.target.closest('.select-wrapper')) closeCustomSelects();
    });
    requireElement('#resetButton').addEventListener('click', () => {
        eventFilter.value = 'all';
        searchInput.value = '';
        state.event = 'all';
        state.search = '';
        syncCustomSelect(eventFilter);
        state.sort = { key: 'date', direction: 'desc' };
        applyFilters();
    });
    eventFilter.addEventListener('change', () => {
        state.event = eventFilter.value;
        applyFilters();
    });
    searchInput.addEventListener('input', debounce(() => {
        state.search = searchInput.value;
        applyFilters();
    }, 300));
    requireElement('#battlesTable').addEventListener('click', event => {
        const header = event.target.closest('th[data-sort]');
        if (!header) return;
        const key = header.dataset.sort;
        state.sort = state.sort.key === key
            ? { key, direction: state.sort.direction === 'asc' ? 'desc' : 'asc' }
            : { key, direction: ['date', 'event'].includes(key) ? 'desc' : 'desc' };
        document.querySelectorAll('th[data-sort]').forEach(item => item.classList.remove('sort-asc', 'sort-desc'));
        header.classList.add(state.sort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        applyFilters();
    });
}

async function init() {
    state.rows = await loadBattles();
    populateEventFilter();
    bindControls();
    applyFilters();
}

document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
        console.error('内战数据初始化失败：', error);
        requireElement('#statusMessage').textContent = error instanceof Error ? error.message : '内战数据加载失败';
    });
});
