#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GROUPS_INPUT_PATH = path.join(ROOT, 'data', 'groups', 'groups.json');
const CHARACTER_DATA_PATH = path.join(ROOT, 'data', 'characters', 'stats', 'characters-detail-data.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'groups', 'groups-data.json');

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function buildCharactersByName(data) {
    return Object.values(data.characters)
        .reduce((characters, character) => {
            const basic = character.basic;
            if (!characters[basic.name]) {
                characters[basic.name] = {
                    id: character.id,
                    database_id: basic.database_id,
                    name: basic.name,
                    ip: basic.ip,
                    cv: basic.cv,
                    avatar: basic.avatar
                };
            }
            return characters;
        }, {});
}

function collectGroupCharacters(groupsData) {
    const names = [];
    Object.values(groupsData).forEach(group => {
        Object.values(group.groups).forEach(characters => {
            characters.forEach(character => {
                const name = typeof character === 'string' ? character : character.name;
                if (name && !names.includes(name)) names.push(name);
            });
        });
    });
    return names;
}

function buildCharacterIndex(groupsData, charactersByName, missing) {
    const names = collectGroupCharacters(groupsData);
    return Object.fromEntries(names.map(name => {
        const character = charactersByName[name];
        if (!character) missing.push(name);
        return [name, character ? {
            id: character.id,
            database_id: character.database_id,
            name: character.name,
            ip: character.ip,
            cv: character.cv,
            avatar: character.avatar
        } : { name }];
    }));
}

async function main() {
    const [groupsData, characterData] = await Promise.all([
        readJson(GROUPS_INPUT_PATH),
        readJson(CHARACTER_DATA_PATH)
    ]);
    const missing = [];
    const characters = buildCharacterIndex(groupsData, buildCharactersByName(characterData), missing);
    const output = { groups: groupsData, characters };

    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 4)}\n`, 'utf8');
    console.log(`已生成: ${path.relative(ROOT, OUTPUT_PATH)}`);
    console.log(`分组数量: ${Object.keys(groupsData).length}`);
    console.log(`角色数量: ${Object.keys(characters).length}`);
    console.log(`未匹配角色: ${missing.length}`);
    if (missing.length > 0) console.warn(missing.join(', '));
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
