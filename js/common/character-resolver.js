const CHARACTER_DATABASE_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/characters-data.json';
const IP_DATABASE_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/ip-data.json';
const PARTICIPANT_MAP_PATH = 'data/characters/participant-map.json';
const CHARACTER_DETAILS_PATH = 'data/characters/characters-details.json';
const DATA_ROOT = new URL('../../', import.meta.url);

let resolverPromise;

async function fetchJson(url) {
    const response = await fetch(new URL(url, DATA_ROOT));
    if (!response.ok) throw new Error(`数据加载失败: ${url} HTTP ${response.status}`);
    return response.json();
}

function assertObject(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${label} 必须是对象`);
    }
}

function normalize(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .trim()
        .toLocaleLowerCase()
        .replace(/[\s\u3000]/g, '')
        .replace(/[·・•]/g, '')
        .replace(/[！!？?。.～~]/g, '');
}

function firstNonEmpty(...values) {
    const value = values.find(item => String(item ?? '').trim() !== '');
    return String(value ?? '').trim();
}

function toDisplayCv(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join('、');
    if (value && typeof value === 'object') return Object.values(value).flat().filter(Boolean).join('、');
    return String(value ?? '').trim();
}

function collectDatabaseCharacters(databaseData) {
    const records = Array.isArray(databaseData) ? databaseData : Object.values(databaseData);
    return records.map(character => {
        if (!character || typeof character !== 'object') {
            throw new Error('角色数据库包含无效记录');
        }
        if (!character.id) {
            throw new Error('角色数据库记录缺少 id');
        }
        return {
            id: String(character.id).trim(),
            name: String(character.name ?? '').trim(),
            nameEn: String(character.name_en ?? '').trim(),
            ipId: String(character.ip_id ?? '').trim(),
            cv: toDisplayCv(character.cv),
            avatar: String(character.avatar ?? '').trim()
        };
    });
}

function collectIpRecords(ipData) {
    const records = Array.isArray(ipData) ? ipData : Object.values(ipData || {});
    return records.reduce((index, ip) => {
        if (ip && ip.id) index.set(String(ip.id).trim(), ip);
        return index;
    }, new Map());
}

function getIpRecord(ipRecords, ipId, label) {
    const ip = ipRecords.get(ipId);
    if (!ip || !ip.name) {
        throw new Error(`ip-data 缺少作品资料：${label} -> ${ipId}`);
    }
    return ip;
}

function toIpNumber(value) {
    const number = Number(value);
    return Number.isInteger(number) ? number : 0;
}

function toCharacterDisplay(databaseCharacter, ipRecords, extra = {}) {
    const ip = getIpRecord(ipRecords, databaseCharacter.ipId, extra.participantId || databaseCharacter.id);
    return {
        characterId: databaseCharacter.id,
        name: databaseCharacter.name,
        nameEn: databaseCharacter.nameEn,
        ip: String(ip.name).trim(),
        ipNameEn: String(ip.name_en ?? '').trim(),
        ipId: databaseCharacter.ipId,
        cv: databaseCharacter.cv,
        avatar: databaseCharacter.avatar,
        company: '',
        birthday: '',
        ...extra,
        ip_year: toIpNumber(ip.year),
        ip_season: toIpNumber(ip.season)
    };
}

function getParticipantProfile(participantId, detailsData, databaseCharacter, ipRecords) {
    const detail = detailsData.characters[participantId];
    if (!detail || typeof detail !== 'object') {
        throw new Error(`characters-details 缺少参赛记录：${participantId}`);
    }
    getIpRecord(ipRecords, databaseCharacter.ipId, participantId);
    return { detail };
}

function createCharacterIndexes(databaseCharacters, ipRecords, detailsData, participantMap) {
    const byCharacterId = new Map();
    const byParticipantId = new Map();
    const byNameIp = new Map();

    databaseCharacters.forEach(character => {
        if (!/^char_\d{6}$/.test(character.id)) {
            throw new Error(`角色数据库包含非法角色 ID：${character.id}`);
        }
        byCharacterId.set(character.id, character);
    });

    Object.entries(participantMap).forEach(([participantId, characterId]) => {
        const databaseCharacter = byCharacterId.get(characterId);
        if (!databaseCharacter) {
            throw new Error(`participant-map 指向不存在的角色库 ID：${participantId} -> ${characterId}`);
        }
        const { detail } = getParticipantProfile(participantId, detailsData, databaseCharacter, ipRecords);
        const resolved = toCharacterDisplay(databaseCharacter, ipRecords, {
            participantId,
            rounds: Array.isArray(detail.rounds) ? detail.rounds : []
        });
        byParticipantId.set(participantId, resolved);
        byNameIp.set(`${normalize(resolved.name)}@${normalize(resolved.ip)}`, resolved);
    });

    return { byCharacterId, byParticipantId, byNameIp, ipRecords };
}

class CharacterResolver {
    constructor(indexes) {
        this.byCharacterId = indexes.byCharacterId;
        this.byParticipantId = indexes.byParticipantId;
        this.byNameIp = indexes.byNameIp;
        this.ipRecords = indexes.ipRecords;
    }

    getByParticipantId(participantId) {
        const character = this.byParticipantId.get(participantId);
        if (!character) throw new Error(`找不到参赛角色：${participantId}`);
        return character;
    }

    getByCharacterId(characterId) {
        const character = this.byCharacterId.get(characterId);
        if (!character) throw new Error(`找不到角色库记录：${characterId}`);
        return toCharacterDisplay(character, this.ipRecords);
    }

    findByNameIp(name, ip) {
        return this.byNameIp.get(`${normalize(name)}@${normalize(ip)}`) ?? null;
    }

    enrichParticipant(participantId, eventFields = {}) {
        const character = this.getByParticipantId(participantId);
        return {
            ...character,
            ...eventFields,
            ip_year: character.ip_year,
            ip_season: character.ip_season
        };
    }

    enrichLegacyRow(row) {
        if (!row || !row.name || !row.ip) {
            throw new Error('enrichLegacyRow 需要 name 和 ip 字段');
        }
        const resolved = this.findByNameIp(row.name, row.ip);
        if (!resolved) return { ...row };
        return {
            ...row,
            participantId: resolved.participantId,
            characterId: resolved.characterId,
            name: firstNonEmpty(row.name, resolved.name),
            nameEn: firstNonEmpty(row.name_en, row.nameEn, resolved.nameEn),
            ip: firstNonEmpty(row.ip, resolved.ip),
            cv: firstNonEmpty(row.cv, resolved.cv),
            avatar: firstNonEmpty(row.avatar, resolved.avatar),
            ip_year: resolved.ip_year,
            ip_season: resolved.ip_season
        };
    }
}

export async function loadCharacterResolver() {
    if (resolverPromise) return resolverPromise;

    resolverPromise = Promise.all([
        fetchJson(CHARACTER_DATABASE_URL),
        fetchJson(IP_DATABASE_URL),
        fetchJson(PARTICIPANT_MAP_PATH),
        fetchJson(CHARACTER_DETAILS_PATH)
    ]).then(([databaseData, ipData, participantMap, detailsData]) => {
        assertObject(participantMap, 'participant-map');
        assertObject(detailsData.characters, 'characters-details.characters');
        const databaseCharacters = collectDatabaseCharacters(databaseData);
        const ipRecords = collectIpRecords(ipData);
        const indexes = createCharacterIndexes(databaseCharacters, ipRecords, detailsData, participantMap);
        return new CharacterResolver(indexes);
    }).catch(error => {
        resolverPromise = null;
        throw error;
    });

    return resolverPromise;
}
