import { EVENT_LINKS } from '../aliases/aliases.js';

async function checkPageExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

async function generateDropdownMenu() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop().replace('.html', '');
    const visualizationId = new URLSearchParams(window.location.search).get('id');
    const pageKey = currentPage === 'visualization' && visualizationId ? visualizationId : currentPage;
    const currentPhase = EVENT_LINKS[pageKey]?.phase;

    if (!currentPhase) {
        return;
    }

    const isTablePage = currentPage.includes('-table');
    const currentFrom = new URLSearchParams(window.location.search).get('from');

    const getTargetUrl = (id) => {
        if (isTablePage) {
            return `pages/tables/${id}-table.html${currentFrom ? `?from=${currentFrom}` : ''}`;
        }

        const params = new URLSearchParams({ id });
        if (currentFrom) {
            params.set('from', currentFrom);
        }
        return `pages/visualization/visualization.html?${params.toString()}`;
    };

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
            const pageUrl = getTargetUrl(id.replace('-table', ''));
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
        document.querySelector('.visualization-btn')?.after(dropdown);
        return;
    }

    document.querySelector('.size-controls')?.after(dropdown);
}

document.addEventListener('DOMContentLoaded', generateDropdownMenu);
