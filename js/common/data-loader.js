import { loadCharacterResolver } from './character-resolver.js';

const CHARACTER_MATCHES_PATH = 'data/matches/character-matches.json';
const CHARACTER_DETAILS_PATH = 'data/characters/characters-details.json';
const NOMINATION_STATS_PATH = 'data/statistics/nomination-stats.json';
const DATA_ROOT = new URL('../../', import.meta.url);

async function fetchJson(url) {
    const response = await fetch(new URL(url, DATA_ROOT));
    if (!response.ok) throw new Error(`数据加载失败: ${response.status}`);
    return response.json();
}

export async function loadCharacterDetails() {
    const [rawData, resolver] = await Promise.all([
        fetchJson(CHARACTER_DETAILS_PATH),
        loadCharacterResolver()
    ]);
    const characters = Object.fromEntries(Object.entries(rawData.characters || {}).map(([participantId, detail]) => {
        const character = resolver.getByParticipantId(participantId);
        return [participantId, {
            basic: {
                participantId,
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
    const [events, rankings, resolver] = await Promise.all([
        fetchJson('data/config/events.json'),
        fetchJson('data/votes/top5-rankings.json'),
        loadCharacterResolver()
    ]);
    const rankingData = Object.fromEntries(Object.entries(rankings).map(([title, ranking]) => [
        title,
        {
            ...ranking,
            top5: ranking.top5.map(item => {
                const character = resolver.getByParticipantId(item.participantId);
                return {
                    name: character.name,
                    ip: character.ip,
                    avatar: character.avatar || '',
                    votes: item.votes
                };
            })
        }
    ]));
    return { events, rankings: rankingData };
}

function extraGroupFields(record) {
    const extra = {};
    if (Number.isInteger(record?.seed)) extra.seed = record.seed;
    return extra;
}

function enrichGroupMember(record, resolver, path) {
    if (typeof record === 'string') {
        return { name: record, ip: '', avatar: '' };
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw new Error(`groups.json ${path} 必须是对象`);
    }
    const extra = extraGroupFields(record);
    if (typeof record.participantId === 'string' && record.participantId.trim()) {
        const character = resolver.getByParticipantId(record.participantId);
        return { ...character, ...extra, participantId: record.participantId };
    }
    if (typeof record.characterId === 'string' && record.characterId.trim()) {
        const character = resolver.getByCharacterId(record.characterId);
        return { ...character, ...extra, characterId: record.characterId };
    }
    if (record.name && record.ip) {
        return { ...resolver.enrichLegacyRow(record), ...extra };
    }
    throw new Error(`groups.json ${path} 缺少 participantId、characterId 或 name/ip`);
}

export async function loadGroupData() {
    const [rawGroups, resolver] = await Promise.all([
        fetchJson('data/groups/groups.json'),
        loadCharacterResolver()
    ]);
    const groups = Object.fromEntries(Object.entries(rawGroups).map(([eventId, eventConfig]) => {
        const eventGroups = Object.fromEntries(Object.entries(eventConfig.groups || {}).map(([groupName, members]) => [
            groupName,
            (members || []).map((member, index) => enrichGroupMember(member, resolver, `${eventId}.${groupName}[${index}]`))
        ]));
        return [eventId, { ...eventConfig, groups: eventGroups }];
    }));
    const characters = Object.values(groups).reduce((index, eventConfig) => {
        Object.values(eventConfig.groups || {}).forEach(members => {
            members.forEach(character => {
                if (character.participantId && !index[character.participantId]) {
                    index[character.participantId] = character;
                }
                if (character.name && !index[character.name]) {
                    index[character.name] = character;
                }
            });
        });
        return index;
    }, {});
    return { groups, characters };
}

function requireStatsList(value, path) {
    if (!Array.isArray(value)) {
        throw new Error(`nomination-stats.json ${path} 必须是数组`);
    }
    return value;
}

function enrichNominationRecord(record, resolver, path) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw new Error(`nomination-stats.json ${path} 必须是对象`);
    }
    const eventFields = {
        status: record.status ?? '',
        votes: record.votes
    };
    if (typeof record.participantId === 'string' && record.participantId.trim()) {
        const character = resolver.getByParticipantId(record.participantId);
        return {
            ...character,
            ...eventFields,
            participantId: record.participantId
        };
    }
    if (typeof record.characterId === 'string' && record.characterId.trim()) {
        const character = resolver.getByCharacterId(record.characterId);
        return {
            ...character,
            ...eventFields,
            characterId: record.characterId
        };
    }
    if (record.name && record.ip) {
        return resolver.enrichLegacyRow(record);
    }
    throw new Error(`nomination-stats.json ${path} 缺少 participantId、characterId 或 name/ip`);
}

function enrichNominationList(list, resolver, path) {
    return requireStatsList(list, path).map((record, index) => (
        enrichNominationRecord(record, resolver, `${path}[${index}]`)
    ));
}

export async function loadNominationStats() {
    const [rawData, resolver] = await Promise.all([
        fetchJson(NOMINATION_STATS_PATH),
        loadCharacterResolver()
    ]);
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        throw new Error('nomination-stats.json 必须是对象');
    }
    return {
        stellar: {
            female: enrichNominationList(rawData.stellar?.female, resolver, 'stellar.female'),
            male: enrichNominationList(rawData.stellar?.male, resolver, 'stellar.male')
        },
        nova: {
            winter: {
                female: enrichNominationList(rawData.nova?.winter?.female, resolver, 'nova.winter.female'),
                male: enrichNominationList(rawData.nova?.winter?.male, resolver, 'nova.winter.male')
            },
            spring: {
                female: enrichNominationList(rawData.nova?.spring?.female, resolver, 'nova.spring.female'),
                male: enrichNominationList(rawData.nova?.spring?.male, resolver, 'nova.spring.male')
            },
            summer: {
                female: enrichNominationList(rawData.nova?.summer?.female, resolver, 'nova.summer.female'),
                male: enrichNominationList(rawData.nova?.summer?.male, resolver, 'nova.summer.male')
            },
            autumn: {
                female: enrichNominationList(rawData.nova?.autumn?.female, resolver, 'nova.autumn.female'),
                male: enrichNominationList(rawData.nova?.autumn?.male, resolver, 'nova.autumn.male')
            }
        }
    };
}
