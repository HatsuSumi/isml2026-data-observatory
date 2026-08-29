import { CONFIG, collectCharacterTemplates } from './characters-data-config.js';
import { createCardContext, checkTooltips } from './characters-data-card.js';
import { renderCharacters } from './characters-data-groups.js';
import { createSearchController } from './characters-data-search.js';
import { initElevatorNav } from './characters-data-navigation.js';
async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`角色数据加载失败: ${response.status}`);
    return response.json();
}

function assertCharactersData(data) {
    if (!data || typeof data !== 'object') throw new Error('角色数据格式错误：根节点必须是对象');
    if (!data.stellar || !Array.isArray(data.stellar.female) || !Array.isArray(data.stellar.male)) {
        throw new Error('角色数据格式错误：恒星组缺少女性或男性分组');
    }
    for (const gender of ['female', 'male']) {
        data.stellar[gender].forEach((group, index) => {
            if (!group || typeof group.rankLabel !== 'string' || !Array.isArray(group.characters)) {
                throw new Error(`角色数据格式错误：恒星组 ${gender} 第 ${index + 1} 项无效`);
            }
        });
    }
    if (!data.nova || typeof data.nova !== 'object') {
        throw new Error('角色数据格式错误：缺少新星组');
    }
    for (const season of ['winter', 'spring', 'summer', 'autumn']) {
        const seasonData = data.nova[season];
        if (!seasonData || !Array.isArray(seasonData.female) || !Array.isArray(seasonData.male)) {
            throw new Error(`角色数据格式错误：新星组缺少${season}数据`);
        }
        for (const gender of ['female', 'male']) {
            seasonData[gender].forEach((character, index) => {
                if (!character || typeof character !== 'object') {
                    throw new Error(`角色数据格式错误：新星组${season}${gender}第 ${index + 1} 项无效`);
                }
            });
        }
    }
}

async function loadCharactersData() {
    const data = await fetchJson('data/characters/roundsData.json');
    assertCharactersData(data);
    const seasons = ['winter', 'spring', 'summer', 'autumn'];

    return {
        stellar: data.stellar,
        nova: {
            female: seasons.map(season => ({
                season,
                characters: data.nova[season]?.female || []
            })),
            male: seasons.map(season => ({
                season,
                characters: data.nova[season]?.male || []
            }))
        }
    };
}

function getGroupContainers() {
    return {
        stellar: document.querySelector('.stellar .rank-groups'),
        nova: document.querySelector('.nova .rank-groups')
    };
}

function getVisibleCards() {
    const currentGender = document.querySelector('.tab-btn.active')?.dataset.gender;
    const crossGender = document.getElementById('crossGender').checked;
    if (crossGender) return document.querySelectorAll('.character-card');
    if (CONFIG.characters.showRounds) {
        return document.querySelectorAll(`.rank-group[data-gender="${currentGender}"] .rank-round .character-card`);
    }
    return document.querySelectorAll(`.character-cards[data-gender="${currentGender}"] .character-card`);
}

function getActiveGroupController(targetGroup, controllers) {
    return targetGroup.closest('.group-container').classList.contains('stellar')
        ? controllers.stellar
        : controllers.nova;
}

export async function initializeCharactersPage() {
    const templates = collectCharacterTemplates();
    const cardContext = createCardContext(templates);
    const animationContext = { fastSwitching: false };
    const containers = getGroupContainers();

    try {
        const data = await loadCharactersData();
        const controllers = renderCharacters(data, {
            containers,
            templates,
            cardContext,
            animationContext
        });
        const search = createSearchController({
            templates,
            animationContext,
            getVisibleCards: () => getVisibleCards(),
            getSwitchController: targetGroup => getActiveGroupController(targetGroup, controllers)
        });
        search.bind();
        initElevatorNav();
        requestAnimationFrame(() => setTimeout(checkTooltips, 500));
    } catch (error) {
        console.error('加载角色数据失败:', error);
    }
}
