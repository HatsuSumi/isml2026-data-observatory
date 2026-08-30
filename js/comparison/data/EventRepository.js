import { loadEventData } from '../../common/data-loader.js';

export class EventRepository {
    constructor({ dataPath, fetchImpl = globalThis.fetch.bind(globalThis) }) {
        this.dataPath = dataPath;
        this.fetchImpl = fetchImpl;
        this.eventsPromise = null;
    }

    findAll() {
        this.eventsPromise ??= this.fetchEvents();
        return this.eventsPromise;
    }

    async fetchEvents() {
        try {
            return await loadEventData();
        } catch (error) {
            this.eventsPromise = null;
            throw error;
        }
    }
}
