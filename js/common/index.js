import { SERIES_ALIASES } from '../aliases/aliases.js';
import { reconcileKeyedList } from './keyed-list.js';
import { debounce } from './dom.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    loadCharacterData();
    initializeSearch();
    initStatusFilter();
});

const TEMPLATES = {
    card: document.getElementById('home-character-card-template'),
    resultsLayout: document.getElementById('search-results-layout-template'),
    resultsSection: document.getElementById('search-results-section-template'),
    resultsEmpty: document.getElementById('search-results-empty-template')
};

let characterData = null;

function cloneTemplate(template, selector = null) {
    const fragment = template?.content.cloneNode(true);
    if (!fragment) throw new Error('首页模板缺失');
    return selector ? fragment.querySelector(selector) : fragment;
}

function initializeTabs() {
    document.querySelectorAll('.tab-buttons').forEach(tabButtons => {
        tabButtons.addEventListener('click', event => {
            const btn = event.target.closest('.tab-btn');
            if (!btn || !tabButtons.contains(btn)) return;
            handleTabClick(btn);
        });
    });
}

function handleTabClick(btn) {
    const panelsContainer = btn.closest('.tab-container').nextElementSibling;
    btn.closest('.tab-buttons').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const panelId = btn.dataset.season ? `nova-${btn.dataset.season}-${btn.dataset.gender}` : `stellar-${btn.dataset.gender}`;
    updatePanels(panelsContainer, panelId);
}

function updatePanels(container, targetId) {
    container.querySelectorAll('.character-panel').forEach(panel => {
        if (panel.id === targetId) {
            panel.classList.add('active');
            const cards = panel.querySelectorAll('.character-card');
            cards.forEach(card => card.classList.remove('loaded'));
            requestAnimationFrame(() => {
                adjustCardLayout();
                void panel.offsetHeight;
                cards.forEach(card => card.classList.add('loaded'));
            });
        } else {
            panel.classList.remove('active');
        }
    });
}

async function loadCharacterData() {
    showLoading();
    try {
        const response = await fetch('data/characters/stats/ISML2026-characters.json');
        const data = await response.json();
        characterData = {
            stellar: {
                female: data.stellar.female.filter(char => char.status !== '未晋级'),
                male: data.stellar.male.filter(char => char.status !== '未晋级')
            },
            nova: {
                winter: {
                    female: data.nova.winter.female.filter(char => char.status !== '未晋级'),
                    male: data.nova.winter.male.filter(char => char.status !== '未晋级')
                },
                spring: {
                    female: data.nova.spring.female.filter(char => char.status !== '未晋级'),
                    male: data.nova.spring.male.filter(char => char.status !== '未晋级')
                },
                summer: {
                    female: data.nova.summer.female.filter(char => char.status !== '未晋级'),
                    male: data.nova.summer.male.filter(char => char.status !== '未晋级')
                },
                autumn: {
                    female: data.nova.autumn.female.filter(char => char.status !== '未晋级'),
                    male: data.nova.autumn.male.filter(char => char.status !== '未晋级')
                }
            }
        };
        renderStellarCharacters(characterData.stellar);
        renderNovaCharacters(characterData.nova);
        requestAnimationFrame(() => {
            adjustCardLayout();
            observeImages();
            animateCards();
            hideLoading();
            document.querySelector('.loading-tip')?.classList.add('hidden');
        });
    } catch (error) {
        console.error('加载角色数据失败:', error);
        hideLoading();
        const loadingTip = document.querySelector('.loading-tip');
        if (loadingTip) loadingTip.textContent = '加载失败，请刷新页面重试';
    }
}

function getStatusClass(status) {
    if (!status) return 'pending';
    if (status.includes('晋级')) return 'promoted';
    if (status.includes('淘汰') || status.includes('止步')) return 'eliminated';
    return 'pending';
}

