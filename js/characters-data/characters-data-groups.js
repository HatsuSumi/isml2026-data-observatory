import { CONFIG } from './characters-data-config.js';
import { createCharacterCard, checkTooltips } from './characters-data-card.js';
import { createGenderSwitchController } from './characters-data-animation.js';

function getOppositeGender(gender) {
    return gender === 'female' ? 'male' : 'female';
}

function setupGenderTabs(container, switchGender) {
    const tabs = container.closest('.group-container').querySelectorAll('.gender-tabs .tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            if (tab.classList.contains('active')) return;
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            await switchGender(tab.dataset.gender);
        });
    });
}

function renderStellarGender(groups, container, gender, templates, cardContext) {
    if (CONFIG.characters.showRounds) {
        groups.forEach(group => {
            const roundDiv = templates.rankRound.content.cloneNode(true).querySelector('.rank-round');
            const titleDiv = roundDiv.querySelector('.rank-title');
            const cardsDiv = roundDiv.querySelector('.character-cards');
            titleDiv.textContent = group.rankLabel;
            titleDiv.dataset.rank = parseInt(group.rankLabel, 10);
            group.characters.forEach(char => {
                const card = createCharacterCard(char, gender, cardContext);
                if (gender === 'female') card.classList.add('show');
                cardsDiv.appendChild(card);
            });
            container.appendChild(roundDiv);
        });
        return;
    }

    const groupDiv = templates.rankGroup.content.cloneNode(true).querySelector('.rank-group');
    groupDiv.dataset.gender = gender;
    if (gender === 'female') groupDiv.classList.add('show');
    const cardsDiv = templates.characterCards.content.cloneNode(true).querySelector('.character-cards');
    cardsDiv.dataset.gender = gender;
    const sortedCharacters = groups.flatMap(group => group.characters).sort((a, b) => {
        const idA = parseInt(a.id.replace('SF', ''), 10);
        const idB = parseInt(b.id.replace('SF', ''), 10);
        if (idA <= 37 && idB <= 37) return idA - idB;
        if (idA <= 37) return -1;
        if (idB <= 37) return 1;
        return idB - idA;
    });
    sortedCharacters.forEach(char => cardsDiv.appendChild(createCharacterCard(char, gender, cardContext)));
    groupDiv.appendChild(cardsDiv);
    container.appendChild(groupDiv);
    requestAnimationFrame(() => {
        groupDiv.classList.add('show');
        cardsDiv.querySelectorAll('.character-card').forEach(card => card.classList.add('show'));
    });
}

export function renderStellarGroups(data, container, templates, cardContext, animationContext) {
    const groups = {};
    ['female', 'male'].forEach(gender => {
        const group = templates.rankGroup.content.cloneNode(true).querySelector('.rank-group');
        group.dataset.gender = gender;
        if (gender === 'female') group.classList.add('show');
        renderStellarGender(data[gender], group, gender, templates, cardContext);
        if (gender === 'male') group.style.display = 'none';
        container.appendChild(group);
        groups[gender] = group;
    });
    const controller = createGenderSwitchController({
        getGroup: gender => groups[gender],
        getChildGroups: group => CONFIG.characters.showRounds
            ? Array.from(group.querySelectorAll('.rank-round'))
            : [],
        isFastSwitching: () => animationContext.fastSwitching
    });
    setupGenderTabs(container, controller.switchGender);
    return controller;
}

function renderNovaGender(groups, container, gender, templates, cardContext) {
    if (!Array.isArray(groups)) {
        console.error('Nova groups data format error:', groups);
        return;
    }
    const groupDiv = templates.novaGroup.content.cloneNode(true).querySelector('.nova-group');
    groupDiv.dataset.gender = gender;
    if (gender === 'female') groupDiv.classList.add('show');
    groups.forEach(seasonGroup => {
        if (!seasonGroup.season || !Array.isArray(seasonGroup.characters)) {
            console.error('Invalid season group data:', seasonGroup);
            return;
        }
        if (seasonGroup.characters.length === 0) return;
        const seasonDiv = templates.seasonGroup.content.cloneNode(true).querySelector('.season-group');
        seasonDiv.dataset.season = seasonGroup.season;
        if (gender === 'female') seasonDiv.classList.add('show');
        seasonDiv.querySelector('.season-title').textContent = {
            spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季'
        }[seasonGroup.season] || seasonGroup.season;
        const cardsDiv = seasonDiv.querySelector('.character-cards');
        seasonGroup.characters.forEach(char => {
            const card = createCharacterCard(char, gender, cardContext);
            if (gender === 'female') card.classList.add('show');
            cardsDiv.appendChild(card);
        });
        groupDiv.appendChild(seasonDiv);
    });
    container.appendChild(groupDiv);
    return groupDiv;
}

export function renderNovaGroups(data, container, templates, cardContext, animationContext) {
    const groups = {};
    ['female', 'male'].forEach(gender => {
        groups[gender] = renderNovaGender(data[gender], container, gender, templates, cardContext);
        if (gender === 'male') groups[gender].style.display = 'none';
    });
    requestAnimationFrame(() => {
        Object.values(groups).forEach(group => {
            group.classList.add('show');
            group.querySelectorAll('.season-group').forEach((season, seasonIndex) => {
                if (groups.female === group) {
                    setTimeout(() => season.classList.add('show'), seasonIndex * 100);
                }
                season.querySelectorAll('.character-card').forEach((card, cardIndex) => {
                    setTimeout(() => card.classList.add('show'), seasonIndex * 100 + cardIndex * 20);
                });
            });
        });
        setTimeout(checkTooltips, 500);
    });
    const controller = createGenderSwitchController({
        getGroup: gender => groups[gender],
        getChildGroups: group => Array.from(group.querySelectorAll('.season-group')),
        isFastSwitching: () => animationContext.fastSwitching
    });
    setupGenderTabs(container, controller.switchGender);
    return controller;
}

export function renderCharacters(data, { containers, templates, cardContext, animationContext }) {
    document.body.classList.toggle('show-rounds-mode', CONFIG.characters.showRounds);
    const controllers = {
        stellar: renderStellarGroups(data.stellar, containers.stellar, templates, cardContext, animationContext),
        nova: renderNovaGroups(data.nova, containers.nova, templates, cardContext, animationContext)
    };
    return controllers;
}

export { getOppositeGender };
