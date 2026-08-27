export function findNextEventStartTime(data) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let nextStartTime = null;

    for (const month of Object.values(data.months)) {
        month.events.forEach(event => {
            const startDate = getEventStartDate(event);
            startDate.setHours(0, 0, 0, 0);
            if (startDate > now && (!nextStartTime || startDate < nextStartTime)) {
                nextStartTime = startDate;
            }
        });
    }
    return nextStartTime;
}

export function getEventStatus(event, nextEventStartTime) {
    if (event.status === 'postponed') return 'postponed';

    const startDate = getEventStartDate(event);
    const endDate = getEventEndDate(event);
    const now = new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    now.setHours(0, 0, 0, 0);

    if (now > endDate) return 'completed';
    if (now >= startDate && now <= endDate) return 'ongoing';
    if (startDate.getTime() === nextEventStartTime?.getTime()) return 'upcoming';
    return 'notstarted';
}

export function getCurrentPhase(eventsData) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const month of Object.values(eventsData.months)) {
        for (const event of month.events) {
            const startDate = getEventStartDate(event);
            const endDate = getEventEndDate(event);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            if (now >= startDate && now <= endDate && event.matches[0]?.phase) {
                return event.matches[0].phase;
            }
        }
    }
    return null;
}

export function formatDateTime(date, format = 'full') {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const current = new Date(date);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const weekDay = weekDays[current.getDay()];

    if (format === 'date') return `${year}-${month}-${day} (${weekDay})`;
    const hours = String(current.getHours()).padStart(2, '0');
    const minutes = String(current.getMinutes()).padStart(2, '0');
    const seconds = String(current.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} (${weekDay})`;
}

export function getStatusText(status) {
    return {
        completed: '已结束',
        ongoing: '进行中',
        upcoming: '即将开始',
        notstarted: '未开始',
        postponed: '已延期'
    }[status] || status;
}

export function getEventStartDate(event) {
    return new Date(event.dateRange.isRescheduled && event.dateRange.Restart
        ? event.dateRange.Restart
        : event.dateRange.start);
}

export function getEventEndDate(event) {
    return new Date(event.dateRange.isRescheduled && event.dateRange.Reend
        ? event.dateRange.Reend
        : event.dateRange.end);
}
