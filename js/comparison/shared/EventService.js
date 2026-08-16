export class EventService {
    constructor(repository) {
        this.repository = repository;
    }

    async loadEvents() {
        return this.repository.findAll();
    }

    getSelectableMatches(events) {
        return Object.values(events?.months ?? {})
            .flatMap(month => month.events ?? [])
            .filter(event => event.dateRange?.result)
            .flatMap(event => event.matches ?? [])
            .filter(match => match.id && match.links?.data)
            .map(match => ({ value: match.id, name: match.title }));
    }

    findMatch(events, eventId) {
        return Object.values(events.months)
            .flatMap(month => month.events)
            .flatMap(event => event.matches)
            .find(match => match.id === eventId);
    }

    findStats(events, eventId) {
        for (const month of Object.values(events.months)) {
            const event = month.events.find(item => item.matches?.some(match => match.id === eventId));
            if (event) return event;
        }
        return null;
    }
}
