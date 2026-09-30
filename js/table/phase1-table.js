import { buildCustomSelect, closeCustomSelects, syncCustomSelect } from './table-custom-select.js';
import { loadEventData, loadGroupData, loadNecklaceData, loadPhase1Data } from '../common/data-loader.js';


const state = {
    config: null,
    rows: [],
    filtered: [],
    sort: { key: 'votes', direction: 'desc' },
    necklace: false
};

function getId() { return new URLSearchParams(window.location.search).get('id') || ''; }

async function getConfig(id) {
    const source = await loadEventData();
    for (const month of Object.values((source.events || source).months || {})) {
        for (const event of month.events || []) {
            const match = (event.matches || []).find((item) => {
                const url = item.links?.visualization || '';
                return new URLSearchParams(url.split('?')[1] || '').get('id') === id;
            });
            if (match) return { ...match, dateRange: event.dateRange };
        }
    }
    return null;
}

function isNecklaceId(id) {
    return String(id).startsWith('phase1-r06-necklace-');
}

function getNecklaceRows(raw) {
    const byParticipant = new Map();
    raw.data.forEach((round) => {
        round.contestants.forEach((item) => {
            const current = byParticipant.get(item.participantId) || {
                ...item,
                roundVotes: Array(raw.data.length).fill(null),
                eliminationRound: null,
                finalRank: null
            };
            current.roundVotes[round.round - 1] = item.votes;
            if (item.status === 'winner') {
                current.finalRank = 1;
                current.eliminationRound = null;
            } else if (item.status === 'eliminated') {
                current.eliminationRound = round.round;
                current.finalRank = 9 - round.round;
            }
            byParticipant.set(item.participantId, current);
        });
    });
    return [...byParticipant.values()]
        .map((item) => ({
            ...item,
            group: '',
            seed: null,
            match: `淘汰第${item.eliminationRound}轮`,
            matchNumber: item.eliminationRound,
            globalRank: item.finalRank,
            result: item.finalRank === 1 ? 'win' : 'loss',
            votes: item.roundVotes.findLast((value) => Number.isFinite(value)) ?? 0,
            eliminationRound: item.eliminationRound
        }))
        .sort((a, b) => a.globalRank - b.globalRank);
}

function getNecklaceHeaders() {
    return [
        ['globalRank', '最终排名'],
        ['name', '角色'],
        ['avatar', '头像'],
        ['ip', 'IP'],
        ...Array.from({ length: 7 }, (_, index) => [`round${index + 1}`, `第${index + 1}轮票数`]),
        ['eliminationRound', '淘汰轮次'],
        ['result', '结果']
    ];
}

function setupNecklaceTable() {
    document.body.classList.add('necklace-table-page');
    document.getElementById('pageTitle').textContent = '第一阶段第六轮项链赛表格';
    document.querySelector('.subtitle:not(#pageSubtitle)')?.remove();
    document.querySelector('.filter-container')?.remove();
    document.querySelector('[data-download-group="filtered"]')?.remove();
    document.getElementById('tableHead').innerHTML = `<tr>${getNecklaceHeaders().map(([, label]) => `<th>${label}</th>`).join('')}</tr>`;
}

function getGroupKey(id) {
    const match = String(id).match(/^phase1-(r\d+)-(stellar)-(female|male)$/);
    if (!match) throw new Error(`无法从第一阶段赛事 ID 识别分组: ${id}`);
    return `phase1.${match[2]}.${match[1]}.${match[3]}`;
}

function resolveGroupReference(rawGroups, groupKey, stack = []) {
    const config = rawGroups[groupKey];
    if (!config) return null;
    const reference = config.groups?.$ref;
    if (!reference) return config;
    if (stack.includes(groupKey)) throw new Error(`分组引用循环: ${[...stack, groupKey].join(' -> ')}`);
    const source = resolveGroupReference(rawGroups, reference, [...stack, groupKey]);
    return source ? { ...source, ...config, groups: source.groups } : null;
}

