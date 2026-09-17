#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MATCHES_PATH = path.join(ROOT, 'data', 'matches', 'character-matches.json');
const PARTICIPANT_MAP_PATH = path.join(ROOT, 'data', 'characters', 'participant-map.json');

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function compareIds(participantMap, matchesData) {
    const expected = Object.keys(participantMap);
    const matches = matchesData.matches;
    const actual = Object.keys(matches);
    const actualSet = new Set(actual);
    const expectedSet = new Set(expected);
    return {
        expected,
        actual,
        missing: expected.filter(id => !actualSet.has(id)),
        extra: actual.filter(id => !expectedSet.has(id))
    };
}

function collectInvalidRecords(matchesData) {
    const matches = matchesData.matches;
    return Object.entries(matches)
        .filter(([, record]) => {
            if (!record) return true;
            return Array.isArray(record.matches) === false;
        })
        .map(([id]) => id);
}

function collectMissingEvents(matchesData, title) {
    const matches = matchesData.matches;
    return Object.entries(matches)
        .filter(([, record]) => !record.matches.some(match => match.title === title))
        .map(([id]) => id);
}

async function main() {
    const [participantMap, matchesData] = await Promise.all([
        readJson(PARTICIPANT_MAP_PATH),
        readJson(MATCHES_PATH)
    ]);
    const ids = compareIds(participantMap, matchesData);
    const invalidRecords = collectInvalidRecords(matchesData);
    const missingNomination = collectMissingEvents(matchesData, '恒星组提名');
    const nonParticipantsPreliminary = collectMissingEvents(matchesData, '预选赛第一轮');

    console.log(`participant-map 参赛角色: ${ids.expected.length}`);
    console.log(`character-matches.json 角色: ${ids.actual.length}`);
    console.log(`已覆盖: ${ids.expected.length - ids.missing.length}`);
    console.log(`缺失: ${ids.missing.length}`);
    console.log(`多余角色: ${ids.extra.length}`);
    console.log(`记录格式错误: ${invalidRecords.length}`);
    console.log(`缺少恒星组提名记录: ${missingNomination.length}`);
    console.log(`未参加预选赛第一轮: ${nonParticipantsPreliminary.length}`);

    if (ids.missing.length) console.log(`缺失角色: ${ids.missing.join(', ')}`);
    if (ids.extra.length) console.log(`多余角色: ${ids.extra.join(', ')}`);
    if (invalidRecords.length) console.log(`格式错误记录: ${invalidRecords.join(', ')}`);

    const hasBlockingIssues = [ids.missing.length, ids.extra.length, invalidRecords.length]
        .some(count => count > 0);
    if (hasBlockingIssues) {
        process.exitCode = 1;
        return;
    }

    console.log('\n检查通过：character-matches.json 与 participant-map.json ID 集合一致。');
}

main().catch(error => {
    console.error(`检查失败：${error.message}`);
    process.exitCode = 1;
});
