#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runFile = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT_PATH = path.join(ROOT, 'temp.html');
const OUTPUT_ROOT = path.join(ROOT, 'data', 'internal', 'phase1');
const EXPORT_ROOT = path.join(ROOT, 'data', 'phase1');
const PARTICIPANT_MAP_PATH = path.join(ROOT, 'data', 'characters', 'participant-map.json');
const CHARACTERS_CACHE_PATH = path.join(ROOT, '.cache', 'characters-data.json');
const IP_CACHE_PATH = path.join(ROOT, '.cache', 'ip-data.json');
const CHARACTERS_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/characters-data.json';
const IP_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/ip-data.json';

const SERIES_ALIASES = {
    '青春猪头少年': ['青春猪头少年系列'],
    'GIRLS BAND CRY': ['少女乐队的呐喊'],
    'Code Geass': ['反叛的路鲁修', '反叛的鲁路修'],
    '中二病也要谈恋爱': ['中二病也要谈恋爱！']
};

function decodeHtml(value) {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function normalize(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .trim()
        .replace(/[\s\u3000]/g, '')
        .replace(/[·・•]/g, '');
}

function expandIpNames(ip) {
    return [...new Set([ip, ...(SERIES_ALIASES[ip] || []), ...Object.entries(SERIES_ALIASES)
        .filter(([, aliases]) => aliases.includes(ip))
        .map(([canonical]) => canonical)])];
}

function buildIndex(records) {
    const index = new Map();
    for (const record of records) {
        for (const ip of expandIpNames(record.ip)) {
            index.set(`${normalize(record.name)}@${normalize(ip)}`, record);
        }
    }
    return index;
}

function matchParticipant(name, ip, participantIndex) {
    return expandIpNames(ip)
        .map(candidateIp => participantIndex.get(`${normalize(name)}@${normalize(candidateIp)}`))
        .find(Boolean) || null;
}

function extractMatchup(contestantHtmls, index, participantIndex) {
    if (contestantHtmls.length !== 2) {
        throw new Error(`第 ${index + 1} 场应有两名角色，实际为 ${contestantHtmls.length} 名`);
    }

    const contestants = contestantHtmls.map(positionHtml => {
        const contestantHtml = positionHtml;
        const name = contestantHtml.match(/<span class="alt-name-text">([\s\S]*?)<\/span>/)?.[1];
        const ip = contestantHtml.match(/<p class="contestantSeries">([\s\S]*?)<\/p>/)?.[1];
        const votesText = contestantHtml.match(/<h3 class="contestantVotes[^\"]*">([\d,]+)<\/h3>/)?.[1];
        if (!name || !ip || !votesText) throw new Error(`第 ${index + 1} 场角色信息不完整`);

        const decodedName = decodeHtml(name.trim());
        const decodedIp = decodeHtml(ip.trim());
        const participant = matchParticipant(decodedName, decodedIp, participantIndex);

        return {
            participantId: participant?.participantId || null,
            characterId: participant?.characterId || null,
            name: decodedName,
            ip: decodedIp,
            votes: Number(votesText.replace(/,/g, '')),
            avatar: participant?.avatar || ''
        };
    });

    if (contestants[0].votes === contestants[1].votes) {
        throw new Error(`第 ${index + 1} 场票数相同，无法判定胜者`);
    }
    const winnerIndex = contestants[0].votes > contestants[1].votes ? 0 : 1;
    return {
        match: index + 1,
        contestants: contestants.map((contestant, contestantIndex) => ({
            ...contestant,
            result: contestantIndex === winnerIndex ? 'win' : 'loss'
        }))
    };
}

async function readOrDownload(filePath, url) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        if (content.trim()) return JSON.parse(content);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`下载失败：${url} (${response.status})`);
    const content = await response.text();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
    return JSON.parse(content);
}

function getGender(participantId) {
    if (participantId?.startsWith('SF')) return 'female';
    if (participantId?.startsWith('SM')) return 'male';
    throw new Error(`无法识别性别：${participantId}`);
}

function buildPhaseOutput(matches, gender) {
    const genderMatches = matches.filter(match => match.contestants.every(contestant => getGender(contestant.participantId) === gender));
    if (genderMatches.length !== 48) {
        throw new Error(`${gender} 对局数量异常：${genderMatches.length}`);
    }
    return {
        date: '2026-09-01 - 2026-09-02',
        event: `第一阶段第一轮-恒星组${gender === 'female' ? '女性' : '男性'}组别`,
        data: genderMatches.map(match => ({
            match: match.match,
            contestants: match.contestants.map(contestant => ({
                participantId: contestant.participantId,
                votes: contestant.votes,
                result: contestant.result
            }))
        }))
    };
}

function escapeXml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function phaseRows(data) {
    return data.data.flatMap(match => match.contestants.map(contestant => [
        `擂台${match.match}`,
        contestant.name,
        contestant.ip,
        contestant.votes,
        contestant.result === 'win' ? '胜者' : '败者',
        contestant.avatar || ''
    ]));
}

