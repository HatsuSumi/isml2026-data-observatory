import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const firstFiles = {
    female: 'data/phase2/stellar/female/41-phase2-r01-stellar-female.json',
    male: 'data/phase2/stellar/male/42-phase2-r01-stellar-male.json'
};
const sources = { female: 'temp.html', male: 'temp2.html' };
const aliases = new Map([
    ['小鸟游六花\0中二病也要谈恋爱！', 'SF022'],
    ['鲁路修·兰佩洛基\0Code Geass', 'SM094']
]);
const idsByName = new Map();
for (const file of Object.values(firstFiles)) {
    const data = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    for (const match of data.data) {
        for (const item of match.contestants) idsByName.set(`${item.name}\0${item.ip}`, item.participantId);
    }
}
for (const [key, participantId] of aliases) idsByName.set(key, participantId);

function clean(value) {
    return value.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

function parseSource(gender) {
    const html = fs.readFileSync(path.join(root, sources[gender]), 'utf8');
    const chunks = html.split('<div class="resultsArenaGroup ').slice(1);
    if (chunks.length !== 32) throw new Error(`${gender}: expected 32 arenas, got ${chunks.length}`);
    const first = JSON.parse(fs.readFileSync(path.join(root, firstFiles[gender]), 'utf8'));
    const profiles = new Map(first.data.flatMap(match => match.contestants).map(item => [item.participantId, item]));
    const data = chunks.map((chunk, index) => {
        const names = [...chunk.matchAll(/<span class="alt-name-text">([\s\S]*?)<\/span>/g)].map(match => clean(match[1]));
        const ips = [...chunk.matchAll(/<p class="contestantSeries">([\s\S]*?)<\/p>/g)].map(match => clean(match[1]));
        const votes = [...chunk.matchAll(/<h3 class="contestantVotes[^>]*>([\d,]+)<\/h3>/g)].map(match => Number(match[1].replace(/,/g, '')));
        const avatars = [...chunk.matchAll(/<img class="contestantFlag[^>]*src="([^"]+)"/g)].map(match => match[1]);
        if (names.length !== 2 || ips.length !== 2 || votes.length !== 2) throw new Error(`${gender}: invalid arena ${index + 1}`);
        const contestants = names.map((name, itemIndex) => {
            const participantId = idsByName.get(`${name}\0${ips[itemIndex]}`);
            if (!participantId) throw new Error(`${gender}: no participantId for ${name} / ${ips[itemIndex]}`);
            const profile = profiles.get(participantId);
            return {
                participantId,
                votes: votes[itemIndex],
                result: votes[itemIndex] >= votes[1 - itemIndex] ? 'win' : 'loss',
                name,
                ip: ips[itemIndex],
                cv: profile?.cv || '',
                avatar: avatars[itemIndex] || ''
            };
        });
        return { match: index + 1, contestants };
    });
    return {
        date: '2026-10-09 20:00:00 - 2026-10-10 19:59:59',
        event: gender === 'female' ? '第二阶段第二轮-女性组别' : '第二阶段第二轮-男性组别',
        data
    };
}

function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildCsv(data) {
    const rows = [['擂台', '角色', 'IP', '得票数', '结果', '头像']];
    for (const match of data.data) {
        for (const item of match.contestants) {
            rows.push([`擂台${match.match}`, item.name, item.ip, item.votes, item.result === 'win' ? '胜者' : '败者', item.avatar]);
        }
    }
    return `\ufeff${rows.map(row => row.map(csvEscape).join(',')).join('\n')}\n`;
}

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function buildXlsx(data) {
    const rows = [['擂台', '角色', 'IP', '得票数', '结果', '头像']];
    for (const match of data.data) for (const item of match.contestants) rows.push([`擂台${match.match}`, item.name, item.ip, item.votes, item.result === 'win' ? '胜者' : '败者', item.avatar]);
    const escapeXml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const sheetRows = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => `<c r="${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`).join('')}</row>`).join('');
    const parts = {
        types: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
        rels: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        workbook: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="赛事数据" sheetId="1" r:id="rId1"/></sheets></workbook>',
        workbookRels: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
        sheet: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`
    };
    const encoder = new TextEncoder();
    const files = [];
    const central = [];
    let offset = 0;
    for (const [name, content] of Object.entries({ '[Content_Types].xml': parts.types, '_rels/.rels': parts.rels, 'xl/workbook.xml': parts.workbook, 'xl/_rels/workbook.xml.rels': parts.workbookRels, 'xl/worksheets/sheet1.xml': parts.sheet })) {
        const nameBytes = encoder.encode(name);
        const dataBytes = encoder.encode(content);
        const checksum = crc32(dataBytes);
        const header = new Uint8Array(30);
        const headerView = new DataView(header.buffer);
        headerView.setUint32(0, 0x04034b50, true);
        headerView.setUint16(4, 20, true);
        headerView.setUint32(14, checksum, true);
        headerView.setUint32(18, dataBytes.length, true);
        headerView.setUint32(22, dataBytes.length, true);
        headerView.setUint16(26, nameBytes.length, true);
        files.push(Buffer.from(header), Buffer.from(nameBytes), Buffer.from(dataBytes));
        const record = new Uint8Array(46);
        const recordView = new DataView(record.buffer);
        recordView.setUint32(0, 0x02014b50, true);
        recordView.setUint16(4, 20, true);
        recordView.setUint16(6, 20, true);
        recordView.setUint32(16, checksum, true);
        recordView.setUint32(20, dataBytes.length, true);
        recordView.setUint32(24, dataBytes.length, true);
        recordView.setUint16(28, nameBytes.length, true);
        recordView.setUint32(42, offset, true);
        central.push(Buffer.from(record), Buffer.from(nameBytes));
        offset += 30 + nameBytes.length + dataBytes.length;
    }
    const centralData = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(5, 8);
    end.writeUInt16LE(5, 10);
    end.writeUInt32LE(centralData.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...files, centralData, end]);
}

for (const gender of ['female', 'male']) {
    const data = parseSource(gender);
    const base = gender === 'female' ? '43-phase2-r02-stellar-female' : '44-phase2-r02-stellar-male';
    const outputDir = path.join(root, 'data/phase2/stellar', gender);
    const internalDir = path.join(root, 'data/internal/phase2/stellar', gender);
    const internal = {
        date: data.date,
        event: data.event,
        data: data.data.map(match => ({
            match: match.match,
            contestants: match.contestants.map(({ participantId, votes, result }) => ({ participantId, votes, result }))
        }))
    };
    fs.writeFileSync(path.join(outputDir, `${base}.json`), JSON.stringify(data, null, 2) + '\n');
    fs.writeFileSync(path.join(outputDir, `${base}.csv`), buildCsv(data));
    fs.writeFileSync(path.join(outputDir, `${base}.xlsx`), buildXlsx(data));
    fs.writeFileSync(path.join(internalDir, `${base}.json`), JSON.stringify(internal, null, 2) + '\n');
    console.log(`${gender}: 32 arenas, 64 contestants`);
}
