import { buildCustomSelect, closeCustomSelects, syncCustomSelect } from './table-custom-select.js';
import { loadEventData } from '../common/data-loader.js';
import { reconcileKeyedList } from '../common/keyed-list.js';

const DEFAULT_SORT = { key: 'votes', direction: 'desc' };
const state = {
    title: '预选赛表格',
    visualizationId: '',
    dataPath: '',
    rows: [],
    filteredRows: [],
    sort: { ...DEFAULT_SORT },
    filters: { group: 'all', status: 'all', search: '', minVotes: '', maxVotes: '' }
};

function getId() {
    return new URLSearchParams(window.location.search).get('id') || '';
}

async function getMatchConfig(id) {
    const source = await loadEventData();
    const events = source.events || source;
    for (const month of Object.values(events.months || {})) {
        for (const event of month.events || []) {
            for (const match of event.matches || []) {
                const visualizationUrl = match.links?.visualization || '';
                const visualizationId = new URLSearchParams(visualizationUrl.split('?')[1] || '').get('id');
                if (visualizationId === id || match.id === id) {
                    return { ...match, dateRange: event.dateRange };
                }
            }
        }
    }
    return null;
}

function normalizeRows(rawData) {
    if (!Array.isArray(rawData?.data)) throw new Error('预选赛数据格式错误：data 必须是数组');
    return rawData.data
        .map((item) => ({
            ...item,
            group: String(item.group || '未分组'),
            rank: Number(item.rank),
            name: String(item.name || ''),
            ip: String(item.ip || ''),
            votes: Number(item.votes),
            isPromoted: item.is_advanced === true
        }))
        .filter((item) => item.name && Number.isFinite(item.rank) && Number.isFinite(item.votes))
        .sort((a, b) => a.votes - b.votes || a.rank - b.rank);
}

function compareValues(a, b, key) {
    if (key === 'votes' || key === 'rank') return a[key] - b[key];
    if (key === 'isPromoted') return Number(a[key]) - Number(b[key]);
    return String(a[key] || '').localeCompare(String(b[key] || ''), 'zh-CN');
}

function closeDropdownIfNeeded(event) {
    if (event.target.closest('.select-wrapper')) return;
    closeCustomSelects();
}

function sortRows(rows) {
    const { key, direction } = state.sort;
    const factor = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => compareValues(a, b, key) * factor || b.votes - a.votes || a.rank - b.rank);
}

function applyFilters() {
    const { group, status, search, minVotes, maxVotes } = state.filters;
    const normalizedSearch = search.trim().toLowerCase();
    const min = minVotes === '' ? -Infinity : Number(minVotes);
    const max = maxVotes === '' ? Infinity : Number(maxVotes);
    state.filteredRows = sortRows(state.rows.filter((row) => {
        const matchesGroup = group === 'all' || row.group === group;
        const matchesStatus = status === 'all' || (status === 'promoted' ? row.isPromoted : !row.isPromoted);
        const matchesSearch = !normalizedSearch || `${row.name} ${row.ip}`.toLowerCase().includes(normalizedSearch);
        return matchesGroup && matchesStatus && row.votes >= min && row.votes <= max && matchesSearch;
    }));
    renderRows();
}

function createPreliminaryRow() {
    const template = document.getElementById('preliminary-row-template');
    if (!template?.content?.firstElementChild) {
        throw new Error('预选赛表格缺少有效的 preliminary-row-template 模板');
    }
    return template.content.firstElementChild.cloneNode(true);
}

function updatePreliminaryRow(tr, row) {
    tr.dataset.promoted = String(row.isPromoted);
    tr.querySelector('.group').textContent = row.group;
    tr.querySelector('.rank').textContent = String(row.rank);
    tr.querySelector('.name').textContent = row.name;
    tr.querySelector('.ip').textContent = row.ip;
    tr.querySelector('.cv').textContent = row.cv || '-';
    tr.querySelector('.votes').textContent = `${row.votes}票`;

    const avatar = tr.querySelector('.avatar img');
    avatar.hidden = !row.avatar;
    avatar.src = row.avatar || '';
    avatar.alt = row.avatar ? `${row.name}头像` : '';

    const status = tr.querySelector('.status');
    status.textContent = row.isPromoted ? '晋级' : '未晋级';
    status.className = `status ${row.isPromoted ? 'status-promoted' : 'status-eliminated'}`;
}

function renderRows() {
    const body = document.getElementById('tableBody');
    reconcileKeyedList(body, state.filteredRows, {
        getKey: (row) => `${row.group}@${row.name}@${row.ip}`,
        keyAttribute: 'rowKey',
        create: createPreliminaryRow,
        update: updatePreliminaryRow
    });
    body.querySelectorAll('tr').forEach((row) => row.classList.add('fade-in'));
    const promoted = state.filteredRows.filter((row) => row.isPromoted).length;
    document.getElementById('summary').textContent = `显示 ${state.filteredRows.length} 名角色，其中晋级 ${promoted} 名`;
}

