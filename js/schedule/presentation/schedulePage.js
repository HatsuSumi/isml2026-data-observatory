import { SCROLL_POSITION_KEY, setScheduleData } from '../state/scheduleState.js';
import { smoothScrollTo } from '../utils/dom.js';
import { loadJson } from '../utils/loadJson.js';
import { createMatchElement, renderSchedule } from './renderSchedule.js';
import { initReminders, initSavePosition, initStickySearchContainer, updateCountdown } from './pageEffects.js';
import { normalizeRoundNames } from './roundNameNormalizer.js';
import { createScheduleNavController } from './scheduleNavController.js';
import { bindCharacterSearch } from './bindings.js';

export async function startSchedulePage(renderMatchDetails) {
    const data = await loadJson('data/config/schedule.json', 'Error loading schedule data:');
    if (!data) {
        return;
    }

    setScheduleData(data);
    renderSchedule(data, {
        createMatchElement: match => createMatchElement(match, renderMatchDetails),
        initReminders,
        createElevatorNav: createScheduleNavController,
        initSavePosition,
    });

    updateCountdown();
    setInterval(updateCountdown, 1000);

    const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (savedPosition) {
        setTimeout(() => {
            smoothScrollTo(Number.parseInt(savedPosition, 10), 800);
            sessionStorage.removeItem(SCROLL_POSITION_KEY);
        }, 100);
    }

    initStickySearchContainer();
    bindCharacterSearch();
    normalizeRoundNames();
}
