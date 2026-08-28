import { getDatabaseRecordByLegacyCharacter, loadCharacterDatabase } from '../common/character-database.js';

const DATA_SOURCES = {
    characters: 'data/characters/characters-details.json',
    rules: 'data/rules/rules.json',
    groups: 'data/groups/groups.json'
};

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`数据加载失败: ${response.status}`);
    return response.json();
}

function mergeCharacterBasicData(characterData, database) {
    const databaseRecord = getDatabaseRecordByLegacyCharacter(database, characterData.basic);
    if (!databaseRecord) return characterData;

    return {
        ...characterData,
        basic: Object.fromEntries(
            Object.entries({ ...characterData.basic, ...databaseRecord }).filter(([, value]) => {
                if (value === '' || value === null || value === undefined) return false;
                if (Array.isArray(value)) return value.length > 0;
                return true;
            })
        )
    };
}

function mergeAllCharactersBasicData(allCharacters, database) {
    return Object.fromEntries(Object.entries(allCharacters).map(([id, character]) => [
        id,
        mergeCharacterBasicData(character, database)
    ]));
}

export async function loadCharacterDetailData(characterId) {
    const [charactersData, rulesData, groupsData, database] = await Promise.all([
        fetchJson(DATA_SOURCES.characters),
        fetchJson(DATA_SOURCES.rules),
        fetchJson(DATA_SOURCES.groups),
        loadCharacterDatabase()
    ]);

    const allCharacters = mergeAllCharactersBasicData(charactersData.characters, database);
    const characterData = allCharacters?.[characterId];
    if (!characterData) throw new Error('角色数据不存在');

    return {
        characterId,
        characterData,
        allCharacters,
        configData: charactersData.config,
        rulesData,
        groupsData,
        eventData: characterData.rounds
    };
}
