export class CharacterRepository {
    constructor({ fetchImpl = globalThis.fetch.bind(globalThis) } = {}) {
        this.fetchImpl = fetchImpl;
    }

    async findByEvent(event) {
        if (!event?.links?.data) {
            throw new Error('找不到赛事数据路径');
        }

        const response = await this.fetchImpl(event.links.data);
        if (!response.ok) {
            throw new Error('加载数据失败');
        }

        const data = await response.json();
        return data.data;
    }
}
