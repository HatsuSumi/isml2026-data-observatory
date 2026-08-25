export class CharacterRepository {
    constructor({ fetchImpl = globalThis.fetch.bind(globalThis) } = {}) {
        this.fetchImpl = fetchImpl;
        this.charactersByPath = new Map();
    }

    findByEvent(event) {
        const dataPath = event?.links?.data;
        if (!dataPath) {
            throw new Error('找不到赛事数据路径');
        }

        if (!this.charactersByPath.has(dataPath)) {
            this.charactersByPath.set(dataPath, this.fetchCharacters(dataPath));
        }

        return this.charactersByPath.get(dataPath);
    }

    async fetchCharacters(dataPath) {
        try {
            const response = await this.fetchImpl(dataPath);
            if (!response.ok) {
                throw new Error('加载数据失败');
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            this.charactersByPath.delete(dataPath);
            throw error;
        }
    }
}
