export class EventRepository {
    constructor({ dataPath, fetchImpl = globalThis.fetch.bind(globalThis) }) {
        this.dataPath = dataPath;
        this.fetchImpl = fetchImpl;
    }

    async findAll() {
        const response = await this.fetchImpl(this.dataPath);
        if (!response.ok) {
            throw new Error(`鍔犺浇璧涗簨澶辫触锛?{response.status}`);
        }
        return response.json();
    }
}