function updateCharacterCard(card, character) {
    const imageContainer = card.querySelector('.character-image-container');
    const image = card.querySelector('.character-image');
    const cv = card.querySelector('.character-cv');
    const status = card.querySelector('.character-status');

    card.querySelector('.character-name').textContent = character.name;
    card.querySelector('.character-series').textContent = character.ip;
    imageContainer.hidden = !character.avatar;
    if (character.avatar) {
        image.dataset.src = character.avatar;
        image.alt = character.name;
    } else {
        delete image.dataset.src;
    }
    cv.hidden = !character.cv;
    cv.textContent = character.cv ? `CV: ${character.cv}` : '';
    status.hidden = !character.status;
    status.className = `character-status ${character.status ? getStatusClass(character.status) : ''}`;
    status.textContent = character.status || '';
}

function createCharacterCard(character) {
    const card = cloneTemplate(TEMPLATES.card, '.character-card');
    updateCharacterCard(card, character);
    return card;
}

function getCharacterKey(character) {
    return `${character.name}@${character.ip}@${character.cv || ''}`;
}

function renderCharacterList(panel, characters) {
    if (!panel) return;
    if (characters.length === 0) {
        if (panel.id) {
            panel.replaceChildren(Object.assign(document.createElement('div'), {
                className: 'character-panel-empty',
                textContent: '暂无数据'
            }));
        } else {
            panel.replaceChildren();
        }
        return;
    }

    reconcileKeyedList(panel, characters, {
        keyAttribute: 'characterKey',
        getKey: getCharacterKey,
        create: () => cloneTemplate(TEMPLATES.card, '.character-card'),
        update: (card, character) => {
            updateCharacterCard(card, character);
            card.classList.add('loaded');
        }
    });
}

function getResultGroups(results) {
    const groups = [];
    if (results.stellar.length > 0) groups.push({ key: 'stellar', title: `恒星组 (${results.stellar.length})`, characters: results.stellar });
    const seasonNames = { winter: '冬季', spring: '春季', summer: '夏季', autumn: '秋季' };
    ['winter', 'spring', 'summer', 'autumn'].forEach(season => {
        if (results.nova[season]?.length > 0) {
            groups.push({
                key: season,
                title: `新星组 - ${seasonNames[season]} (${results.nova[season].length})`,
                characters: results.nova[season]
            });
        }
    });
    return groups;
}
function renderStellarCharacters(data) {
    renderCharacterList(document.getElementById('stellar-female'), data.female);
    renderCharacterList(document.getElementById('stellar-male'), data.male);
}

function renderNovaCharacters(data) {
    ['winter', 'spring', 'summer', 'autumn'].forEach(season => {
        renderCharacterList(document.getElementById(`nova-${season}-female`), data[season]?.female || []);
        renderCharacterList(document.getElementById(`nova-${season}-male`), data[season]?.male || []);
    });
}

function observeImages() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                observer.unobserve(img);
            }
        });
    });
    document.querySelectorAll('.character-image[data-src]').forEach(img => imageObserver.observe(img));
}

function adjustCardLayout() {
    const contentWidth = document.querySelector('.tournament-section').offsetWidth;
    const activePanels = document.querySelectorAll('.tournament-section .character-panel.active');
    let minCardWidth = '145px';
    let gap = '0.7rem';
    if (contentWidth >= 2200) {
        minCardWidth = '190px';
        gap = '1.1rem';
    } else if (contentWidth >= 1800) {
        minCardWidth = '175px';
        gap = '1rem';
    } else if (contentWidth >= 1400) {
        minCardWidth = '165px';
        gap = '0.9rem';
    } else if (contentWidth >= 1000) {
        minCardWidth = '155px';
        gap = '0.8rem';
    }
    activePanels.forEach(panel => {
        if (panel.hidden || panel.offsetParent === null) return;
        const availableWidth = panel.offsetWidth;
        const cardWidth = parseInt(minCardWidth, 10);
        const gapWidth = parseFloat(gap) * 16;
        const idealColumns = Math.floor((availableWidth + gapWidth) / (cardWidth + gapWidth));
        const actualCardWidth = Math.floor((availableWidth - (idealColumns - 1) * gapWidth) / idealColumns);
        panel.style.setProperty('--character-grid-columns', `repeat(${idealColumns}, ${actualCardWidth}px)`);
        panel.style.setProperty('--character-grid-gap', gap);
        panel.style.setProperty('--character-card-width', `${actualCardWidth}px`);
    });
}

