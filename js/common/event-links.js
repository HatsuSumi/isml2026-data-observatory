import { EVENT_LINKS } from '../aliases/aliases.js';

async function checkPageExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

function getCurrentContext() {
    const params = new URLSearchParams(window.location.search);
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop().replace('.html', '');
    const currentId = params.get('id');

    if (currentPage === 'visualization' && currentId) {
        return {
            pageType: 'visualization',
            pageKey: currentId,
            currentFrom: params.get('from')
        };
    }

    if ((currentPage === 'nomination-table' || currentPage === 'preliminaries-table') && currentId) {
        return {
            pageType: 'table',
            pageKey: `${currentId}-table`,
            currentFrom: params.get('from')
        };
    }

    return {
        pageType: currentPage.includes('-table') ? 'table' : 'visualization',
        pageKey: currentId || currentPage,
        currentFrom: params.get('from')
    };
}

function getTargetUrl(link, currentFrom) {
    const separator = link.url.includes('?') ? '&' : '?';
    return currentFrom ? `${link.url}${separator}from=${encodeURIComponent(currentFrom)}` : link.url;
}

async function generateDropdownMenu() {
    const { pageType, pageKey, currentFrom } = getCurrentContext();
    const currentLink = EVENT_LINKS[pageKey];
    const currentPhase = currentLink?.phase;

    if (!currentPhase) {
        return;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'events-dropdown';

    const button = document.createElement('button');
    button.className = 'other-events-btn';
    button.textContent = '同阶段其他赛事';
    dropdown.appendChild(button);

    const content = document.createElement('div');
    content.className = 'events-dropdown-content';

    const linkPromises = Object.values(EVENT_LINKS)
        .filter((link) => link.phase === currentPhase && link.pageType === pageType && link.baseId !== currentLink.baseId)
        .map(async (link) => {
            const pageUrl = getTargetUrl(link, currentFrom);
            const exists = await checkPageExists(pageUrl);
            return { link, exists, pageUrl };
        });

    const results = await Promise.all(linkPromises);

    results.forEach(({ link, exists, pageUrl }) => {
        if (!exists) {
            return;
        }
        const anchor = document.createElement('a');
        anchor.href = pageUrl;
        anchor.textContent = link.name;
        content.appendChild(anchor);
    });

    if (!content.children.length) {
        return;
    }

    dropdown.appendChild(content);

    if (pageType === 'table') {
        document.querySelector('.dropdown')?.after(dropdown);
        return;
    }

    document.querySelector('.size-controls')?.after(dropdown);
}

document.addEventListener('DOMContentLoaded', generateDropdownMenu);
