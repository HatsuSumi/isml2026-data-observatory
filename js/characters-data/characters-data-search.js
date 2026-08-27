import { CONFIG, SERIES_ALIASES, normalizeSeriesName } from './characters-data-config.js';
import { scrollToElement } from './characters-data-navigation.js';

export function isValidRegex(pattern) {
    try {
        new RegExp(pattern);
        return true;
    } catch {
        return false;
    }
}

function matchSeriesAlias(series, keyword, useRegex, exactMatch) {
    const normalizedSeries = normalizeSeriesName(series);
    const aliases = SERIES_ALIASES[normalizedSeries];
    if (useRegex) {
        const regex = new RegExp(keyword, 'i');
        return regex.test(normalizedSeries) || Boolean(aliases?.some(alias => regex.test(alias)));
    }
    if (exactMatch) {
        const normalizedKeyword = keyword.toLowerCase();
        return normalizedSeries.toLowerCase() === normalizedKeyword
            || Boolean(aliases?.some(alias => alias.toLowerCase() === normalizedKeyword));
    }
    const normalizedKeyword = keyword.toLowerCase();
    return normalizedSeries.toLowerCase().includes(normalizedKeyword)
        || Boolean(aliases?.some(alias => alias.toLowerCase().includes(normalizedKeyword)));
}

function showRegexError(templates, searchInput) {
    const template = templates.regexErrorTooltip;
    if (!template) {
        console.error('正则表达式语法错误');
        return;
    }
    const tooltip = template.content.cloneNode(true).querySelector('.regex-error-tooltip');
    tooltip.textContent = '正则表达式语法错误';
    const searchBox = searchInput.getBoundingClientRect();
    tooltip.style.top = `${searchBox.top - 30}px`;
    tooltip.style.left = `${searchBox.left}px`;
    document.body.appendChild(tooltip);
    setTimeout(() => {
        tooltip.classList.add('fade-out');
        setTimeout(() => tooltip.remove(), 300);
    }, 3000);
}

export function createSearchController({ templates, getSwitchController, getVisibleCards, animationContext }) {
    let currentSearchResults = [];
    let currentResultIndex = -1;

    function clearHighlight() {
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('highlight', 'current-result');
        });
    }

    function updateSearchCount() {
        const searchCount = document.querySelector('.search-count');
        if (!searchCount) return;
        const searchInput = document.getElementById('searchInput');
        if (!searchInput.value.trim()) {
            searchCount.style.display = 'none';
            return;
        }
        if (currentSearchResults.length === 0) {
            searchCount.textContent = '0/0';
            searchCount.classList.add('no-results');
        } else {
            searchCount.textContent = `${currentResultIndex + 1}/${currentSearchResults.length}`;
            searchCount.classList.remove('no-results');
        }
        searchCount.style.display = 'block';
    }

    function scrollToResult(card, waitForSwitch = false) {
        setTimeout(() => {
            const cardRect = card.getBoundingClientRect();
            const targetY = window.scrollY + cardRect.top - window.innerHeight / 2 + cardRect.height / 2;
            scrollWindowTo(targetY);
        }, waitForSwitch ? 300 : 0);
    }

    function highlightCurrentResult() {
        document.querySelectorAll('.character-card.current-result').forEach(card => card.classList.remove('current-result'));
        const card = currentSearchResults[currentResultIndex];
        if (!card) return;
        card.classList.add('current-result');
        scrollToResult(card, animationContext.fastSwitching);
        updateSearchCount();
    }

    function handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const keyword = searchInput.value.trim();
        const useRegex = document.getElementById('useRegex').checked;
        const exactMatch = document.getElementById('exactMatch').checked;
        currentSearchResults = [];
        currentResultIndex = -1;
        clearHighlight();
        if (!keyword) {
            updateSearchCount();
            return;
        }
        if (useRegex && !isValidRegex(keyword)) {
            showRegexError(templates, searchInput);
            return;
        }
        try {
            const keywords = exactMatch ? [keyword.toLowerCase()]
                : useRegex ? [keyword] : keyword.toLowerCase().split(/[,，\s]+/).filter(Boolean);
            const cards = getVisibleCards();
            cards.forEach(card => {
                const cardInfo = {
                    name: card.querySelector('.character-name').textContent,
                    ip: card.querySelector('.character-ip').textContent,
                    cv: card.querySelector('.character-cv').textContent
                };
                const matched = keywords.some(kw => ['name', 'cv'].some(field => {
                    const value = cardInfo[field];
                    if (!value) return false;
                    return useRegex ? new RegExp(kw, 'i').test(value)
                        : exactMatch ? value.toLowerCase() === kw : value.toLowerCase().includes(kw);
                }) || matchSeriesAlias(cardInfo.ip, kw, useRegex, exactMatch));
                card.classList.toggle('highlight', matched);
                if (matched) currentSearchResults.push(card);
            });
            if (currentSearchResults.length > 0) {
                currentResultIndex = 0;
                highlightCurrentResult();
            }
            updateSearchCount();
        } catch (error) {
            console.error('搜索出错:', error);
        }
    }

    function switchToNextResult() {
        if (currentSearchResults.length === 0) return;
        const nextIndex = currentResultIndex === -1 || currentResultIndex === currentSearchResults.length - 1
            ? 0 : currentResultIndex + 1;
        const targetResult = currentSearchResults[nextIndex];
        const targetGender = targetResult.dataset.gender;
        const targetGroup = targetResult.closest('.group-container');
        const currentGender = targetGroup.querySelector('.tab-btn.active')?.dataset.gender;
        currentResultIndex = nextIndex;
        if (targetGender !== currentGender) {
            animationContext.fastSwitching = true;
            const tabToSwitch = targetGroup.querySelector(`.tab-btn[data-gender="${targetGender}"]`);
            tabToSwitch?.click();
            setTimeout(() => {
                animationContext.fastSwitching = false;
            }, 350);
        }
        highlightCurrentResult();
        updateSearchCount();
    }

    function bind() {
        const searchInput = document.querySelector('.search-box input');
        const searchButton = document.querySelector('#searchBtn');
        const exactMatch = document.querySelector('#exactMatch');
        const useRegex = document.querySelector('#useRegex');
        searchInput.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (event.shiftKey || currentSearchResults.length === 0) handleSearch();
            else switchToNextResult();
        });
        searchButton.addEventListener('click', handleSearch);
        exactMatch.addEventListener('change', () => {
            if (exactMatch.checked) useRegex.checked = false;
            if (searchInput.value.trim()) handleSearch();
        });
        useRegex.addEventListener('change', () => {
            if (useRegex.checked) exactMatch.checked = false;
            if (searchInput.value.trim()) handleSearch();
        });
        document.querySelectorAll('.gender-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
        if (searchInput.value.trim() && !animationContext.fastSwitching) setTimeout(handleSearch, 350);
            });
        });
        searchInput.addEventListener('input', () => {
            if (!searchInput.value.trim()) handleSearch();
        });
    }

    return { bind, handleSearch };
}

export { CONFIG };
