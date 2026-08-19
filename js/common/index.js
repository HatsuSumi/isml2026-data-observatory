import { SERIES_ALIASES } from '../aliases/aliases.js';

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
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', handleTabClick));
}

function handleTabClick(e) {
    const btn = e.currentTarget;
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

function createCharacterCard(character) {
    const card = cloneTemplate(TEMPLATES.card, '.character-card');
    const imageContainer = card.querySelector('.character-image-container');
    const image = card.querySelector('.character-image');
    const cv = card.querySelector('.character-cv');
    const status = card.querySelector('.character-status');

    card.querySelector('.character-name').textContent = character.name;
    card.querySelector('.character-series').textContent = character.ip;

    if (character.avatar) {
        imageContainer.hidden = false;
        image.dataset.src = character.avatar;
        image.alt = character.name;
        image.addEventListener('load', () => imageContainer.classList.remove('loading'));
        image.addEventListener('error', () => imageContainer.classList.add('error'));
    }

    if (character.cv) {
        cv.hidden = false;
        cv.textContent = `CV: ${character.cv}`;
    }

    if (character.status) {
        status.hidden = false;
        status.classList.add(getStatusClass(character.status));
        status.textContent = character.status;
    }

    return card;
}

function renderCharacterList(panel, characters) {
    if (!panel) return;
    const fragment = document.createDocumentFragment();
    characters.forEach(character => fragment.appendChild(createCharacterCard(character)));
    panel.replaceChildren(fragment);
    requestAnimationFrame(() => {
        const cards = panel.querySelectorAll('.character-card');
        void panel.offsetHeight;
        cards.forEach(card => card.classList.add('loaded'));
    });
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
        const availableWidth = panel.offsetWidth;
        const cardWidth = parseInt(minCardWidth, 10);
        const gapWidth = parseFloat(gap) * 16;
        const idealColumns = Math.floor((availableWidth + gapWidth) / (cardWidth + gapWidth));
        const actualCardWidth = Math.floor((availableWidth - (idealColumns - 1) * gapWidth) / idealColumns);
        panel.style.gridTemplateColumns = `repeat(${idealColumns}, ${actualCardWidth}px)`;
        panel.style.gap = gap;
        panel.style.justifyContent = 'center';
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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
        const keyword = searchInput.value.toLowerCase();
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
    document.querySelectorAll('.group-options input').forEach(opt => opt.addEventListener('change', performSearch));
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

function showAllCharacters() {
    const container = document.querySelector('.search-results-container');
    const tournamentSection = document.querySelector('.tournament-section');
    container.classList.remove('visible');
    setTimeout(() => {
        container.style.display = 'none';
        tournamentSection.style.display = 'block';
        adjustCardLayout();
    }, 300);
}

function createResultsSection(title, characters) {
    const section = cloneTemplate(TEMPLATES.resultsSection, '.results-section');
    section.querySelector('h3').textContent = title;
    renderCharacterList(section.querySelector('.character-panel'), characters);
    return section;
}

function displaySearchResults(results) {
    const container = document.querySelector('.search-results-container');
    const tournamentSection = document.querySelector('.tournament-section');
    const seasons = ['winter', 'spring', 'summer', 'autumn'];
    let totalResults = results.stellar.length;
    seasons.forEach(season => {
        totalResults += results.nova[season]?.length ?? 0;
    });
    container.replaceChildren();
    if (totalResults === 0) {
        container.classList.add('no-results');
        container.classList.remove('has-results');
        container.appendChild(cloneTemplate(TEMPLATES.resultsEmpty, '.no-results-message'));
        container.style.display = 'block';
        tournamentSection.style.display = 'none';
        requestAnimationFrame(() => container.classList.add('visible'));
        return;
    }
    container.classList.remove('no-results');
    container.classList.add('has-results');
    container.appendChild(cloneTemplate(TEMPLATES.resultsLayout));
    const stellarResults = container.querySelector('.stellar-results');
    const novaResults = container.querySelector('.nova-results');
    if (results.stellar.length > 0) {
        stellarResults.appendChild(createResultsSection(`恒星组 (${results.stellar.length})`, results.stellar));
    }
    const seasonNames = { winter: '冬季', spring: '春季', summer: '夏季', autumn: '秋季' };
    seasons.forEach(season => {
        if (results.nova[season]?.length > 0) {
            novaResults.appendChild(createResultsSection(`新星组 - ${seasonNames[season]} (${results.nova[season].length})`, results.nova[season]));
        }
    });
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
