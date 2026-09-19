export const SCHEDULE_PHASES = [
    { id: 'mainNomination', title: '主赛事提名阶段' },
    { id: 'preliminary', title: '预选赛阶段' },
    { id: 'phase1', title: '第一阶段' },
    { id: 'phase2', title: '第二阶段' },
    { id: 'phase3', title: '第三阶段' },
    { id: 'phase4', title: '第四阶段' },
    { id: 'phase5', title: '第五阶段' },
    { id: 'phase6', title: '第六阶段' },
    { id: 'phase7', title: '第七阶段' },
    { id: 'knockout', title: '淘汰赛阶段' }
];

const PHASE_NUMBER_IDS = {
    一: 'phase1',
    二: 'phase2',
    三: 'phase3',
    四: 'phase4',
    五: 'phase5',
    六: 'phase6',
    七: 'phase7'
};

export function getScheduleGroupTitle(matchTitle) {
    return String(matchTitle || '').replace(/-(?:女性|男性)组别$/, '');
}

export function getSchedulePhaseId(phaseTitle) {
    const value = String(phaseTitle || '');
    if (value === '主赛事提名阶段' || value.includes('提名')) return 'mainNomination';
    if (value.startsWith('预选赛')) return 'preliminary';
    const numbered = value.match(/^第([一二三四五六七])阶段/);
    if (numbered) return PHASE_NUMBER_IDS[numbered[1]] || '';
    if (value.startsWith('淘汰赛')) return 'knockout';
    const known = SCHEDULE_PHASES.find(phase => phase.title === value);
    return known?.id || '';
}

export function collectEventWindows(eventsConfig) {
    const windows = [];
    Object.values(eventsConfig?.months || {}).forEach((month) => {
        (month.events || []).forEach((event) => {
            const matches = event.matches || [];
            if (!matches.length) return;
            const groupTitle = getScheduleGroupTitle(matches[0].title);
            const phaseId = getSchedulePhaseId(matches[0].phase);
            const mixed = matches.filter((match) => getScheduleGroupTitle(match.title) !== groupTitle);
            if (mixed.length) {
                throw new Error(`同一时间窗口包含不同赛事组：${groupTitle}`);
            }
            windows.push({
                event,
                matches,
                groupTitle,
                phaseId
            });
        });
    });
    return windows;
}

function resultLinkText(title) {
    if (title.includes('女性') || title.includes('女子')) return '查看女子组结果';
    if (title.includes('男性') || title.includes('男子')) return '查看男子组结果';
    return `查看${title}结果`;
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function hasMeaningfulValue(value) {
    if (value === undefined || value === null || value === '' || value === '-') return false;
    if (typeof value !== 'object') return true;
    if (Array.isArray(value)) return value.length > 0;
    return Object.values(value).some(hasMeaningfulValue);
}

function compactDetails(details) {
    return Object.fromEntries(Object.entries(details || {}).filter(([, value]) => hasMeaningfulValue(value)));
}

function eventVotesForSchedule(event) {
    const votes = event.stats?.votes;
    if (!votes || votes.valid === undefined || votes.valid === null || votes.valid === '') {
        return undefined;
    }
    return votes;
}

export function buildScheduleMatchFromWindow(window) {
    const details = compactDetails({
        ...(window.event.details || {}),
        votes: eventVotesForSchedule(window.event)
    });
    const items = window.matches
        .filter((match) => match.links?.visualization)
        .map((match) => ({
            text: resultLinkText(match.title),
            url: match.links.visualization
        }));
    const match = {
        title: window.groupTitle,
        dateRange: cloneJson(window.event.dateRange)
    };
    if (window.event.status) match.status = window.event.status;
    if (Object.keys(details).length) match.details = details;
    if (items.length) {
        match.links = {
            completed: { items }
        };
    }
    return match;
}

export function buildScheduleView(eventsConfig, upcomingSchedule) {
    const phases = Object.fromEntries(SCHEDULE_PHASES.map((phase) => [
        phase.id,
        { title: phase.title, matches: [] }
    ]));
    const occupied = new Set();

    collectEventWindows(eventsConfig).forEach((window) => {
        if (!window.phaseId || !phases[window.phaseId]) {
            throw new Error(`无法映射赛事阶段：${window.matches[0]?.phase || window.groupTitle}`);
        }
        if (occupied.has(window.groupTitle)) {
            throw new Error(`events.json 出现重复赛事组：${window.groupTitle}`);
        }
        occupied.add(window.groupTitle);
        phases[window.phaseId].matches.push(buildScheduleMatchFromWindow(window));
    });

    Object.entries(upcomingSchedule?.phases || {}).forEach(([phaseId, phase]) => {
        if (!phases[phaseId]) {
            phases[phaseId] = {
                title: phase.title || phaseId,
                matches: []
            };
        }
        (phase.matches || []).forEach((match) => {
            if (!match?.title) {
                throw new Error(`schedule.json ${phaseId} 存在缺少标题的赛事`);
            }
            if (occupied.has(match.title)) {
                throw new Error(`schedule.json 重复维护已发生赛事：${match.title}`);
            }
            phases[phaseId].matches.push(cloneJson(match));
        });
    });

    Object.values(phases).forEach((phase) => {
        phase.matches.sort((left, right) => {
            const leftStart = Date.parse(left.dateRange?.start || 0);
            const rightStart = Date.parse(right.dateRange?.start || 0);
            if (leftStart !== rightStart) return leftStart - rightStart;
            return String(left.title).localeCompare(String(right.title), 'zh');
        });
    });

    return { phases };
}
