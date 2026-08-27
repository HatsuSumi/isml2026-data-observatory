import { CHINESE_ROUND_NUMBERS, NAVIGATION_GROUPS, PHASE_NAME_TARGETS, templates } from './events-data-config.js';

export function getPhaseTargetId(phaseName) {
    return PHASE_NAME_TARGETS[phaseName] ?? null;
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
    nav.querySelectorAll('.elevator-nav-item[data-target]').forEach(item => {
        item.hidden = !document.querySelector(`[data-phase="${item.dataset.target}"]`);
    });
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
        const targetElement = document.querySelector(`[data-phase="${targetId}"]`);
        if (!targetElement) return;
        event.preventDefault();
        scrollTo(getDocumentTop(targetElement) - 80);
        history.pushState(null, '', `./pages/events-data/events-data.html#${targetId}`);
        onNavigate(targetId);
    });
}

function toChineseNumber(num) {
    return ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][num];
}
