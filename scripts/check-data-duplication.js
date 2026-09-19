#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PATHS = {
    participantMap: path.join(ROOT, 'data', 'characters', 'participant-map.json'),
    characterDetails: path.join(ROOT, 'data', 'characters', 'characters-details.json'),
    roundsData: path.join(ROOT, 'data', 'characters', 'roundsData.json'),
    characterMatches: path.join(ROOT, 'data', 'matches', 'character-matches.json'),
    groups: path.join(ROOT, 'data', 'groups', 'groups.json'),
    top5Rankings: path.join(ROOT, 'data', 'votes', 'top5-rankings.json'),
    nominationStats: path.join(ROOT, 'data', 'statistics', 'nomination-stats.json')
};

const PARTICIPANT_ID_PATTERN = /^(?:E?SF|E?SM)\d{3}$/;

function fail(message) {
    throw new Error(message);
}

async function readJson(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
}

function assertObject(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        fail(`${label} 必须是对象`);
    }
}

function assertParticipantId(id, label) {
    if (!PARTICIPANT_ID_PATTERN.test(id)) {
        fail(`${label} 包含非法参赛 ID：${id}`);
    }
}

function getCharacterDetailIds(detailsData) {
    assertObject(detailsData.characters, 'characters-details.json characters');
    return Object.keys(detailsData.characters);
}

function getRoundCharacterIds(roundsData) {
    const ids = [];
    const visit = value => {
        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value.characters)) {
            value.characters.forEach(character => {
                if (!character?.participantId) fail('roundsData.json 角色记录缺少 participantId');
                ids.push(character.participantId);
            });
        }
        Object.entries(value).forEach(([key, child]) => {
            if (key !== 'characters') visit(child);
        });
    };
    visit(roundsData);
    return [...new Set(ids)];
}

function getMatchCharacterIds(matchesData) {
    assertObject(matchesData.matches, 'character-matches.json matches');
    return Object.keys(matchesData.matches);
}

function compareIdSets(label, baseIds, targetIds) {
    const baseSet = new Set(baseIds);
    const targetSet = new Set(targetIds);
    const missing = baseIds.filter(id => !targetSet.has(id));
    const extra = targetIds.filter(id => !baseSet.has(id));
    if (missing.length || extra.length) {
        return {
            label,
            missing,
            extra
        };
    }
    return null;
}

function collectGroupCharacters(groupsData) {
    const characters = [];
    for (const [groupId, groupConfig] of Object.entries(groupsData)) {
        assertObject(groupConfig.groups, `groups.json ${groupId}.groups`);
        for (const [groupName, groupCharacters] of Object.entries(groupConfig.groups)) {
            if (!Array.isArray(groupCharacters)) fail(`groups.json ${groupId}.${groupName} 必须是数组`);
            groupCharacters.forEach((character, index) => {
                if (!character || typeof character !== 'object' || Array.isArray(character)) {
                    fail(`groups.json ${groupId}.${groupName}[${index}] 必须是对象`);
                }
                if (character.name || character.ip || character.avatar || character.cv) {
                    fail(`groups.json ${groupId}.${groupName}[${index}] 仍包含角色展示字段`);
                }
                const hasParticipantId = typeof character.participantId === 'string' && character.participantId.trim();
                const hasCharacterId = typeof character.characterId === 'string' && character.characterId.trim();
                if (!hasParticipantId && !hasCharacterId) {
                    fail(`groups.json ${groupId}.${groupName}[${index}] 缺少 participantId 或 characterId`);
                }
                if (hasParticipantId) assertParticipantId(character.participantId, `groups.json ${groupId}.${groupName}`);
                if (hasCharacterId && !/^char_\d{6}$/.test(character.characterId)) {
                    fail(`groups.json ${groupId}.${groupName}[${index}] 包含非法角色库 ID：${character.characterId}`);
                }
                characters.push({
                    groupId,
                    groupName,
                    participantId: hasParticipantId ? character.participantId : '',
                    characterId: hasCharacterId ? character.characterId : ''
                });
            });
        }
    }
    return characters;
}

function collectTop5Characters(rankingsData) {
    const characters = [];
    for (const [eventTitle, ranking] of Object.entries(rankingsData)) {
        if (!Array.isArray(ranking.top5)) fail(`top5-rankings.json ${eventTitle}.top5 必须是数组`);
        ranking.top5.forEach((character, index) => {
            if (character.name || character.ip || character.avatar) {
                fail(`top5-rankings.json ${eventTitle}[${index}] 仍包含角色展示字段`);
            }
            if (!character.participantId) fail(`top5-rankings.json ${eventTitle}[${index}] 缺少 participantId`);
            assertParticipantId(character.participantId, `top5-rankings.json ${eventTitle}`);
            characters.push({ eventTitle, participantId: character.participantId });
        });
    }
    return characters;
}

function visitNominationLists(statsData, visit) {
    assertObject(statsData, 'nomination-stats.json');
    assertObject(statsData.stellar, 'nomination-stats.json stellar');
    assertObject(statsData.nova, 'nomination-stats.json nova');
    visit(statsData.stellar.female, 'stellar.female');
    visit(statsData.stellar.male, 'stellar.male');
    ['winter', 'spring', 'summer', 'autumn'].forEach(season => {
        assertObject(statsData.nova[season], `nomination-stats.json nova.${season}`);
        visit(statsData.nova[season].female, `nova.${season}.female`);
        visit(statsData.nova[season].male, `nova.${season}.male`);
    });
}

