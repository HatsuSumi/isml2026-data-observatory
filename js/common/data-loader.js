import { loadCharacterResolver } from './character-resolver.js';
import { buildScheduleView } from './schedule-view.js';

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

export async function loadEventsConfig() {
    return fetchJson('data/config/events.json');
}

export async function loadScheduleView() {
    const events = await loadEventsConfig();
    return buildScheduleView(events);
}

export async function loadEventData() {
    const [events, rankings, resolver] = await Promise.all([
        loadEventsConfig(),
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
    if (Number.isInteger(record?.rank)) extra.rank = record.rank;
    return extra;
}

function enrichGroupMember(record, resolver, path) {
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
    throw new Error(`groups.json ${path} 缺少 participantId 或 characterId`);
}

function resolveGroupConfig(rawGroups, eventId, stack = []) {
    const eventConfig = rawGroups[eventId];
    if (!eventConfig || typeof eventConfig !== 'object' || Array.isArray(eventConfig)) {
        throw new Error(`groups.json 缺少分组配置: ${eventId}`);
    }
    const groups = eventConfig.groups;
    if (!groups || typeof groups !== 'object' || Array.isArray(groups)) {
        throw new Error(`groups.json ${eventId}.groups 格式错误`);
    }
    const reference = groups.$ref;
    if (reference === undefined) return eventConfig;
    if (typeof reference !== 'string' || !reference.trim()) {
        throw new Error(`groups.json ${eventId}.groups.$ref 必须是非空字符串`);
    }
    if (stack.includes(eventId)) {
        throw new Error(`groups.json 分组引用循环: ${[...stack, eventId].join(' -> ')}`);
    }
    const source = resolveGroupConfig(rawGroups, reference, [...stack, eventId]);
    return { ...source, ...eventConfig, groups: source.groups };
}

export async function loadGroupData() {
    const [rawGroups, resolver] = await Promise.all([
        fetchJson('data/groups/groups.json'),
        loadCharacterResolver()
    ]);
    const groups = Object.fromEntries(Object.keys(rawGroups).map(eventId => {
        const eventConfig = resolveGroupConfig(rawGroups, eventId);
        const eventGroups = Object.fromEntries(Object.entries(eventConfig.groups).map(([groupName, members]) => [
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
    throw new Error(`nomination-stats.json ${path} 缺少 participantId 或 characterId`);
}

function enrichNominationList(list, resolver, path) {
    return requireStatsList(list, path).map((record, index) => (
        enrichNominationRecord(record, resolver, `${path}[${index}]`)
    ));
}

export function getInternalSnapshotPath(snapshotPath, category) {
    const value = String(snapshotPath || '').replace(/\\/g, '/');
    const prefix = `data/${category}/`;
    if (!value.includes(prefix)) throw new Error(`内部快照路径无效：${snapshotPath}`);
    return value.replace(prefix, `data/internal/${category}/`);
}

function toInternalPreliminaryPath(snapshotPath) {
    return getInternalSnapshotPath(snapshotPath, 'preliminaries');
}

function enrichPreliminaryRecord(record, resolver, path) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw new Error(`预选赛数据 ${path} 必须是对象`);
    }
    const eventFields = {
        group: String(record.group || ''),
        rank: record.rank,
        global_rank: record.global_rank,
        votes: record.votes,
        is_advanced: record.is_advanced === true
    };
    if (typeof record.participantId === 'string' && record.participantId.trim()) {
        const character = resolver.getByParticipantId(record.participantId);
        return { ...character, ...eventFields, participantId: record.participantId };
    }
    if (typeof record.characterId === 'string' && record.characterId.trim()) {
        const character = resolver.getByCharacterId(record.characterId);
        return { ...character, ...eventFields, characterId: record.characterId };
    }
    throw new Error(`预选赛数据 ${path} 缺少 participantId 或 characterId`);
}

export function getPreliminarySnapshotPath(snapshotPath) {
    return String(snapshotPath || '');
}

export async function loadNecklaceData(snapshotPath) {
    const [rawData, resolver] = await Promise.all([
        fetchJson(getInternalSnapshotPath(snapshotPath, 'phase1')),
        loadCharacterResolver()
    ]);
    if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.data)) {
        throw new Error('内部项链赛数据格式错误：data 必须是数组');
    }
    return {
        ...rawData,
        data: rawData.data.map((round, roundIndex) => {
            if (!round || !Array.isArray(round.contestants)) {
                throw new Error(`内部项链赛数据第 ${roundIndex + 1} 轮格式错误`);
            }
            return {
                ...round,
                contestants: round.contestants.map((contestant, contestantIndex) => {
                    if (!contestant?.participantId) {
                        throw new Error(`内部项链赛数据第 ${roundIndex + 1} 轮第 ${contestantIndex + 1} 项缺少 participantId`);
                    }
                    return {
                        ...resolver.getByParticipantId(contestant.participantId),
                        participantId: contestant.participantId,
                        votes: Number(contestant.votes),
                        status: contestant.status
                    };
                })
            };
        })
    };
}

export async function loadPhase1Data(snapshotPath) {
    const [rawData, resolver] = await Promise.all([
        fetchJson(getInternalSnapshotPath(snapshotPath, 'phase1')),
        loadCharacterResolver()
    ]);
    if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.data)) {
        throw new Error('内部第一阶段数据格式错误：data 必须是数组');
    }

    const participantIds = rawData.data.flatMap(match => (
        Array.isArray(match?.contestants) ? match.contestants.map(contestant => contestant?.participantId) : []
    ));
    const wildcardIds = participantIds.filter(participantId => /^(WF|WM)\d+$/.test(participantId || ''));
    let wildcardProfiles = new Map();
    if (wildcardIds.length) {
        const publicData = await fetchJson(snapshotPath);
        if (!publicData || !Array.isArray(publicData.data)) {
            throw new Error(`外卡赛公开数据格式错误：${snapshotPath}`);
        }
        wildcardProfiles = new Map(publicData.data.map(profile => [profile.participantId, {
            participantId: profile.participantId,
            characterId: profile.participantId,
            name: profile.name,
            nameEn: '',
            ip: profile.ip,
            ipNameEn: '',
            avatar: profile.avatar || '',
            cv: '',
            company: '',
            birthday: '',
            rounds: []
        }]));
    }

    return {
        ...rawData,
        data: rawData.data.map((match, matchIndex) => {
            if (!match || !Array.isArray(match.contestants)) {
                throw new Error(`内部第一阶段数据 [${matchIndex}] 格式错误`);
            }
            return {
                ...match,
                contestants: match.contestants.map((contestant, contestantIndex) => {
                    if (!contestant?.participantId) {
                        throw new Error(`内部第一阶段数据 [${matchIndex}][${contestantIndex}] 缺少 participantId`);
                    }
                    const character = wildcardProfiles.get(contestant.participantId)
                        || resolver.getByParticipantId(contestant.participantId);
                    return {
                        ...character,
                        votes: contestant.votes,
                        result: contestant.result,
                        participantId: contestant.participantId
                    };
                })
            };
        })
    };
}

export async function loadPreliminariesData(snapshotPath) {
    const [rawData, resolver] = await Promise.all([
        fetchJson(toInternalPreliminaryPath(snapshotPath)),
        loadCharacterResolver()
    ]);
    if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.data)) {
        throw new Error('内部预选赛数据格式错误：data 必须是数组');
    }
    return {
        date: rawData.date || '',
        event: rawData.event || '',
        snapshotPath: getPreliminarySnapshotPath(snapshotPath),
        data: rawData.data.map((record, index) => enrichPreliminaryRecord(record, resolver, `[${index}]`))
    };
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
