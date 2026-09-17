import { loadCharacterResolver } from './character-resolver.js';

const CHARACTER_MATCHES_PATH = 'data/matches/character-matches.json';
const CHARACTER_DETAILS_PATH = 'data/characters/characters-details.json';
const DATA_ROOT = new URL('../../', import.meta.url);

async function fetchJson(url) {
    const response = await fetch(new URL(url, DATA_ROOT));
    if (!response.ok) throw new Error(`数据加载失败: ${response.status}`);
    return response.json();
}

function getBasicCharacterIndex(data) {
    return Object.values(data.characters || {}).reduce((index, character) => {
        const basic = character.basic;
        if (basic?.name && basic.ip) {
            index[`${basic.name}@${basic.ip}`] = basic;
        }
        return index;
    }, {});
}

export async function loadCharacterDetails() {
    const [rawData, resolver] = await Promise.all([
        fetchJson(CHARACTER_DETAILS_PATH),
        loadCharacterResolver()
    ]);
    const characters = Object.fromEntries(Object.entries(rawData.characters || {}).map(([participantId, detail]) => {
        const character = resolver.getByParticipantId(participantId);
        return [character.characterId, {
            basic: {
                id: participantId,
                characterId: character.characterId,
                name: character.name,
                name_en: character.nameEn,
                ip: character.ip,
                avatar: character.avatar,
                cv: character.cv,
                ...(character.company ? { company: character.company } : {}),
                ...(character.birthday ? { birthday: character.birthday } : {})
            },
            rounds: Array.isArray(detail.rounds) ? detail.rounds : []
        }];
    }));
    return { ...rawData, characters };
}

export async function loadResolvedCharacters() {
    const resolver = await loadCharacterResolver();
    return resolver;
}

function normalizeCharacterMatchRecord(participantId, record, resolver) {
    if (!record || typeof record !== 'object' || !Array.isArray(record.matches)) {
        throw new Error(`character-matches.json ${participantId} 记录格式错误`);
    }
    const character = resolver.getByParticipantId(participantId);
    return {
        ...character,
        ...record,
        participantId,
        characterId: character.characterId,
        name: character.name,
        nameEn: character.nameEn,
        ip: character.ip,
        cv: character.cv,
        avatar: character.avatar,
        matches: record.matches
    };
}

export async function loadCharacterMatches() {
    const [rawData, resolver] = await Promise.all([
        fetchJson(CHARACTER_MATCHES_PATH),
        loadCharacterResolver()
    ]);
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData) || !rawData.matches) {
        throw new Error('character-matches.json 缺少 matches 对象');
    }
    const matches = Object.fromEntries(Object.entries(rawData.matches).map(([participantId, record]) => [
        participantId,
        normalizeCharacterMatchRecord(participantId, record, resolver)
    ]));
    return { matches };
}

export async function loadEventData() {
    const [events, rankings, characterData] = await Promise.all([
        fetchJson('data/config/events.json'),
        fetchJson('data/votes/top5-rankings.json'),
        loadCharacterDetails()
    ]);
    const characters = Object.fromEntries(Object.entries(getBasicCharacterIndex(characterData)).map(([key, basic]) => [
        key,
        {
            name: basic.name,
            ip: basic.ip,
            avatar: basic.avatar || ''
        }
    ]));
    const rankingData = Object.fromEntries(Object.entries(rankings).map(([title, ranking]) => [
        title,
        {
            ...ranking,
            top5: ranking.top5.map(item => ({
                ...item,
                avatar: characters[`${item.name}@${item.ip}`]?.avatar || ''
            }))
        }
    ]));
    return { events, rankings: rankingData, characters };
}

export async function loadGroupData() {
    const [groups, characterData] = await Promise.all([
        fetchJson('data/groups/groups.json'),
        loadCharacterDetails()
    ]);
    const characters = Object.values(characterData.characters).reduce((index, character) => {
        const basic = character.basic;
        if (!index[basic.name]) {
            index[basic.name] = {
                id: character.id,
                database_id: basic.database_id,
                name: basic.name,
                ip: basic.ip,
                cv: basic.cv,
                avatar: basic.avatar
            };
        }
        return index;
    }, {});
    return { groups, characters };
}
