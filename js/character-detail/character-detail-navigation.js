import { reconcileKeyedList } from '../common/keyed-list.js';

const RECENT_CHARS_KEY = 'recent_visited_characters';
const MAX_RECENT_CHARS = 5;
const EMPTY_MESSAGES = {
    all: '当前分组下没有其他角色可显示',
    cv: '没有找到同声优的其他角色',
    ip: '没有找到同作品的其他角色'
};

function readRecentCharacters() {
    try {
        const value = JSON.parse(localStorage.getItem(RECENT_CHARS_KEY) || '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function getRoundContext(roundText) {
    const round = roundText || '';
    return {
        group: ['恒星组', '新星组'].find(group => round.includes(group)) ?? null,
        gender: ['女性', '男性'].find(gender => round.includes(gender)) ?? null,
        season: ['春季赛', '夏季赛', '秋季赛', '冬季赛'].find(season => round.includes(season)) ?? null
    };
}

function matchesCharacterRound(charRound, context) {
    const roundContext = getRoundContext(charRound);
    if (roundContext.group !== context.group || roundContext.gender !== context.gender) return false;
    return context.group !== '新星组' || roundContext.season === context.season;
}

function matchesCharacterFilter(character, currentCharacter, filter) {
    if (filter === 'cv') return character.basic.cv === currentCharacter.basic.cv;
    if (filter === 'ip') return character.basic.ip === currentCharacter.basic.ip;
    return true;
}

function filterCharacters(filter, context) {
    const recentCharacters = readRecentCharacters();
    const currentContext = getRoundContext(context.eventData[0]?.round);
    const characters = Object.entries(context.allCharacters).filter(([id, character]) => {
        if (id === context.characterId) return false;
        const characterRound = character.rounds[0]?.round || '';
        return matchesCharacterRound(characterRound, currentContext)
            && matchesCharacterFilter(character, context.characterData, filter);
    });

    characters.sort(([idA], [idB]) => {
        const indexA = recentCharacters.indexOf(idA);
        const indexB = recentCharacters.indexOf(idB);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
    return { characters, recentCharacters };
}

function scheduleListEntrance(list, selector, animationState) {
    const renderVersion = ++animationState.renderVersion;
    const items = Array.from(list.querySelectorAll(selector));

    items.forEach(item => {
        item.classList.add('is-entering');
        item.classList.remove('visible');
    });

    requestAnimationFrame(() => {
        if (renderVersion !== animationState.renderVersion) return;
        requestAnimationFrame(() => {
            if (renderVersion !== animationState.renderVersion) return;
            items.forEach(item => {
                if (item.isConnected) item.classList.add('visible');
            });
        });
    });
}

function renderCharacters(filter, context, animationState) {
    const { list, templates } = context;
    const { characters, recentCharacters } = filterCharacters(filter, context);
    const emptyState = list.querySelector('.character-nav-empty');

    if (characters.length === 0) {
        list.querySelectorAll('.character-item').forEach(item => item.remove());
        const nextEmptyState = emptyState || templates.characterNavEmpty.content
            .cloneNode(true).querySelector('.character-nav-empty');
        nextEmptyState.textContent = EMPTY_MESSAGES[filter] ?? '暂无可显示角色';
        if (!emptyState) list.appendChild(nextEmptyState);
        scheduleListEntrance(list, '.character-nav-empty', animationState);
        return;
    }

    emptyState?.remove();
    reconcileKeyedList(list, characters, {
        getKey: ([id]) => id,
        keyAttribute: 'characterId',
        create: () => templates.characterItem.content.cloneNode(true).querySelector('.character-item'),
        update: (item, [id, character]) => {
            item.dataset.characterId = id;
            item.classList.toggle('recently-visited', recentCharacters.includes(id));
            const avatar = item.querySelector('.character-item-avatar');
            const name = item.querySelector('.name');
            const textContents = item.querySelectorAll('.text-content');
            avatar.hidden = !character.basic.avatar;
            if (character.basic.avatar) {
                avatar.src = character.basic.avatar;
                avatar.alt = character.basic.name;
            }
            name.textContent = character.basic.name;
            textContents[0].textContent = character.basic.ip;
            textContents[1].textContent = character.basic.cv;
        }
    });
    scheduleListEntrance(list, '.character-item', animationState);
}

function recordVisit(id) {
    const recentCharacters = readRecentCharacters();
    const updated = [id, ...recentCharacters.filter(characterId => characterId !== id)]
        .slice(0, MAX_RECENT_CHARS);
    localStorage.setItem(RECENT_CHARS_KEY, JSON.stringify(updated));
}

export function setupCharacterNavigation(context) {
    const animationState = { renderVersion: 0 };
    const { filters, list } = context;
    filters.addEventListener('click', event => {
        const button = event.target.closest('.filter-btn');
        if (!button) return;
        filters.querySelectorAll('.filter-btn').forEach(item => {
            item.classList.toggle('active', item === button);
        });
        renderCharacters(button.dataset.filter, context, animationState);
    });

    list.addEventListener('click', event => {
        const item = event.target.closest('.character-item');
        if (!item || !list.contains(item)) return;
        const id = item.dataset.characterId;
        if (!id) return;
        recordVisit(id);
        context.onNavigate(id);
    });

    renderCharacters('all', context, animationState);
}

export { filterCharacters, getRoundContext, matchesCharacterRound };
