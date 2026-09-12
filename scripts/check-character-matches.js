#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NOMINATION_PATHS = [
    { path: path.join(ROOT, 'data', 'nomination', 'stellar', 'female', '01-female-nomination.json'), gender: 'female' },
    { path: path.join(ROOT, 'data', 'nomination', 'stellar', 'male', '02-male-nomination.json'), gender: 'male' }
];
const MATCHES_PATH = path.join(ROOT, 'data', 'matches', 'character-matches.json');
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

function collectParticipants(nominationSources) {
    return nominationSources.flatMap(({ data, gender }) => data.map((character, index) => ({
        id: `${gender === 'female' ? 'SF' : 'SM'}${String(index + 1).padStart(3, '0')}`,
        name: String(character.name).trim(),
        ip: String(character.ip).trim(),
        gender,
        rank: index + 1
    })));
}

function collectMatchCharacters(matchesData) {
    return Object.entries(matchesData.matches).map(([id, character]) => ({
        ...character,
        id
    }));
}

function indexByKey(characters) {
    const index = new Map();
    for (const character of characters) {
        const key = characterKey(character);
        const entries = index.get(key) || [];
        entries.push(character);
        index.set(key, entries);
    }
    return index;
}

function findMissingCharacters(participants, matchIndex) {
    return participants.filter(character => !matchIndex.has(characterKey(character)));
}

function findMissingEventRecords(participants, matches, title) {
    const matchByKey = new Map(matches.map(character => [characterKey(character), character]));
    return participants.filter(participant => {
        const character = matchByKey.get(characterKey(participant));
        return !character?.matches?.some(match => match.title === title);
    });
}

function findExtraCharacters(matches, participantIndex) {
    return matches.filter(character => !participantIndex.has(characterKey(character)));
}

function findDuplicates(index) {
    return [...index.entries()]
        .filter(([, characters]) => characters.length > 1)
        .map(([key, characters]) => ({ key, characters }));
}

function printCharacterList(title, characters) {
    console.log(`\n${title} (${characters.length})`);
    characters.forEach(character => {
        const gender = character.gender ? ` [${character.gender}]` : '';
        console.log(`- ${character.id || '未分配 ID'}: ${character.name} @ ${character.ip}${gender}`);
    });
}

function ensureNominationMatch(character, participant) {
    const matches = Array.isArray(character.matches) ? character.matches : [];
    const nomination = matches.find(match => match.title === '恒星组提名');
    if (!nomination) matches.unshift({ title: '恒星组提名', result: '晋级' });
    return { ...character, name: participant.name, ip: participant.ip, matches };
}

function rebuildMatches(participants, matchesData) {
    const existing = indexByKey(collectMatchCharacters(matchesData));
    const matches = {};
    participants.forEach((participant, index) => {
        const key = characterKey(participant);
        const previous = existing.get(key)?.[0];
        const id = `${participant.gender === 'female' ? 'SF' : 'SM'}${String(index + 1).padStart(3, '0')}`;
        matches[id] = ensureNominationMatch(previous || { avatar: '', matches: [] }, participant);
    });
    return { matches };
}

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function main() {
    const [femaleSource, maleSource, matchesData] = await Promise.all([
        readJson(NOMINATION_PATHS[0].path),
        readJson(NOMINATION_PATHS[1].path),
        readJson(MATCHES_PATH)
    ]);
    const participants = collectParticipants([
        { data: femaleSource.data, gender: NOMINATION_PATHS[0].gender },
        { data: maleSource.data, gender: NOMINATION_PATHS[1].gender }
    ]);
    const matches = collectMatchCharacters(matchesData);
    const participantIndex = indexByKey(participants);
    const matchIndex = indexByKey(matches);
    const missing = findMissingCharacters(participants, matchIndex);
    const extra = findExtraCharacters(matches, participantIndex);
    const duplicateParticipants = findDuplicates(participantIndex);
    const duplicateMatches = findDuplicates(matchIndex);
    const femaleParticipants = participants.filter(character => character.gender === 'female');
    const maleParticipants = participants.filter(character => character.gender === 'male');
    const missingNomination = findMissingEventRecords(participants, matches, '恒星组提名');
    const missingPreliminary = findMissingEventRecords(participants, matches, '预选赛第一轮');

    console.log(`2026 恒星组参赛角色: ${participants.length}`);
    console.log(`character-matches.json 角色: ${matches.length}`);
    console.log(`已覆盖: ${participants.length - missing.length}`);
    console.log(`缺失: ${missing.length}`);
    console.log(`多余角色（信息）: ${extra.length}`);
    console.log(`参赛名单重复: ${duplicateParticipants.length}`);
    console.log(`女子提名名单: ${femaleParticipants.length}`);
    console.log(`男子提名名单: ${maleParticipants.length}`);
    console.log(`缺少恒星组提名记录: ${missingNomination.length}`);
    console.log(`缺少预选赛第一轮记录: ${missingPreliminary.length}`);

    printCharacterList('缺失角色', missing);
    printCharacterList('多余角色', extra);
    printCharacterList('缺少恒星组提名记录', missingNomination);
    printCharacterList('缺少预选赛第一轮记录', missingPreliminary);

    if (missing.length || duplicateParticipants.length || duplicateMatches.length) {
        process.exitCode = 1;
        return;
    }

    console.log('\n检查通过：character-matches.json 包含全部 2026 恒星组参赛角色。');
}

main().catch(error => {
    console.error(`检查失败：${error.message}`);
    process.exitCode = 1;
});
