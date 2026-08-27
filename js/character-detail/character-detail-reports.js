const LINK_CONFIGS = [
    { key: 'visualization', icon: 'chart-line', text: '数据可视化' },
    { key: 'table', icon: 'table', text: '详细表格' },
    { key: 'groups', icon: 'users', text: '角色分组' },
    { key: 'rules', icon: 'book', text: '赛事规则' }
];

const EXCLUDED_RANK_FIELDS = new Set(['弃票数', '弃票率']);

function getRankStyle(rank) {
    switch (parseInt(rank, 10)) {
        case 1: return 'rank-first';
        case 2: return 'rank-second';
        case 3: return 'rank-third';
        default: return '';
    }
}

function extractRank(value) {
    if (typeof value !== 'string') return null;
    return value.match(/（全场排名第\s*(\d+)）/)?.[1] || null;
}

function appendRecordLinks(record, links, templates) {
    const linksDropdown = record.querySelector('.links-dropdown');
    const linksSection = record.querySelector('.record-links');
    if (!links.length) {
        linksSection.hidden = true;
        return;
    }

    const fragment = document.createDocumentFragment();
    links.forEach(link => {
        const linkNode = templates.recordLink.content.cloneNode(true).querySelector('a');
        linkNode.href = link.url;
        linkNode.querySelector('i').classList.add(`fa-${link.icon}`);
        linkNode.querySelector('.link-text').textContent = link.text;
        fragment.appendChild(linkNode);
    });
    linksDropdown.appendChild(fragment);
}

function buildLinks(roundConfig, rulesData) {
    return LINK_CONFIGS
        .filter(config => {
            const value = roundConfig?.[config.key];
            return config.key === 'rules' ? value && rulesData[value] : Boolean(value);
        })
        .map(config => {
            let url = roundConfig[config.key];
            if (config.key === 'rules') {
                url = `pages/rules/rules.html?id=${url}&from=characters-data`;
            } else if (config.key === 'groups') {
                url = `pages/groups/groups.html?id=${url}&from=characters-data`;
            }
            if (!url.includes('from=characters-data')) {
                url += url.includes('?') ? '&from=characters-data' : '?from=characters-data';
            }
            return { ...config, url };
        });
}

function bindLinksHover(record, templates) {
    const linksBtn = record.querySelector('.links-btn');
    const linksDropdown = record.querySelector('.links-dropdown');
    const recordLinks = record.querySelector('.record-links');
    if (!linksBtn || !linksDropdown || !recordLinks) return;

    let isHovering = false;
    let hoverTimeout;
    const showDropdown = () => linksDropdown.classList.add('is-open');
    const hideDropdown = () => linksDropdown.classList.remove('is-open');
    const handleMouseEnter = () => {
        isHovering = true;
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(showDropdown, 50);
    };
    const handleMouseLeave = () => {
        isHovering = false;
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            if (!isHovering) hideDropdown();
        }, 100);
    };

    const hoverArea = templates.hoverArea.content.cloneNode(true)
        .querySelector('.record-links-hover-area');
    recordLinks.appendChild(hoverArea);
    [linksBtn, linksDropdown, hoverArea].forEach(element => {
        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);
    });
}

function createBattleRecord(round, context) {
    const { templates, stageContext } = context;
    const record = templates.battleRecord.content.cloneNode(true).querySelector('.battle-record');
    const content = record.querySelector('.record-content');
    try {
        const handler = context.stageHandlerFactory(round, stageContext);
        const { roundConfig, stageConfig } = handler.config;
        const fields = handler.getFields(round);
        const rows = document.createDocumentFragment();
        Object.entries(fields)
            .filter(([, value]) => value !== null && value !== undefined && value !== '')
            .forEach(([label, value]) => {
                const row = templates.dataRow.content.cloneNode(true).querySelector('.data-row');
                const rank = !EXCLUDED_RANK_FIELDS.has(label) ? extractRank(value) : null;
                const rankStyle = rank ? getRankStyle(rank) : '';
                row.querySelector('.data-label').className = rankStyle ? `data-label ${rankStyle}` : 'data-label';
                row.querySelector('.data-label').textContent = label;
                row.querySelector('.data-value').className = rankStyle ? `data-value ${rankStyle}` : 'data-value';
                row.querySelector('.data-value').textContent = value;
                rows.appendChild(row);
            });
        content.appendChild(rows);
        appendRecordLinks(record, buildLinks(roundConfig, context.rulesData), templates);
        bindLinksHover(record, templates);
        return record;
    } catch (error) {
        console.error('处理赛事数据失败:', error);
        return record;
    }
}

function createEventReport(round, context) {
    const report = context.templates.eventReport.content.cloneNode(true).querySelector('.event-report');
    report.id = `round-${round.round}`;
    const titleBar = report.querySelector('.event-title');
    const collapseIcon = document.createElement('i');
    collapseIcon.className = 'fas fa-chevron-down collapse-icon';
    const titleText = document.createElement('span');
    titleText.textContent = round.round;
    titleBar.replaceChildren(collapseIcon, titleText);

    const battleList = report.querySelector('.battle-list');
    if (Object.keys(round).length === 1 && round.round) {
        battleList.appendChild(context.templates.noContent.content.cloneNode(true));
    } else {
        battleList.appendChild(createBattleRecord(round, context));
    }

    titleBar.addEventListener('click', () => {
        const isCollapsed = battleList.classList.contains('collapsed');
        battleList.classList.toggle('collapsed');
        collapseIcon.className = `fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-right'} collapse-icon`;
        titleBar.classList.toggle('collapsed');
        setTimeout(() => {
            context.onScroll();
            if (!isCollapsed) {
                const targetRect = report.getBoundingClientRect();
                const containerRect = context.reports.getBoundingClientRect();
                const targetTop = context.reports.scrollTop + targetRect.top - containerRect.top;
                context.onSmoothScroll(targetTop);
            }
        }, 300);
    });
    return report;
}

export function renderEventReports(eventData, context) {
    if (!Array.isArray(eventData)) {
        console.error('事件数据无效:', eventData);
        return;
    }
    const fragment = document.createDocumentFragment();
    eventData.forEach(round => fragment.appendChild(createEventReport(round, context)));
    context.reports.replaceChildren(fragment);
}

export function renderEventNavigation(eventData, context) {
    const fragment = document.createDocumentFragment();
    eventData.forEach(round => {
        const item = context.templates.navItem.content.cloneNode(true).querySelector('.nav-item');
        const link = item.querySelector('a');
        link.href = 'javascript:void(0)';
        link.dataset.target = `round-${round.round}`;
        link.textContent = round.round.split('（')[0];
        fragment.appendChild(item);
    });
    context.nav.replaceChildren(fragment);
    context.nav.firstElementChild?.classList.add('active');
}
