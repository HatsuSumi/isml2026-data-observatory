import { CHINESE_ROUND_NUMBERS, NAVIGATION_GROUPS, PHASE_NAME_TARGETS, templates } from './events-data-config.js';

export function getPhaseTargetId(phaseName) {
    if (PHASE_NAME_TARGETS[phaseName]) return PHASE_NAME_TARGETS[phaseName];
    if (phaseName.startsWith('预选赛')) return 'preliminary';
    throw new Error(`未定义的赛事阶段：${phaseName}`);
}

export function getRoundNumber(title) {
    const round = title.match(/第([一二三四五六七八九])轮/)?.[1];
    return round ? CHINESE_ROUND_NUMBERS[round] : null;
}

export function getMatchTargetId(match) {
    if (match.title.includes('恒星组提名')) return 'stellar-nomination';
    if (match.title.includes('新星组') && match.title.includes('提名')) return 'nova-nomination';
    const phaseTarget = getPhaseTargetId(match.phase);
    const round = getRoundNumber(match.title);
    return phaseTarget && round ? `${phaseTarget}-${round}` : '';
}

export function createElevatorNavigation() {
    const navigation = templates.elevatorNav.content.cloneNode(true).firstElementChild;
    const list = navigation.querySelector('.elevator-nav-list');

    NAVIGATION_GROUPS.forEach(groupConfig => {
        const group = templates.elevatorNavGroup.content.cloneNode(true).firstElementChild;
        const mainItem = group.querySelector('.elevator-nav-item');
        mainItem.dataset.target = groupConfig.target;
        group.querySelector('.nav-label').textContent = groupConfig.label;
        group.querySelector('.collapse-toggle').setAttribute('aria-label', `展开或折叠${groupConfig.label}`);
        const items = groupConfig.items || Array.from({ length: groupConfig.rounds }, (_, index) => ({
            target: `${groupConfig.roundPrefix}${index + 1}`,
            label: `${groupConfig.roundLabel}${toChineseNumber(index + 1)}轮`
        }));
        const subItems = group.querySelector('.nav-sub-items');
        items.forEach(itemConfig => {
            const item = document.createElement('div');
            item.className = 'elevator-nav-item sub-item';
            item.dataset.target = itemConfig.target;
            item.textContent = itemConfig.label;
            subItems.appendChild(item);
        });
        list.appendChild(group);
    });
    return navigation;
}

export function syncNavigationTargets(nav) {
    const navigationItems = nav.querySelectorAll('.elevator-nav-item[data-target]');
    navigationItems.forEach(item => {
        item.hidden = !getNavigationTarget(item.dataset.target);
    });
    const visibleItems = [...navigationItems].filter(item => !item.hidden);
    if (!visibleItems.length) {
        throw new Error('赛事数据页未生成任何有效导航目标');
    }
}

export function validateRenderedTargets(data) {
    const expectedTargets = new Set();
    for (const month of Object.values(data.months || {})) {
        for (const event of month.events || []) {
            for (const match of event.matches || []) {
                const targetId = getMatchTargetId(match);
                if (targetId) expectedTargets.add(targetId);
                const phaseTargetId = getPhaseTargetId(match.phase);
                if (phaseTargetId === 'preliminary') expectedTargets.add('preliminary');
            }
        }
    }
    const missingTargets = [...expectedTargets].filter(targetId => !getNavigationTarget(targetId));
    if (missingTargets.length) {
        throw new Error(`赛事数据页缺少导航目标：${missingTargets.join('、')}`);
    }
}

function getNavigationTarget(targetId) {
    return document.querySelector(`[data-phase="${targetId}"], [data-stage="${targetId}"]`);
}

export function updateNavActiveState(nav, activeId) {
    nav.querySelectorAll('.elevator-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.target === activeId);
    });
}

export function initializeNavigationState(nav, currentPhase) {
    nav.querySelectorAll('.elevator-nav-group').forEach(group => {
        const phase = group.querySelector('.elevator-nav-item').textContent.trim();
        group.classList.add('collapsed');
        const icon = group.querySelector('.collapse-icon');
        icon?.classList.remove('fa-chevron-down');
        icon?.classList.add('fa-chevron-right');
        if (currentPhase && phase.includes(currentPhase)) {
            group.classList.remove('collapsed');
            icon?.classList.remove('fa-chevron-right');
            icon?.classList.add('fa-chevron-down');
        }
    });
}

export function bindNavigationEvents(nav, { getDocumentTop, scrollTo, onNavigate }) {
    nav.addEventListener('click', event => {
        const toggle = event.target.closest('.collapse-toggle');
        if (toggle && nav.contains(toggle)) {
            event.preventDefault();
            event.stopPropagation();
            const group = toggle.closest('.elevator-nav-group');
            const icon = toggle.querySelector('.collapse-icon');
            group.classList.toggle('collapsed');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-right');
            nav.querySelectorAll('.elevator-nav-group').forEach(otherGroup => {
                if (otherGroup !== group && !otherGroup.classList.contains('collapsed')) {
                    otherGroup.classList.add('collapsed');
                    const otherIcon = otherGroup.querySelector('.collapse-icon');
                    otherIcon?.classList.remove('fa-chevron-down');
                    otherIcon?.classList.add('fa-chevron-right');
                }
            });
            return;
        }

        const item = event.target.closest('.elevator-nav-item');
        if (!item || !nav.contains(item)) return;
        const targetId = item.dataset.target;
        const targetElement = getNavigationTarget(targetId);
    if (!targetElement) {
            throw new Error(`导航目标不存在：${targetId}`);
        }
        event.preventDefault();
        const group = item.closest('.elevator-nav-group');
        if (group?.classList.contains('collapsed')) {
            group.classList.remove('collapsed');
            const icon = group.querySelector('.collapse-icon');
            icon?.classList.remove('fa-chevron-right');
            icon?.classList.add('fa-chevron-down');
        }
        scrollTo(getDocumentTop(targetElement) - 80);
        history.pushState(null, '', `./pages/events-data/events-data.html#${targetId}`);
        onNavigate(targetId);
    });
}

function toChineseNumber(num) {
    return ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][num];
}