async function getGroupConfig(allGroups, groupKey) {
    if (allGroups.groups[groupKey]) return allGroups.groups[groupKey];
    const response = await fetch('data/groups/groups.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`分组数据加载失败: ${response.status}`);
    const rawGroups = await response.json();
    const rawConfig = resolveGroupReference(rawGroups, groupKey);
    if (!rawConfig) return null;
    return allGroups.groups[groupKey] || rawConfig;
}

function getGroupMembers(groupConfig) {
    return Object.entries(groupConfig.groups).flatMap(([group, members]) => members.map((member) => ({ ...member, group })));
}

function normalizeRows(raw, groupMembers) {
    if (!Array.isArray(raw.data) || !Array.isArray(raw.data[0]?.contestants)) throw new Error('第一阶段数据格式错误');
    const memberById = new Map(groupMembers.map((member) => [member.participantId, member]));
    const rows = raw.data.flatMap((match) => match.contestants.map((item) => {
        const groupMember = memberById.get(item.participantId) || {};
        return {
            ...item,
            group: groupMember.group || '',
            seed: groupMember.seed ?? null,
            groupRank: groupMember.rank ?? null,
            match: `擂台${match.match}`,
            matchNumber: Number(match.match),
            result: item.result === 'win' ? 'win' : 'loss',
            votes: Number(item.votes)
        };
    }));
    return rows.sort((a, b) => b.votes - a.votes || a.matchNumber - b.matchNumber).map((row, index) => ({ ...row, globalRank: index + 1 }));
}

function compare(a, b, key) {
    if (key.startsWith('round')) {
        const index = Number(key.slice(5)) - 1;
        return (a.roundVotes[index] ?? -Infinity) - (b.roundVotes[index] ?? -Infinity);
    }
    if (['votes', 'globalRank', 'groupRank', 'seed', 'matchNumber', 'eliminationRound'].includes(key)) return (a[key] || 0) - (b[key] || 0);
    return String(a[key] || '').localeCompare(String(b[key] || ''), 'zh-CN');
}

function applyFilters() {
    const factor = state.sort.direction === 'asc' ? 1 : -1;
    if (state.necklace) {
        state.filtered = [...state.rows].sort((a, b) => compare(a, b, state.sort.key) * factor || a.globalRank - b.globalRank);
        renderRows();
        return;
    }
    const status = document.getElementById('statusFilter').value;
    const match = document.getElementById('matchFilter').value;
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const min = Number(document.getElementById('minVotes').value || -Infinity);
    const max = Number(document.getElementById('maxVotes').value || Infinity);
    state.filtered = state.rows.filter((row) => (
        (status === 'all' || row.result === status)
        && (match === 'all' || row.match === match)
        && row.votes >= min
        && row.votes <= max
        && (!search || `${row.name} ${row.ip}`.toLowerCase().includes(search))
    )).sort((a, b) => compare(a, b, state.sort.key) * factor || b.votes - a.votes);
    renderRows();
}

function renderRows() {
    const body = document.getElementById('tableBody');
    body.replaceChildren(...state.filtered.map((row) => {
        const tr = document.createElement('tr');
        const values = state.necklace
            ? [row.globalRank, row.name, row.avatar, row.ip, ...row.roundVotes, row.eliminationRound, row.result === 'win' ? '胜者' : '淘汰']
            : [row.group, row.seed ?? '-', row.match, row.globalRank, row.name, row.ip, `${row.votes}票`, row.result === 'win' ? '胜者' : '败者'];
        values.forEach((value, index) => {
            const td = document.createElement('td');
            if (state.necklace && index === 2 && row.avatar) {
                const img = document.createElement('img');
                img.src = row.avatar;
                img.alt = `${row.name}头像`;
                img.loading = 'lazy';
                td.appendChild(img);
            } else if (!state.necklace || index !== 2) {
                td.textContent = value === null || value === undefined ? '-' : value;
            }
            if ((!state.necklace && index === 5) || (state.necklace && index === 3)) td.className = 'ip';
            tr.appendChild(td);
        });
        if (!state.necklace) {
            const avatar = document.createElement('td');
            if (row.avatar) { const img = document.createElement('img'); img.src = row.avatar; img.alt = `${row.name}头像`; img.loading = 'lazy'; avatar.appendChild(img); }
            tr.insertBefore(avatar, tr.children[5]);
            tr.lastChild.className = row.result === 'win' ? 'status-win' : 'status-loss';
        } else {
            tr.lastChild.className = row.result === 'win' ? 'status-win' : 'status-loss';
        }
        return tr;
    }));
    const wins = state.filtered.filter((row) => row.result === 'win').length;
    document.getElementById('summary').textContent = `显示 ${state.filtered.length} 名角色，其中${state.necklace ? '胜者' : '胜者'} ${wins} 名，${state.necklace ? '淘汰' : '败者'} ${state.filtered.length - wins} 名`;
}

function populateMatches() {
    if (state.necklace) return;
    const select = document.getElementById('matchFilter');
    [...new Set(state.rows.map((row) => row.match))].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2))).forEach((match) => {
        const option = document.createElement('option'); option.value = match; option.textContent = match; select.appendChild(option);
    });
    buildCustomSelect(select);
    syncCustomSelect(select);
}

