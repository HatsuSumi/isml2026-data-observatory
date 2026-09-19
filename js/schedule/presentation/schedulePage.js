import { loadScheduleView } from '../../common/data-loader.js';
import { SCROLL_POSITION_KEY, setScheduleData } from '../state/scheduleState.js';
import { smoothScrollTo } from '../utils/dom.js';
import { createMatchElement, renderSchedule } from './renderSchedule.js';
import { initReminders, initSavePosition, initStickySearchContainer, startCountdownLoop } from './pageEffects.js';
import { createScheduleNavController } from './scheduleNavController.js';
import { bindCharacterSearch } from './bindings.js';

export async function startSchedulePage(renderMatchDetails) {
    let data;
    try {
        data = await loadScheduleView();
    } catch (error) {
        console.error('Error loading schedule data:', error);
        return;
    }

    setScheduleData(data);
    renderSchedule(data, {
        createMatchElement: match => createMatchElement(match, renderMatchDetails),
        initReminders,
        createElevatorNav: createScheduleNavController,
        initSavePosition,
    });

    startCountdownLoop();

    const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (savedPosition) {
        setTimeout(() => {
            smoothScrollTo(Number.parseInt(savedPosition, 10), 800);
            sessionStorage.removeItem(SCROLL_POSITION_KEY);
        }, 100);
    }

    initStickySearchContainer();
    bindCharacterSearch();
}
