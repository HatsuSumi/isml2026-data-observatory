export function getWeekday(date) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
}

export function getMatchStatus(match) {
    if (match.status === 'postponed') {
        return 'postponed';
    }

    const now = new Date();
    const startDate = match.dateRange.isRescheduled && match.dateRange.Restart
        ? new Date(match.dateRange.Restart)
        : new Date(match.dateRange.start);
    const endDate = match.dateRange.isRescheduled && match.dateRange.Reend
        ? new Date(match.dateRange.Reend)
        : new Date(match.dateRange.end);

    if (now > endDate) {
        return 'completed';
    }
    if (now >= startDate && now <= endDate) {
        return 'ongoing';
    }
    if (startDate - now < 24 * 60 * 60 * 1000) {
        return 'upcoming';
    }
    return 'pending';
}

export function getNextMatch(data) {
    const now = new Date();
    let nextMatch = null;
    let minDiff = Infinity;

    Object.values(data.phases).forEach(phase => {
        phase.matches.forEach(match => {
            const startDate = match.dateRange.isRescheduled
                ? new Date(match.dateRange.Restart)
                : new Date(match.dateRange.start);

            const diff = startDate - now;
            if (diff > 0 && diff < minDiff) {
                minDiff = diff;
                nextMatch = match;
            }
        });
    });

    return nextMatch;
}

export function getMatchDetails(scheduleData, matchTitle) {
    if (!scheduleData) return null;

    for (const phase of Object.values(scheduleData.phases)) {
        const match = phase.matches.find(item => item.title === matchTitle);
        if (match) return match;
    }
    return null;
}

export function getPhaseStatus(matches, now = new Date()) {
    const hasCompleted = matches.some(match => getMatchEndDate(match) < now);
    const hasOngoing = matches.some(match => {
        const start = getMatchStartDate(match);
        const end = getMatchEndDate(match);
        return now >= start && now <= end;
    });

    if (hasCompleted && !hasOngoing) {
        return 'completed';
    }
    if (hasOngoing) {
        return 'ongoing';
    }
    return 'pending';
}

export function getRoundStatus(match, now = new Date()) {
    const start = getMatchStartDate(match);
    const end = getMatchEndDate(match);

    if (end < now) {
        return '已结束';
    }
    if (start <= now && now <= end) {
        return '进行中';
    }
    return '未开始';
}

export function getPhaseStatusText(status) {
    if (status === 'completed') {
        return '已结束';
    }
    if (status === 'ongoing') {
        return '进行中';
    }
    return '未开始';
}

export function getRoundStatusClass(status) {
    if (status === '已结束') {
        return 'completed';
    }
    if (status === '进行中') {
        return 'ongoing';
    }
    return 'pending';
}

export function getCurrentMatchLabel(match, now = new Date()) {
    const start = getMatchStartDate(match);
    const end = getMatchEndDate(match);
    return now >= start && now <= end ? '当前进行中的赛事：' : '即将开始的赛事：';
}

function getMatchStartDate(match) {
    return match.dateRange.isRescheduled && match.dateRange.Restart
        ? new Date(match.dateRange.Restart)
        : new Date(match.dateRange.start);
}

function getMatchEndDate(match) {
    return match.dateRange.isRescheduled && match.dateRange.Reend
        ? new Date(match.dateRange.Reend)
        : new Date(match.dateRange.end);
}
