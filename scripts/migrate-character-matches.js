#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT, 'data', 'matches', 'character-matches.json');
const MAP_PATH = path.join(ROOT, 'data', 'characters', 'participant-map.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'matches', 'character-matches.next.json');

function fail(message) {
    throw new Error(message);
}

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function assertObject(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        fail(`${label} 必须是对象`);
    }
}

function formatList(values) {
    if (values.length === 0) return '无';
    return values.join(', ');
}

function normalizeMatches(rawRecord, participantId) {
    if (!Array.isArray(rawRecord.matches)) {
        fail(`character-matches.json ${participantId}.matches 必须是数组`);
    }
    return rawRecord.matches.map((match, index) => {
        if (!match || typeof match !== 'object') {
            fail(`character-matches.json ${participantId}.matches[${index}] 必须是对象`);
        }
        if (typeof match.title !== 'string' || match.title.trim() === '') {
            fail(`character-matches.json ${participantId}.matches[${index}].title 无效`);
        }
        if (typeof match.result !== 'string' || match.result.trim() === '') {
            fail(`character-matches.json ${participantId}.matches[${index}].result 无效`);
        }
        return { ...match };
    });
}

function buildNormalizedData(source, participantMap) {
    assertObject(source.matches, 'character-matches.json matches');
    assertObject(participantMap, 'participant-map.json');

    const sourceIds = Object.keys(source.matches);
    const mapIds = Object.keys(participantMap);
    const missing = mapIds.filter(id => !source.matches[id]);
    const extra = sourceIds.filter(id => !participantMap[id]);
    if (missing.length || extra.length) {
        fail(`赛事匹配记录与 participant-map 不一致；缺失: ${formatList(missing)}；多余: ${formatList(extra)}`);
    }

    const matches = Object.fromEntries(mapIds.map(participantId => [
        participantId,
        {
            matches: normalizeMatches(source.matches[participantId], participantId)
        }
    ]));

    return { matches };
}

async function main() {
    const [source, participantMap] = await Promise.all([
        readJson(INPUT_PATH),
        readJson(MAP_PATH)
    ]);
    const normalized = buildNormalizedData(source, participantMap);
    const participantIds = Object.keys(normalized.matches);
    const matchCount = participantIds.reduce((total, id) => total + normalized.matches[id].matches.length, 0);

    console.log(`待迁移参赛记录: ${participantIds.length}`);
    console.log(`保留赛事记录: ${matchCount}`);
    console.log('目标结构：每个参赛 ID 仅保留 matches 赛事事实。');

    if (!process.argv.includes('--write-next')) {
        console.log(`预览模式：未写入 ${path.relative(ROOT, OUTPUT_PATH)}`);
        return;
    }

    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(normalized, null, 4)}\n`, 'utf8');
    console.log(`已生成：${path.relative(ROOT, OUTPUT_PATH)}`);
}

main().catch(error => {
    console.error(`迁移失败：${error.message}`);
    process.exitCode = 1;
});
