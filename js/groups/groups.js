import { loadGroupData } from '../common/data-loader.js';

function resolveGroupCharacter(character, charactersData) {
    if (typeof character === 'string') {
        return charactersData[character] || { name: character, ip: '', avatar: '' };
    }
    const lookupKey = character.participantId || character.characterId || character.name;
    const fallback = lookupKey ? charactersData[lookupKey] : null;
    return {
        ...fallback,
        ...character,
        name: character.name || fallback?.name || '',
        ip: character.ip || fallback?.ip || '',
        avatar: character.avatar || fallback?.avatar || ''
    };
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

                characters.forEach(character => {
                    const resolved = resolveGroupCharacter(character, charactersData);
                    const characterItem = characterTemplate.cloneNode(true);
                    const avatar = characterItem.querySelector('.character-avatar');
                    const avatarWrap = characterItem.querySelector('.character-avatar-wrap');
                    const nameSpan = characterItem.querySelector('.character-name');
                    const ipSpan = characterItem.querySelector('.character-ip');

                    if (resolved.avatar) {
                        avatar.src = resolved.avatar;
                        avatar.alt = resolved.name;
                    } else {
                        avatarWrap.remove();
                    }

                    nameSpan.textContent = resolved.name;
                    ipSpan.textContent = resolved.ip;
                    charactersList.appendChild(characterItem);
                });

                groupContainer.appendChild(groupSection);
            });

            containers.content.innerHTML = '';
            containers.content.appendChild(groupContainer);
        },

        seedGroup: (groupConfig, charactersData, containers) => {
            const seedCount = Math.max(...Object.values(groupConfig.groups).flat().map(character => character.seed || 0));
            const tableElement = document.createElement('table');
            tableElement.className = 'seed-group-table';

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const groupHeader = document.createElement('th');
            groupHeader.innerHTML = '<span>角色</span>';
            headerRow.appendChild(groupHeader);

            for (let seedNumber = 1; seedNumber <= seedCount; seedNumber += 1) {
                const header = document.createElement('th');
                header.textContent = `${seedNumber}号种子`;
                headerRow.appendChild(header);
            }
            thead.appendChild(headerRow);
            tableElement.appendChild(thead);

            const tbody = document.createElement('tbody');
            Object.entries(groupConfig.groups).forEach(([groupName, characters]) => {
                const row = document.createElement('tr');
                const groupCell = document.createElement('th');
                groupCell.className = 'seed-group-name';
                groupCell.textContent = groupName;
                row.appendChild(groupCell);

                for (let seedNumber = 1; seedNumber <= seedCount; seedNumber += 1) {
                    const cell = document.createElement('td');
                    cell.className = `seed-group-cell seed-${seedNumber}`;
                    const character = characters.find(item => item.seed === seedNumber);

                    if (character) {
                        const resolved = resolveGroupCharacter(character, charactersData);
                        const characterDiv = document.createElement('div');
                        characterDiv.className = 'seed-group-character';
                        const nameSpan = document.createElement('span');
                        nameSpan.className = 'seed-group-name';
                        nameSpan.textContent = resolved.name;
                        characterDiv.appendChild(nameSpan);

                        if (resolved.avatar) {
                            const avatar = document.createElement('img');
                            avatar.className = 'seed-group-avatar';
                            avatar.src = resolved.avatar;
                            avatar.alt = resolved.name;
                            characterDiv.prepend(avatar);
                        }

                        cell.appendChild(characterDiv);
                    }
                    row.appendChild(cell);
                }
                tbody.appendChild(row);
            });

            tableElement.appendChild(tbody);
            const tableWrap = document.createElement('div');
            tableWrap.className = 'seed-group-table-wrap';
            tableWrap.appendChild(tableElement);
            containers.content.innerHTML = '';
            containers.content.appendChild(tableWrap);
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
        this.groupId = (urlParams.get('id') || '').trim();
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
        const data = await loadGroupData();
        this.groupsData = data.groups;
        this.charactersData = data.characters;
    }

    renderGroups() {
        const groupConfig = this.groupsData[this.groupId];
        if (!groupConfig) {
            console.warn('未找到对应的分组信息:', this.groupId, Object.keys(this.groupsData || {}).filter((key) => key.includes('phase1')));
            this.showError('未找到对应的分组信息');
            return;
        }

        this.containers.title.textContent = groupConfig.title;

        const type = this.getGroupType();
        GroupRendererStrategy.render(type, groupConfig, this.charactersData, this.containers);
    }

    getGroupType() {
        const layout = this.groupsData[this.groupId].layout;
        if (!Object.hasOwn(GroupRendererStrategy.strategies, layout)) {
            throw new Error(`未知的分组布局: ${layout}`);
        }
        return layout;
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
