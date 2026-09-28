import { buildCustomSelect, closeCustomSelects, syncCustomSelect } from './table-custom-select.js';
import { loadEventData, loadGroupData, loadPhase1Data } from '../common/data-loader.js';


const state = {
    config: null,
    rows: [],
    filtered: [],
    sort: { key: 'votes', direction: 'desc' }
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

function getGroupKey(id) {
    const match = String(id).match(/^phase1-(r\d+)-(stellar)-(female|male)$/);
    if (!match) throw new Error(`无法从第一阶段赛事 ID 识别分组: ${id}`);
    return `phase1.${match[2]}.${match[1]}.${match[3]}`;
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
    if (['votes', 'globalRank', 'groupRank', 'seed', 'matchNumber'].includes(key)) return (a[key] || 0) - (b[key] || 0);
    return String(a[key] || '').localeCompare(String(b[key] || ''), 'zh-CN');
}

function applyFilters() {
    const status = document.getElementById('statusFilter').value;
    const match = document.getElementById('matchFilter').value;
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const min = Number(document.getElementById('minVotes').value || -Infinity);
    const max = Number(document.getElementById('maxVotes').value || Infinity);
    const factor = state.sort.direction === 'asc' ? 1 : -1;
    state.filtered = state.rows.filter((row) => (status === 'all' || row.result === status) && (match === 'all' || row.match === match) && row.votes >= min && row.votes <= max && (!search || `${row.name} ${row.ip}`.toLowerCase().includes(search))).sort((a, b) => compare(a, b, state.sort.key) * factor || b.votes - a.votes);
    renderRows();
}

function renderRows() {
    const body = document.getElementById('tableBody');
    body.replaceChildren(...state.filtered.map((row) => {
        const tr = document.createElement('tr');
        const values = [row.group, row.seed ?? '-', row.match, row.globalRank, row.name, row.ip, `${row.votes}票`, row.result === 'win' ? '胜者' : '败者'];
        values.forEach((value, index) => {
            const td = document.createElement('td');
            if (index === 5) td.className = 'ip';
            td.textContent = value;
            tr.appendChild(td);
        });
        const avatar = document.createElement('td');
        if (row.avatar) { const img = document.createElement('img'); img.src = row.avatar; img.alt = `${row.name}头像`; img.loading = 'lazy'; avatar.appendChild(img); }
        tr.insertBefore(avatar, tr.children[5]);
        tr.lastChild.className = row.result === 'win' ? 'status-win' : 'status-loss';
        return tr;
    }));
    const wins = state.filtered.filter((row) => row.result === 'win').length;
    document.getElementById('summary').textContent = `显示 ${state.filtered.length} 名角色，其中胜者 ${wins} 名，败者 ${state.filtered.length - wins} 名`;
}

function populateMatches() {
    const select = document.getElementById('matchFilter');
    [...new Set(state.rows.map((row) => row.match))].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2))).forEach((match) => {
        const option = document.createElement('option'); option.value = match; option.textContent = match; select.appendChild(option);
    });
    buildCustomSelect(select);
    syncCustomSelect(select);
}

function bindControls() {
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
        const isOpen = downloadMenu.hasAttribute('hidden');
        downloadMenu.toggleAttribute('hidden', !isOpen);
        if (isOpen) {
            downloadMenu.style.setProperty('display', 'block', 'important');
            downloadMenu.style.setProperty('visibility', 'visible', 'important');
            downloadMenu.style.setProperty('opacity', '1', 'important');
            downloadMenu.style.setProperty('pointer-events', 'auto', 'important');
        } else {
            downloadMenu.style.removeProperty('display');
            downloadMenu.style.removeProperty('visibility');
            downloadMenu.style.removeProperty('opacity');
            downloadMenu.style.removeProperty('pointer-events');
        }
        dropdown.classList.toggle('show', isOpen);
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
            downloadMenu?.setAttribute('hidden', '');
            downloadMenu?.style.removeProperty('display');
            downloadMenu?.style.removeProperty('visibility');
            downloadMenu?.style.removeProperty('opacity');
            downloadMenu?.style.removeProperty('pointer-events');
            dropdown?.classList.remove('show');
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
    state.config = await getConfig(id);
    if (!state.config?.links?.data) throw new Error('缺少或无效的第一阶段表格 id 参数');
    const rawData = await loadPhase1Data(state.config.links.data);
    const allGroups = await loadGroupData();
    const groupConfig = allGroups.groups[getGroupKey(id)];
    if (!groupConfig) throw new Error(`未找到第一阶段分组数据: ${getGroupKey(id)}`);
    state.rows = normalizeRows(rawData, getGroupMembers(groupConfig));
    document.title = `${state.config.title} - ISML 2026 数据观测`;
    document.getElementById('pageTitle').textContent = state.config.title;
    document.getElementById('pageSubtitle').textContent = `${rawData.date || ''} · ${rawData.event || ''}`;
    document.getElementById('visualizationLink').href = state.config.links.visualization;
    populateMatches();
    bindControls();
    applyFilters();
}

init().catch((error) => { console.error('第一阶段表格初始化失败:', error); document.getElementById('pageSubtitle').textContent = error instanceof Error ? error.message : '第一阶段表格加载失败'; });
