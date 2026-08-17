import { getScheduleFilterControls, isScheduleFiltersEnabled } from '../state/scheduleState.js';
import { cloneScheduleTemplate } from '../utils/template.js';
import { getOffsetTop, isInViewport, smoothScrollTo } from '../utils/dom.js';
import {
    getCurrentMatchLabel,
    getPhaseStatus,
    getPhaseStatusText,
    getRoundStatus,
    getRoundStatusClass,
} from '../utils/match.js';
import {
    appendCurrentMatch,
    bindElevatorScroll,
    bindSearchInput,
    createElevatorNavSkeleton,
    createFilterControls,
    createNavItemSkeleton,
    createRoundItem,
    mountElevatorNav,
    scrollToElement,
    setScheduleFiltersEnabled,
} from './elevatorNav.js';
import { getCurrentMatchData } from './bindings.js';

function createNoResultsElement() {
    const noResults = cloneScheduleTemplate('schedule-no-results-template', '.no-results');
    noResults.hidden = true;
    document.querySelector('.timeline').appendChild(noResults);
    return noResults;
}

function getFilterValues(controls) {
    return {
        startDay: controls.startDayFilter.getValue(),
        endDay: controls.endDayFilter.getValue(),
    };
}

function isMatchVisible(match, currentFilter, { startDay, endDay }) {
    const startDate = new Date(match.dataset.startDate);
    const endDate = new Date(match.dataset.endDate);
    const matchesStatus = currentFilter === 'all'
        || (currentFilter === 'upcoming'
            ? match.dataset.status === 'upcoming' || match.dataset.status === 'pending'
            : match.dataset.status === currentFilter);
    const matchesStartDay = !startDay || startDate.getDay() === Number.parseInt(startDay, 10);
    const matchesEndDay = !endDay || endDate.getDay() === Number.parseInt(endDay, 10);

    return matchesStatus && matchesStartDay && matchesEndDay;
}

function updateRoundItemVisibility(navLink, matches) {
    navLink.querySelectorAll('.round-item').forEach(item => {
        const matchElement = Array.from(matches).find(match =>
            match.querySelector('.match-title').textContent === item.dataset.matchTitle
        );
        if (matchElement) {
            item.hidden = matchElement.hidden;
        }
    });
}

function updateSectionVisibility(section, navLinks) {
    const matches = section.querySelectorAll('.timeline-item');
    const navLink = Array.from(navLinks).find(link => link.getAttribute('href') === `#${section.id}`);
    let hasVisibleMatch = false;

    matches.forEach(match => {
        if (!match.hidden) {
            hasVisibleMatch = true;
        }
    });

    section.hidden = !hasVisibleMatch;
    if (navLink) {
        navLink.parentElement.hidden = !hasVisibleMatch;
        updateRoundItemVisibility(navLink, matches);
    }

    return hasVisibleMatch;
}

function applyFilters(getCurrentFilter, controls) {
    if (!isScheduleFiltersEnabled()) {
        return;
    }

    const filterValues = getFilterValues(controls);
    const noResults = document.querySelector('.no-results') || createNoResultsElement();
    const allSections = document.querySelectorAll('.timeline-section');
    const navLinks = document.querySelectorAll('.elevator-nav .nav-link');
    let hasAnyVisibleMatch = false;

    allSections.forEach(section => {
        const matches = section.querySelectorAll('.timeline-item');
        const currentFilter = getCurrentFilter();

        matches.forEach(match => {
            match.hidden = !isMatchVisible(match, currentFilter, filterValues);
        });

        if (updateSectionVisibility(section, navLinks)) {
            hasAnyVisibleMatch = true;
        }
    });

    noResults.hidden = hasAnyVisibleMatch;
    document.querySelector('.timeline').classList.toggle('has-results', hasAnyVisibleMatch);
}

function createUpdateRoundHighlight() {
    return function updateRoundHighlight() {
        const allMatches = document.querySelectorAll('.match-card');
        const roundItems = document.querySelectorAll('.round-item');
        const headerHeight = 80;
        let currentMatch = null;

        allMatches.forEach(match => {
            if (isInViewport(match, headerHeight + 100)) {
                currentMatch = match;
            }
        });

        if (!currentMatch) {
            let minDistance = Infinity;
            allMatches.forEach(match => {
                const distance = Math.abs(match.getBoundingClientRect().top - headerHeight);
                if (distance < minDistance) {
                    minDistance = distance;
                    currentMatch = match;
                }
            });
        }

        if (currentMatch) {
            const currentTitle = currentMatch.querySelector('.match-title').textContent;
            roundItems.forEach(item => {
                item.classList.toggle('active', item.dataset.matchTitle === currentTitle);
            });
        }
    };
}

