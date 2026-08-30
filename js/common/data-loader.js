async function fetchJson(url) {
    const response = await fetch(url);
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
    return fetchJson('data/characters/characters-details.json');
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
