import { createPagination } from './pagination.js';
import { buildCustomSelect, closeCustomSelects, syncCustomSelect } from '../../table/table-custom-select.js';
import { loadEventsConfig, loadGroupData, loadBattleData } from '../../common/data-loader.js';

const state = { rows: [], filteredRows: [], event: 'all', search: '', sort: { key: 'date', direction: 'desc' }, pageRows: [] };
let pagination;

function requireElement(selector) {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`下克上页面缺少必要元素：${selector}`);
    return element;
}

function requireTemplate(selector) {
    const template = requireElement(selector);
    if (!(template instanceof HTMLTemplateElement) || !template.content.firstElementChild) throw new Error(`下克上模板无效：${selector}`);
    return template;
}

function normalizeDate(value) {
    const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    if (!match) throw new Error(`赛事日期格式无效：${value}`);
    return match[0];
}

function formatDate(value) { return normalizeDate(value).replaceAll('-', '/'); }

function assertVotes(value, label) {
    const votes = Number(value);
    if (!Number.isFinite(votes) || votes < 0) throw new Error(`${label}票数无效：${value}`);
    return votes;
}

function getOptionalTotalVotes(value) {
    const votes = Number(value);
    return Number.isFinite(votes) && votes >= 0 ? votes : null;
}

function getGroupKey(groupsLink) {
    const match = String(groupsLink).match(/[?&]id=([^&]+)/);
    if (!match) throw new Error(`赛事分组链接缺少 id：${groupsLink}`);
    return decodeURIComponent(match[1]);
}

function buildSeedIndex(groupConfig) {
    const index = new Map();
    Object.values(groupConfig.groups || {}).forEach(members => members.forEach(member => {
        if (Number.isInteger(member.seed)) index.set(member.participantId, member.seed);
    }));
    return index;
}

function buildUpsetRow(match, rawMatch, profiles, seedIndex) {
    if (!Array.isArray(rawMatch.contestants) || rawMatch.contestants.length !== 2) return null;
    const [first, second] = rawMatch.contestants;
    const firstSeed = seedIndex.get(first.participantId);
    const secondSeed = seedIndex.get(second.participantId);
    if (!Number.isInteger(firstSeed) || !Number.isInteger(secondSeed) || firstSeed === secondSeed) return null;
    const firstProfile = profiles.get(first.participantId);
    const secondProfile = profiles.get(second.participantId);
    if (!firstProfile || !secondProfile) throw new Error(`下克上角色资料缺失：${first.participantId} / ${second.participantId}`);
    const firstVotes = assertVotes(first.votes, `${firstProfile.name} `);
    const secondVotes = assertVotes(second.votes, `${secondProfile.name} `);
    const higherSeed = firstSeed > secondSeed ? { seed: firstSeed, profile: firstProfile, votes: firstVotes } : { seed: secondSeed, profile: secondProfile, votes: secondVotes };
    const lowerSeed = firstSeed < secondSeed ? { seed: firstSeed, profile: firstProfile, votes: firstVotes } : { seed: secondSeed, profile: secondProfile, votes: secondVotes };
    if (higherSeed.votes <= lowerSeed.votes) return null;
    const voteBank = higherSeed.votes + lowerSeed.votes;
    const totalVotes = getOptionalTotalVotes(match.totalVotes);
    return {
        id: `${match.links.data}:${rawMatch.match}`,
        date: normalizeDate(match.date), dateLabel: formatDate(match.date), event: match.title,
        higherSeed: higherSeed.seed, higherCharacter: higherSeed.profile.name, higherIp: higherSeed.profile.ip, higherVotes: higherSeed.votes,
        higherShare: voteBank ? higherSeed.votes / voteBank : 0,
        lowerSeed: lowerSeed.seed, lowerCharacter: lowerSeed.profile.name, lowerIp: lowerSeed.profile.ip, lowerVotes: lowerSeed.votes,
        lowerShare: voteBank ? lowerSeed.votes / voteBank : 0,
        seedGap: higherSeed.seed - lowerSeed.seed, voteBank, margin: higherSeed.votes - lowerSeed.votes,
        ratio: lowerSeed.votes === 0 ? Infinity : higherSeed.votes / lowerSeed.votes,
        abstentionRate: totalVotes === null ? null : totalVotes === 0 ? 0 : 1 - voteBank / totalVotes
    };
}

async function loadUpsets() {
    const [eventsConfig, groupData] = await Promise.all([loadEventsConfig(), loadGroupData()]);
    const rows = [];
    for (const month of Object.values(eventsConfig.months)) {
        for (const event of month.events) {
            for (const match of event.matches) {
                if (!match.links?.data || !match.links?.groups) continue;
                const groupKey = getGroupKey(match.links.groups);
                const groupConfig = groupData.groups[groupKey];
                if (!groupConfig) throw new Error(`赛事分组配置不存在：${groupKey}`);
                const phaseData = await loadBattleData(match.links.data);
                if (!phaseData) continue;
                const seedIndex = buildSeedIndex(groupConfig);
                const profiles = new Map(phaseData.data.flatMap(item => item.contestants.map(contestant => [contestant.participantId, contestant])));
                phaseData.data.forEach(item => {
                    const row = buildUpsetRow({ ...match, date: event.dateRange.start, totalVotes: event.stats?.votes?.total, title: phaseData.event || match.title }, item, profiles, seedIndex);
                    if (row) rows.push(row);
                });
            }
        }
    }
    return rows;
}

