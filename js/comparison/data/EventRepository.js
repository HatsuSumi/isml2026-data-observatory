export class EventRepository {
    constructor({ dataPath, fetchImpl = globalThis.fetch.bind(globalThis) }) {
        this.dataPath = dataPath;
        this.fetchImpl = fetchImpl;
    }

    async findAll() {
        const response = await this.fetchImpl(this.dataPath);
        if (!response.ok) {
            throw new Error(`加载赛事失败：${response.status}`);
        }
        return response.json();
    }
}
