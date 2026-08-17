import { cloneScheduleTemplate } from '../utils/template.js';
import { getMatchStatus, getNextMatch, getWeekday } from '../utils/match.js';

function cloneInlineText(className, text) {
    const node = cloneScheduleTemplate('schedule-inline-text-template', 'span');
    node.className = className;
    node.textContent = text;
    return node;
}

function cloneParagraph() {
    return cloneScheduleTemplate('schedule-paragraph-template', 'p');
}

function cloneLineBreak() {
    return cloneScheduleTemplate('schedule-line-break-template', 'br');
}

function cloneVotingFormatWrapper(format) {
    const wrapper = cloneScheduleTemplate('schedule-voting-format-wrapper-template', '.voting-format-wrapper');
    wrapper.querySelector('.key').textContent = '投票制度';
    const menu = wrapper.querySelector('.voting-format-menu');

    if (typeof format === 'string') {
        format.split('\n').forEach(line => {
            const item = cloneScheduleTemplate('schedule-format-item-template', '.format-item');
            item.textContent = line;
            menu.appendChild(item);
        });
    } else {
        Object.entries(format).forEach(([group, rule]) => {
            const item = cloneScheduleTemplate('schedule-format-item-template', '.format-item');
            item.textContent = `${group}：${rule}`;
            menu.appendChild(item);
        });
    }

    return wrapper;
}

function buildDateContent(match) {
    const fragment = document.createDocumentFragment();

    if (match.title === '恒星组提名') {
        fragment.appendChild(cloneInlineText('', '2024-12-31 20:00:00 (周二) - 2025-01-07 19:59:59 (周二)'));
    } else {
        const startDate = match.dateRange.isRescheduled && match.dateRange.Restart
            ? new Date(match.dateRange.Restart)
            : new Date(match.dateRange.start);
        const endDate = match.dateRange.isRescheduled && match.dateRange.Reend
            ? new Date(match.dateRange.Reend)
            : new Date(match.dateRange.end);
        const startStr = match.dateRange.isRescheduled && match.dateRange.Restart
            ? match.dateRange.Restart
            : match.dateRange.start;
        const endStr = match.dateRange.isRescheduled && match.dateRange.Reend
            ? match.dateRange.Reend
            : match.dateRange.end;
        const endParts = endStr.split(' ')[0].split('-');
        const isCrossMonth = endDate.getMonth() !== startDate.getMonth()
            || endDate.getFullYear() !== startDate.getFullYear();
        const normalizedEndDate = endParts.length === 3
            ? endStr
            : isCrossMonth
                ? `${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endParts[0].padStart(2, '0')} ${endStr.split(' ')[1]}`
                : `${endParts[0].padStart(2, '0')} ${endStr.split(' ')[1]}`;
        const originalDateText = `${startStr} (${getWeekday(startDate)}) - ${normalizedEndDate} (${getWeekday(endDate)})`;

        if (match.dateRange.isRescheduled) {
            fragment.appendChild(cloneInlineText('', `原定：${originalDateText}`));
            fragment.appendChild(cloneLineBreak());
            fragment.appendChild(cloneInlineText('', '重赛：'));

            if (match.dateRange.Restart) {
                const retryText = `${match.dateRange.Restart} (${getWeekday(new Date(match.dateRange.Restart))}) - ${match.dateRange.Reend} (${getWeekday(new Date(match.dateRange.Reend))})`;
                fragment.appendChild(cloneInlineText('', retryText));

                const tooltipTrigger = cloneInlineText('tooltip-trigger', '?');
                tooltipTrigger.dataset.title = match.dateRange.rescheduledReason || '';
                fragment.appendChild(tooltipTrigger);
            }
        } else {
            fragment.appendChild(cloneInlineText('', originalDateText));
        }
    }

    if (match.dateRange.result) {
        fragment.appendChild(cloneInlineText('', ` | 结果公布：${match.dateRange.result} (${getWeekday(new Date(match.dateRange.result))})`));
    }

    if (match.details?.format) {
        fragment.appendChild(cloneVotingFormatWrapper(match.details.format));
    }

    return fragment;
}

function buildStatusContent(status, statusIcon, statusText) {
    if (status === 'postponed') {
        const wrapper = cloneScheduleTemplate('schedule-status-wrapper-template', '.status-wrapper');
        wrapper.querySelector('.status-icon').textContent = statusIcon;
        wrapper.firstElementChild.after(document.createTextNode(statusText));
        wrapper.querySelector('.tooltip').textContent = '该赛事已延期，具体时间待定';
        return wrapper;
    }

    const fragment = document.createDocumentFragment();
    fragment.appendChild(cloneInlineText('status-icon', statusIcon));
    fragment.appendChild(document.createTextNode(statusText));
    return fragment;
}

function buildStatsContent(votes) {
    const fragment = document.createDocumentFragment();
    if (!votes) {
        return fragment;
    }

    const statsItem = cloneScheduleTemplate('schedule-stats-item-template', '.stats-item');
    statsItem.textContent = `总选票数：${votes.total}（有效：${votes.valid}）`;
    fragment.appendChild(statsItem);
    return fragment;
}

export function renderSchedule(data, { createMatchElement, initReminders, createElevatorNav, initSavePosition }) {
    const timeline = document.getElementById('timeline');
    const elevatorNav = document.querySelector('.elevator-nav');

    timeline.innerHTML = '';
    if (elevatorNav) {
        elevatorNav.remove();
    }

    timeline.classList.add('has-results');
    const nextMatch = getNextMatch(data);

    Object.entries(data.phases).forEach(([phaseId, phase]) => {
        const section = cloneScheduleTemplate('schedule-timeline-section-template', '.timeline-section');
        section.id = phaseId;
        section.querySelector('.timeline-header h2').textContent = phase.title;

        phase.matches.forEach(match => {
            const matchElement = createMatchElement(match, nextMatch);
            section.appendChild(matchElement);
        });

        timeline.appendChild(section);
    });

    initReminders();
    createElevatorNav(data);
    initSavePosition();
}

export function createMatchElement(match, renderMatchDetails) {
    const element = cloneScheduleTemplate('schedule-timeline-item-template', '.timeline-item');
    const status = getMatchStatus(match);

    const statusText = {
        completed: '已结束',
        ongoing: '进行中',
        upcoming: '即将开始',
        pending: '未开始',
        postponed: '已延期'
    }[status];

    const statusIcon = {
        completed: '✓',
        ongoing: '●',
        upcoming: '○',
        pending: '·',
        postponed: '!'
    }[status];

    element.className = `timeline-item ${status}`;
    element.dataset.status = status;
    element.dataset.startDate = match.dateRange.isRescheduled && match.dateRange.Restart
        ? match.dateRange.Restart
        : match.dateRange.start;
    element.dataset.endDate = match.dateRange.isRescheduled && match.dateRange.Reend
        ? match.dateRange.Reend
        : match.dateRange.end;

    const matchDate = element.querySelector('.match-date');
    const matchTitle = element.querySelector('.match-title');
    const matchStatus = element.querySelector('.match-status');
    const matchStats = element.querySelector('.match-stats');
    const matchDetails = element.querySelector('.match-details');

    matchDate.replaceChildren(buildDateContent(match));
    matchTitle.textContent = match.title;
    matchStatus.replaceChildren(buildStatusContent(status, statusIcon, statusText));
    matchStats.replaceChildren(buildStatsContent(match.details?.votes));
    matchDetails.replaceChildren(renderMatchDetails(match, status));

    return element;
}
