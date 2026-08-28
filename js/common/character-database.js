const DATABASE_BASE_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/';
const DATA_SOURCES = {
    characters: `${DATABASE_BASE_URL}characters-data.json`,
    lookup: `${DATABASE_BASE_URL}character-lookup.json`,
    ips: `${DATABASE_BASE_URL}ip-data.json`
};

let databasePromise = null;

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`角色数据库加载失败: ${response.status}`);
    return response.json();
}

function createCharacterRecord(character, ip) {
    const cv = Array.isArray(character.cv) ? character.cv.filter(Boolean).join('、') : character.cv || '';
    return {
        id: character.id,
        name: character.name,
        name_en: character.name_en || '',
        ip: ip?.name || '',
        ip_id: character.ip_id,
        cv,
        avatar: character.avatar || '',
        ip_year: ip?.year ?? 0,
        ip_season: ip?.season ?? 0
    };
}

export function mergeCharacterRecord(base, patch) {
    const next = { ...base };
    for (const [key, value] of Object.entries(patch)) {
        if (value === '' || value === null || value === undefined) continue;
        if (Array.isArray(value) && value.length === 0) continue;
        next[key] = value;
    }
    return next;
}

function normalizeDatabase({ characters, lookup, ips }) {
    const records = {};
    const recordsByLookupKey = new Map();

    Object.values(characters).forEach(character => {
        const ip = ips[character.ip_id];
        const record = createCharacterRecord(character, ip);
        records[record.id] = record;
        if (record.name && record.ip) recordsByLookupKey.set(`${record.name}@${record.ip}`, record);
    });

    return {
        characters,
        lookup,
        ips,
        records,
        recordsByLookupKey
    };
}

export async function loadCharacterDatabase() {
    if (!databasePromise) {
        databasePromise = Promise.all([
            fetchJson(DATA_SOURCES.characters),
            fetchJson(DATA_SOURCES.lookup),
            fetchJson(DATA_SOURCES.ips)
        ])
            .then(([characters, lookup, ips]) => normalizeDatabase({ characters, lookup, ips }))
            .catch(error => {
                databasePromise = null;
                throw error;
            });
    }

    return databasePromise;
}

export function getLookupKey(character) {
    if (!character) return '';
    const name = character.name || character.basic?.name || '';
    const ip = character.ip || character.basic?.ip || '';
    return name && ip ? `${name}@${ip}` : '';
}

export function getDatabaseRecordByLegacyCharacter(database, character) {
    const lookupKey = getLookupKey(character);
    const id = database.lookup[lookupKey];
    return id ? database.records[id] : database.recordsByLookupKey.get(lookupKey);
}
