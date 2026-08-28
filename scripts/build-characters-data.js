#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT, 'data', 'characters', 'roundsData.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'characters', 'stats', 'characters-data.json');
const DATABASE_BASE_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/';

const DATABASE_SOURCES = {
    characters: `${DATABASE_BASE_URL}characters-data.json`,
    lookup: `${DATABASE_BASE_URL}character-lookup.json`,
    ips: `${DATABASE_BASE_URL}ip-data.json`
};

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`加载 ${url} 失败: HTTP ${response.status}`);
    }
    return response.json();
}

function createDatabaseRecord(character, ips) {
    const ip = ips[character.ip_id];
    const cv = Array.isArray(character.cv)
        ? character.cv.filter(Boolean).join('、')
        : character.cv || '';

    return {
        database_id: character.id,
        name: character.name,
        name_en: character.name_en || '',
        ip: ip?.name || '',
        ip_id: character.ip_id,
        cv,
        avatar: character.avatar || '',
        ip_year: ip?.year ?? 0,
        ip_season: ip?.season ?? 0
    };
}

function hasValue(value) {
    if (value === '' || value === null || value === undefined) return false;
    return !Array.isArray(value) || value.length > 0;
}

function mergeCharacterRecord(base, patch) {
    const merged = { ...base };
    for (const [key, value] of Object.entries(patch)) {
        if (hasValue(value)) merged[key] = value;
    }
    return merged;
}

function createDatabaseIndex({ characters, lookup, ips }) {
    const records = {};
    const recordsByLookupKey = new Map();

    Object.values(characters).forEach(character => {
        const record = createDatabaseRecord(character, ips);
        records[character.id] = record;
        if (record.name && record.ip) {
            recordsByLookupKey.set(`${record.name}@${record.ip}`, record);
        }
    });

    return { lookup, records, recordsByLookupKey };
}

function getDatabaseRecord(database, character) {
    const lookupKey = character.name && character.ip
        ? `${character.name}@${character.ip}`
        : '';
    const id = database.lookup[lookupKey];
    return (id && database.records[id]) || database.recordsByLookupKey.get(lookupKey);
}

function mergeCharacters(data, database, unmatched) {
    const mergeGroup = groups => groups.map(group => ({
        ...group,
        characters: group.characters.map(character => {
            const databaseRecord = getDatabaseRecord(database, character);
            if (!databaseRecord) unmatched.push(`${character.name}@${character.ip}`);
            return databaseRecord
                ? mergeCharacterRecord(character, databaseRecord)
                : character;
        })
    }));

    return {
        stellar: Object.fromEntries(
            Object.entries(data.stellar).map(([gender, groups]) => [gender, mergeGroup(groups)])
        ),
        nova: Object.fromEntries(
            Object.entries(data.nova).map(([gender, groups]) => [gender, mergeGroup(groups)])
        )
    };
}

function countCharacters(data) {
    const countGroups = groups => groups.reduce(
        (total, group) => total + group.characters.length,
        0
    );

    return Object.values(data.stellar).reduce((total, groups) => total + countGroups(groups), 0)
        + Object.values(data.nova).reduce((total, groups) => total + countGroups(groups), 0);
}

function validateOutput(data) {
    const missingFields = [];
    const checkGroups = groups => groups.forEach(group => group.characters.forEach(character => {
        ['id', 'name', 'ip'].forEach(field => {
            if (!hasValue(character[field])) missingFields.push(`${character.id || character.name}.${field}`);
        });
    }));

    Object.values(data.stellar).forEach(checkGroups);
    Object.values(data.nova).forEach(checkGroups);

    if (missingFields.length > 0) {
        throw new Error(`生成数据存在缺失字段: ${missingFields.slice(0, 10).join(', ')}`);
    }
}

function restoreFromExistingOutput(sourceData, existingData) {
    const restoreGroups = (sourceGroups, existingGroups) => sourceGroups.map((group, index) => ({
        ...group,
        characters: group.characters.map((character, characterIndex) => {
            const existingCharacter = existingGroups[index]?.characters?.[characterIndex];
            const databaseId = existingCharacter?.database_id
                || (existingCharacter?.id?.startsWith('char_') ? existingCharacter.id : undefined);
            const restored = existingCharacter ? { ...existingCharacter, ...character } : character;
            restored.id = character.id;
            if (databaseId) restored.database_id = databaseId;
            return restored;
        })
    }));

    return {
        stellar: Object.fromEntries(
            Object.entries(sourceData.stellar).map(([gender, groups]) => [
                gender,
                restoreGroups(groups, existingData.stellar[gender] || [])
            ])
        ),
        nova: Object.fromEntries(
            Object.entries(sourceData.nova).map(([gender, groups]) => [
                gender,
                restoreGroups(groups, existingData.nova[gender] || [])
            ])
        )
    };
}

async function loadDatabase() {
    try {
        const [characters, lookup, ips] = await Promise.all([
            fetchJson(DATABASE_SOURCES.characters),
            fetchJson(DATABASE_SOURCES.lookup),
            fetchJson(DATABASE_SOURCES.ips)
        ]);
        return { type: 'online', value: createDatabaseIndex({ characters, lookup, ips }) };
    } catch (error) {
        try {
            return { type: 'offline', value: await readJson(OUTPUT_PATH) };
        } catch {
            throw error;
        }
    }
}

async function main() {
    const sourceData = await readJson(INPUT_PATH);
    const database = await loadDatabase();
    let output;
    const unmatched = [];

    if (database.type === 'online') {
        output = mergeCharacters(sourceData, database.value, unmatched);
    } else {
        output = restoreFromExistingOutput(sourceData, database.value);
        console.warn('远端角色数据库不可用，已使用现有成品数据离线恢复');
    }

    validateOutput(output);
    if (countCharacters(output) !== countCharacters(sourceData)) {
        throw new Error('生成前后角色数量不一致');
    }

    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 4)}\n`, 'utf8');
    console.log(`已生成: ${path.relative(ROOT, OUTPUT_PATH)}`);
    console.log(`角色数量: ${countCharacters(output)}`);
    if (database.type === 'online') {
        console.log(`未匹配角色: ${unmatched.length}`);
        if (unmatched.length > 0) {
            console.warn(unmatched.slice(0, 20).join('\n'));
        }
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
