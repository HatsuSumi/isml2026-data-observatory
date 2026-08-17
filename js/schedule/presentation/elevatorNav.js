import { cloneScheduleTemplate } from '../utils/template.js';
import { getOffsetTop, isInViewport, smoothScrollTo } from '../utils/dom.js';
import { isScheduleFiltersEnabled, setScheduleFilterControls } from '../state/scheduleState.js';
import { createCustomSelect } from './customSelect.js';

export function setScheduleFiltersEnabled(enabled, controls) {
    if (!controls) {
        return;
    }

    const { filterGroup, startDayFilter, endDayFilter } = controls;
    filterGroup.classList.toggle('disabled', !enabled);

    filterGroup.querySelectorAll('.filter-btn').forEach(button => {
        button.disabled = !enabled;
        button.tabIndex = enabled ? 0 : -1;
    });

    [startDayFilter, endDayFilter].forEach(control => {
        control.setDisabled(!enabled);
    });
}

function updateNavHighlight() {
    const sections = document.querySelectorAll('.timeline-section');
    const navLinks = document.querySelectorAll('.elevator-nav a');
    const headerHeight = 80;

    let currentSection = null;
    sections.forEach(section => {
        if (isInViewport(section, headerHeight + 100)) {
            currentSection = section;
        }
    });

    if (!currentSection) {
        let minDistance = Infinity;
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const distance = Math.abs(rect.top - headerHeight);
            if (distance < minDistance) {
                minDistance = distance;
                currentSection = section;
            }
        });
    }

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (currentSection && link.getAttribute('href') === `#${currentSection.id}`) {
            link.classList.add('active');
        }
    });
}

export function createElevatorNavSkeleton() {
    const nav = cloneScheduleTemplate('schedule-elevator-nav-template', '.elevator-nav');
    return {
        nav,
        searchDiv: nav.querySelector('.elevator-search'),
        filterGroup: nav.querySelector('.filter-group'),
        navList: nav.querySelector('.elevator-nav-list')
    };
}

export function createFilterControls(filterGroup, onApplyFilters) {
    const filterOptions = [
        { value: '', label: '任意' },
        { value: '0', label: '周日' },
        { value: '1', label: '周一' },
        { value: '2', label: '周二' },
        { value: '3', label: '周三' },
        { value: '4', label: '周四' },
        { value: '5', label: '周五' },
        { value: '6', label: '周六' }
    ];

    const startDayFilter = createCustomSelect({
        id: 'start-day-filter',
        placeholder: '开始日期（任意）',
        options: filterOptions.map(option => ({
            ...option,
            label: option.value === '' ? '开始日期（任意）' : option.label
        })),
        onChange: onApplyFilters
    });

    const endDayFilter = createCustomSelect({
        id: 'end-day-filter',
        placeholder: '结束日期（任意）',
        options: filterOptions.map(option => ({
            ...option,
            label: option.value === '' ? '结束日期（任意）' : option.label
        })),
        onChange: onApplyFilters
    });

    filterGroup.querySelector('[data-filter-slot="start"]').appendChild(startDayFilter.element);
    filterGroup.querySelector('[data-filter-slot="end"]').appendChild(endDayFilter.element);

    const controls = { filterGroup, startDayFilter, endDayFilter };
    setScheduleFilterControls(controls);
    return controls;
}

export function bindSearchInput(searchDiv, handlers) {
    const searchInput = searchDiv.querySelector('input');
    const searchInfo = searchDiv.querySelector('.search-info');
    return handlers(searchInput, searchInfo);
}

export function createRoundItem(match, index, statusClass, status, onClick) {
    const roundItem = cloneScheduleTemplate('schedule-round-item-template', '.round-item');
    roundItem.dataset.matchTitle = match.title;
    roundItem.style.setProperty('--round-delay', `${0.05 * (index + 1)}s`);
    roundItem.querySelector('.round-title').textContent = `${match.title.split(' ').pop()}${match.dateRange.isRescheduled ? ' (重赛)' : ''}`;
    const roundStatus = roundItem.querySelector('.round-status');
    roundStatus.classList.add(statusClass);
    roundStatus.textContent = status;
    roundItem.addEventListener('click', onClick);
    return roundItem;
}

export function createNavItemSkeleton(phaseId, phaseTitleText, phaseStatusText, phaseStatusClass) {
    const li = cloneScheduleTemplate('schedule-nav-item-template', 'li');
    const link = li.querySelector('.nav-link');
    link.href = `#${phaseId}`;
    link.classList.add(phaseStatusClass);
    li.querySelector('.phase-title').textContent = phaseTitleText;
    li.querySelector('.phase-status').textContent = phaseStatusText;
    return li;
}

export function appendCurrentMatch(nav, currentMatch, onMatchClick) {
    const currentMatchDiv = cloneScheduleTemplate('schedule-current-match-template', '.current-match-info');
    const infoLabel = currentMatchDiv.querySelector('.info-label');
    const matchName = currentMatchDiv.querySelector('.match-name');

    infoLabel.textContent = currentMatch.label;
    matchName.textContent = currentMatch.name;
    matchName.addEventListener('click', onMatchClick);
    nav.appendChild(currentMatchDiv);
}

export function mountElevatorNav(nav) {
    document.body.appendChild(nav);
}

export function bindElevatorScroll(updateRoundHighlight) {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(() => {
            updateNavHighlight();
            updateRoundHighlight();
        }, 100);
    });

    updateNavHighlight();
    updateRoundHighlight();
}

export function scrollToElement(targetElement, offset) {
    if (!targetElement) return;
    const targetPosition = getOffsetTop(targetElement) - offset;
    smoothScrollTo(targetPosition);
}

export function canUseFilters() {
    return isScheduleFiltersEnabled();
}
