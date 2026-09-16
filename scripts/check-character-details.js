#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DETAILS_PATH = path.join(ROOT, 'data', 'characters', 'characters-details.json');
const MAP_PATH = path.join(ROOT, 'data', 'characters', 'participant-map.json');

function collectParticipants(participantMap) {
    return Object.keys(participantMap).map(id => ({ id }));
}

function detailKey(character) {
    return character.id;
}

function collectDetails(detailsData) {
    return Object.entries(detailsData.characters).map(([id, character]) => ({
        id,
        characterId: String(character.characterId).trim(),
        hasRounds: Array.isArray(character.rounds)
    }));
}

function duplicateStatus(hasDuplicates) {
    if (hasDuplicates) return '有';
    return '无';
}

function printList(title, characters) {
    console.log(`\n${title} (${characters.length})`);
    characters.forEach(character => {
        console.log(`- ${character.id}`);
    });
}

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function main() {
    const [detailsData, participantMap] = await Promise.all([
        readJson(DETAILS_PATH),
        readJson(MAP_PATH)
    ]);
    const participants = collectParticipants(participantMap);
    const details = collectDetails(detailsData);
    const detailsById = new Map(details.map(character => [detailKey(character), character]));
    const participantsById = new Map(participants.map(character => [character.id, character]));
    const missing = participants.filter(character => !detailsById.has(character.id));
    const mismatched = details.filter(character => {
        if (character.characterId.length === 0) return true;
        return character.hasRounds === false;
    });
    const extra = details.filter(character => !participantsById.has(character.id));
    const duplicateIds = details.filter((character, index) => details.findIndex(item => item.id === character.id) !== index);
    const duplicateKeys = new Set(details.map(character => character.id)).size !== details.length;
    const idSummary = participants
        .filter(character => detailsById.has(character.id))
        .map(character => ({ ...character, detailId: detailsById.get(character.id).id }));

    console.log(`2026 恒星组参赛角色: ${participants.length}`);
    console.log(`角色详情记录: ${details.length}`);
    console.log(`缺少详情记录: ${missing.length}`);
    console.log(`详情 ID 已匹配: ${idSummary.length}`);
    console.log(`多余详情记录（信息）: ${extra.length}`);
    console.log(`重复详情 ID: ${duplicateIds.length}`);
    console.log(`重复参赛 ID: ${duplicateStatus(duplicateKeys)}`);

    if (missing.length) printList('缺少详情记录', missing);
    if (extra.length) printList('多余详情记录', extra);

    const hasBlockingIssues = [missing.length, mismatched.length, duplicateIds.length]
        .some(count => count > 0);
    const hasAnyBlockingIssue = hasBlockingIssues || duplicateKeys;
    if (hasAnyBlockingIssue) {
        process.exitCode = 1;
        return;
    }

    console.log('\n检查通过：角色详情页包含全部 2026 恒星组参赛角色。');
}

main().catch(error => {
    console.error(`检查失败：${error.message}`);
    process.exitCode = 1;
});
