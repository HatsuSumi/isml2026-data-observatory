#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EVENTS_INPUT_PATH = path.join(ROOT, 'data', 'config', 'events.json');
const RANKINGS_INPUT_PATH = path.join(ROOT, 'data', 'votes', 'top5-rankings.json');
const CHARACTER_DATA_PATH = path.join(ROOT, 'data', 'characters', 'stats', 'characters-detail-data.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'config', 'events-data.json');

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function buildCharacterIndex(data) {
    const index = {};
    Object.values(data.characters).forEach(character => {
        const basic = character.basic;
        if (basic.name && basic.ip) {
            index[`${basic.name}@${basic.ip}`] = {
                name: basic.name,
                ip: basic.ip,
                avatar: basic.avatar || ''
            };
        }
    });
    return index;
}

function buildRankingIndex(rankings, characters) {
    return Object.fromEntries(Object.entries(rankings).map(([title, ranking]) => [
        title,
        {
            ...ranking,
            top5: ranking.top5.map(item => {
                const character = characters[`${item.name}@${item.ip}`];
                return {
                    ...item,
                    avatar: character?.avatar || ''
                };
            })
        }
    ]));
}

function countMatches(events) {
    return Object.values(events.months)
        .flatMap(month => month.events)
        .reduce((total, event) => total + event.matches.length, 0);
}

async function main() {
    const [events, rankings, characterData] = await Promise.all([
        readJson(EVENTS_INPUT_PATH),
        readJson(RANKINGS_INPUT_PATH),
        readJson(CHARACTER_DATA_PATH)
    ]);
    const characters = buildCharacterIndex(characterData);
    const output = {
        events,
        rankings: buildRankingIndex(rankings, characters),
        characters
    };

    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 4)}\n`, 'utf8');
    console.log(`已生成: ${path.relative(ROOT, OUTPUT_PATH)}`);
    console.log(`月份数量: ${Object.keys(events.months).length}`);
    console.log(`赛事数量: ${Object.values(events.months).flatMap(month => month.events).length}`);
    console.log(`比赛数量: ${countMatches(events)}`);
    console.log(`排名组数: ${Object.keys(rankings).length}`);
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