function bindControls() {
    if (!state.necklace) {
        const statusSelect = document.getElementById('statusFilter');
        buildCustomSelect(statusSelect);
        syncCustomSelect(statusSelect);
        ['statusFilter', 'matchFilter', 'searchInput', 'minVotes', 'maxVotes'].forEach((id) => {
            const control = document.getElementById(id);
            if (control) control.addEventListener(id.includes('Filter') ? 'change' : 'input', applyFilters);
        });
        document.getElementById('resetBtn')?.addEventListener('click', () => {
            ['statusFilter', 'matchFilter'].forEach((id) => {
                const control = document.getElementById(id);
                if (control) {
                    control.value = 'all';
                    syncCustomSelect(control);
                }
            });
            ['searchInput', 'minVotes', 'maxVotes'].forEach((id) => { const control = document.getElementById(id); if (control) control.value = ''; });
            state.sort = { key: 'votes', direction: 'desc' };
            applyFilters();
        });
    }
    document.querySelectorAll('th[data-sort]').forEach((header) => header.addEventListener('click', () => {
        const key = header.dataset.sort;
        state.sort = state.sort.key === key
            ? { key, direction: state.sort.direction === 'asc' ? 'desc' : 'asc' }
            : { key, direction: ['votes', 'globalRank', 'groupRank', 'seed'].includes(key) ? 'desc' : 'asc' };
        applyFilters();
    }));
    const downloadMenu = document.getElementById('phase1DownloadDropdown');
    const dropdown = downloadMenu?.closest('.dropdown');
    const downloadButton = dropdown?.querySelector('.download-btn');
    downloadButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!downloadMenu) {
            return;
        }
        const isOpen = !downloadMenu.classList.contains('show');
        downloadMenu.classList.toggle('show', isOpen);
        downloadButton.setAttribute('aria-expanded', String(isOpen));
    });
    downloadMenu?.addEventListener('click', (event) => {
        const item = event.target.closest('[data-download]');
        if (!item) return;
        event.preventDefault();
        event.stopPropagation();
        handleDownload(item.dataset.download).catch((error) => console.error('下载失败:', error));
    });
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.select-wrapper')) closeCustomSelects();
        if (!event.target.closest('.dropdown')) {
            downloadMenu?.classList.remove('show');
            downloadButton?.setAttribute('aria-expanded', 'false');
        }
    });
    document.getElementById('backToTop')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function toExportRows(rows) {
    if (state.necklace) {
        return [
            ['最终排名', '角色', 'IP', ...Array.from({ length: 7 }, (_, index) => `第${index + 1}轮票数`), '淘汰轮次', '最终结果', '头像'],
            ...rows.map((row) => [row.globalRank, row.name, row.ip, ...row.roundVotes, row.eliminationRound, row.result === 'win' ? '胜者' : '淘汰', row.avatar || ''])
        ];
    }
    return [['分组', '种子', '擂台', '全局排名', '角色', 'IP', '得票数', '结果'], ...rows.map((row) => [row.group, row.seed ?? '', row.match, row.globalRank, row.name, row.ip, row.votes, row.result === 'win' ? '胜者' : '败者'])];
}

