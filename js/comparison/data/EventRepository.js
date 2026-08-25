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
            const response = await this.fetchImpl(this.dataPath);
            if (!response.ok) {
                throw new Error(`加载赛事失败：${response.status}`);
            }
            return response.json();
        } catch (error) {
            this.eventsPromise = null;
            throw error;
        }
    }
}
