export const SCROLL_POSITION_KEY = 'schedule_scroll_position';

export const scheduleState = {
    data: null,
    filtersEnabled: true,
    filterControls: null,
};

export function setScheduleData(data) {
    scheduleState.data = data;
}

export function getScheduleData() {
    return scheduleState.data;
}

export function setScheduleFiltersEnabledState(enabled) {
    scheduleState.filtersEnabled = enabled;
}

export function isScheduleFiltersEnabled() {
    return scheduleState.filtersEnabled;
}

export function setScheduleFilterControls(controls) {
    scheduleState.filterControls = controls;
}

export function getScheduleFilterControls() {
    return scheduleState.filterControls;
}
