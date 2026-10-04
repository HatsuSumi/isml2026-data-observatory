import { createPagination } from './pagination.js';
import { loadCharacterResolver } from '../../common/character-resolver.js';
import { loadEventsConfig } from '../../common/data-loader.js';

const DATA_CACHE = new Map();
const state = {
    events: [],
    rows: [],
    filteredRows: [],
    selectedEvents: new Set(),
    search: '',
    sort: { key: 'totalVotes', direction: 'desc' },
    pageRows: []
};
let pagination;

function requireElement(selector) {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`累计得票数页面缺少必要元素：${selector}`);
    return element;
}

function requireTemplate(selector) {
    const template = requireElement(selector);
    if (!(template instanceof HTMLTemplateElement) || !template.content.firstElementChild) throw new Error(`累计得票数模板无效：${selector}`);
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

function assertDate(value, label) {
    const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    if (!match) throw new Error(`${label}日期格式无效：${value}`);
    return match[0].replaceAll('-', '/');
}

function assertVotes(value, label) {
    const votes = Number(value);
    if (!Number.isFinite(votes) || votes < 0) throw new Error(`${label}票数无效：${value}`);
    return votes;
}

function getDataEntries(eventsConfig) {
    const entries = [];
    for (const [monthKey, month] of Object.entries(eventsConfig.months)) {
        for (const [eventIndex, event] of month.events.entries()) {
            for (const [matchIndex, match] of event.matches.entries()) {
                if (!match.links?.data) continue;
                entries.push({
                    id: `${monthKey}:${eventIndex}:${matchIndex}:${match.links.data}`,
                    title: match.title,
                    date: assertDate(event.dateRange.start, match.title),
                    dataPath: match.links.data
                });
            }
        }
    }
    if (!entries.length) throw new Error('events.json 中没有可统计的赛事数据');
    return entries;
}

function createEventLabel(event) {
    return `${event.date} ${event.title}`;
}

function collectVoteRecords(data, event, resolver) {
    if (!Array.isArray(data.data)) throw new Error(`赛事数据格式无效：${event.dataPath}`);
    const records = [];
    data.data.forEach((item, itemIndex) => {
        if (Array.isArray(item?.contestants)) {
            item.contestants.forEach((contestant, contestantIndex) => {
                if (!contestant || typeof contestant.participantId !== 'string') throw new Error(`赛事数据 ${event.dataPath} 第 ${itemIndex + 1} 场第 ${contestantIndex + 1} 项缺少 participantId`);
                const votes = Number(contestant.votes);
                if (Number.isFinite(votes) && votes >= 0) records.push({ participantId: contestant.participantId, votes, profile: resolver.getByParticipantId(contestant.participantId) });
            });
            return;
        }
        if (typeof item?.participantId !== 'string') return;
        const votes = Number(item.votes);
        if (Number.isFinite(votes) && votes >= 0) records.push({ participantId: item.participantId, votes, profile: resolver.getByParticipantId(item.participantId) });
    });
    return records;
}

async function loadEvents() {
    const [eventsConfig, resolver] = await Promise.all([loadEventsConfig(), loadCharacterResolver()]);
    const events = getDataEntries(eventsConfig);
    const loadedEvents = await Promise.all(events.map(async event => {
        const data = await fetchJson(event.dataPath);
        return { ...event, label: createEventLabel(event), records: collectVoteRecords(data, event, resolver) };
    }));
    return loadedEvents.filter(event => event.records.length > 0);
}

function aggregateRows() {
    const totals = new Map();
    state.events.filter(event => state.selectedEvents.has(event.id)).forEach(event => {
        const eventVotes = new Map();
        event.records.forEach(record => {
            const entry = eventVotes.get(record.participantId);
            if (entry) entry.votes += record.votes;
            else eventVotes.set(record.participantId, { profile: record.profile, votes: record.votes });
        });
        eventVotes.forEach(({ profile, votes }, participantId) => {
            let row = totals.get(participantId);
            if (!row) {
                row = {
                    id: participantId,
                    participantId,
                    name: profile.name,
                    ip: profile.ip,
                    totalVotes: 0,
                    eventCount: 0,
                    breakdown: []
                };
                totals.set(participantId, row);
            }
            row.totalVotes += votes;
            row.eventCount += 1;
            row.breakdown.push({ eventId: event.id, label: event.label, votes });
        });
    });
    return [...totals.values()];
}

function compareValues(left, right, key) {
    if (typeof left[key] === 'number' && typeof right[key] === 'number') return left[key] - right[key];
    return String(left[key]).localeCompare(String(right[key]), 'zh-CN');
}

function sortRows(rows) {
    const factor = state.sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => compareValues(left, right, state.sort.key) * factor || left.id.localeCompare(right.id));
}

