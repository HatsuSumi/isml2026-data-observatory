#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DETAILS_PATH = path.join(ROOT, 'data', 'characters', 'characters-details.json');
const NOMINATION_PATHS = [
    { path: path.join(ROOT, 'data', 'nomination', 'stellar', 'female', '01-female-nomination.json'), gender: 'female' },
    { path: path.join(ROOT, 'data', 'nomination', 'stellar', 'male', '02-male-nomination.json'), gender: 'male' }
];
const IP_ALIASES = new Map([
    ['青春猪头少年', '青春猪头少年系列'],
    ['旋风管家', '旋风管家！'],
    ['干物妹小埋', '干物妹！小埋']
]);

function normalizeIp(ip) {
    const value = String(ip).trim();
    return IP_ALIASES.get(value) || value;
}

function characterKey(character) {
    return `${String(character.name).trim()}@${normalizeIp(character.ip)}`;
}

function collectParticipants(sources) {
    return sources.flatMap(({ data, gender }) => data.map((character, index) => ({
        id: `${gender === 'female' ? 'SF' : 'SM'}${String(index + 1).padStart(3, '0')}`,
        name: String(character.name).trim(),
        ip: String(character.ip).trim(),
        gender
    })));
}

function collectDetails(detailsData) {
    return Object.entries(detailsData.characters).map(([id, character]) => ({
        id,
        name: String(character.basic?.name || '').trim(),
        ip: String(character.basic?.ip || '').trim()
    }));
}

function printList(title, characters) {
    console.log(`\n${title} (${characters.length})`);
    characters.forEach(character => {
        console.log(`- ${character.id}: ${character.name} @ ${character.ip}`);
    });
}

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function main() {
    const [detailsData, femaleSource, maleSource] = await Promise.all([
        readJson(DETAILS_PATH),
        readJson(NOMINATION_PATHS[0].path),
        readJson(NOMINATION_PATHS[1].path)
    ]);
    const participants = collectParticipants([
        { data: femaleSource.data, gender: NOMINATION_PATHS[0].gender },
        { data: maleSource.data, gender: NOMINATION_PATHS[1].gender }
    ]);
    const details = collectDetails(detailsData);
    const detailsByKey = new Map(details.map(character => [characterKey(character), character]));
    const participantsByKey = new Map(participants.map(character => [characterKey(character), character]));
    const missing = participants.filter(character => !detailsByKey.has(characterKey(character)));
    const mismatched = [];
    const extra = details.filter(character => !participantsByKey.has(characterKey(character)));
    const duplicateIds = details.filter((character, index) => details.findIndex(item => item.id === character.id) !== index);
    const duplicateKeys = new Set(details.map(characterKey)).size !== details.length;
    const idSummary = participants
        .filter(character => detailsByKey.has(characterKey(character)))
        .map(character => ({ ...character, detailId: detailsByKey.get(characterKey(character)).id }));

    console.log(`2026 恒星组参赛角色: ${participants.length}`);
    console.log(`角色详情记录: ${details.length}`);
    console.log(`缺少详情记录: ${missing.length}`);
    console.log(`详情 ID 已匹配: ${idSummary.length}`);
    console.log(`多余详情记录（信息）: ${extra.length}`);
    console.log(`重复详情 ID: ${duplicateIds.length}`);
    console.log(`重复姓名/IP: ${duplicateKeys ? '有' : '无'}`);

    if (missing.length) printList('缺少详情记录', missing);
    if (extra.length) printList('多余详情记录', extra);

    if (missing.length || mismatched.length || duplicateIds.length || duplicateKeys) {
        process.exitCode = 1;
        return;
    }

    console.log('\n检查通过：角色详情页包含全部 2026 恒星组参赛角色。');
}

main().catch(error => {
    console.error(`检查失败：${error.message}`);
    process.exitCode = 1;
});
