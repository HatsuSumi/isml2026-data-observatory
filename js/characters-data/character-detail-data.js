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

export async function loadCharacterDetailData(characterId) {
    const [charactersData, rulesData, groupsData] = await Promise.all([
        fetchJson(DATA_SOURCES.characters),
        fetchJson(DATA_SOURCES.rules),
        fetchJson(DATA_SOURCES.groups)
    ]);

    const allCharacters = charactersData.characters;
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
