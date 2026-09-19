import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const stats = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/statistics/nomination-stats.json'), 'utf-8'));
const participantMap = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/characters/participant-map.json'), 'utf-8'));
const charactersDb = JSON.parse(fs.readFileSync(path.join(rootDir, '.cache/characters-data.json'), 'utf-8'));
const ipDb = JSON.parse(fs.readFileSync(path.join(rootDir, '.cache/ip-data.json'), 'utf-8'));

function normalize(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .trim()
        .toLocaleLowerCase()
        .replace(/[\s\u3000]/g, '')
        .replace(/[·・•]/g, '')
        .replace(/[！!？?。.～~]/g, '');
}

const charMap = new Map(Object.entries(charactersDb));
const ipMap = new Map(Object.entries(ipDb));

const participantExact = new Map();
const participantNormalized = new Map();
const participantByName = new Map();
for (const [participantId, characterId] of Object.entries(participantMap)) {
    const character = charMap.get(characterId);
    const ip = character ? ipMap.get(character.ip_id) : null;
    if (!character || !ip) continue;
    const exactKey = `${character.name}@${ip.name}`;
    const normalizedKey = `${normalize(character.name)}@${normalize(ip.name)}`;
    participantExact.set(exactKey, { participantId, characterId, name: character.name, ip: ip.name });
    participantNormalized.set(normalizedKey, { participantId, characterId, name: character.name, ip: ip.name });
    const nameKey = normalize(character.name);
    if (!participantByName.has(nameKey)) participantByName.set(nameKey, []);
    participantByName.get(nameKey).push({ participantId, characterId, name: character.name, ip: ip.name });
}

const dbExact = new Map();
const dbNormalized = new Map();
const dbByName = new Map();
for (const character of Object.values(charactersDb)) {
    const ip = ipMap.get(character.ip_id);
    if (!character?.name || !ip?.name) continue;
    const record = { characterId: character.id, name: character.name, ip: ip.name };
    dbExact.set(`${character.name}@${ip.name}`, record);
    dbNormalized.set(`${normalize(character.name)}@${normalize(ip.name)}`, record);
    const nameKey = normalize(character.name);
    if (!dbByName.has(nameKey)) dbByName.set(nameKey, []);
    dbByName.get(nameKey).push(record);
}

function walk(node, prefix = []) {
    if (Array.isArray(node)) return node.map((item, index) => ({ path: [...prefix, index], item }));
    if (!node || typeof node !== 'object') return [];
    return Object.entries(node).flatMap(([key, value]) => walk(value, [...prefix, key]));
}

const rows = walk(stats);
const results = {
    total: rows.length,
    participantExact: 0,
    participantNormalized: 0,
    characterExact: 0,
    characterNormalized: 0,
    nameOnlyUnique: 0,
    unmatched: [],
    nameOnlyAmbiguous: [],
    duplicateKeys: [],
    reusedIds: []
};

const usedParticipantIds = new Map();
const usedCharacterIds = new Map();

for (const { path, item } of rows) {
    const location = path.slice(0, -1).join('.');
    const key = `${item.name}@${item.ip}`;
    const normalizedKey = `${normalize(item.name)}@${normalize(item.ip)}`;
    let match = participantExact.get(key);
    let kind = 'participantExact';
    if (!match) {
        match = participantNormalized.get(normalizedKey);
        kind = 'participantNormalized';
    }
    if (!match) {
        match = dbExact.get(key);
        kind = 'characterExact';
    }
    if (!match) {
        match = dbNormalized.get(normalizedKey);
        kind = 'characterNormalized';
    }
    if (!match) {
        const sameName = participantByName.get(normalize(item.name)) || dbByName.get(normalize(item.name)) || [];
        const unique = [...new Map(sameName.map(entry => [entry.characterId || entry.participantId, entry])).values()];
        if (unique.length === 1) {
            match = unique[0];
            kind = 'nameOnlyUnique';
        } else if (unique.length > 1) {
            results.nameOnlyAmbiguous.push({
                location,
                name: item.name,
                ip: item.ip,
                status: item.status,
                votes: item.votes,
                candidates: unique
            });
            continue;
        }
    }

    if (!match) {
        results.unmatched.push({
            location,
            name: item.name,
            ip: item.ip,
            status: item.status,
            votes: item.votes
        });
        continue;
    }

    results[kind]++;
    const id = match.participantId || match.characterId;
    const idMap = match.participantId ? usedParticipantIds : usedCharacterIds;
    const seen = idMap.get(id) || [];
    seen.push({ location, name: item.name, ip: item.ip, status: item.status, votes: item.votes, kind, mappedName: match.name, mappedIp: match.ip });
    idMap.set(id, seen);
}

for (const [id, items] of [...usedParticipantIds.entries(), ...usedCharacterIds.entries()]) {
    if (items.length > 1) {
        results.reusedIds.push({ id, count: items.length, items });
    }
}

console.log(JSON.stringify({
    total: results.total,
    participantExact: results.participantExact,
    participantNormalized: results.participantNormalized,
    characterExact: results.characterExact,
    characterNormalized: results.characterNormalized,
    nameOnlyUnique: results.nameOnlyUnique,
    unmatched: results.unmatched.length,
    nameOnlyAmbiguous: results.nameOnlyAmbiguous.length,
    reusedIds: results.reusedIds.length
}, null, 2));

console.log('\n--- unmatched ---');
for (const item of results.unmatched) {
    console.log(`${item.location}: ${item.name} @ ${item.ip} [${item.status}/${item.votes}]`);
}

console.log('\n--- name-only ambiguous ---');
for (const item of results.nameOnlyAmbiguous) {
    console.log(`${item.location}: ${item.name} @ ${item.ip}`);
    item.candidates.forEach(candidate => {
        console.log(`  -> ${candidate.participantId || candidate.characterId} ${candidate.name} @ ${candidate.ip}`);
    });
}

console.log('\n--- reused ids ---');
for (const item of results.reusedIds) {
    console.log(`${item.id} x${item.count}`);
    item.items.forEach(entry => {
        console.log(`  ${entry.location}: ${entry.name} @ ${entry.ip} [${entry.status}/${entry.votes}] via ${entry.kind} => ${entry.mappedName} @ ${entry.mappedIp}`);
    });
}
