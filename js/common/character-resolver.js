const CHARACTER_DATABASE_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/characters-data.json';
const PARTICIPANT_MAP_PATH = 'data/characters/participant-map.json';
const CHARACTER_DETAILS_PATH = 'data/characters/characters-details.json';

let resolverPromise;

async function fetchJson(url) {
    const response = await fetch(url);
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
        .replace(/[·・•]/g, '');
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

function createCharacterIndexes(databaseCharacters, detailsData, participantMap) {
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
        const detail = detailsData.characters[participantId];
        if (!detail || typeof detail !== 'object') {
            throw new Error(`characters-details 缺少参赛记录：${participantId}`);
        }
        const basic = detail.basic;
        if (!basic || typeof basic !== 'object' || !basic.name || !basic.ip) {
            throw new Error(`characters-details ${participantId} 缺少 basic.name/basic.ip`);
        }
        const resolved = {
            participantId,
            characterId,
            name: firstNonEmpty(databaseCharacter.name, basic.name),
            nameEn: firstNonEmpty(databaseCharacter.nameEn, basic.name_en),
            ip: basic.ip,
            ipId: databaseCharacter.ipId,
            cv: firstNonEmpty(databaseCharacter.cv, basic.cv),
            avatar: firstNonEmpty(databaseCharacter.avatar, basic.avatar),
            rounds: Array.isArray(detail.rounds) ? detail.rounds : []
        };
        byParticipantId.set(participantId, resolved);
        byNameIp.set(`${normalize(basic.name)}@${normalize(basic.ip)}`, resolved);
    });

    return { byCharacterId, byParticipantId, byNameIp };
}

class CharacterResolver {
    constructor(indexes) {
        this.byCharacterId = indexes.byCharacterId;
        this.byParticipantId = indexes.byParticipantId;
        this.byNameIp = indexes.byNameIp;
    }

    getByParticipantId(participantId) {
        const character = this.byParticipantId.get(participantId);
        if (!character) throw new Error(`找不到参赛角色：${participantId}`);
        return character;
    }

    getByCharacterId(characterId) {
        const character = this.byCharacterId.get(characterId);
        if (!character) throw new Error(`找不到角色库记录：${characterId}`);
        return character;
    }

    findByNameIp(name, ip) {
        return this.byNameIp.get(`${normalize(name)}@${normalize(ip)}`) ?? null;
    }

    enrichParticipant(participantId, eventFields = {}) {
        return {
            ...this.getByParticipantId(participantId),
            ...eventFields
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
            avatar: firstNonEmpty(row.avatar, resolved.avatar)
        };
    }
}

export async function loadCharacterResolver() {
    if (resolverPromise) return resolverPromise;

    resolverPromise = Promise.all([
        fetchJson(CHARACTER_DATABASE_URL),
        fetchJson(PARTICIPANT_MAP_PATH),
        fetchJson(CHARACTER_DETAILS_PATH)
    ]).then(([databaseData, participantMap, detailsData]) => {
        assertObject(participantMap, 'participant-map');
        assertObject(detailsData.characters, 'characters-details.characters');
        const databaseCharacters = collectDatabaseCharacters(databaseData);
        const indexes = createCharacterIndexes(databaseCharacters, detailsData, participantMap);
        return new CharacterResolver(indexes);
    }).catch(error => {
        resolverPromise = null;
        throw error;
    });

    return resolverPromise;
}
