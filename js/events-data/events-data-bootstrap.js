import { smoothScrollTo } from '../common/dom.js';
import { RETURN_FROM_KEY, SCROLL_POSITION_KEY, templates } from './events-data-config.js';
import { findNextEventStartTime, getCurrentPhase } from './events-data-status.js';
import {
    bindNavigationEvents,
    createElevatorNavigation,
    initializeNavigationState,
    syncNavigationTargets,
    updateNavActiveState
} from './events-data-navigation.js';
import { createMonthSection } from './events-data-sections.js';
import { getDocumentTop, restoreSavedPosition, scrollToHash, setupScrollTracking } from './events-data-scroll.js';

async function loadEventsData() {
    const response = await fetch('data/config/events-data.json');
    if (!response.ok) throw new Error(`赛事数据加载失败: ${response.status}`);
    const data = await response.json();
    return {
        data: data.events,
        rankingData: data.rankings,
        charactersData: data.characters
    };
}

function renderEventsPage(data, rankingData, charactersData) {
    const container = document.querySelector('.container');
    const pageContent = templates.eventsPage.content.cloneNode(true).firstElementChild;
    container.replaceChildren(pageContent);
    const eventsContainer = container.querySelector('.events-container');
    const nextEventStartTime = findNextEventStartTime(data);
    const monthFragment = document.createDocumentFragment();

    for (const month of Object.values(data.months)) {
        monthFragment.appendChild(createMonthSection(
            templates, month, nextEventStartTime, rankingData, charactersData
        ));
    }
    eventsContainer.appendChild(monthFragment);
    return container;
}

function initializePagePosition(nav) {
    const hash = window.location.hash.slice(1);
    const updateActiveState = activeId => updateNavActiveState(nav, activeId);
    setupScrollTracking(updateActiveState);
    restoreSavedPosition();
    scrollToHash(hash, updateActiveState);
}

export async function initializeEventsPage() {
    try {
        const { data, rankingData, charactersData } = await loadEventsData();
        const nav = createElevatorNavigation();
        initializeNavigationState(nav, getCurrentPhase(data));
        renderEventsPage(data, rankingData, charactersData);
        document.body.appendChild(nav);
        syncNavigationTargets(nav);
        bindNavigationEvents(nav, {
            getDocumentTop,
            scrollTo: smoothScrollTo,
            onNavigate: targetId => updateNavActiveState(nav, targetId)
        });
        initializePagePosition(nav);
    } catch (error) {
        console.error('Error:', error);
    }
}