const debouncedAdjustLayout = debounce(adjustCardLayout, 250);
window.removeEventListener('resize', adjustCardLayout);
window.addEventListener('resize', debouncedAdjustLayout);

function showLoading() {
    if (document.querySelector('.loading-container')) return;
    const template = document.getElementById('loading-container-template');
    document.body.appendChild(template.content.firstElementChild.cloneNode(true));
}

function hideLoading() {
    document.querySelector('.loading-container')?.remove();
}

function animateCards() {
    document.querySelectorAll('.character-card:not(.loaded)').forEach(card => {
        void card.offsetHeight;
        card.classList.add('loaded');
    });
}

function initializeSearch() {
    const searchContainer = document.querySelector('.search-container');
    const searchIcon = document.querySelector('.search-icon');
    const searchInput = document.getElementById('searchInput');

    function performSearch() {
        const keyword = searchInput.value.trim().toLowerCase();
        if (!keyword) return showAllCharacters();
        const searchConfig = {
            fields: ['name', 'ip', 'cv', 'status'],
            stellar: {
                female: document.querySelector('input[value="stellar-female"]').checked,
                male: document.querySelector('input[value="stellar-male"]').checked
            },
            nova: {
                winter: {
                    female: document.querySelector('input[value="winter-female"]').checked,
                    male: document.querySelector('input[value="winter-male"]').checked
                },
                spring: {
                    female: document.querySelector('input[value="spring-female"]').checked,
                    male: document.querySelector('input[value="spring-male"]').checked
                },
                summer: {
                    female: document.querySelector('input[value="summer-female"]').checked,
                    male: document.querySelector('input[value="summer-male"]').checked
                },
                autumn: {
                    female: document.querySelector('input[value="autumn-female"]').checked,
                    male: document.querySelector('input[value="autumn-male"]').checked
                }
            }
        };
        displaySearchResults(searchCharacters(keyword, searchConfig));
    }

    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            e.preventDefault();
            performSearch();
        }
    });
    document.addEventListener('click', e => {
        if (!searchContainer.contains(e.target) && searchContainer.classList.contains('expanded')) {
            searchContainer.classList.remove('expanded');
        }
    });
    searchContainer.addEventListener('click', e => e.stopPropagation());
    searchIcon.addEventListener('click', () => {
        if (searchContainer.classList.contains('expanded')) {
            if (searchInput.value.trim()) performSearch();
            else searchContainer.classList.remove('expanded');
        } else {
            searchContainer.classList.add('expanded');
            searchInput.focus();
        }
    });
    document.querySelectorAll('.search-options, .group-options').forEach(panel => {
        panel.addEventListener('mousedown', e => e.preventDefault());
    });
    document.querySelector('input[value="stellar"]').addEventListener('change', e => {
        document.querySelectorAll('.stellar-options input').forEach(opt => { opt.checked = e.target.checked; });
    });
    document.querySelector('input[value="nova"]').addEventListener('change', e => {
        document.querySelectorAll('.nova-options input').forEach(opt => { opt.checked = e.target.checked; });
    });
    ['winter', 'spring', 'summer', 'autumn'].forEach(season => {
        document.querySelector(`input[value="${season}"]`).addEventListener('change', e => {
            document.querySelectorAll(`.gender-options input[value^="${season}"]`).forEach(opt => {
                opt.checked = e.target.checked;
            });
        });
    });
    searchInput.addEventListener('input', debounce(performSearch, 300));
    const groupOptions = document.querySelector('.group-options');
    groupOptions.addEventListener('change', event => {
        if (event.target.matches('input')) performSearch();
    });
}

