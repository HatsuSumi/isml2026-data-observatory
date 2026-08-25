import { getScheduleData, getScheduleFilterControls, setScheduleFiltersEnabledState } from '../state/scheduleState.js';
import { debounce } from '../utils/dom.js';
import { loadJson } from '../utils/loadJson.js';
import { clearCharacterSelection, filterTimelineByCharacter, showAllMatches, showCharacterSelection } from './characterSearch.js';
import { setScheduleFiltersEnabled } from './elevatorNav.js';

export function bindCharacterSearch() {
    let searchRequestId = 0;
    const searchInput = document.getElementById('characterSearch');
    const handleSearch = debounce(async (event, requestId) => {
        const searchValue = event.target.value.trim();
        const noCharacterEl = document.querySelector('.no-character');
        const timelineEl = document.getElementById('timeline');

        if (!searchValue) {
            clearCharacterSelection();
            setScheduleFiltersEnabledState(true);
            setScheduleFiltersEnabled(true, getScheduleFilterControls());
            showAllMatches();
            noCharacterEl.hidden = true;
            timelineEl.hidden = false;
            return;
        }

        clearCharacterSelection();

        const data = await loadJson('data/matches/character-matches.json', 'Error fetching character data:');
        if (requestId !== searchRequestId) return;
        if (!data) {
            noCharacterEl.hidden = true;
            timelineEl.hidden = false;
            return;
        }

        const matchedCharacters = Object.entries(data.matches).filter(([, char]) =>
            char.name.toLowerCase().includes(searchValue.toLowerCase())
        );

        if (matchedCharacters.length > 0) {
            setScheduleFiltersEnabledState(false);
            setScheduleFiltersEnabled(false, getScheduleFilterControls());

            if (matchedCharacters.length === 1) {
                const [, character] = matchedCharacters[0];
                filterTimelineByCharacter(character);
                noCharacterEl.hidden = true;
                timelineEl.hidden = false;
            } else {
                noCharacterEl.hidden = true;
                timelineEl.hidden = true;
                showCharacterSelection(matchedCharacters, filterTimelineByCharacter);
            }
            return;
        }

        noCharacterEl.hidden = false;
        timelineEl.hidden = true;
        noCharacterEl.textContent = `未找到角色"${searchValue}"`;
    }, 300);

    searchInput.addEventListener('input', event => {
        const requestId = ++searchRequestId;
        handleSearch(event, requestId);
    });
}

export function getCurrentMatchData(data) {
    const now = new Date();
    let currentMatch = null;
    let upcomingMatch = null;

    Object.values(data.phases).forEach(phase => {
        phase.matches.forEach(match => {
            const startDate = match.dateRange.isRescheduled && match.dateRange.Restart
                ? new Date(match.dateRange.Restart)
                : new Date(match.dateRange.start);
            const endDate = match.dateRange.isRescheduled && match.dateRange.Reend
                ? new Date(match.dateRange.Reend)
                : new Date(match.dateRange.end);

            if (now >= startDate && now <= endDate) {
                currentMatch = { ...match, phaseTitle: phase.title };
            } else if (now < startDate && (!upcomingMatch || startDate < new Date(upcomingMatch.dateRange.start))) {
                upcomingMatch = { ...match, phaseTitle: phase.title };
            }
        });
    });

    return currentMatch || upcomingMatch;
}