function csvText(data) {
    const rows = [['擂台', '角色', 'IP', '得票数', '结果', '头像'], ...phaseRows(data)];
    return `\ufeff${rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')}\n`;
}

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entries) {
    const files = [];
    const central = [];
    let offset = 0;
    for (const [name, content] of entries) {
        const nameBuffer = Buffer.from(name);
        const dataBuffer = Buffer.from(content);
        const header = Buffer.alloc(30);
        header.writeUInt32LE(0x04034b50, 0);
        header.writeUInt16LE(20, 4);
        header.writeUInt16LE(0, 6);
        header.writeUInt16LE(0, 8);
        header.writeUInt16LE(0, 10);
        header.writeUInt16LE(0, 12);
        header.writeUInt32LE(crc32(dataBuffer), 14);
        header.writeUInt32LE(dataBuffer.length, 18);
        header.writeUInt32LE(dataBuffer.length, 22);
        header.writeUInt16LE(nameBuffer.length, 26);
        header.writeUInt16LE(0, 28);
        files.push(header, nameBuffer, dataBuffer);
        const record = Buffer.alloc(46);
        record.writeUInt32LE(0x02014b50, 0);
        record.writeUInt16LE(20, 4);
        record.writeUInt16LE(20, 6);
        record.writeUInt16LE(0, 8);
        record.writeUInt16LE(0, 10);
        record.writeUInt16LE(0, 12);
        record.writeUInt16LE(0, 14);
        record.writeUInt32LE(crc32(dataBuffer), 16);
        record.writeUInt32LE(dataBuffer.length, 20);
        record.writeUInt32LE(dataBuffer.length, 24);
        record.writeUInt16LE(nameBuffer.length, 28);
        record.writeUInt16LE(0, 30);
        record.writeUInt16LE(0, 32);
        record.writeUInt16LE(0, 34);
        record.writeUInt16LE(0, 36);
        record.writeUInt32LE(0, 38);
        record.writeUInt32LE(offset, 42);
        central.push(record, nameBuffer);
        offset += header.length + nameBuffer.length + dataBuffer.length;
    }
    const centralBuffer = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralBuffer.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...files, centralBuffer, end]);
}

function xlsxBuffer(data) {
    const rows = [['擂台', '角色', 'IP', '得票数', '结果', '头像'], ...phaseRows(data)];
    const cells = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
        const ref = `${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}`;
        const text = escapeXml(value);
        return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
    }).join('')}</row>`).join('');
    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="第一阶段" sheetId="1" r:id="rId1"/></sheets></workbook>';
    const workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${cells}</sheetData></worksheet>`;
    return zipStore([['[Content_Types].xml', contentTypes], ['_rels/.rels', rels], ['xl/workbook.xml', workbook], ['xl/_rels/workbook.xml.rels', workbookRels], ['xl/worksheets/sheet1.xml', sheet]]);
}

async function writePhaseFile(gender, data) {
    const directory = path.join(OUTPUT_ROOT, 'stellar', gender);
    const fileName = `${gender === 'female' ? '27' : '28'}-phase1-r01-stellar-${gender}.json`;
    await fs.mkdir(directory, { recursive: true });
    const jsonPath = path.join(directory, fileName);
    await fs.writeFile(jsonPath, `${JSON.stringify(data, null, 4)}\n`, 'utf8');
    return path.relative(ROOT, jsonPath);
}

async function main() {
    const [html, participantMap, characters, ips] = await Promise.all([
        fs.readFile(INPUT_PATH, 'utf8'),
        fs.readFile(PARTICIPANT_MAP_PATH, 'utf8').then(JSON.parse),
        readOrDownload(CHARACTERS_CACHE_PATH, CHARACTERS_URL),
        readOrDownload(IP_CACHE_PATH, IP_URL)
    ]);
    const ipNames = new Map(Object.values(ips).map(ip => [ip.id, ip.name]));
    const participantRecords = Object.entries(participantMap).map(([participantId, characterId]) => {
        const character = characters[characterId];
        return {
            participantId,
            characterId,
            name: character?.name,
            ip: ipNames.get(character?.ip_id),
            avatar: character?.avatar || ''
        };
    }).filter(record => record.name && record.ip);
    const participantIndex = buildIndex(participantRecords);

    const positions = [...html.matchAll(/<div class="resultArenaPosition">([\s\S]*?)<\/div>\s*<\/div>/g)];
    if (!positions.length || positions.length % 2 !== 0) {
        throw new Error(`对局位置数量无效：${positions.length}`);
    }
    const matches = [];
    for (let index = 0; index < positions.length; index += 2) {
        matches.push(extractMatchup([positions[index][1], positions[index + 1][1]], index / 2, participantIndex));
    }
    const output = {
        event: '恒星联赛女子组与男性组',
        source: path.relative(ROOT, INPUT_PATH),
        matches
    };
    const femaleOutput = buildPhaseOutput(matches, 'female');
    const maleOutput = buildPhaseOutput(matches, 'male');
    const [femalePath, malePath] = await Promise.all([
        writePhaseFile('female', femaleOutput),
        writePhaseFile('male', maleOutput)
    ]);
    console.log(`已生成: ${femalePath}`);
    console.log(`已生成: ${malePath}`);
    await runFile('python', [path.join(ROOT, 'scripts', 'build-phase1-exports.py'), femalePath, malePath, '--export-root', EXPORT_ROOT], { cwd: ROOT });
    console.log('女性对局: 48');
    console.log('男性对局: 48');
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
