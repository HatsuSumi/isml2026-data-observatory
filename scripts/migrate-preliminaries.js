#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SOURCE_ROOT = path.join(rootDir, 'data/preliminaries');
const OUTPUT_ROOT = path.join(rootDir, 'data/internal/preliminaries');
const MAP_PATH = path.join(rootDir, 'data/characters/participant-map.json');
const CHAR_CACHE_PATH = path.join(rootDir, '.cache/characters-data.json');
const IP_CACHE_PATH = path.join(rootDir, '.cache/ip-data.json');
const CHARACTER_DATABASE_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/characters-data.json';
const IP_DATABASE_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/ip-data.json';

const MANUAL_ALIASES = {};

const SERIES_ALIASES = {
    '青春猪头少年': ['青春猪头少年系列'],
    'GIRLS BAND CRY': ['少女乐队的呐喊'],
    '疑似后宫': ['百变的七仓同学'],
    'Code Geass': ['反叛的鲁路修'],
    '治愈魔法的错误使用法～奔赴战场的回复要员～': ['治愈魔法的错误使用法']
};

function fail(message) {
    throw new Error(message);
}

function normalize(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .trim()
        .toLocaleLowerCase()
        .replace(/[\s\u3000]/g, '')
        .replace(/[·・•]/g, '')
        .replace(/[！!？?。.～~]/g, '');
}

function expandIpNames(ip) {
    const names = new Set([ip]);
    const aliases = SERIES_ALIASES[ip] || [];
    aliases.forEach(alias => names.add(alias));
    Object.entries(SERIES_ALIASES).forEach(([canonical, aliasList]) => {
        if (aliasList.includes(ip)) names.add(canonical);
    });
    return [...names];
}

function indexRecords(records) {
    const exact = new Map();
    const normalized = new Map();
    const byName = new Map();
    records.forEach(record => {
        const keys = expandIpNames(record.ip).flatMap(ipName => [
            `${record.name}@${ipName}`,
            `${normalize(record.name)}@${normalize(ipName)}`
        ]);
        keys.forEach((key, index) => {
            const target = index % 2 === 0 ? exact : normalized;
            if (!target.has(key)) target.set(key, record);
        });
        const nameKey = normalize(record.name);
        if (!byName.has(nameKey)) byName.set(nameKey, []);
        byName.get(nameKey).push(record);
    });
    return { exact, normalized, byName };
}

function uniqueById(records) {
    return [...new Map(records.map(record => [record.participantId || record.characterId, record])).values()];
}

function matchRecord(item, participantIndex, characterIndex) {
    const alias = MANUAL_ALIASES[`${item.name}@${item.ip}`];
    if (alias) return { ...alias, kind: 'manual' };

    const exactKeys = expandIpNames(item.ip).map(ip => `${item.name}@${ip}`);
    const normalizedKeys = expandIpNames(item.ip).map(ip => `${normalize(item.name)}@${normalize(ip)}`);
    for (const key of exactKeys) {
        if (participantIndex.exact.has(key)) return { ...participantIndex.exact.get(key), kind: 'participantExact' };
    }
    for (const key of normalizedKeys) {
        if (participantIndex.normalized.has(key)) return { ...participantIndex.normalized.get(key), kind: 'participantNormalized' };
    }
    for (const key of exactKeys) {
        if (characterIndex.exact.has(key)) return { ...characterIndex.exact.get(key), kind: 'characterExact' };
    }
    for (const key of normalizedKeys) {
        if (characterIndex.normalized.has(key)) return { ...characterIndex.normalized.get(key), kind: 'characterNormalized' };
    }

    const sameName = uniqueById([
        ...(participantIndex.byName.get(normalize(item.name)) || []),
        ...(characterIndex.byName.get(normalize(item.name)) || [])
    ]);
    if (sameName.length === 1) {
        return { ...sameName[0], kind: 'nameOnlyUnique' };
    }
    return null;
}

function toEventFields(item) {
    return {
        group: String(item.group || ''),
        rank: item.rank,
        global_rank: item.global_rank,
        votes: item.votes,
        is_advanced: item.is_advanced === true
    };
}

function mapRow(item, location, participantIndex, characterIndex, stats) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
        fail(`${location} 必须是对象`);
    }
    if (typeof item.participantId === 'string' && item.participantId.trim()) {
        stats.existingParticipant += 1;
        stats.total += 1;
        stats.participant += 1;
        return { participantId: item.participantId, ...toEventFields(item) };
    }
    if (typeof item.characterId === 'string' && item.characterId.trim()) {
        stats.existingCharacter += 1;
        stats.total += 1;
        stats.character += 1;
        return { characterId: item.characterId, ...toEventFields(item) };
    }
    const match = matchRecord(item, participantIndex, characterIndex);
    if (!match) {
        stats.unmatched.push(`${location}: ${item.name} @ ${item.ip}`);
        fail(`无法匹配 ${location}: ${item.name} @ ${item.ip}`);
    }
    stats[match.kind] = (stats[match.kind] || 0) + 1;
    stats.total += 1;
    if (match.participantId) {
        stats.participant += 1;
        return { participantId: match.participantId, ...toEventFields(item) };
    }
    stats.character += 1;
    return { characterId: match.characterId, ...toEventFields(item) };
}

function listJsonFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return listJsonFiles(fullPath);
        return entry.name.endsWith('.json') ? [fullPath] : [];
    });
}

function toInternalPath(sourcePath) {
    const relative = path.relative(SOURCE_ROOT, sourcePath);
    return path.join(OUTPUT_ROOT, relative);
}

async function downloadFile(url, destPath, retries = 3) {
    const cacheDir = path.dirname(destPath);
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
        console.log(`使用缓存: ${path.basename(destPath)}`);
        return;
    }
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`下载: ${url} (尝试 ${i + 1}/${retries})`);
            await execAsync(`curl -L --max-time 30 -o "${destPath}" "${url}"`);
            if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
                console.log(`下载成功: ${path.basename(destPath)}`);
                return;
            }
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function main() {
    await downloadFile(CHARACTER_DATABASE_URL, CHAR_CACHE_PATH);
    await downloadFile(IP_DATABASE_URL, IP_CACHE_PATH);

    const participantMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
    const charactersDb = JSON.parse(fs.readFileSync(CHAR_CACHE_PATH, 'utf8'));
    const ipDb = JSON.parse(fs.readFileSync(IP_CACHE_PATH, 'utf8'));
    const charMap = new Map(Object.entries(charactersDb));
    const ipMap = new Map(Object.entries(ipDb));

    const participantRecords = Object.entries(participantMap).map(([participantId, characterId]) => {
        const character = charMap.get(characterId);
        const ip = character ? ipMap.get(character.ip_id) : null;
        if (!character || !ip) fail(`participant-map 无法解析：${participantId} -> ${characterId}`);
        return { participantId, characterId, name: character.name, ip: ip.name };
    });
    const characterRecords = Object.values(charactersDb)
        .filter(character => character?.id && character.name)
        .map(character => {
            const ip = ipMap.get(character.ip_id);
            if (!ip?.name) return null;
            return { characterId: character.id, name: character.name, ip: ip.name };
        })
        .filter(Boolean);

    const participantIndex = indexRecords(participantRecords);
    const characterIndex = indexRecords(characterRecords);
    const stats = {
        files: 0,
        total: 0,
        participant: 0,
        character: 0,
        existingParticipant: 0,
        existingCharacter: 0,
        unmatched: []
    };

    const sourceFiles = listJsonFiles(SOURCE_ROOT);
    if (sourceFiles.length === 0) fail('未找到预选赛快照 JSON');

    const writeOfficial = process.argv.includes('--write');
    sourceFiles.forEach(sourcePath => {
        const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
        if (!Array.isArray(source.data)) fail(`${path.relative(rootDir, sourcePath)} data 必须是数组`);
        const relative = path.relative(rootDir, sourcePath);
        const data = source.data.map((item, index) => mapRow(
            item,
            `${relative}[${index}]`,
            participantIndex,
            characterIndex,
            stats
        ));
        stats.files += 1;
        const output = {
            date: source.date || '',
            event: source.event || '',
            data
        };
        if (writeOfficial) {
            const destPath = toInternalPath(sourcePath);
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.writeFileSync(destPath, `${JSON.stringify(output, null, 4)}\n`, 'utf8');
            console.log(`已生成：${path.relative(rootDir, destPath)}`);
        }
    });

    console.log(`文件数: ${stats.files}`);
    console.log(`总记录: ${stats.total}`);
    console.log(`participantId: ${stats.participant}`);
    console.log(`characterId: ${stats.character}`);
    console.log(`已有 participantId: ${stats.existingParticipant}`);
    console.log(`已有 characterId: ${stats.existingCharacter}`);
    console.log(`participantExact: ${stats.participantExact || 0}`);
    console.log(`participantNormalized: ${stats.participantNormalized || 0}`);
    console.log(`characterExact: ${stats.characterExact || 0}`);
    console.log(`characterNormalized: ${stats.characterNormalized || 0}`);
    console.log(`nameOnlyUnique: ${stats.nameOnlyUnique || 0}`);
    console.log(`manual: ${stats.manual || 0}`);

    if (!writeOfficial) {
        console.log(`预览模式：未写入 ${path.relative(rootDir, OUTPUT_ROOT)}`);
    }
}

try {
    await main();
} catch (error) {
    console.error(`迁移失败：${error.message}`);
    process.exitCode = 1;
}
