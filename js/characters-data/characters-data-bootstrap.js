import { CONFIG, collectCharacterTemplates } from './characters-data-config.js';
import { createCardContext, checkTooltips } from './characters-data-card.js';
import { renderCharacters } from './characters-data-groups.js';
import { createSearchController } from './characters-data-search.js';
import { initElevatorNav } from './characters-data-navigation.js';

async function loadCharactersData() {
    const response = await fetch('data/characters/roundsData.json');
    if (!response.ok) throw new Error(`角色数据加载失败: ${response.status}`);
    return response.json();
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
