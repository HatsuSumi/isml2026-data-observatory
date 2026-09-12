#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHARACTER_SOURCES = [
    path.join(ROOT, 'data', 'characters', 'stats', 'characters-data.json'),
    path.join(ROOT, 'data', 'characters', 'characters-details.json')
];
const NOMINATION_FILES = [
    'data/nomination/stellar/female/01-female-nomination.json',
    'data/nomination/stellar/male/02-male-nomination.json',
    'data/nomination/nova/winter/female/03-nova-winter-female-nomination.json',
    'data/nomination/nova/winter/male/04-nova-winter-male-nomination.json',
    'data/nomination/nova/spring/female/05-nova-spring-female-nomination.json',
    'data/nomination/nova/spring/male/06-nova-spring-male-nomination.json',
    'data/nomination/nova/summer/female/07-nova-summer-female-nomination.json',
    'data/nomination/nova/summer/male/08-nova-summer-male-nomination.json',
    'data/nomination/nova/autumn/female/09-nova-autumn-female-nomination.json',
    'data/nomination/nova/autumn/male/10-nova-autumn-male-nomination.json'
];
const PRELIMINARY_FILES = [
    'data/preliminaries/stellar/female/11-preliminary-r01-stellar-female.json'
];

function characterKey(name, ip) {
    return `${String(name || '').trim()}@${String(ip || '').trim()}`;
}

function addToIndex(index, character) {
    const key = characterKey(character.name, character.ip);
    if (key !== '@') index.set(key, character);
}

function buildCharacterIndex(stats, details) {
    const index = new Map();
    for (const groups of Object.values(stats.stellar || {})) {
        for (const group of groups) {
            for (const character of group.characters || []) addToIndex(index, character);
        }
    }
    for (const character of Object.values(details.characters || {})) {
        addToIndex(index, character.basic || character);
    }
    return index;
}

function mergeRow(row, characterIndex) {
    const character = characterIndex.get(characterKey(row.name, row.ip));
    return {
        ...row,
        cv: row.cv || character?.cv || '',
        avatar: row.avatar || character?.avatar || ''
    };
}

function missingFields(row, characterIndex) {
    if (row.cv && row.avatar) return false;
    const character = characterIndex.get(characterKey(row.name, row.ip));
    return !character || (!row.cv && !character.cv) || (!row.avatar && !character.avatar);
}

async function readJson(relativePath) {
    return JSON.parse(await fs.readFile(path.join(ROOT, relativePath), 'utf8'));
}

async function main() {
    const [stats, details] = await Promise.all(CHARACTER_SOURCES.map(async file => JSON.parse(await fs.readFile(file, 'utf8'))));
    const characterIndex = buildCharacterIndex(stats, details);
    const outputs = [];
    const missing = [];

    for (const relativePath of [...NOMINATION_FILES, ...PRELIMINARY_FILES]) {
        const source = await readJson(relativePath);
        const rows = source.data.map(row => {
            if (missingFields(row, characterIndex)) missing.push(`${relativePath}: ${row.name}@${row.ip}`);
            return mergeRow(row, characterIndex);
        });
        outputs.push({ relativePath, data: { ...source, data: rows } });
    }

    if (missing.length) {
        console.error(`角色资料校验失败，共 ${missing.length} 条记录缺少精确匹配或字段：`);
        missing.forEach(item => console.error(`- ${item}`));
        process.exitCode = 1;
        return;
    }

    await Promise.all(outputs.map(({ relativePath, data }) =>
        fs.writeFile(path.join(ROOT, relativePath), `${JSON.stringify(data, null, 4)}\n`, 'utf8')));
    console.log(`已生成 ${outputs.length} 个赛事数据文件，共 ${outputs.reduce((count, output) => count + output.data.data.length, 0)} 条记录。`);
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
