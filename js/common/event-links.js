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
            isTablePage: false,
            pageKey: currentId,
            currentFrom: params.get('from')
        };
    }

    if (currentPage === 'nomination-table' && currentId) {
        return {
            isTablePage: true,
            pageKey: `${currentId}-table`,
            currentFrom: params.get('from')
        };
    }

    return {
        isTablePage: currentPage.includes('-table'),
        pageKey: currentPage,
        currentFrom: params.get('from')
    };
}

function getTargetUrl(id, isTablePage, currentFrom) {
    if (isTablePage) {
        const params = new URLSearchParams({ id });
        if (currentFrom) {
            params.set('from', currentFrom);
        }
        return `pages/tables/nomination-table.html?${params.toString()}`;
    }

    const params = new URLSearchParams({ id });
    if (currentFrom) {
        params.set('from', currentFrom);
    }
    return `pages/visualization/visualization.html?${params.toString()}`;
}

async function generateDropdownMenu() {
    const { isTablePage, pageKey, currentFrom } = getCurrentContext();
    const currentPhase = EVENT_LINKS[pageKey]?.phase;

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

    const linkPromises = Object.entries(EVENT_LINKS)
        .filter(([id, info]) => {
            const isTargetTable = id.includes('-table');
            return id !== pageKey && info.phase === currentPhase && isTargetTable === isTablePage;
        })
        .map(async ([id, info]) => {
            const targetId = id.replace('-table', '');
            const pageUrl = getTargetUrl(targetId, isTablePage, currentFrom);
            const exists = await checkPageExists(pageUrl);
            return { info, exists, pageUrl };
        });

    const results = await Promise.all(linkPromises);

    results.forEach(({ info, exists, pageUrl }) => {
        if (!exists) {
            return;
        }
        const link = document.createElement('a');
        link.href = pageUrl;
        link.textContent = info.name;
        content.appendChild(link);
    });

    if (!content.children.length) {
        return;
    }

    dropdown.appendChild(content);

    if (isTablePage) {
        document.querySelector('.dropdown')?.after(dropdown);
        return;
    }

    document.querySelector('.size-controls')?.after(dropdown);
}

document.addEventListener('DOMContentLoaded', generateDropdownMenu);
