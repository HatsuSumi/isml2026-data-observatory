#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ROUNDS_PATH = path.join(ROOT, 'data', 'characters', 'roundsData.json');
const STATS_PATH = path.join(ROOT, 'data', 'characters', 'stats', 'ISML2026-characters.json');
const ROUNDS_OUTPUT_PATH = path.join(ROOT, 'data', 'characters', 'roundsData.next.json');
const STATS_OUTPUT_PATH = path.join(ROOT, 'data', 'characters', 'stats', 'ISML2026-characters.next.json');

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function normalizeRoundCollection(value) {
    if (Array.isArray(value)) {
        return value.map(group => ({
            ...group,
            characters: group.characters.map(character => ({ participantId: character.id }))
        }));
    }
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
        key,
        normalizeRoundCollection(child)
    ]));
}

function normalizeRoundGroups(data) {
    return Object.fromEntries(Object.entries(data).map(([stage, divisions]) => [stage,
        Object.fromEntries(Object.entries(divisions).map(([gender, groups]) => [
            gender,
            normalizeRoundCollection(groups)
        ]))
    ]));
}

function normalizeStatsGroups(value) {
    if (Array.isArray(value)) {
        return value.map(record => ({
            participantId: record.id,
            status: record.status
        }));
    }
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
        key,
        normalizeStatsGroups(child)
    ]));
}

function collectRoundRecords(value) {
    if (Array.isArray(value)) {
        return value.flatMap(group => Array.isArray(group.characters) ? group.characters : []);
    }
    return Object.values(value).flatMap(collectRoundRecords);
}

function collectStatsRecords(value) {
    if (Array.isArray(value)) return value;
    return Object.values(value).flatMap(collectStatsRecords);
}

async function main() {
    const [roundsData, statsData] = await Promise.all([
        readJson(ROUNDS_PATH),
        readJson(STATS_PATH)
    ]);
    const roundsOutput = normalizeRoundGroups(roundsData);
    const statsOutput = normalizeStatsGroups(statsData);
    const roundRecords = collectRoundRecords(roundsOutput).length;
    const statsRecords = collectStatsRecords(statsOutput).length;

    console.log(`roundsData 赛事角色记录: ${roundRecords}`);
    console.log(`ISML2026-characters 赛事记录: ${statsRecords}`);
    console.log('迁移内容：使用 participantId，删除 name/ip/cv/avatar。');

    if (!process.argv.includes('--write-next')) {
        console.log('预览模式：未写入临时文件');
        return;
    }

    await Promise.all([
        fs.writeFile(ROUNDS_OUTPUT_PATH, `${JSON.stringify(roundsOutput, null, 4)}\n`, 'utf8'),
        fs.writeFile(STATS_OUTPUT_PATH, `${JSON.stringify(statsOutput, null, 4)}\n`, 'utf8')
    ]);
    console.log(`已生成：${path.relative(ROOT, ROUNDS_OUTPUT_PATH)}`);
    console.log(`已生成：${path.relative(ROOT, STATS_OUTPUT_PATH)}`);
}

main().catch(error => {
    console.error(`迁移失败：${error.message}`);
    process.exitCode = 1;
});