function compareValues(left, right, key) {
    if (typeof left[key] === 'number' && typeof right[key] === 'number') return left[key] - right[key];
    return String(left[key]).localeCompare(String(right[key]), 'zh-CN');
}

function applyFilters() {
    const search = state.search.trim().toLocaleLowerCase('zh-CN');
    const factor = state.sort.direction === 'asc' ? 1 : -1;
    state.filteredRows = state.rows.filter(row => {
        const eventMatches = state.event === 'all' || row.event === state.event;
        const searchMatches = !search || `${row.higherCharacter} ${row.higherIp} ${row.lowerCharacter} ${row.lowerIp}`.toLocaleLowerCase('zh-CN').includes(search);
        return eventMatches && searchMatches;
    }).sort((left, right) => compareValues(left, right, state.sort.key) * factor || left.id.localeCompare(right.id));
    pagination.setTotal(state.filteredRows.length);
}

function setText(row, selector, value) {
    const element = row.querySelector(selector);
    if (!element) throw new Error(`下克上数据行缺少元素：${selector}`);
    element.textContent = value;
}

function formatRatio(value) { return Number.isFinite(value) ? `${value.toFixed(2)} 倍` : '∞'; }
function formatPercent(value) { return `${(value * 100).toFixed(2)}%`; }
function updateRow(element, row) {
    setText(element, '.date', row.dateLabel); setText(element, '.event', row.event);
    setText(element, '.higher-seed', `${row.higherSeed}号`); setText(element, '.higher-character', row.higherCharacter); setText(element, '.higher-ip', row.higherIp); setText(element, '.higher-votes', `${row.higherVotes}票（${formatPercent(row.higherShare)}）`);
    setText(element, '.lower-seed', `${row.lowerSeed}号`); setText(element, '.lower-character', row.lowerCharacter); setText(element, '.lower-ip', row.lowerIp); setText(element, '.lower-votes', `${row.lowerVotes}票（${formatPercent(row.lowerShare)}）`);
    setText(element, '.seed-gap', `${row.seedGap}`); setText(element, '.vote-bank', `${row.voteBank}票`); setText(element, '.margin', `${row.margin}票`); setText(element, '.ratio', formatRatio(row.ratio)); setText(element, '.abstention-rate', formatPercent(row.abstentionRate));
}

function renderRows() {
    const body = requireElement('#tableBody'); const fragment = document.createDocumentFragment();
    state.pageRows.forEach(row => { const element = requireTemplate('#upsetRowTemplate').content.firstElementChild.cloneNode(true); element.dataset.id = row.id; updateRow(element, row); fragment.appendChild(element); });
    body.replaceChildren(fragment);
    requireElement('#summary').textContent = `共发现 ${state.rows.length} 场下克上，当前显示 ${state.filteredRows.length} 场`;
    const status = requireElement('#statusMessage'); const hasRows = state.filteredRows.length > 0; status.hidden = hasRows; if (!hasRows) status.textContent = state.rows.length ? '没有符合当前筛选条件的下克上记录。' : '当前赛事数据中暂无可识别的下克上记录。';
    requireElement('#upsetsTable').hidden = !hasRows;
}

function populateEventFilter() {
    const select = requireElement('#eventFilter'); const fragment = document.createDocumentFragment();
    [...new Set(state.rows.map(row => row.event))].forEach(event => { const option = document.createElement('option'); option.value = event; option.textContent = event; fragment.appendChild(option); }); select.appendChild(fragment);
}
function debounce(callback, delay) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => callback(...args), delay); }; }
function bindControls() {
    const eventFilter = requireElement('#eventFilter'); const searchInput = requireElement('#searchInput');
    pagination = createPagination({ container: requireElement('#pagination'), pageSize: 25, onPageChange: ({ start, end }) => { state.pageRows = state.filteredRows.slice(start, end); renderRows(); } });
    buildCustomSelect(eventFilter);
    document.addEventListener('click', event => { if (!event.target.closest('.select-wrapper')) closeCustomSelects(); });
    requireElement('#resetButton').addEventListener('click', () => { eventFilter.value = 'all'; searchInput.value = ''; state.event = 'all'; state.search = ''; state.sort = { key: 'date', direction: 'desc' }; syncCustomSelect(eventFilter); applyFilters(); });
    eventFilter.addEventListener('change', () => { state.event = eventFilter.value; applyFilters(); });
    searchInput.addEventListener('input', debounce(() => { state.search = searchInput.value; applyFilters(); }, 300));
    requireElement('#upsetsTable').addEventListener('click', event => { const header = event.target.closest('th[data-sort]'); if (!header) return; const key = header.dataset.sort; state.sort = state.sort.key === key ? { key, direction: state.sort.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' }; applyFilters(); });
}

async function init() { state.rows = await loadUpsets(); populateEventFilter(); bindControls(); applyFilters(); }
document.addEventListener('DOMContentLoaded', () => { init().catch(error => { console.error('下克上数据初始化失败：', error); requireElement('#statusMessage').textContent = error instanceof Error ? error.message : '下克上数据加载失败'; }); });
