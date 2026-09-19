#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const INPUT_PATH = path.join(rootDir, 'data/statistics/nomination-stats.json');
const OUTPUT_PATH = path.join(rootDir, 'data/statistics/nomination-stats.next.json');
const MAP_PATH = path.join(rootDir, 'data/characters/participant-map.json');
const CHAR_CACHE_PATH = path.join(rootDir, '.cache/characters-data.json');
const IP_CACHE_PATH = path.join(rootDir, '.cache/ip-data.json');

const MANUAL_ALIASES = {
    '后藤一里@孤独摇滚！': { participantId: 'SF001' }
};

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
        const keys = expandIpNames(record.ip).flatMap(ip => [
            `${record.name}@${ip}`,
            `${normalize(record.name)}@${normalize(ip)}`
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

function toEventRecord(source, match) {
    const record = match.participantId
        ? { participantId: match.participantId }
        : { characterId: match.characterId };
    record.votes = source.votes;
    record.status = source.status;
    return record;
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

function mapList(list, path, participantIndex, characterIndex, stats) {
    if (!Array.isArray(list)) fail(`${path} 必须是数组`);
    return list.map((item, index) => {
        const location = `${path}[${index}]`;
        const match = matchRecord(item, participantIndex, characterIndex);
        if (!match) {
            stats.unmatched.push(`${location}: ${item.name} @ ${item.ip}`);
            fail(`无法匹配 ${location}: ${item.name} @ ${item.ip}`);
        }
        stats[match.kind] = (stats[match.kind] || 0) + 1;
        stats.total += 1;
        if (match.participantId) stats.participant += 1;
        else stats.character += 1;
        return toEventRecord(item, match);
    });
}

function main() {
    if (!fs.existsSync(CHAR_CACHE_PATH) || !fs.existsSync(IP_CACHE_PATH)) {
        fail('缺少 .cache/characters-data.json 或 .cache/ip-data.json，请先运行 migrate-top5-rankings.js 下载缓存');
    }

    const source = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
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
        total: 0,
        participant: 0,
        character: 0,
        unmatched: []
    };

    const result = {
        stellar: {
            female: mapList(source.stellar?.female, 'stellar.female', participantIndex, characterIndex, stats),
            male: mapList(source.stellar?.male, 'stellar.male', participantIndex, characterIndex, stats)
        },
        nova: {
            winter: {
                female: mapList(source.nova?.winter?.female, 'nova.winter.female', participantIndex, characterIndex, stats),
                male: mapList(source.nova?.winter?.male, 'nova.winter.male', participantIndex, characterIndex, stats)
            },
            spring: {
                female: mapList(source.nova?.spring?.female, 'nova.spring.female', participantIndex, characterIndex, stats),
                male: mapList(source.nova?.spring?.male, 'nova.spring.male', participantIndex, characterIndex, stats)
            },
            summer: {
                female: mapList(source.nova?.summer?.female, 'nova.summer.female', participantIndex, characterIndex, stats),
                male: mapList(source.nova?.summer?.male, 'nova.summer.male', participantIndex, characterIndex, stats)
            },
            autumn: {
                female: mapList(source.nova?.autumn?.female, 'nova.autumn.female', participantIndex, characterIndex, stats),
                male: mapList(source.nova?.autumn?.male, 'nova.autumn.male', participantIndex, characterIndex, stats)
            }
        }
    };

    console.log(`总记录: ${stats.total}`);
    console.log(`participantId: ${stats.participant}`);
    console.log(`characterId: ${stats.character}`);
    console.log(`participantExact: ${stats.participantExact || 0}`);
    console.log(`participantNormalized: ${stats.participantNormalized || 0}`);
    console.log(`characterExact: ${stats.characterExact || 0}`);
    console.log(`characterNormalized: ${stats.characterNormalized || 0}`);
    console.log(`nameOnlyUnique: ${stats.nameOnlyUnique || 0}`);
    console.log(`manual: ${stats.manual || 0}`);

    const writeNext = process.argv.includes('--write-next');
    const writeOfficial = process.argv.includes('--write');
    if (!writeNext && !writeOfficial) {
        console.log(`预览模式：未写入 ${path.relative(rootDir, OUTPUT_PATH)}`);
        return;
    }

    const output = `${JSON.stringify(result, null, 4)}\n`;
    if (writeNext) {
        fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
        console.log(`已生成：${path.relative(rootDir, OUTPUT_PATH)}`);
    }
    if (writeOfficial) {
        fs.writeFileSync(INPUT_PATH, output, 'utf8');
        console.log(`已覆盖：${path.relative(rootDir, INPUT_PATH)}`);
    }
}

try {
    main();
} catch (error) {
    console.error(`迁移失败：${error.message}`);
    process.exitCode = 1;
}