function applyFilters() {
    const search = state.search.trim().toLocaleLowerCase('zh-CN');
    state.rows = aggregateRows();
    state.filteredRows = sortRows(state.rows.filter(row => !search || `${row.name} ${row.ip}`.toLocaleLowerCase('zh-CN').includes(search)));
    pagination.setTotal(state.filteredRows.length);
    renderSummary();
}

function formatVotes(value) { return `${value.toLocaleString('zh-CN')}票`; }
function setText(row, selector, value) {
    const element = row.querySelector(selector);
    if (!element) throw new Error(`累计得票数数据行缺少元素：${selector}`);
    element.textContent = value;
}

function updateRow(element, row) {
    setText(element, '.rank', `${state.filteredRows.indexOf(row) + 1}`);
    setText(element, '.character', row.name);
    setText(element, '.ip', row.ip);
    const votesButton = element.querySelector('.total-votes');
    const eventsButton = element.querySelector('.event-count');
    if (!(votesButton instanceof HTMLButtonElement) || !(eventsButton instanceof HTMLButtonElement)) throw new Error('累计得票数数据行缺少明细按钮');
    votesButton.textContent = formatVotes(row.totalVotes);
    votesButton.dataset.detailType = 'votes';
    votesButton.dataset.rowId = row.id;
    votesButton.setAttribute('aria-label', `${row.name}累计得票数明细`);
    eventsButton.textContent = `${row.eventCount}`;
    eventsButton.dataset.detailType = 'events';
    eventsButton.dataset.rowId = row.id;
    eventsButton.setAttribute('aria-label', `${row.name}参与赛事明细`);
}

function buildDetailItems(row, detailType) {
    const container = requireElement('#detailBody');
    const fragment = document.createDocumentFragment();
    row.breakdown.forEach(item => {
        const element = requireTemplate('#detailVoteItemTemplate').content.firstElementChild.cloneNode(true);
        const label = element.querySelector('.detail-item__label');
        const value = element.querySelector('.detail-item__value');
        if (!label || !value) throw new Error('得票明细模板结构不完整');
        label.textContent = item.label;
        value.textContent = detailType === 'votes' ? formatVotes(item.votes) : '已参与';
        fragment.appendChild(element);
    });
    if (detailType === 'votes') {
        const total = document.createElement('div');
        total.className = 'detail-item detail-item--total';
        const label = document.createElement('span');
        label.className = 'detail-item__label';
        label.textContent = '累计得票数';
        const value = document.createElement('strong');
        value.className = 'detail-item__value';
        value.textContent = formatVotes(row.totalVotes);
        total.append(label, value);
        fragment.appendChild(total);
    }
    container.replaceChildren(fragment);
}

function bindDetailModal() {
    const modal = requireElement('#detailModal');
    const closeButton = requireElement('#closeDetailModal');
    let isClosing = false;
    const close = () => {
        if (modal.hidden || isClosing) return;
        isClosing = true;
        modal.classList.add('is-closing');
    };
    const open = (row, detailType) => {
        isClosing = false;
        modal.classList.remove('is-closing');
        requireElement('#detailModalTitle').textContent = detailType === 'votes' ? '累计得票数明细' : '参与赛事明细';
        requireElement('#detailCharacter').textContent = `${row.name} · ${row.ip}`;
        buildDetailItems(row, detailType);
        modal.hidden = false;
        closeButton.focus();
    };
    closeButton.addEventListener('click', close);
    modal.addEventListener('animationend', event => {
        if (event.animationName !== 'eventModalExit') return;
        modal.hidden = true;
        modal.classList.remove('is-closing');
        isClosing = false;
    });
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) close(); });
    requireElement('#totalVotesTable').addEventListener('click', event => {
        const button = event.target.closest('button[data-detail-type]');
        if (!button) return;
        const row = state.filteredRows.find(item => item.id === button.dataset.rowId);
        if (!row) throw new Error(`找不到累计得票数明细角色：${button.dataset.rowId}`);
        open(row, button.dataset.detailType);
    });
}

function renderRows() {
    const body = requireElement('#tableBody');
    const fragment = document.createDocumentFragment();
    state.pageRows.forEach(row => {
        const element = requireTemplate('#totalVotesRowTemplate').content.firstElementChild.cloneNode(true);
        element.dataset.id = row.id;
        updateRow(element, row);
        fragment.appendChild(element);
    });
    body.replaceChildren(fragment);
    const hasRows = state.filteredRows.length > 0;
    requireElement('#totalVotesTable').hidden = !hasRows;
    const status = requireElement('#statusMessage');
    status.hidden = hasRows;
    if (!hasRows) status.textContent = state.rows.length ? '没有符合当前搜索条件的角色。' : '当前筛选赛事暂无可统计的得票数据。';
}