function buildCsv(rows) {
    return `\ufeff${toExportRows(rows).map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')}\n`;
}

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entries) {
    const encoder = new TextEncoder();
    const files = [];
    const central = [];
    let offset = 0;
    entries.forEach(([name, content]) => {
        const nameBytes = encoder.encode(name);
        const data = encoder.encode(content);
        const header = new Uint8Array(30);
        const view = new DataView(header.buffer);
        view.setUint32(0, 0x04034b50, true);
        view.setUint16(4, 20, true);
        view.setUint32(14, crc32(data), true);
        view.setUint32(18, data.length, true);
        view.setUint32(22, data.length, true);
        view.setUint16(26, nameBytes.length, true);
        files.push(header, nameBytes, data);
        const record = new Uint8Array(46);
        const recordView = new DataView(record.buffer);
        recordView.setUint32(0, 0x02014b50, true);
        recordView.setUint16(4, 20, true);
        recordView.setUint16(6, 20, true);
        recordView.setUint32(16, crc32(data), true);
        recordView.setUint32(20, data.length, true);
        recordView.setUint32(24, data.length, true);
        recordView.setUint16(28, nameBytes.length, true);
        recordView.setUint32(42, offset, true);
        central.push(record, nameBytes);
        offset += header.length + nameBytes.length + data.length;
    });
    const centralSize = central.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    return new Blob([...files, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function buildXlsx(rows) {
    const values = toExportRows(rows);
    const escapeXml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const sheetRows = values.map((line, rowIndex) => `<row r="${rowIndex + 1}">${line.map((value, columnIndex) => `<c r="${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`).join('')}</row>`).join('');
    const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
    const types = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
    const rels = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    const workbook = '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="第一阶段" sheetId="1" r:id="rId1"/></sheets></workbook>';
    const workbookRels = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
    return zipStore([['[Content_Types].xml', types], ['_rels/.rels', rels], ['xl/workbook.xml', workbook], ['xl/_rels/workbook.xml.rels', workbookRels], ['xl/worksheets/sheet1.xml', sheet]]);
}

async function downloadSource(extension) {
    const base = state.config.links.data.replace(/^data\/internal\/phase1\//, 'data/phase1/').replace(/\.json$/, '');
    const response = await fetch(`${base}.${extension}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`下载失败: ${response.status}`);
    triggerDownload(await response.blob(), `${base.split('/').pop()}.${extension}`);
}

async function handleDownload(type) {
    if (type.startsWith('source-')) return downloadSource(type.replace('source-', ''));
    const extension = type.replace('filtered-', '');
    if (extension === 'json') return triggerDownload(new Blob([JSON.stringify(state.filtered, null, 2)], { type: 'application/json;charset=utf-8' }), `${state.config.title}-筛选后.json`);
    if (extension === 'csv') return triggerDownload(new Blob([buildCsv(state.filtered)], { type: 'text/csv;charset=utf-8' }), `${state.config.title}-筛选后.csv`);
    triggerDownload(buildXlsx(state.filtered), `${state.config.title}-筛选后.xlsx`);
}


async function init() {
    const id = getId();
    state.necklace = isNecklaceId(id);
    state.config = await getConfig(id);
    if (!state.config?.links?.data) throw new Error('缺少或无效的第一阶段表格 id 参数');
    const rawData = state.necklace
        ? await loadNecklaceData(state.config.links.data)
        : await loadPhase1Data(state.config.links.data);
    if (state.necklace) {
        setupNecklaceTable();
        state.rows = getNecklaceRows(rawData);
    } else {
        const allGroups = await loadGroupData();
        const groupKey = getGroupKey(id);
        const groupConfig = await getGroupConfig(allGroups, groupKey);
        if (!groupConfig) throw new Error(`未找到第一阶段分组数据: ${groupKey}`);
        state.rows = normalizeRows(rawData, getGroupMembers(groupConfig));
    }
    document.title = `${state.config.title} - ISML 2026 数据观测`;
    document.getElementById('pageTitle').textContent = state.config.title;
    const subtitleDate = state.necklace
        ? rawData.date.split(' ')[0] + ' - ' + rawData.date.split(' - ')[1].split(' ')[0]
        : rawData.date || '';
    document.getElementById('pageSubtitle').textContent = `${subtitleDate} · ${rawData.event || ''}`;
    document.getElementById('visualizationLink').href = state.config.links.visualization;
    populateMatches();
    bindControls();
    applyFilters();
}

init().catch((error) => { console.error('第一阶段表格初始化失败:', error); document.getElementById('pageSubtitle').textContent = error instanceof Error ? error.message : '第一阶段表格加载失败'; });