function searchCharacters(keyword, searchConfig) {
    const results = { stellar: [], nova: {} };
    if (searchConfig.stellar.female) {
        characterData.stellar.female.forEach(char => {
            if (matchesSearch(char, keyword, searchConfig.fields)) results.stellar.push(char);
        });
    }
    if (searchConfig.stellar.male) {
        characterData.stellar.male.forEach(char => {
            if (matchesSearch(char, keyword, searchConfig.fields)) results.stellar.push(char);
        });
    }
    ['winter', 'spring', 'summer', 'autumn'].forEach(season => {
        if (searchConfig.nova[season].female || searchConfig.nova[season].male) results.nova[season] = [];
        if (searchConfig.nova[season].female) {
            characterData.nova[season].female.forEach(char => {
                if (matchesSearch(char, keyword, searchConfig.fields)) results.nova[season].push(char);
            });
        }
        if (searchConfig.nova[season].male) {
            characterData.nova[season].male.forEach(char => {
                if (matchesSearch(char, keyword, searchConfig.fields)) results.nova[season].push(char);
            });
        }
    });
    return results;
}

function matchesSearch(character, keyword, fields) {
    const keywords = keyword.split(/[,，\s]+/).map(k => k.trim()).filter(Boolean);
    const exactMatch = document.getElementById('exactMatch').checked;
    return keywords.some(kw => fields.some(field => {
        const value = (character[field] || '').toLowerCase();
        const aliases = field === 'ip'
            ? [value, ...(Object.entries(SERIES_ALIASES).find(([original]) => original === value)?.[1] || [])]
            : [value];
        const simpleAliases = aliases.map(a => a.toLowerCase().replace(/[!！?？.。,，\s]+/g, ''));
        const simpleKeyword = kw.replace(/[!！?？.。,，\s]+/g, '');
        return exactMatch
            ? simpleAliases.some(alias => alias === simpleKeyword)
            : simpleAliases.some(alias => alias.includes(simpleKeyword));
    }));
}

function getSearchScope() {
    return {
        stellar: {
            enabled: document.querySelector('input[value="stellar"]').checked,
            female: document.querySelector('input[value="stellar-female"]').checked,
            male: document.querySelector('input[value="stellar-male"]').checked
        },
        nova: {
            enabled: document.querySelector('input[value="nova"]').checked,
            seasons: Object.fromEntries(['winter', 'spring', 'summer', 'autumn'].map(season => [
                season,
                {
                    enabled: document.querySelector(`input[value="${season}"]`).checked,
                    female: document.querySelector(`input[value="${season}-female"]`).checked,
                    male: document.querySelector(`input[value="${season}-male"]`).checked
                }
            ]))
        }
    };
}

function updateBrowseScope() {
    const scope = getSearchScope();
    const stellar = document.querySelector('.division.stellar');
    const nova = document.querySelector('.division.nova');
    stellar.hidden = !scope.stellar.enabled;
    nova.hidden = !scope.nova.enabled;

    const updateGenderPanel = (panel, button, enabled) => {
        panel.hidden = !enabled;
        button.hidden = !enabled;
        if (!enabled && button.classList.contains('active')) {
            button.classList.remove('active');
            const fallbackButton = Array.from(button.parentElement.querySelectorAll('.tab-btn'))
                .find(item => !item.hidden);
            if (fallbackButton) {
                fallbackButton.classList.add('active');
                updatePanels(button.closest('.tab-container').nextElementSibling, fallbackButton.dataset.season
                    ? `nova-${fallbackButton.dataset.season}-${fallbackButton.dataset.gender}`
                    : `stellar-${fallbackButton.dataset.gender}`);
            }
        }
    };

    const stellarButtons = stellar.querySelectorAll('.tab-btn');
    updateGenderPanel(
        document.getElementById('stellar-female'),
        stellarButtons[0],
        scope.stellar.female
    );
    updateGenderPanel(
        document.getElementById('stellar-male'),
        stellarButtons[1],
        scope.stellar.male
    );

    Object.entries(scope.nova.seasons).forEach(([season, seasonScope]) => {
        const seasonSection = nova.querySelector(`.season-section[data-season="${season}"]`);
        seasonSection.hidden = !seasonScope.enabled;
        const buttons = seasonSection.querySelectorAll('.tab-btn');
        updateGenderPanel(
            seasonSection.querySelector(`#nova-${season}-female`),
            buttons[0],
            seasonScope.female
        );
        updateGenderPanel(
            seasonSection.querySelector(`#nova-${season}-male`),
            buttons[1],
            seasonScope.male
        );
    });
}

