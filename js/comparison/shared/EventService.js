function assertEventTree(events) {
    if (!events || typeof events !== 'object') {
        throw new Error('事件数据结构错误：事件数据必须是对象');
    }

    if (!events.months || typeof events.months !== 'object' || Array.isArray(events.months)) {
        throw new Error('事件数据结构错误：缺少有效的 months 对象');
    }

    Object.entries(events.months).forEach(([monthKey, month]) => {
        if (!month || typeof month !== 'object') {
            throw new Error(`事件数据结构错误：月份 ${monthKey} 必须是对象`);
        }
        if (!Array.isArray(month.events)) {
            throw new Error(`事件数据结构错误：月份 ${monthKey} 缺少 events 数组`);
        }
        month.events.forEach((event, eventIndex) => {
            if (!event || typeof event !== 'object' || !Array.isArray(event.matches)) {
                throw new Error(`事件数据结构错误：月份 ${monthKey} 的赛事 ${eventIndex} 缺少 matches 数组`);
            }
            event.matches.forEach((match, matchIndex) => {
                if (!match || typeof match !== 'object') {
                    throw new Error(`事件数据结构错误：月份 ${monthKey} 的赛事 ${eventIndex} 中项目 ${matchIndex} 无效`);
                }
            });
        });
    });

    return events;
}

function normalizeEvents(data) {
    if (data?.months) {
        return assertEventTree(data);
    }

    if (data?.events?.months) {
        return assertEventTree(data.events);
    }

    throw new Error('事件数据结构错误：期望 events.months 或 months');
}

export class EventService {
    constructor(repository) {
        this.repository = repository;
    }

    async loadEvents() {
        return normalizeEvents(await this.repository.findAll());
    }

    getSelectableMatches(events) {
        const eventTree = assertEventTree(events);
        return Object.values(eventTree.months)
            .flatMap(month => month.events)
            .flatMap(event => event.matches)
            .filter(match => match.id && match.title && match.links?.data)
            .map(match => ({ value: match.id, name: match.title }));
    }

    findMatch(events, eventId) {
        const eventTree = assertEventTree(events);
        if (!eventId) {
            throw new Error('赛事查询失败：eventId 不能为空');
        }
        const match = Object.values(eventTree.months)
            .flatMap(month => month.events)
            .flatMap(event => event.matches)
            .find(item => item.id === eventId);
        if (!match) {
            throw new Error(`赛事查询失败：找不到赛事 ${eventId}`);
        }
        return match;
    }

    findStats(events, eventId) {
        const eventTree = assertEventTree(events);
        if (!eventId) {
            throw new Error('赛事统计查询失败：eventId 不能为空');
        }
        for (const month of Object.values(eventTree.months)) {
            const event = month.events.find(item => item.matches.some(match => match.id === eventId));
            if (event) return event;
        }
        throw new Error(`赛事统计查询失败：找不到赛事 ${eventId}`);
    }
}