function collectNominationStatsRecords(statsData) {
    const records = [];
    visitNominationLists(statsData, (list, pathLabel) => {
        if (!Array.isArray(list)) fail(`nomination-stats.json ${pathLabel} 必须是数组`);
        list.forEach((record, index) => {
            if (!record || typeof record !== 'object' || Array.isArray(record)) {
                fail(`nomination-stats.json ${pathLabel}[${index}] 必须是对象`);
            }
            if (record.name || record.ip || record.cv || record.avatar) {
                fail(`nomination-stats.json ${pathLabel}[${index}] 仍包含角色展示字段`);
            }
            const hasParticipantId = typeof record.participantId === 'string' && record.participantId.trim();
            const hasCharacterId = typeof record.characterId === 'string' && record.characterId.trim();
            if (!hasParticipantId && !hasCharacterId) {
                fail(`nomination-stats.json ${pathLabel}[${index}] 缺少 participantId 或 characterId`);
            }
            if (hasParticipantId) assertParticipantId(record.participantId, `nomination-stats.json ${pathLabel}`);
            if (hasCharacterId && !/^char_\d{6}$/.test(record.characterId)) {
                fail(`nomination-stats.json ${pathLabel}[${index}] 包含非法角色库 ID：${record.characterId}`);
            }
            records.push({
                path: `${pathLabel}[${index}]`,
                participantId: hasParticipantId ? record.participantId : '',
                characterId: hasCharacterId ? record.characterId : ''
            });
        });
    });
    return records;
}

function createParticipantIdIndex(detailsData) {
    return new Set(Object.keys(detailsData.characters));
}

function validateParticipantMap(participantMap) {
    assertObject(participantMap, 'participant-map.json');
    const ids = Object.keys(participantMap);
    const characterIds = Object.values(participantMap);
    ids.forEach(id => assertParticipantId(id, 'participant-map.json'));
    characterIds.forEach(characterId => {
        if (!/^char_\d{6}$/.test(characterId)) fail(`participant-map.json 包含非法角色库 ID：${characterId}`);
    });
    const duplicateCharacterIds = characterIds.filter((id, index) => characterIds.indexOf(id) !== index);
    if (duplicateCharacterIds.length) {
        fail(`participant-map.json 存在重复角色库 ID：${[...new Set(duplicateCharacterIds)].join(', ')}`);
    }
    return ids;
}

function validateParticipantIdReferences(label, records, participantIds) {
    const missing = records.filter(record => record.participantId && !participantIds.has(record.participantId));
    if (!missing.length) return null;
    return {
        label,
        missing: missing.map(record => record.participantId),
        extra: []
    };
}

async function main() {
    const [participantMap, detailsData, roundsData, matchesData, groupsData, rankingsData, nominationStats] = await Promise.all([
        readJson(PATHS.participantMap),
        readJson(PATHS.characterDetails),
        readJson(PATHS.roundsData),
        readJson(PATHS.characterMatches),
        readJson(PATHS.groups),
        readJson(PATHS.top5Rankings),
        readJson(PATHS.nominationStats)
    ]);

    const participantIds = validateParticipantMap(participantMap);
    const detailIds = getCharacterDetailIds(detailsData);
    const roundIds = getRoundCharacterIds(roundsData);
    const matchIds = getMatchCharacterIds(matchesData);

    [...detailIds, ...roundIds, ...matchIds].forEach(id => assertParticipantId(id, '赛事数据'));

    const issues = [
        compareIdSets('participant-map ↔ characters-details', participantIds, detailIds),
        compareIdSets('participant-map ↔ roundsData', participantIds, roundIds),
        compareIdSets('participant-map ↔ character-matches', participantIds, matchIds)
    ].filter(Boolean);

    const participantIdsSet = new Set(participantIds);
    const nominationRecords = collectNominationStatsRecords(nominationStats);
    const groupRecords = collectGroupCharacters(groupsData);
    const groupIssue = validateParticipantIdReferences(
        'groups.json ↔ participant-map',
        groupRecords,
        participantIdsSet
    );
    const top5Issue = validateParticipantIdReferences(
        'top5-rankings.json ↔ participant-map',
        collectTop5Characters(rankingsData),
        participantIdsSet
    );
    const nominationIssue = validateParticipantIdReferences(
        'nomination-stats.json ↔ participant-map',
        nominationRecords,
        participantIdsSet
    );
    [groupIssue, top5Issue, nominationIssue].filter(Boolean).forEach(issue => issues.push(issue));

    console.log(`participant-map 参赛记录: ${participantIds.length}`);
    console.log(`characters-details 参赛记录: ${detailIds.length}`);
    console.log(`roundsData 参赛记录: ${roundIds.length}`);
    console.log(`character-matches 参赛记录: ${matchIds.length}`);
    console.log(`groups.json 角色引用: ${groupRecords.length}`);
    console.log(`groups.json participantId: ${groupRecords.filter(record => record.participantId).length}`);
    console.log(`groups.json characterId: ${groupRecords.filter(record => record.characterId && !record.participantId).length}`);
    console.log(`top5-rankings.json 角色引用: ${collectTop5Characters(rankingsData).length}`);
    console.log(`nomination-stats.json 记录: ${nominationRecords.length}`);
    console.log(`nomination-stats.json participantId: ${nominationRecords.filter(record => record.participantId).length}`);
    console.log(`nomination-stats.json characterId: ${nominationRecords.filter(record => record.characterId && !record.participantId).length}`);

    if (issues.length) {
        console.log('\n发现数据引用问题：');
        issues.forEach(issue => {
            console.log(`\n${issue.label}`);
            if (issue.missing.length) console.log(`- 缺失: ${issue.missing.join(', ')}`);
            if (issue.extra.length) console.log(`- 多余: ${issue.extra.join(', ')}`);
        });
        process.exitCode = 1;
        return;
    }

    console.log('\n检查通过：核心内部数据引用一致。');
}

main().catch(error => {
    console.error(`检查失败：${error.message}`);
    process.exitCode = 1;
});
