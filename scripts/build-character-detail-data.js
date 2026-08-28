#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DETAILS_INPUT_PATH = path.join(ROOT, 'data', 'characters', 'characters-details.json');
const CHARACTER_DATA_PATH = path.join(ROOT, 'data', 'characters', 'stats', 'characters-data.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'characters', 'stats', 'characters-detail-data.json');

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function hasValue(value) {
    if (value === '' || value === null || value === undefined) return false;
    return !Array.isArray(value) || value.length > 0;
}

function countCharacters(characters) {
    return Object.keys(characters).length;
}

function buildCharacterIndex(data) {
    return [...Object.values(data.stellar), ...Object.values(data.nova)]
        .flat()
        .flatMap(group => group.characters)
        .reduce((index, character) => {
            index[character.id] = character;
            return index;
        }, {});
}

function mergeBasicData(basic, preparedCharacter) {
    const merged = { ...basic };
    for (const [key, value] of Object.entries(preparedCharacter || {})) {
        if (key === 'id' || key === 'status' || key === 'rankLabel') continue;
        if (hasValue(value)) merged[key] = value;
    }
    return merged;
}

function buildCharacters(details, preparedCharacters, missing) {
    return Object.fromEntries(Object.entries(details).map(([id, character]) => {
        const preparedCharacter = preparedCharacters[id];
        if (!preparedCharacter) missing.push(id);
        return [id, {
            ...character,
            basic: mergeBasicData(character.basic, preparedCharacter)
        }];
    }));
}

async function main() {
    const [detailsData, preparedData] = await Promise.all([
        readJson(DETAILS_INPUT_PATH),
        readJson(CHARACTER_DATA_PATH)
    ]);
    const preparedCharacters = buildCharacterIndex(preparedData);
    const missing = [];
    const characters = buildCharacters(detailsData.characters, preparedCharacters, missing);

    if (countCharacters(characters) !== countCharacters(detailsData.characters)) {
        throw new Error('生成前后角色数量不一致');
    }
    if (missing.length > 0) {
        throw new Error(`角色列表成品缺少详情角色: ${missing.slice(0, 20).join(', ')}`);
    }

    await fs.writeFile(
        OUTPUT_PATH,
        `${JSON.stringify({ config: detailsData.config, characters }, null, 4)}\n`,
        'utf8'
    );
    console.log(`已生成: ${path.relative(ROOT, OUTPUT_PATH)}`);
    console.log(`角色数量: ${countCharacters(characters)}`);
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