function populateGroupFilter() {
    const select = document.getElementById('groupFilter');
    const template = document.getElementById('group-option-template');
    if (!template?.content?.firstElementChild) {
        throw new Error('预选赛表格缺少有效的 group-option-template 模板');
    }
    const fragment = document.createDocumentFragment();
    [...new Set(state.rows.map((row) => row.group))]
        .sort((a, b) => a.localeCompare(b, 'zh-CN'))
        .forEach((group) => {
            const option = template.content.firstElementChild.cloneNode(true);
            option.value = group;
            option.textContent = group;
            fragment.appendChild(option);
        });
    select.appendChild(fragment);
}

function bindControls() {
    const group = document.getElementById('groupFilter');
    const status = document.getElementById('statusFilter');
    const search = document.getElementById('searchInput');
    const minVotes = document.getElementById('minVotes');
    const maxVotes = document.getElementById('maxVotes');

    buildCustomSelect(group);
    buildCustomSelect(status);
    const update = () => {
        state.filters = {
            group: group.value,
            status: status.value,
            search: search.value,
            minVotes: minVotes.value,
            maxVotes: maxVotes.value
        };
        applyFilters();
    };
    [group, status].forEach((control) => control.addEventListener('change', update));
    [search, minVotes, maxVotes].forEach((control) => control.addEventListener('input', update));
    document.addEventListener('click', closeDropdownIfNeeded);
    document.querySelectorAll('th[data-sort]').forEach((header) => {
        header.dataset.sortable = 'true';
        header.addEventListener('click', () => {
        const key = header.dataset.sort;
        state.sort = state.sort.key === key
            ? { key, direction: state.sort.direction === 'asc' ? 'desc' : 'asc' }
            : { key, direction: key === 'votes' || key === 'rank' ? 'desc' : 'asc' };
        document.querySelectorAll('th[data-sort]').forEach((item) => item.classList.remove('sort-asc', 'sort-desc'));
        header.classList.add(state.sort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        applyFilters();
        });
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
        group.value = 'all';
        status.value = 'all';
        search.value = '';
        minVotes.value = '';
        maxVotes.value = '';
        syncCustomSelect(group);
        syncCustomSelect(status);
        state.sort = { ...DEFAULT_SORT };
        document.querySelectorAll('th[data-sort]').forEach((item) => item.classList.remove('sort-asc', 'sort-desc'));
        document.querySelector('th[data-sort="votes"]').classList.add('sort-desc');
        update();
    });
    document.getElementById('downloadCsv').addEventListener('click', () => download('csv'));
    document.getElementById('downloadJson').addEventListener('click', () => download('json'));
    document.getElementById('backToTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function download(format) {
    const headers = ['组别', '组内排名', '角色', '头像', 'IP', 'CV', '得票数', '状态'];
    const values = state.filteredRows.map((row) => [row.group, row.rank, row.name, row.avatar, row.ip, row.cv, row.votes, row.isPromoted ? '晋级' : '未晋级']);
    const content = format === 'json'
        ? JSON.stringify(state.filteredRows, null, 2)
        : [headers, ...values].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([format === 'csv' ? `\ufeff${content}` : content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${state.title}-${format}.${format}`;
    link.click();
    URL.revokeObjectURL(link.href);
}

async function init() {
    const id = getId();
    const config = await getMatchConfig(id);
    if (!config?.links?.data) throw new Error('缺少或无效的预选赛表 id 参数');
    state.title = config.title || '预选赛表格';
    state.visualizationId = new URLSearchParams((config.links.visualization || '').split('?')[1] || '').get('id') || id;
    state.dataPath = config.links.data;
    const response = await fetch(state.dataPath, { cache: 'no-store' });
    if (!response.ok) throw new Error(`预选赛数据加载失败：${response.status}`);
    const rawData = await response.json();
    state.rows = normalizeRows(rawData);
    document.title = `${state.title} - ISML 2026 数据观测`;
    document.getElementById('pageTitle').textContent = state.title;
    document.getElementById('pageSubtitle').textContent = `${rawData.date || ''} · ${rawData.event || ''}`;
    document.getElementById('visualizationLink').href = `pages/visualization/visualization.html?id=${encodeURIComponent(state.visualizationId)}`;
    populateGroupFilter();
    bindControls();
    document.querySelector('th[data-sort="votes"]').classList.add('sort-desc');
    applyFilters();
}

init().catch((error) => {
    console.error('预选赛表格初始化失败:', error);
    document.getElementById('pageSubtitle').textContent = error instanceof Error ? error.message : '预选赛表格加载失败';
});
