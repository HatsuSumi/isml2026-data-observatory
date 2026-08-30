#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT, 'temp.html');
const OUTPUT_PATH = path.join(
    ROOT,
    'data',
    'preliminaries',
    'stellar',
    'female',
    '11-preliminary-r01-stellar-female.json'
);
const CHARACTER_DATA_PATH = path.join(ROOT, 'characters-data.json');
const IP_DATA_PATH = path.join(ROOT, 'ip-data.json');
const LEGACY_CHARACTER_DATA_PATH = path.join(ROOT, 'data', 'characters', 'characters-details.json');

function setCharacter(index, character, key) {
    const previous = index.get(key) || {};
    index.set(key, {
        ...previous,
        ...character,
        cv: character.cv?.length ? character.cv : previous.cv || '',
        avatar: character.avatar || previous.avatar || ''
    });
}

function buildCharacterIndex(data, ipData, legacyData) {
    const ipNames = new Map(Object.values(ipData || {}).map(ip => [ip.id, ip.name]));
    const index = new Map();
    Object.values(data || {}).forEach(character => {
        const ip = ipNames.get(character.ip_id);
        if (character.name && ip) setCharacter(index, character, `${character.name}@${ip}`);
    });
    Object.values(legacyData.characters || {}).forEach(character => {
        const basic = character.basic || character;
        const key = `${basic.name}@${basic.ip}`;
        if (basic.name && basic.ip) setCharacter(index, basic, key);
    });
    return index;
}

function getCv(character) {
    return Array.isArray(character?.cv) ? character.cv.filter(Boolean).join(' / ') : character?.cv || '';
}

function mergeCharacterData(rows, characterIndex) {
    return rows.map(row => {
        const character = characterIndex.get(`${row.name}@${row.ip}`);
        return {
            ...row,
            cv: getCv(character),
            avatar: row.avatar || character?.avatar || ''
        };
    });
}
function parseInput(text) {
    const groups = [];
    let currentGroup = null;

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;

        const columns = line.split(/\s+/);
        if (columns.length === 2 && columns[0] === '预选赛' && columns[1] === '第1轮') {
            continue;
        }
        if (columns.length === 1 && /^女子\d+组$/.test(columns[0])) {
            currentGroup = { name: columns[0], data: [] };
            groups.push(currentGroup);
            continue;
        }

        if (!currentGroup || columns.length < 4 || !/^\d+$/.test(columns[0])) {
            throw new Error(`无法解析数据行：${rawLine}`);
        }

        const rank = Number.parseInt(columns[0], 10);
        const votes = Number.parseInt(columns.at(-1), 10);
        const ip = columns.slice(2, -1).join(' ');
        const name = columns[1];

        if (!Number.isInteger(votes)) {
            throw new Error(`票数无效：${rawLine}`);
        }

        currentGroup.data.push({
            group: currentGroup.name,
            rank,
            name,
            ip,
            votes,
            is_advanced: rank === 1
        });
    }

    if (groups.length !== 8 || groups.some(group => group.data.length !== 8)) {
        throw new Error('数据校验失败：应包含 8 个小组，且每组 8 名角色');
    }

    groups.forEach(group => {
        group.data.forEach((item, index) => {
            if (item.rank !== index + 1) {
                throw new Error(`排名不连续：${group.name}`);
            }
        });
    });

    return groups.flatMap(group => group.data);
}

async function main() {
    const input = await fs.readFile(INPUT_PATH, 'utf8');
    const characterData = JSON.parse(await fs.readFile(CHARACTER_DATA_PATH, 'utf8'));
    const ipData = JSON.parse(await fs.readFile(IP_DATA_PATH, 'utf8'));
    const legacyData = JSON.parse(await fs.readFile(LEGACY_CHARACTER_DATA_PATH, 'utf8'));
    const data = mergeCharacterData(parseInput(input), buildCharacterIndex(characterData, ipData, legacyData));
    const output = {
        date: '2026-07-27 - 2026-07-28',
        event: '预选赛第一轮-恒星组女性组别',
        data
    };

    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 4)}\n`, 'utf8');
    console.log(`已生成: ${path.relative(ROOT, OUTPUT_PATH)}`);
    console.log(`小组数量: 8`);
    console.log(`角色数量: ${data.length}`);
    console.log(`晋级数量: ${data.filter(item => item.is_advanced).length}`);
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
