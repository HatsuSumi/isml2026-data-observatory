#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DETAILS_PATH = path.join(ROOT, 'data', 'characters', 'characters-details.json');
const DATABASE_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/characters-data.json';
const MANUAL_MATCHES = new Map([
    ['ESF010', 'char_001330'],
    ['SM050', 'char_000747']
]);

function normalize(value) {
    return String(value || '')
        .normalize('NFKC')
        .trim()
        .toLocaleLowerCase()
        .replace(/[\s\u3000]/g, '')
        .replace(/[·・•]/g, '');
}

function toValues(value) {
    if (Array.isArray(value)) return value.flatMap(toValues).filter(Boolean);
    if (value && typeof value === 'object') {
        return Object.values(value).flatMap(toValues).filter(Boolean);
    }
    const normalized = normalize(value);
    return normalized ? [normalized] : [];
}

function collectParticipants(detailsData) {
    return Object.entries(detailsData.characters || {}).map(([id, character]) => ({
        id,
        name: String(character.basic?.name || '').trim(),
        cv: String(character.basic?.cv || '').trim(),
        ip: String(character.basic?.ip || '').trim()
    }));
}

function collectDatabaseCharacters(databaseData) {
    const records = Array.isArray(databaseData)
        ? databaseData
        : Object.values(databaseData || {});

    return records.map((character, index) => ({
        id: String(character.id || '').trim() || `record-${index + 1}`,
        name: String(character.name || '').trim(),
        nameEn: String(character.name_en || '').trim(),
        cv: toValues(character.cv),
        ipId: String(character.ip_id || '').trim()
    }));
}

function indexByName(characters) {
    const index = new Map();
    for (const character of characters) {
        const names = [character.name, character.nameEn]
            .map(normalize)
            .filter(Boolean);
        for (const name of names) {
            const records = index.get(name) || [];
            records.push(character);
            index.set(name, records);
        }
    }
    return index;
}

function scoreCandidate(participant, candidate) {
    const participantCv = normalize(participant.cv);
    const cvMatch = participantCv && candidate.cv.includes(participantCv);
    return cvMatch ? 2 : 1;
}

function matchParticipant(participant, databaseIndex, databaseById) {
    const manualId = MANUAL_MATCHES.get(participant.id);
    if (manualId) {
        const match = databaseById.get(manualId);
        if (!match) {
            return { status: 'invalid-manual-match', candidates: [], manualId };
        }
        return { status: 'manual', match, candidates: [match] };
    }

    const names = [participant.name].map(normalize).filter(Boolean);
    const candidates = names.flatMap(name => databaseIndex.get(name) || []);
    const uniqueCandidates = [...new Map(candidates.map(candidate => [candidate.id, candidate])).values()];
    const scored = uniqueCandidates
        .map(candidate => ({ ...candidate, score: scoreCandidate(participant, candidate) }))
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

    if (!scored.length) return { status: 'unmatched', candidates: [] };
    if (scored.length === 1) return { status: 'unique', match: scored[0], candidates: scored };
    if (scored[0].score > scored[1].score) return { status: 'unique-by-cv', match: scored[0], candidates: scored };
    return { status: 'ambiguous', candidates: scored };
}

function printParticipant(participant, result) {
    const label = `${participant.id}: ${participant.name} @ ${participant.ip}`;
    if (result.status === 'unmatched') {
        console.log(`- ${label}`);
        return;
    }

    const candidates = result.candidates
        .map(candidate => `${candidate.id} ${candidate.name}${candidate.nameEn ? ` (${candidate.nameEn})` : ''}`)
        .join(' | ');
    console.log(`- ${label} -> ${candidates}`);
}

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadRemoteDatabase() {
    const response = await fetch(DATABASE_URL);
    if (!response.ok) {
        throw new Error(`GitHub 数据库请求失败：HTTP ${response.status}`);
    }
    return response.json();
}

async function main() {
    const [detailsData, databaseData] = await Promise.all([
        readJson(DETAILS_PATH),
        loadRemoteDatabase()
    ]);
    const participants = collectParticipants(detailsData);
    const databaseCharacters = collectDatabaseCharacters(databaseData);
    const databaseIndex = indexByName(databaseCharacters);
    const databaseById = new Map(databaseCharacters.map(character => [character.id, character]));
    const results = participants.map(participant => ({
        participant,
        result: matchParticipant(participant, databaseIndex, databaseById)
    }));
    const unique = results.filter(item => ['unique', 'unique-by-cv', 'manual'].includes(item.result.status));
    const ambiguous = results.filter(item => item.result.status === 'ambiguous');
    const unmatched = results.filter(item => ['unmatched', 'invalid-manual-match'].includes(item.result.status));

    console.log(`本地赛事角色: ${participants.length}`);
    console.log(`GitHub 全量角色: ${databaseCharacters.length}`);
    console.log(`唯一匹配: ${unique.length}`);
    console.log(`多候选匹配: ${ambiguous.length}`);
    console.log(`未匹配: ${unmatched.length}`);

    if (ambiguous.length) {
        console.log(`\n多候选匹配 (${ambiguous.length})`);
        ambiguous.forEach(({ participant, result }) => printParticipant(participant, result));
    }

    if (unmatched.length) {
        console.log(`\n未匹配 (${unmatched.length})`);
        unmatched.forEach(({ participant, result }) => printParticipant(participant, result));
    }

    if (ambiguous.length || unmatched.length) {
        process.exitCode = 1;
        return;
    }

    console.log('\n检查通过：所有本届赛事角色均有唯一数据库匹配。');
}

main().catch(error => {
    console.error(`检查失败：${error.message}`);
    process.exitCode = 1;
});