function showAllCharacters() {
    const container = document.querySelector('.search-results-container');
    const tournamentSection = document.querySelector('.tournament-section');
    container.classList.remove('visible');
    setTimeout(() => {
        container.style.display = 'none';
        tournamentSection.style.display = 'block';
        updateBrowseScope();
        adjustCardLayout();
    }, 300);
}

function createResultsSection(group) {
    const section = cloneTemplate(TEMPLATES.resultsSection, '.results-section');
    section.querySelector('h3').textContent = group.title;
    return section;
}

function updateResultsGroup(container, groups) {
    reconcileKeyedList(container, groups, {
        keyAttribute: 'resultGroupKey',
        getKey: group => group.key,
        create: createResultsSection,
        update: (section, group) => {
            section.querySelector('h3').textContent = group.title;
            renderCharacterList(section.querySelector('.character-panel'), group.characters);
        }
    });
}

function displaySearchResults(results) {
    const container = document.querySelector('.search-results-container');
    const tournamentSection = document.querySelector('.tournament-section');
    const groups = getResultGroups(results);

    if (groups.length === 0) {
        container.classList.add('no-results');
        container.classList.remove('has-results');
        container.replaceChildren(cloneTemplate(TEMPLATES.resultsEmpty, '.no-results-message'));
        container.style.display = 'block';
        tournamentSection.style.display = 'none';
        requestAnimationFrame(() => container.classList.add('visible'));
        return;
    }

    container.classList.remove('no-results');
    container.classList.add('has-results');
    let content = container.querySelector('.search-results-content');
    if (!content) {
        container.replaceChildren(cloneTemplate(TEMPLATES.resultsLayout));
        content = container.querySelector('.search-results-content');
    }

    const stellarGroups = groups.filter(group => group.key === 'stellar');
    const novaGroups = groups.filter(group => group.key !== 'stellar');
    updateResultsGroup(content.querySelector('.stellar-results'), stellarGroups);
    updateResultsGroup(content.querySelector('.nova-results'), novaGroups);

    container.style.display = 'block';
    tournamentSection.style.display = 'none';
    requestAnimationFrame(() => {
        container.classList.add('visible');
        adjustCardLayout();
        observeImages();
        animateCards();
    });
}

function initStatusFilter() {
    const statusFilters = document.querySelectorAll('.status-filter input[type="checkbox"]');
    const filterCards = division => {
        const panel = division.querySelector('.character-panel.active');
        const cards = panel.querySelectorAll('.character-card');
        const isActive = division.querySelector('input[value="active"]').checked;
        const isEliminated = division.querySelector('input[value="eliminated"]').checked;
        cards.forEach(card => {
            const statusElement = card.querySelector('.character-status');
            const isPromoted = statusElement.classList.contains('promoted');
            const isElim = statusElement.classList.contains('eliminated');
            const isPending = statusElement.classList.contains('pending');
            const shouldShow = (isActive && (isPromoted || isPending)) || (isEliminated && isElim);
            card.removeEventListener('transitionend', card._transitionEndHandler);
            if (shouldShow) {
                card.classList.remove('filtered-out');
                card.classList.add('loaded');
                card.style.position = '';
            } else {
                card.classList.remove('loaded');
                card.classList.add('filtered-out');
                card._transitionEndHandler = () => { card.style.position = 'absolute'; };
                card.addEventListener('transitionend', card._transitionEndHandler, { once: true });
            }
        });
    };
    statusFilters.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            filterCards(this.closest('.division'));
            requestAnimationFrame(adjustCardLayout);
        });
    });
}
