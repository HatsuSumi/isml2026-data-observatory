import { formatDateTime, getEventStatus, getStatusText } from './events-data-status.js';
import { getEventLinks } from './events-data-links.js';

export function createInfoRow(templates, wrapperClass, keyText, valueText) {
    const wrapper = templates.infoRow.content.cloneNode(true).firstElementChild;
    wrapper.className = wrapperClass;
    wrapper.querySelector('.key').textContent = keyText;
    wrapper.querySelector('.value').textContent = valueText;
    return wrapper;
}

export function createTopCharacterItem(templates, item, index, topFiveData, charactersData) {
    const characterKey = `${item.name}@${item.ip}`;
    const characterData = charactersData[characterKey];
    const row = templates.topCharacterItem.content.cloneNode(true).firstElementChild;
    const avatar = row.querySelector('.character-avatar');
    const image = row.querySelector('img');
    const name = row.querySelector('.name');
    const diff = row.querySelector('.votes-diff');

    if (characterData?.avatar) {
        image.src = characterData.avatar;
        image.alt = item.name;
    } else {
        avatar.hidden = true;
    }

    row.querySelector('.rank').textContent = String(index + 1);
    name.textContent = item.name;
    const ip = document.createElement('span');
    ip.className = 'ip';
    ip.textContent = `@${characterData?.ip || item.ip}`;
    name.appendChild(ip);
    row.querySelector('.votes').textContent = `${item.votes}票`;

    if (index > 0) {
        diff.textContent = `↓${topFiveData[index - 1].votes - item.votes}`;
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
    if (stats) {
        const statsContainer = document.createElement('div');
        statsContainer.className = 'event-stats';
        const item = document.createElement('span');
        item.className = 'stat-item';
        item.textContent = `总选票数: ${stats.votes.total}（有效：${stats.votes.valid}）`;
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

export function createEventCard(templates, match, event, nextEventStartTime, rankingData, charactersData) {
    const card = templates.eventCard.content.cloneNode(true).querySelector('.event-card');
    const status = getEventStatus(event, nextEventStartTime);
    const topFiveData = rankingData?.[match.title]?.top5;
    const body = templates.eventCardBody.content.cloneNode(true).firstElementChild;
    const header = body.querySelector('.event-header');
    const info = body.querySelector('.event-info');
    const title = body.querySelector('.event-title');
    const description = body.querySelector('.event-content');
    const topCharacters = body.querySelector('.top-characters');
    const footer = body.querySelector('.event-footer');

    title.textContent = match.title;
    description.hidden = !match.details?.qualified?.description;
    if (!description.hidden) description.textContent = match.details.qualified.description;
    if (match.format) info.appendChild(createInfoRow(templates, 'voting-format-wrapper', '投票制度：', match.format));
    if (match.resultDate) info.appendChild(createInfoRow(templates, 'result-date-wrapper', '出结果日：', formatDateTime(match.resultDate)));
    if (status === 'postponed') header.appendChild(templates.postponeHint.content.cloneNode(true));

    if (topFiveData?.length) {
        const list = topCharacters.querySelector('.character-list');
        topFiveData.forEach((item, index) => {
            list.appendChild(createTopCharacterItem(templates, item, index, topFiveData, charactersData));
        });
    } else {
        topCharacters.hidden = true;
    }

    footer.appendChild(getEventLinks(match, status));
    card.replaceChildren(body);
    return card;
}
