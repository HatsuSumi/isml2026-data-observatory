function buildCharactersByName(characters) {
    return characters;
}

class GroupRendererStrategy {
    static strategies = {
        preliminary: (groupConfig, charactersData, containers) => {
            const template = document.getElementById('preliminary-group-template');
            const groupListTemplate = document.getElementById('group-list-template');
            const groupContainer = groupListTemplate.content.cloneNode(true).querySelector('.group-list');

            Object.entries(groupConfig.groups).forEach(([groupName, characters]) => {
                const groupSection = template.content.cloneNode(true);

                groupSection.querySelector('.group-title').textContent = groupName;
                const charactersList = groupSection.querySelector('.characters-list');
                const characterTemplate = charactersList.querySelector('.character-item');

                charactersList.innerHTML = '';

                characters.forEach(characterName => {
                    const characterData = charactersData[characterName];

                    const characterItem = characterTemplate.cloneNode(true);
                    const avatar = characterItem.querySelector('.character-avatar');
                    const nameSpan = characterItem.querySelector('.character-name');

                    if (characterData?.avatar) {
                        avatar.src = characterData.avatar;
                        avatar.alt = characterName;
                    } else {
                        avatar.remove();
                    }

                    nameSpan.textContent = characterName;
                    charactersList.appendChild(characterItem);
                });

                groupContainer.appendChild(groupSection.querySelector('.group-section'));
            });

            containers.content.innerHTML = '';
            containers.content.appendChild(groupContainer);
        },

        seedGroup: (groupConfig, charactersData, containers) => {
            const template = document.getElementById('seed-group-template');
            const table = template.content.cloneNode(true);

            const tbody = table.querySelector('tbody');
            tbody.innerHTML = '';

            Object.entries(groupConfig.groups).forEach(([groupName, characters]) => {
                const rowTemplate = template.content.querySelector('.seed-group-row');
                const row = rowTemplate.cloneNode(true);

                row.querySelector('.seed-group-name').textContent = groupName;

                [1, 2, 3, 4].forEach(seedNumber => {
                    const cell = row.querySelector(`.seed-${seedNumber}`);
                    const characterDiv = cell.querySelector('.seed-group-character');
                    const avatar = characterDiv.querySelector('.seed-group-avatar');
                    const nameSpan = characterDiv.querySelector('.seed-group-name');

                    const character = characters.find(c => c.seed === seedNumber);

                    if (character) {
                        const characterData = charactersData[character.name];

                        if (characterData?.avatar) {
                            avatar.src = characterData.avatar;
                            avatar.alt = character.name;
                        } else {
                            avatar.remove();
                        }

                        nameSpan.textContent = character.name;
                    } else {
                        characterDiv.remove();
                    }
                });

                tbody.appendChild(row);
            });

            const tableElement = document.createElement('table');
            tableElement.className = 'seed-group-table';
            tableElement.appendChild(table.querySelector('thead'));
            tableElement.appendChild(tbody);

            containers.content.innerHTML = '';
            containers.content.appendChild(tableElement);
        }
    };

    static render(type, groupConfig, charactersData, containers) {
        const strategy = this.strategies[type];
        if (strategy) {
            strategy(groupConfig, charactersData, containers);
        } else {
            throw new Error(`未找到 ${type} 类型的渲染策略`);
        }
    }
}

class Groups {
    constructor() {
        const urlParams = new URLSearchParams(window.location.search);
        this.groupId = urlParams.get('id');
        this.containers = {
            content: document.querySelector('.groups-content'),
            title: document.querySelector('.groups-title')
        };

        document.querySelector('.back-btn').addEventListener('click', () => {
            window.history.back();
        });
    }

    async init() {
        try {
            await this.loadCharacters();
            this.renderGroups();
        } catch (error) {
            console.error('初始化分组页面失败:', error);
            this.showError('分组信息加载失败，请稍后重试');
        }
    }

    async loadCharacters() {
        const response = await fetch('data/groups/groups-data.json');
        if (!response.ok) {
            throw new Error('数据加载失败');
        }

        const data = await response.json();
        this.groupsData = data.groups;
        this.charactersData = buildCharactersByName(data.characters);
    }

    renderGroups() {
        const groupConfig = this.groupsData[this.groupId];
        if (!groupConfig) {
            this.showError('未找到对应的分组信息');
            return;
        }

        this.containers.title.textContent = groupConfig.title;

        const type = this.getGroupType();
        GroupRendererStrategy.render(type, groupConfig, this.charactersData, this.containers);
    }

    getGroupType() {
        const cleanGroupId = this.groupId.split('&')[0];
        if (cleanGroupId.includes('preliminary')) return 'preliminary';
        if (cleanGroupId.includes('group_stage')) return 'seedGroup';
        throw new Error('未知的分组类型');
    }

    showError(message) {
        this.containers.content.innerHTML = `<p class="error">${message}</p>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".loading-container").forEach(container => container.remove());
    const groups = new Groups();
    groups.init();
});