function bindNavSearch(searchDiv) {
    bindSearchInput(searchDiv, (searchInput, searchInfo) => {
        let currentMatches = [];
        let currentMatchIndex = -1;

        function updateSearchInfo() {
            if (currentMatches.length > 0) {
                searchInfo.textContent = `${currentMatchIndex + 1}/${currentMatches.length}`;
                searchInfo.hidden = false;
            } else {
                searchInfo.hidden = true;
            }
        }

        function scrollToMatch(index) {
            if (index >= 0 && index < currentMatches.length) {
                currentMatchIndex = index;
                scrollToElement(currentMatches[currentMatchIndex], 120);
                updateSearchInfo();
            }
        }

        searchInput.addEventListener('input', event => {
            const searchText = event.target.value.toLowerCase();
            const allMatches = document.querySelectorAll('.match-card');

            if (!searchText) {
                allMatches.forEach(match => match.classList.remove('is-search-highlighted'));
                currentMatches = [];
                currentMatchIndex = -1;
                searchInfo.hidden = true;
                return;
            }

            currentMatches = [];
            allMatches.forEach(match => {
                if (match.closest('.timeline-item').hidden) {
                    match.classList.remove('is-search-highlighted');
                    return;
                }

                const isMatch = match.querySelector('.match-title').textContent.toLowerCase().includes(searchText);
                match.classList.toggle('is-search-highlighted', isMatch);
                if (isMatch) {
                    currentMatches.push(match);
                }
            });

            if (currentMatches.length === 0) {
                searchInfo.textContent = '在当前筛选结果中未找到匹配项';
                searchInfo.hidden = false;
                searchInfo.classList.add('no-match');
            } else {
                updateSearchInfo();
                searchInfo.classList.remove('no-match');
                currentMatchIndex = 0;
                scrollToMatch(0);
            }
        });

        searchInput.addEventListener('keydown', event => {
            if (event.key === 'Enter' && currentMatches.length > 0) {
                event.preventDefault();
                scrollToMatch((currentMatchIndex + 1) % currentMatches.length);
            }
        });
    });
}

export function createScheduleNavController(data) {
    const { nav, searchDiv, filterGroup, navList } = createElevatorNavSkeleton();
    let currentFilter = 'all';
    let runFilters = () => {};
    const controls = createFilterControls(filterGroup, () => runFilters());
    runFilters = () => applyFilters(() => currentFilter, controls);

    setScheduleFiltersEnabled(isScheduleFiltersEnabled(), getScheduleFilterControls());

    filterGroup.addEventListener('click', event => {
        if (!isScheduleFiltersEnabled() || !event.target.classList.contains('filter-btn')) {
            return;
        }

        filterGroup.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        currentFilter = event.target.dataset.filter;
        runFilters();
    });

    bindNavSearch(searchDiv);

    Object.entries(data.phases).forEach(([phaseId, phase]) => {
        const now = new Date();
        const matches = phase.matches || [];
        const phaseStatus = getPhaseStatus(matches, now);
        const li = createNavItemSkeleton(phaseId, phase.title, getPhaseStatusText(phaseStatus), phaseStatus);
        const link = li.querySelector('.nav-link');
        const roundDropdown = li.querySelector('.round-dropdown');

        phase.matches.forEach((match, index) => {
            const roundStatus = getRoundStatus(match, now);
            const roundStatusClass = getRoundStatusClass(roundStatus);
            const roundItem = createRoundItem(match, index, roundStatusClass, roundStatus, event => {
                event.stopPropagation();
                document.querySelectorAll('.round-item').forEach(item => item.classList.remove('active'));
                roundItem.classList.add('active');
                const matchElement = Array.from(document.querySelectorAll('.match-card')).find(card =>
                    card.querySelector('.match-title').textContent === roundItem.dataset.matchTitle
                );
                scrollToElement(matchElement, 120);
            });
            roundDropdown.appendChild(roundItem);
        });

        link.addEventListener('click', event => {
            event.preventDefault();
            const targetSection = document.getElementById(link.getAttribute('href').slice(1));
            if (targetSection) {
                smoothScrollTo(getOffsetTop(targetSection) - 80);
                history.pushState(null, '', link.getAttribute('href'));
            }
        });

        li.querySelector('.nav-arrow').addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            link.classList.toggle('expanded');
        });

        navList.appendChild(li);
    });

    const currentMatch = getCurrentMatchData(data);
    if (currentMatch) {
        appendCurrentMatch(nav, {
            label: getCurrentMatchLabel(currentMatch),
            name: `${currentMatch.title}${currentMatch.dateRange.isRescheduled ? ' (重赛)' : ''}`
        }, () => {
            const matchElement = Array.from(document.querySelectorAll('.match-card')).find(card =>
                card.querySelector('.match-title').textContent === currentMatch.title
            );
            scrollToElement(matchElement, 120);
        });
    }

    mountElevatorNav(nav);
    bindElevatorScroll(createUpdateRoundHighlight());
}
