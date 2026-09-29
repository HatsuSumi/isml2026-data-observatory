import { formatDateTime, getEventStatus, getStatusText } from './events-data-status.js';
import { getEventLinks } from './events-data-links.js';

export function createInfoRow(templates, wrapperClass, keyText, valueText) {
    const wrapper = templates.infoRow.content.cloneNode(true).firstElementChild;
    wrapper.className = wrapperClass;
    wrapper.querySelector('.key').textContent = keyText;
    wrapper.querySelector('.value').textContent = valueText;
    return wrapper;
}

export function getTopCharacters(items) {
    if (!Array.isArray(items) || items.length <= 5) return items || [];

    const sortedItems = [...items].sort((left, right) => right.votes - left.votes);
    const cutoffVotes = sortedItems[4].votes;
    return sortedItems.filter(item => item.votes >= cutoffVotes);
}

export function createTopCharacterItem(templates, item, index, topFiveData) {
    const row = templates.topCharacterItem.content.cloneNode(true).firstElementChild;
    const avatar = row.querySelector('.character-avatar');
    const image = row.querySelector('img');
    const name = row.querySelector('.name');
    const diff = row.querySelector('.votes-diff');

    if (item.avatar) {
        image.src = item.avatar;
        image.alt = item.name;
    } else {
        avatar.hidden = true;
    }

    const rank = topFiveData.findIndex(previous => previous.votes === item.votes) + 1;
    row.querySelector('.rank').textContent = String(rank);
    name.textContent = item.name;
    const ip = document.createElement('span');
    ip.className = 'ip';
    ip.textContent = `@${item.ip}`;
    name.appendChild(ip);
    row.querySelector('.votes').textContent = `${item.votes}票`;

    if (index > 0) {
        const previousVotes = topFiveData[index - 1].votes;
        const voteDiff = previousVotes - item.votes;
        diff.textContent = voteDiff === 0 ? '=0' : `↓${voteDiff}`;
        diff.classList.toggle('tie', voteDiff === 0);
    } else {
        diff.hidden = true;
    }
    return row;
}

export function createStatusInfo(templates, status, stats) {
    const fragment = document.createDocumentFragment();
    if (status === 'postponed') {
        const wrapper = document.createElement('div');
        wrapper.className = 'status-wrapper';
        const statusLabel = document.createElement('span');
        statusLabel.className = 'event-status status-postponed';
        statusLabel.textContent = '已延期';
        const hint = document.createElement('div');
        hint.className = 'postpone-hint';
        const icon = document.createElement('i');
        icon.className = 'fas fa-question-circle';
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = '该赛事已延期，具体时间待定';
        hint.append(icon, tooltip);
        wrapper.append(statusLabel, hint);
        fragment.appendChild(wrapper);
    } else {
        const statusNode = document.createElement('span');
        statusNode.className = `event-status status-${status}`;
        statusNode.textContent = getStatusText(status);
        fragment.appendChild(statusNode);
    }
    if (stats?.votes && stats.votes.total !== undefined) {
        const statsContainer = document.createElement('div');
        statsContainer.className = 'event-stats';
        const item = document.createElement('span');
        const hasValidVotes = stats.votes.valid !== undefined && stats.votes.valid !== null;
        item.className = 'stat-item';
        item.textContent = hasValidVotes
            ? `投票者总数: ${stats.votes.total}（有效：${stats.votes.valid}）`
            : `投票者总数: ${stats.votes.total}`;
        statsContainer.appendChild(item);
        fragment.appendChild(statsContainer);
    }
    return fragment;
}

export function createDateContent(event) {
    const fragment = document.createDocumentFragment();
    if (event.dateRange.isRescheduled) {
        fragment.appendChild(document.createTextNode(`原定：${formatDateTime(event.dateRange.start)} - ${formatDateTime(event.dateRange.end)}`));
        fragment.appendChild(document.createElement('br'));
        fragment.appendChild(document.createTextNode(`重赛：${formatDateTime(event.dateRange.Restart)} - ${formatDateTime(event.dateRange.Reend)}`));
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip-trigger';
        tooltip.textContent = '?';
        tooltip.dataset.title = event.dateRange.rescheduledReason;
        fragment.append(document.createTextNode(' '), tooltip);
    } else {
        fragment.appendChild(document.createTextNode(`${formatDateTime(event.dateRange.start)} - ${formatDateTime(event.dateRange.end)}`));
    }
    if (event.dateRange.result) {
        fragment.appendChild(document.createTextNode(` | 结果公布：${formatDateTime(event.dateRange.result, 'date')}`));
    }
    return fragment;
}

export function createEventCard(templates, match, event, nextEventStartTime, rankingData) {
    const card = templates.eventCard.content.cloneNode(true).querySelector('.event-card');
    const status = getEventStatus(event, nextEventStartTime);
    const topFiveData = getTopCharacters(rankingData?.[match.title]?.top5);
    const body = templates.eventCardBody.content.cloneNode(true).firstElementChild;
    const header = body.querySelector('.event-header');
    const info = body.querySelector('.event-info');
    const title = body.querySelector('.event-title');
    const description = body.querySelector('.event-content');
    const topCharacters = body.querySelector('.top-characters');
    const footer = body.querySelector('.event-footer');

    const eventDetails = event.details ?? {};
    title.textContent = match.title;
    description.hidden = !eventDetails.qualified?.description;
    if (!description.hidden) description.textContent = eventDetails.qualified.description;
    if (eventDetails.format) info.appendChild(createInfoRow(templates, 'voting-format-wrapper', '投票制度：', eventDetails.format));
    if (match.resultDate) info.appendChild(createInfoRow(templates, 'result-date-wrapper', '出结果日：', formatDateTime(match.resultDate)));
    if (status === 'postponed') header.appendChild(templates.postponeHint.content.cloneNode(true));

    if (topFiveData?.length) {
        const list = topCharacters.querySelector('.character-list');
        topCharacters.querySelector('.top-title').textContent = topFiveData.length > 5
            ? '得票数 Top5（含并列）'
            : '得票数 Top5';
        topCharacters.hidden = false;
        topFiveData.forEach((item, index) => {
            list.appendChild(createTopCharacterItem(templates, item, index, topFiveData));
        });
    } else {
        topCharacters.hidden = true;
    }

    footer.appendChild(getEventLinks(match, status));
    card.replaceChildren(body);
    return card;
}
