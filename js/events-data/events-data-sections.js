import { TITLE_MAPPING } from './events-data-config.js';
import { getEventStatus, getEventStartDate } from './events-data-status.js';
import { createDateContent, createEventCard, createStatusInfo } from './events-data-cards.js';
import { getMatchTargetId, getPhaseTargetId } from './events-data-navigation.js';

export function groupEventsByStructure(events) {
    const structure = {};
    const processedEvents = new Set();

    events.forEach(event => {
        const startDate = getEventStartDate(event);
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const dateKey = `${month}.${day}`;
        if (!structure[dateKey]) {
            structure[dateKey] = {
                date: event.dateRange.isRescheduled && event.dateRange.Restart
                    ? event.dateRange.Restart
                    : event.dateRange.start,
                phases: {}
            };
        }

        event.matches.forEach(match => {
            const eventId = `${event.dateRange.isRescheduled && event.dateRange.Restart
                ? event.dateRange.Restart
                : event.dateRange.start}-${match.title}`;
            if (processedEvents.has(eventId)) return;
            processedEvents.add(eventId);
            const phase = match.phase;
            if (!structure[dateKey].phases[phase]) structure[dateKey].phases[phase] = { groups: {} };
            let mainGroup;
            if (match.title.includes('预选赛')) {
                const roundMatch = match.title.match(/第([一二三四五六])轮/);
                mainGroup = roundMatch ? `预选赛${roundMatch[0]}` : match.title;
            } else {
                mainGroup = match.title.includes('恒星组')
                    ? '恒星组提名'
                    : match.title.includes('新星组') ? '新星组提名' : '其他';
            }
            if (!structure[dateKey].phases[phase].groups[mainGroup]) {
                structure[dateKey].phases[phase].groups[mainGroup] = [];
            }
            structure[dateKey].phases[phase].groups[mainGroup].push({ event, match, phaseId: getMatchTargetId(match) });
        });
    });
    return structure;
}

export function createMonthSection(templates, month, nextEventStartTime, rankingData, charactersData) {
    const section = templates.monthSection.content.cloneNode(true).querySelector('.month-section');
    section.querySelector('.month-title').textContent = month.title;
    const grid = section.querySelector('.events-grid');
    const eventsByDate = groupEventsByStructure(month.events);
    const dateFragment = document.createDocumentFragment();
    Object.keys(eventsByDate).sort((a, b) => new Date(eventsByDate[a].date) - new Date(eventsByDate[b].date))
        .forEach(dateKey => dateFragment.appendChild(createDateSection(
            templates, dateKey, eventsByDate[dateKey], nextEventStartTime, rankingData, charactersData
        )));
    grid.appendChild(dateFragment);
    return section;
}

function createDateSection(templates, date, dateGroup, nextEventStartTime, rankingData, charactersData) {
    const section = templates.dateSection.content.cloneNode(true).querySelector('.date-section');
    section.querySelector('.date-header').textContent = date;
    const phaseFragment = document.createDocumentFragment();
    Object.entries(dateGroup.phases).forEach(([phaseName, phase]) => {
        phaseFragment.appendChild(createPhaseSection(
            templates, phaseName, phase, nextEventStartTime, rankingData, charactersData
        ));
    });
    section.appendChild(phaseFragment);
    return section;
}

function createPhaseSection(templates, phaseName, phase, nextEventStartTime, rankingData, charactersData) {
    const section = templates.phaseSection.content.cloneNode(true).querySelector('.phase-group');
    const header = section.querySelector('.phase-header');
    const content = section.querySelector('.phase-content');
    const phaseTargetId = getPhaseTargetId(phaseName);
    if (phaseTargetId) section.dataset.phase = phaseTargetId;
    section.id = phaseName;
    header.textContent = phaseName;

    const groupFragment = document.createDocumentFragment();
    Object.entries(phase.groups).forEach(([groupName, matches]) => {
        const modifiedMatches = matches.flatMap(eventMatch => {
            const mapping = TITLE_MAPPING[eventMatch.match.title];
            if (!mapping) return [eventMatch];
            return mapping.map(item => ({
                ...eventMatch,
                match: {
                    ...eventMatch.match,
                    title: item.title,
                    format: item.format,
                    details: { ...eventMatch.match.details, qualified: { description: item.description } }
                }
            }));
        });
        groupFragment.appendChild(createGroupSection(
            templates, TITLE_MAPPING[groupName]?.groupTitle || groupName,
            modifiedMatches, nextEventStartTime, rankingData, charactersData
        ));
    });
    content.appendChild(groupFragment);
    header.addEventListener('click', () => section.classList.toggle('collapsed'));
    return section;
}

function createGroupSection(templates, groupTitle, groupData, nextEventStartTime, rankingData, charactersData) {
    const section = templates.groupSection.content.cloneNode(true).querySelector('.group-section');
    const phaseId = groupData.find(item => item.phaseId)?.phaseId;
    if (phaseId) section.dataset.phase = phaseId;
    section.querySelector('.group-title').textContent = groupTitle;
    section.querySelector('.group-date').replaceChildren(createDateContent(groupData[0].event));
    const statusInfo = section.querySelector('.status-info');
    const cardsContainer = section.querySelector('.cards-container');
    const firstEvent = groupData[0].event;
    const status = getEventStatus(firstEvent, nextEventStartTime);
    statusInfo.replaceChildren(createStatusInfo(templates, status, firstEvent.stats));
    cardsContainer.hidden = status !== 'completed';
    const cardsFragment = document.createDocumentFragment();
    groupData.forEach(({ event, match }) => cardsFragment.appendChild(createEventCard(
        templates, match, event, nextEventStartTime, rankingData, charactersData
    )));
    cardsContainer.appendChild(cardsFragment);
    return section;
}