function renderSummary() {
    const selectedCount = state.selectedEvents.size;
    requireElement('#summary').textContent = `已纳入 ${selectedCount} 场赛事，共统计 ${state.filteredRows.length} 名角色`;
    requireElement('#selectedEventsLabel').textContent = `已选择 ${selectedCount} 场赛事`;
}

function createEventOption(event, checked) {
    const element = requireTemplate('#eventOptionTemplate').content.firstElementChild.cloneNode(true);
    const input = element.querySelector('input');
    const label = element.querySelector('.event-option__label');
    if (!input || !label) throw new Error('赛事筛选模板结构不完整');
    input.value = event.id;
    input.checked = checked;
    input.id = `event-option-${event.id.replaceAll(/[^a-zA-Z0-9_-]/g, '-')}`;
    label.htmlFor = input.id;
    label.textContent = event.label;
    return element;
}

function renderEventOptions(selection) {
    const container = requireElement('#eventOptions');
    const fragment = document.createDocumentFragment();
    state.events.forEach(event => fragment.appendChild(createEventOption(event, selection.has(event.id))));
    container.replaceChildren(fragment);
}

function bindModal() {
    const modal = requireElement('#eventModal');
    const openButton = requireElement('#openEventModal');
    const closeButton = requireElement('#closeEventModal');
    const cancelButton = requireElement('#cancelEventModal');
    const confirmButton = requireElement('#confirmEventModal');
    const eventOptions = requireElement('#eventOptions');
    const selectAllButton = requireElement('#selectAllEvents');
    const invertButton = requireElement('#invertEvents');
    let draftSelection = new Set(state.selectedEvents);
    let isClosing = false;
    const close = () => {
        if (modal.hidden || isClosing) return;
        isClosing = true;
        modal.classList.add('is-closing');
    };
    const open = () => {
        if (!modal.hidden && !isClosing) return;
        isClosing = false;
        modal.classList.remove('is-closing');
        draftSelection = new Set(state.selectedEvents);
        renderEventOptions(draftSelection);
        modal.hidden = false;
        const firstOption = requireElement('#eventOptions input');
        firstOption.focus();
    };
    openButton.addEventListener('click', open);
    closeButton.addEventListener('click', close);
    cancelButton.addEventListener('click', close);
    confirmButton.addEventListener('click', () => {
        state.selectedEvents = new Set(draftSelection);
        close();
        applyFilters();
    });
    eventOptions.addEventListener('change', event => {
        const input = event.target.closest('input[type="checkbox"]');
        if (!input) return;
        if (input.checked) draftSelection.add(input.value);
        else draftSelection.delete(input.value);
    });
    selectAllButton.addEventListener('click', () => {
        draftSelection = new Set(state.events.map(event => event.id));
        renderEventOptions(draftSelection);
    });
    invertButton.addEventListener('click', () => {
        draftSelection = new Set(state.events.filter(event => !draftSelection.has(event.id)).map(event => event.id));
        renderEventOptions(draftSelection);
    });
    modal.addEventListener('animationend', event => {
        if (event.animationName !== 'eventModalExit') return;
        modal.hidden = true;
        modal.classList.remove('is-closing');
        isClosing = false;
    });
    modal.addEventListener('click', event => {
        if (event.target === modal) close();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.hidden) close();
    });
}

function bindControls() {
    pagination = createPagination({ container: requireElement('#pagination'), pageSize: 25, onPageChange: ({ start, end }) => { state.pageRows = state.filteredRows.slice(start, end); renderRows(); } });
    requireElement('#searchInput').addEventListener('input', debounce(() => { state.search = requireElement('#searchInput').value; applyFilters(); }, 300));
    requireElement('#totalVotesTable').addEventListener('click', event => {
        const header = event.target.closest('th[data-sort]');
        if (!header) return;
        const key = header.dataset.sort;
        if (key === 'rank') return;
        state.sort = state.sort.key === key ? { key, direction: state.sort.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' };
        applyFilters();
    });
    bindModal();
    bindDetailModal();
}

function debounce(callback, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => callback(...args), delay); };
}

async function init() {
    state.events = await loadEvents();
    state.events.forEach(event => state.selectedEvents.add(event.id));
    renderEventOptions(state.selectedEvents);
    bindControls();
    applyFilters();
}

document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
        console.error('累计得票数数据初始化失败：', error);
        requireElement('#statusMessage').textContent = error instanceof Error ? error.message : '累计得票数数据加载失败';
    });
});
