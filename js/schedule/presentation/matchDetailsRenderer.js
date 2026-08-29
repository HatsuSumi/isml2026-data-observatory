const REQUIREMENT_TOOLTIP = '标准时长动画，是指放映集数不少于6集且累计放映时长不少于40分钟，或累计放映时长不少于60分钟的动画系列。';

import { cloneScheduleTemplate } from '../utils/template.js';

function cloneInlineText(className, text) {
    const node = cloneScheduleTemplate('schedule-inline-text-template', 'span');
    node.className = className;
    node.textContent = text;
    return node;
 }

function cloneParagraph() {
    return cloneScheduleTemplate('schedule-paragraph-template', 'p');
}

function cloneDetailRow(label, valueNode) {
    const row = cloneScheduleTemplate('schedule-detail-row-template', 'p');
    row.querySelector('.key').textContent = label;
    const value = row.querySelector('.value');
    value.replaceChildren(valueNode);
    return row;
}

function cloneCountdown(countdownValue) {
    const countdown = cloneScheduleTemplate('schedule-countdown-template', 'span');
    countdown.dataset.countdown = countdownValue;
    return countdown;
}

function cloneReminderButton() {
    const button = cloneScheduleTemplate('schedule-reminder-button-template', '.match-link');
    button.textContent = '设置提醒';
    return button;
}

function cloneResultLink(link) {
    const anchor = cloneScheduleTemplate('schedule-result-link-template', 'a');
    anchor.href = link.href;
    anchor.textContent = link.text;
    return anchor;
}

function cloneResultLinksWrapper(items) {
    const wrapper = cloneScheduleTemplate('schedule-result-links-wrapper-template', '.result-links-wrapper');
    wrapper.querySelector('.result-links-trigger').textContent = '查看结果';
    const menu = wrapper.querySelector('.result-links-menu');

    items.forEach(link => {
        menu.appendChild(cloneResultLink(link));
    });

    return wrapper;
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

function createRequirementContent(match) {
    const requirements = match.details?.requirements;
    if (!requirements) {
        return cloneInlineText('', '');
    }

    if (match.title.includes('提名')) {
        const span = cloneInlineText('requirements-text', requirements);
        span.dataset.tooltip = REQUIREMENT_TOOLTIP;
        return span;
    }

    return cloneInlineText('', requirements);
}

function createRequirementRow(match) {
    const requirements = match.details?.requirements;
    const row = cloneDetailRow('提名条件：', createRequirementContent(match));
    if (!requirements) {
        row.hidden = true;
    }
    return row;
}

function createCountValue(data) {
    const span = cloneInlineText('', `${data?.total || 0} 人`);
    if (data?.female !== undefined) {
        span.textContent += `（女性：${data.female} 人，男性：${data.male} 人）`;
    }
    return span;
}

function createCountRow(label, data) {
    return cloneDetailRow(label, createCountValue(data));
}

function createCountdownRow(label, countdownValue) {
    const row = cloneDetailRow(label, cloneCountdown(countdownValue));
    return row;
}

function buildDetails(match, { includeQualified = false, includeCountdown = false, countdownLabel = '', countdownValue = '', includeResults = false, includeReminder = false } = {}) {
    const fragment = document.createDocumentFragment();

    fragment.appendChild(createRequirementRow(match));
    fragment.appendChild(createCountRow('被提名角色数：', match.details?.participants));

    if (includeQualified) {
        fragment.appendChild(createCountRow('晋级角色数：', match.details?.qualified));
    }

    if (includeCountdown) {
        fragment.appendChild(createCountdownRow(countdownLabel, countdownValue));
    }

    if (includeResults && match.links?.completed?.items) {
        const links = match.links.completed.items.map(link => {
            const separator = link.url.includes('?') ? '&' : '?';
            return {
                href: `${link.url}${separator}from=schedule`,
                text: link.text,
            };
        });
        fragment.appendChild(cloneResultLinksWrapper(links));
    }

    if (includeReminder) {
        fragment.appendChild(cloneReminderButton());
    }

    return fragment;
}

export function renderMatchDetails(match, status) {
    if (status === 'completed') {
        return buildDetails(match, {
            includeQualified: true,
            includeResults: true,
        });
    }

    if (status === 'ongoing') {
        return buildDetails(match, {
            includeCountdown: new Date() < (match.dateRange.isRescheduled && match.dateRange.Reend
                ? new Date(match.dateRange.Reend)
                : new Date(match.dateRange.end)),
            countdownLabel: '剩余时间：',
            countdownValue: match.dateRange.isRescheduled && match.dateRange.Reend
                ? match.dateRange.Reend
                : match.dateRange.end,
        });
    }

    return buildDetails(match, {
        includeCountdown: true,
        countdownLabel: '开始倒计时：',
        countdownValue: match.dateRange.isRescheduled && match.dateRange.Restart
            ? match.dateRange.Restart
            : match.dateRange.start,
        includeReminder: true,
    });
}
