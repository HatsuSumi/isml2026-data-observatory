import { loadEventsConfig } from './data-loader.js';

function extractPageId(url = '') {
    if (!url || !url.includes('?')) return '';
    return new URLSearchParams(url.split('?')[1] || '').get('id') || '';
}

function getNavigationPhase(phase = '') {
    const value = String(phase);
    if (value.includes('提名')) return 'nomination';
    if (value.includes('预选')) return 'preliminary';
    if (value.includes('第一阶段')) return 'phase-1';
    if (value.includes('第二阶段')) return 'phase-2';
    if (value.includes('第三阶段')) return 'phase-3';
    if (value.includes('第四阶段')) return 'phase-4';
    if (value.includes('淘汰')) return 'knockout';
    return value;
}

function collectMatches(eventsData) {
    const events = eventsData?.events || eventsData;
    const matches = [];
    Object.values(events?.months || {}).forEach((month) => {
        (month.events || []).forEach((event) => {
            (event.matches || []).forEach((match) => matches.push(match));
        });
    });
    return matches;
}

function collectEventLinks(eventsData) {
    return collectMatches(eventsData).flatMap((match) => {
        const visualizationId = extractPageId(match.links?.visualization);
        const tableId = extractPageId(match.links?.table);
        const baseId = visualizationId || tableId;
        if (!baseId) return [];
        const phase = getNavigationPhase(match.phase);
        const name = match.title || baseId;
        const links = [];
        if (visualizationId && match.links.visualization) {
            links.push({
                name,
                phase,
                pageType: 'visualization',
                url: match.links.visualization,
                baseId
            });
        }
        if (tableId && match.links.table) {
            links.push({
                name,
                phase,
                pageType: 'table',
                url: match.links.table,
                baseId
            });
        }
        return links;
    });
}

function getCurrentContext() {
    const params = new URLSearchParams(window.location.search);
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop().replace('.html', '');
    const currentId = params.get('id');

    if (currentPage === 'visualization' && currentId) {
        return {
            pageType: 'visualization',
            currentId,
            currentFrom: params.get('from')
        };
    }

    if ((currentPage === 'nomination-table' || currentPage === 'preliminaries-table') && currentId) {
        return {
            pageType: 'table',
            currentId,
            currentFrom: params.get('from')
        };
    }

    return {
        pageType: currentPage.includes('-table') ? 'table' : 'visualization',
        currentId,
        currentFrom: params.get('from')
    };
}

function getTargetUrl(link, currentFrom) {
    const separator = link.url.includes('?') ? '&' : '?';
    return currentFrom ? `${link.url}${separator}from=${encodeURIComponent(currentFrom)}` : link.url;
}

async function generateDropdownMenu() {
    const { pageType, currentId, currentFrom } = getCurrentContext();
    if (!currentId) return;

    const eventsData = await loadEventsConfig();
    const eventLinks = collectEventLinks(eventsData);
    const currentLink = eventLinks.find((link) => link.pageType === pageType && link.baseId === currentId);
    if (!currentLink?.phase) return;

    const siblings = eventLinks.filter((link) => (
        link.phase === currentLink.phase
        && link.pageType === pageType
        && link.baseId !== currentLink.baseId
    ));
    if (!siblings.length) return;

    const dropdown = document.createElement('div');
    dropdown.className = 'events-dropdown';

    const button = document.createElement('button');
    button.className = 'other-events-btn';
    button.textContent = '同阶段其他赛事';
    dropdown.appendChild(button);

    const content = document.createElement('div');
    content.className = 'events-dropdown-content';
    siblings.forEach((link) => {
        const anchor = document.createElement('a');
        anchor.href = getTargetUrl(link, currentFrom);
        anchor.textContent = link.name;
        content.appendChild(anchor);
    });
    dropdown.appendChild(content);

    if (pageType === 'table') {
        document.querySelector('.dropdown')?.after(dropdown);
        return;
    }

    document.querySelector('.size-controls')?.after(dropdown);
}

document.addEventListener('DOMContentLoaded', () => {
    generateDropdownMenu().catch((error) => {
        console.error('同阶段赛事菜单生成失败:', error);
    });
});
